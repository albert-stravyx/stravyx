# ADR 0001 — Unified telemetry types across cloud and direct-SDK paths

- **Status:** Accepted (proposed for Phase 1 build)
- **Date:** 2026-07-01
- **Deciders:** Product / Platform (to confirm at Phase 1 kickoff)
- **Context docs:** [`dji-frontend-technical-spec.md`](../dji-frontend-technical-spec.md), [`dji-frontend-integration.md`](../dji-frontend-integration.md), [`dji-integration-catalogue.md`](../dji-integration-catalogue.md)

## Context

DJI flight data can reach a Stravyx UI by two routes:

1. **Cloud path** — device → DJI gateway (Pilot 2 / Dock) → NestJS Cloud API bridge → `packages/realtime` WebSocket → client. Powers the **consumer tracker**, **admin fleet map**, and remote views.
2. **Direct-SDK path** — MSDK v5 on the operator's phone (`packages/dji-msdk`) emits telemetry/mission/media/HMS events **locally**. Powers the **operator's own live HUD** while flying.

Both paths render the same conceptual data (position, status, battery, upload progress, HMS). We must decide how the data shapes and UI components relate across the two paths, before either is built.

## Decision

Adopt **Option A: one shared type contract.** Both paths normalize to the **same `packages/types` shapes** (`Telemetry`, `UploadProgress`, `HmsAlert`, `MissionStatus`, `Deliverable`). UI components (`<FlightHud>`, `<MissionTracker>`, `<UploadProgress>`) are **source-agnostic** and bind to either `useMissionStream()` (cloud) or `addDjiListener()` (SDK) through a thin adapter.

Guardrail: normalization happens in **two places** — the native `dji-msdk` module and the NestJS bridge — but both are driven by a **single shared schema** in `packages/types` so they cannot drift.

## Options considered

| Option | Summary | Verdict |
|---|---|---|
| **A — Unified types** (chosen) | Both sources normalized to identical `packages/types`; one UI | ✅ Recommended |
| **B — Source-specific types + adapter/duplicate UI** | Keep `DjiTelemetry` vs `CloudTelemetry` distinct; adapt or duplicate per source | ❌ Drift risk + duplicate UI, no benefit |
| **C — Cloud-only funnel** | Phone pushes SDK data to backend; operator UI reads *everything* back via WebSocket (no local render) | ❌ Breaks offline flight; adds latency to operator's own HUD |

**Deciding factor:** an operator at a low-signal rural site must still see their **own** live telemetry and fly the mission. That mandates a **local** SDK render path, which rules out pure C. B adds two shapes that evolve apart and a duplicate UI layer for no gain.

## Consequences

**Positive**
- Single UI component set; lowest maintenance.
- Operator HUD is local → lowest latency, **works offline**.
- Consumer/admin get the same normalized data over the cloud → consistent UX.
- DJI schema/version churn is absorbed at the two normalizers, not in the UI.

**Negative / mitigations**
- Normalization logic exists twice (native + bridge). **Mitigation:** single shared schema + contract tests asserting both emit identical `packages/types` shapes from recorded fixtures (see technical spec § 6).
- Requires discipline that no source-specific field leaks into UI props. **Mitigation:** UI depends only on `packages/types`, never on `dji-msdk` raw shapes.

## Follow-ups
- Contract test: `dji-msdk` (Android + iOS) and bridge emit byte-compatible `Telemetry` from the same fixture.
- Lint rule / boundary: UI packages may import `packages/types` but not raw DJI SDK types.
