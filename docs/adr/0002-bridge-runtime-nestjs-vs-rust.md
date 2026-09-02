# ADR 0002 — Bridge runtime: NestJS (Node/TypeScript) vs Rust

- **Status:** Accepted (proposed for Phase 1 build)
- **Date:** 2026-07-01
- **Deciders:** Product / Platform (to confirm at Phase 1 kickoff)
- **Context docs:** [`dji-bridge-and-client-internals.md`](../dji-bridge-and-client-internals.md), [`dji-frontend-technical-spec.md`](../dji-frontend-technical-spec.md), [`adr/0001-dji-telemetry-unified-types.md`](./0001-dji-telemetry-unified-types.md)

## Context

The DJI Cloud API bridge ([`dji-bridge-and-client-internals.md`](../dji-bridge-and-client-internals.md)) subscribes to DJI MQTT, normalizes raw thing-model into `packages/types`, throttles ~10 Hz OSD down to ~1.4 Hz per mission, projects payloads per subscriber role, and fans out via Redis pub/sub to stateless WS pods. We must decide the **runtime/language** for this service before Phase 1 build, because it is a foundational, hard-to-reverse choice.

The workload has three defining properties that drive the decision:

1. **I/O-bound, not CPU-bound.** The hot path is `receive → JSON.parse → small object remap → coalesce → redis.publish`. No crypto, transcoding, or ML.
2. **Throttling caps effective fan-out volume.** OSD is coalesced to ~1.4 Hz per mission (§3.2) before the expensive-per-message work, so effective rate stays low even with many drones.
3. **Tied to a TypeScript monorepo.** Per [ADR 0001](./0001-dji-telemetry-unified-types.md), the bridge normalizes to `packages/types`, the single shared contract consumed by the WS gateway, web app, and React Native via `packages/realtime`. The bridge is one node in a type graph spanning backend + web + RN.

## Decision

Adopt **Option A: NestJS (Node/TypeScript)** for the bridge runtime.

For an I/O-bound MQTT → transform → pub/sub → WS pipeline inside a TypeScript monorepo with shared `packages/types`, Node/NestJS is the better-fit choice, not a compromise. Rust's advantages target constraints this throttled, low-CPU, 1–2 Hz workload does not hit, while its main cost — a second type system splitting the single-source contract from ADR 0001 — lands on the exact seam the architecture is built around. At prototype/MVP stage, velocity and unified types win decisively.

**Revisit trigger, not a rewrite:** Rust is reconsidered only as a **targeted optimization of a proven hotspot** (see Follow-ups), never as a wholesale port.

## Options considered

| Option | Summary | Verdict |
|---|---|---|
| **A — NestJS / TypeScript** (chosen) | Node event loop for I/O fan-out; shared `packages/types` end-to-end; mature `mqtt.js`/`ioredis`/`socket.io` stack | ✅ Recommended |
| **B — Full Rust bridge** | `tokio` + `rumqttc` + `redis-rs`/`fred` + `axum`/`tokio-tungstenite`; multicore, GC-free | ❌ Solves constraints we don't have; splits the type contract in two |
| **C — Hybrid: Rust hotspot shard + NestJS control plane** | Rust only for a proven CPU-bound OSD shard; projection/RBAC/WS stay NestJS | ⏸ Deferred — valid future step if metrics justify it (Follow-ups) |

**Deciding factor:** the frontend is TypeScript regardless. A Rust bridge forces the ADR 0001 contract to live in two type systems (hand-synced or code-gen'd), permanent overhead on the contract the whole system revolves around — to buy multicore/GC-free performance a 1–2 Hz, I/O-bound MVP workload will not need for a long time.

## Consequences

**Positive**
- Single source of truth for types: a contract change is one edit the compiler enforces across bridge, WS gateway, web, and RN.
- Best-fit ecosystem already assumed by the reference implementation (`mqtt.js`, `ioredis`, `socket.io`/`ws`, NestJS DI/lifecycle, Zod validation) — no FFI or glue.
- Node's event loop is ideal for multiplexing many idle-ish MQTT/WS/Redis connections; horizontal scale-out + broker shared-subscriptions cover volume growth.
- Broadest talent pool; the same engineers work across frontend and bridge.

**Negative / mitigations**
- Single-threaded per process; CPU spikes can stall the event loop. **Mitigation:** stateless pods + Redis pub/sub (already in the design); worker threads for isolated hotspots.
- GC can add p99 jitter at extreme rates. **Mitigation:** UI cadence is 1–2 Hz; monitor tail latency and fall back to the hybrid (Option C) only if metrics demand.
- Higher per-connection memory and weaker whole-process crash guarantees than a compiled runtime. **Mitigation:** failure isolation between ingestion and WS pods (already in the design); per-pod resource limits + restart policy.

## Revisit triggers (when to reconsider Rust)

Reconsider Rust **only as Option C (targeted shard)**, and only if observability proves the need — not on intuition:

- A **single OSD-ingestion shard is CPU-bound** and horizontal Node scale-out has become uneconomical.
- **Hard p99 latency guarantees** are required that the event loop + GC cannot meet.
- Fleet scale grows enough that **per-pod memory/cost** materially moves the infra bill.

If triggered: carve out only the proven hotspot (e.g. a dedicated Rust OSD normalize/throttle shard behind the MQTT `$share/bridge/...` shared-subscription group) and **code-gen its TS types** (`ts-rs`/`schemars`) so the ADR 0001 contract stays single-source. Keep projection, RBAC, and WS fan-out in NestJS.

## Follow-ups
- Wire the observability the triggers depend on: msgs/s per topic, throttle drop ratio, WS connections, reconnect rate, event-loop lag, and p99 publish latency (technical spec § 6, bridge § 6).
- Set an alarm/threshold on event-loop lag + per-shard CPU that would flag the Option C revisit condition.
- If Option C is ever adopted, add a contract test asserting the Rust shard and NestJS normalizer emit byte-compatible `Telemetry` from the same recorded fixtures (mirrors ADR 0001 follow-up).
