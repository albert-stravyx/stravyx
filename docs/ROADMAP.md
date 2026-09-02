# Roadmap — Stravyx

> Ordered priorities for continuing development. Status: [CURRENT_STATE.md](./CURRENT_STATE.md). Decisions: [DECISIONS.md](./DECISIONS.md).

## Now — keep Phase 1A/2A healthy

1. **Re-verify demo DoD on the new machine** — runbook smoke (book → accept → status → upload → admin) + one marketing lead → HubSpot (`hubspot_contact_id`).
2. **Confirm secrets & deploys** — Edge `HUBSPOT_ACCESS_TOKEN`, `HUBSPOT_SYNC_SECRET` / Vault `hubspot_sync_secret`, Vercel `NEXT_PUBLIC_*` (especially MapTiler at **build** time), Replit → same Supabase project.
3. **Keep contract tests green** — visibility / pricing / mission-authz are merge-blocking.
4. **Close HubSpot property drift** — when HubSpot portal properties change, update `hubspot-sync` mappers; prove writeback on all seven lead tables.
5. **Retire remaining demo-only UX before any public prod cut** — real auth/legal links (gap review P1). Account Switch View was removed 2026-08-11; role shell is JWT `/me` only.

## Next — product gaps still on Edge/demo stack

Prioritise only if Phase 1B has not started yet:

| Priority | Item | Notes |
|----------|------|-------|
| P0 | Visibility regressions | Never regress Network Price / suburb / margin firewall |
| P1 | Status label alignment | UI labels vs ERD statuses (`booked` / `dispatched` / …) |
| P1 | Operator decline / offer expiry UX | Schema has windows; product path incomplete |
| P1 | Credential upload + admin verification queue | Gap review |
| P1 | Admin pricing config / dispute / audit export | Mostly missing |
| P1 | Real media upload (not stub) | **S0** in [dji-integration-architecture.md](./dji-integration-architecture.md) — signed upload + quarantine→release; no NestJS required |
| P2 | Split role apps | `consumer-web` / `operator-web` / `admin-web` |
| P2 | Category count alignment | Five MVP-enabled categories SoT |
| P2 | Playwright BDD in CI | Needs stable `PLAYWRIGHT_BASE_URL` |

Source backlog detail: [figma-make-frontend-gap-review.md](./figma-make-frontend-gap-review.md).

## Control-plane follow-ups (from ADR 0004)

| Priority | Item | Notes |
|----------|------|-------|
| P1 | Verify model slugs with `agent models` | `.agent/models.json` records substitutions that are **CLI-unverified**; no `agent`/`cursor-agent` binary was on PATH at adoption |
| P1 | Expand `architecture_boundaries` | Four boundaries enforced today. Candidates: forbid deep `packages/*/src/**` imports across packages; keep Edge route handlers off direct pricing arithmetic |
| P2 | Generate Supabase database types | Would clear the three remaining `deno check` errors on embedded PostgREST relations and give the Edge handlers real row types |
| P2 | Typecheck `supabase/functions/**` in CI | Needs a pinned Deno step; today only `packages/*` and `apps/app-web` are covered by `pnpm typecheck` |
| P2 | Revisit `project.yaml` agent enablement | Mobile / data / AI specialists are off because that code does not exist; turn on at Phase 1B |
| P3 | Review engineering metrics | After 20–50 comparable tasks, per [ENGINEERING_METRICS.md](./ENGINEERING_METRICS.md) |

## Phase 1B — NestJS platform (not started)

When explicitly kicked off:

1. Scaffold `services/api` modular monolith on **same** `/api/...` contracts.
2. Move marketplace business rules off Edge; keep `packages/api-client` as the only client surface.
3. Plan Auth mapping (Supabase → Auth0/Cognito) without breaking `users.id` stability.
4. Region plan: Sydney primary later; do not casually recreate schema in a second SoT.
5. Introduce observability baseline before DJI load.
6. `FlightProvider` registry with **`manual` only** first (ADR 0005); do not enable MQTT/`dji_cloud_api` until APP 8 conditions close ([app8-live-ops-gate-closeout.md](./app8-live-ops-gate-closeout.md)).

## Live-ops slices (after 1B + privacy) — ADR 0005

APP 8 close-out for Liz/Joel: [app8-live-ops-gate-closeout.md](./app8-live-ops-gate-closeout.md). Manual S0 upload is not waiting on that pack.

Ordered in [dji-integration-architecture.md](./dji-integration-architecture.md):

| Slice | Outcome |
|-------|---------|
| S2 | Domain F + Cloud API bind + per-gateway MQTT ACLs |
| S3 | Auto media (STS + callback into S0 pipeline) — **before** telemetry |
| S4 | Telemetry → projected WS Track Job |
| S5 | Multi-gateway hardening |
| S6+ | Wayline/map A+, Dock, livestream, DRC — separately gated |
| L2 later | FH2 Business Modeling **or** Pix4D — not Live-ops A |

## Phase 2C / P1+ — full marketplace + live ops

- Payment/payout **rail decision** (open — see ERD §15).
- Full Domains A–G tables (approvals registry, feasibility, splits/payouts, deliverables/jobs, audit/disputes).
- DJI Cloud bridge (NestJS per ADR 0002 + **0005**) + `packages/realtime`.
- Operator mobile via RN/Expo + `packages/dji-msdk` (ADR 0003), privacy gate first — **not** required for supported Pilot 2 Live-ops A cohort.
- Optional: import Replit marketing into `apps/marketing-web`.
- FH2 OpenAPI **only** if L2/Sync product needs it (Business, not Enterprise seats by default).

## Historical timeline note

[mvp-build-timeline.md](./mvp-build-timeline.md) targets a **19 Jun 2026** web MVP. Treat dates as historical planning context; prefer [backend-build-plan.md](./backend-build-plan.md) + this file for “what’s next.”

## Unresolved decisions that block GA (not demo)

From ERD §15 (still open):

1. Offer fan-out cap / wave escalation
2. No-acceptance path when all offers expire
3. Payment / payout rail + custody / settlement cadence
4. Telemetry store technology (Timescale vs native partition vs external)
5. Canonical seed for mission categories & urgency tiers
6. `max_urgency_tier_id` landing in Web App Master

Also open operationally:

- When to leave Tokyo Supabase region for Sydney production
- Long-term IdP choice (Auth0 vs Cognito vs stay longer on Supabase Auth)
- HubSpot property ownership / marketing consent with CRM owner (Liz)
