# ADR 0005 — FlightProvider boundary: Cloud API only for DJI live-ops

- **Status:** Accepted (direction); **implementation gated** on open conditions in [`dji-integration-architecture.md`](../dji-integration-architecture.md)
- **Date:** 2026-08-12
- **Deciders:** Product / Platform (specialist redo: product-analyst, architect, architecture-challenger)
- **Context docs:** [`dji-integration-architecture.md`](../dji-integration-architecture.md), [`dji-integration-catalogue.md`](../dji-integration-catalogue.md) (superseded for Live-ops A scope), ADRs [0001](./0001-dji-telemetry-unified-types.md)–[0003](./0003-mobile-cross-platform-vs-native.md), ERD §13.16

## Context

Stravyx needs operators to connect aircraft so customers can track jobs and receive raw (L1) media after first-to-accept booking. Two DJI surfaces are often conflated:

1. **Cloud API** — Pilot 2 / Dock talk to **Stravyx-hosted** MQTT + HTTPS + STS.
2. **FlightHub 2 OpenAPI** — Stravyx (or operators) call **DJI’s SaaS**.

We must decide which path is on the Live-ops A critical path, how non-DJI operators stay fair, and where adapters live relative to the marketplace SoT.

## Decision

1. **Stravyx remains marketplace SoT** (book, first-to-accept, Network Price, visibility firewall). DJI never owns dispatch, pricing, or customer delivery.
2. **Live-ops A DJI path = Cloud API only** (`dji_cloud_api` adapter). Multi-drone via multiple Pilot 2 / Dock gateways into Stravyx MQTT.
3. **FlightHub 2 is deferred** (`dji_fh2` documented, not built). Not required for connect / telemetry / raw L1. If later used for L2 Modeling/Sync/Analyzer/Virtual Cockpit, prefer **Business** (unlimited devices), not Enterprise per-device seats. Separate L2-processor ADR when scheduled.
4. **Non-DJI (and rollback) = `manual` adapter** — signed upload + status taps. Every customer-visible outcome must remain reachable via `manual` (contract-tested invariant).
5. **`FlightProvider` type contract** lives in `packages/types`; NestJS hosts adapters after Phase 1B. Edge may ship **S0** real signed upload for `manual` without NestJS.
6. **Bind timing:** aircraft↔mission binding at **`allocated`** (explicit select), never as accept precondition; at most one active binding per device.
7. **Media:** STS → upload → idempotent callback → **quarantine** (`operator_raw`) → explicit **release** (`customer_deliverable`); no silent `delivered` on partial/wrong-mission media. Prefer capture_session / binding-history attribution (open condition).
8. **Slice order:** S0 media path (Edge) → S1 Nest + manual registry → S2 bind (APP 8) → **S3 auto-media** → **S4 telemetry** → S5 multi-gateway → S6+.
9. **No NestJS/MQTT scaffold** until Phase 1B + APP 8 / privacy gate are explicitly approved.
10. **Pin Cloud API documentation version** (target ~v1.14.x) in implementation tickets before S2.

## Recommended path

**Cloud API + `manual`.** Stravyx hosts the device cloud (Pilot 2 / Dock → our MQTT and HTTPS). FlightHub 2 is a later Layer 2 option only. Non-DJI operators, and DJI operators when live bind is unavailable, complete the same customer journey with status taps and signed upload.

Layperson comparison, glossary, examples, and pros/cons: [`dji-live-ops-path-comparison.md`](../dji-live-ops-path-comparison.md). DJI vs non-DJI operator journeys: [`dji-vs-nondji-operator-journeys.md`](../dji-vs-nondji-operator-journeys.md). Independent challenge (2026-08-16), recommended fixes and alternatives in plain English: [`dji-live-ops-challenger-findings.md`](../dji-live-ops-challenger-findings.md).

## Consequences

**Positive**
- Clear SoT; multi-drone without FH2 SKUs.
- Fair non-DJI path and broker outage rollback via `manual`.
- Media auto-return reuses S0 pipeline (high leverage before telemetry plane).

**Negative / residual**
- Stravyx owns MQTT/STS/S3 COGS and ops (must quantify — open HIGH).
- Cloud API STS effectively needs real S3/MinIO (not Supabase Storage STS).
- APP 8 / residual DJI licence hops still require legal DPIA even for self-hosted ingest.
- Catalogue and older board docs mentioning BEST MATCH / early FH2 Modeling must not override this ADR.

**Open conditions** before production MQTT / auto media: see the conditions table in [`dji-integration-architecture.md`](../dji-integration-architecture.md) (includes 2026-08-16 challenger items A-01–A-10). APP 8 homework for Liz/Joel: [`app8-live-ops-gate-closeout.md`](../app8-live-ops-gate-closeout.md).

## Supersession

For **Live-ops A scope**, this ADR + [`dji-integration-architecture.md`](../dji-integration-architecture.md) supersede conflicting language in [`dji-integration-catalogue.md`](../dji-integration-catalogue.md) (BEST MATCH / bidding / FH2 Modeling on Phase 1 critical path).
