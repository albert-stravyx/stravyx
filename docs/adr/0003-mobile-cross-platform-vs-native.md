# ADR 0003 — Mobile stack: cross-platform (React Native) vs native (Kotlin + Swift)

- **Status:** Accepted (proposed for Phase 1 build)
- **Date:** 2026-07-01
- **Deciders:** Product / Platform (to confirm at Phase 1 kickoff)
- **Context docs:** [`dji-frontend-integration.md`](../dji-frontend-integration.md), [`dji-frontend-technical-spec.md`](../dji-frontend-technical-spec.md), [`executive-summary.md`](../executive-summary.md), [`adr/0001-dji-telemetry-unified-types.md`](./0001-dji-telemetry-unified-types.md)

## Context

Stravyx ships two mobile apps in Phase 1 ([`dji-frontend-integration.md`](../dji-frontend-integration.md) § 6): **`consumer-mobile`** (booking, live tracker, deliverables) and **`operator-mobile`** (the flight app — the real MSDK consumer). We must decide the mobile stack — cross-platform vs native per-OS — before either is built, because it is a foundational, hard-to-reverse choice that dictates team shape, hiring, and how much of the existing codebase mobile can reuse.

The workload has four defining properties that drive the decision:

1. **The product is already a TypeScript/React monorepo.** Four Next.js apps (`consumer-web`, `operator-web`, `admin-web`, `marketing-web`) sit on shared packages — `types`, `api-client`, `realtime`, `maps`, `media`, `ui`. Per [ADR 0001](./0001-dji-telemetry-unified-types.md), `packages/types` is the single shared contract spanning backend, web, and mobile; per [ADR 0002](./0002-bridge-runtime-nestjs-vs-rust.md) the bridge and WS gateway are Node/TS on that same contract.
2. **DJI MSDK v5 is native regardless of stack.** MSDK v5 is an Android AAR + iOS framework; it cannot run in JS/Dart and cannot run in Expo Go. *Every* option requires hand-written Kotlin and Swift. The only variable is **how much** native code we write.
3. **The apps are asymmetric.** `consumer-mobile` has **zero** DJI SDK code (it uses `packages/realtime` + `api-client`, like the web tracker). `operator-mobile` is the only true SDK consumer — mission execution, livestream, media pipeline, HMS, accessory/threading.
4. **Most mobile surface is shared CRUD + realtime UI.** Booking, auth, mission tracker, deliverables, upload progress, and status are ~90% shared logic; direct SDK calls are ~10%, and confined to one module.

## Decision

Adopt **Option A: React Native + Expo (custom dev client)**, with all DJI-native code quarantined into a single bridge module **`packages/dji-msdk`** (Kotlin AAR + Swift framework) behind one TypeScript surface.

For a TypeScript-monorepo product whose mobile apps are mostly shared realtime/CRUD UI with a small, well-bounded native SDK dependency, React Native is the better-fit choice, not a compromise. It reuses `packages/types`, `api-client`, and `realtime` directly (the *same* `<FlightHud>` binds to `useMissionStream()` or `addDjiListener()` per ADR 0001), keeps mobile in the language and component model the web team already uses, and isolates the unavoidable native work — which every option pays — into one module instead of two whole apps.

**Custom dev client, not Expo Go:** MSDK v5 requires native linking via config plugin + prebuild (bare/managed-with-prebuild), built with EAS.

**Revisit trigger, not a rewrite:** native is reconsidered only as a **targeted escape hatch for `operator-mobile` flight screens** (see Revisit triggers), never as a wholesale port of both apps.

## Options considered

| Option | Summary | Verdict |
|---|---|---|
| **A — React Native + Expo** (chosen) | Shared TS packages end-to-end; native quarantined in `packages/dji-msdk` (Kotlin + Swift); one product language | ✅ Recommended |
| **B — Full native (Kotlin + Swift)** | Two independent apps per OS; best-in-class SDK ergonomics | ❌ Re-implements realtime/visibility/UI 2× more, in 2 languages; triples mobile cost for a mostly-shared feature set |
| **C — Flutter** | Single cross-platform codebase in Dart | ❌ Forks the entire TS ecosystem; loses shared packages + ADR 0001 contract reuse; still needs a hand-written DJI bridge anyway |

**Deciding factor:** the frontend is TypeScript regardless, and DJI is native regardless. RN is the only option that both reuses the ADR 0001 single-source contract *and* confines the unavoidable native work to one module. Full native buys marginally better SDK ergonomics for `operator-mobile` at the cost of duplicating everything else twice; Flutter buys a single codebase but pays by splitting the type contract into a second language and discarding the shared packages the whole system revolves around.

## Consequences

**Positive**
- Single product language: mobile reuses `packages/types`, `api-client`, `realtime`, `maps`, `media` directly; a contract change is one edit the compiler enforces across backend, web, and both mobile apps.
- `consumer-mobile` is almost entirely shared logic — near-zero incremental native cost.
- Native risk is contained to one module (`packages/dji-msdk`) with a small, explicit TS surface (`registerApp`, `connectProduct`, `startWaypointMission`, `startLiveStream`, `uploadMedia`, `onTelemetry`, HMS).
- Broadest talent reuse: the same engineers work across web and mobile product code.
- Escape hatch preserved: native flight views can be embedded surgically later (below) without touching consumer-mobile or shared packages.

**Negative / mitigations**
- `operator-mobile` is SDK-heavy, and the JS↔native bridge is the hardest part (threading, MFi/USB accessory, RTMP/RTSP livestream, media pipeline) — the exact area where cross-platform "savings" do **not** apply. **Mitigation:** staff genuine senior Kotlin **and** Swift for the bridge; treat it as first-class, not an afterthought.
- Native normalization still exists twice (Android + iOS). **Mitigation:** single shared schema + contract tests asserting Android and iOS emit identical `packages/types` shapes (ADR 0001 follow-up; technical spec § 6).
- JS teams can be blocked waiting on the native bridge. **Mitigation:** build a **mock SDK** early so product screens develop against the `DjiEvent` stream on simulators before hardware is wired.
- Expo custom dev client adds build/config-plugin complexity vs a pure managed app. **Mitigation:** EAS build pipeline + prebuild are already assumed in the build plan (§ 6.3, § 7.2).

## Revisit triggers (when to reconsider native)

Reconsider native **only as a targeted escape hatch for `operator-mobile` flight screens**, and only if evidence proves the need — not on intuition:

- The bridged flight experience misses **hard latency/UX targets** (e.g. livestream lag, camera/gimbal control responsiveness) that RN + `dji-msdk` cannot meet.
- The native bridge surface **grows faster than the shared product UI**, inverting the 90/10 assumption that justifies cross-platform.
- MSDK version churn makes the JS marshalling layer a **recurring stability liability** on the flight path.

If triggered: peel out **only** `operator-mobile`'s flight screens into native views embedded in the RN shell (keep `consumer-mobile` and all shared packages on RN). This mirrors ADR 0002's "targeted shard, not wholesale port" posture.

## Follow-ups
- Stand up `packages/dji-msdk` mock SDK first so product screens (both apps) build against the typed `DjiEvent` stream without hardware.
- Contract test: `dji-msdk` (Android + iOS) emit byte-compatible `Telemetry`/`UploadProgress`/`HmsAlert` from the same recorded fixtures (mirrors ADR 0001 follow-up; technical spec § 6).
- Lint rule / boundary: mobile UI imports `packages/types`, never raw MSDK types (mirrors ADR 0001).
- Wire the observability the triggers depend on: bridge event latency, dropped/late telemetry on the SDK path, livestream start-to-glass time, and crash-free sessions for `operator-mobile`.
- Confirm store-readiness prerequisites early: Play accessory + background-location disclosures; Apple MFi + background-mode justifications (§ 6.3).
