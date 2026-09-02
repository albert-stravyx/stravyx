# Project context — Stravyx

> Durable product and business context for agents. Deep schema: [data-model-erd.md](./data-model-erd.md). Phases: [backend-build-plan.md](./backend-build-plan.md).

## Product purpose

**Stravyx** is an AI-powered, asset-light **two-sided marketplace** for commercial drone services in Australia. It connects customers to **CASA-licensed ReOC operators**, with a longer-term path to a dock network and Stravyx-operated capacity (ReOC / RPL pilots).

This monorepo implements the **Phase 1A/2A working demo**: Supabase Auth + Postgres + Edge Functions + Next.js marketplace app, plus marketing lead tables synced one-way to HubSpot. NestJS full platform and DJI live ops are **planned**, not implemented here yet.

## Business model (locked concepts)

| Concept | Rule |
|---------|------|
| **Network Price** | Customer pays one price. Formula target: `$250/hr × equipment × urgency` (integer **cents**). |
| **Layer 1** | Flight fee — operator ~85% / Stravyx ~15%. |
| **Layer 2** | AI data processing — 100% Stravyx. |
| **Visibility** | Operators must **not** see customer total, L2, or platform margin. Customers must **not** see L1/L2 line splits. Admin sees full economics. |
| **Dispatch** | **First-to-accept**: Stravyx fans fixed-price offers to eligible ReOCs; first accept wins (DB race safety). Competitive bidding and BEST MATCH SCORE ranking are **retired**. |
| **Address** | Operators see **suburb only** until accept; then full address. |
| **CRM** | HubSpot is engagement layer only — **one-way after persist**. |

## Actors / roles

| Role | Primary job in demo |
|------|---------------------|
| **Customer** | Quote, book, track, view deliverables (stub) |
| **Operator** | See offers, accept, advance status, upload stub |
| **Admin** | Full mission list + economics |

Roles are stored in Supabase Auth **`app_metadata.role`** and mirrored on `profiles.primary_role` (`customer` \| `operator` \| `admin`).

## Surfaces (who owns what)

| Surface | Owner | Notes |
|---------|-------|-------|
| Marketplace demo app | This repo `apps/app-web` | Deployed via Vercel (monorepo filter) |
| Marketplace API | This repo `supabase/functions/api` | Edge today → NestJS later |
| Lead schema + HubSpot worker | This repo | Migrations + `hubspot-sync` |
| Marketing website | **Replit** → [stravyx.com](https://stravyx.com) | Outside monorepo for 1A/2A |
| Design / UX inventory | Figma Make (historical port) | Not schema SoT — see gap review |
| CRM | HubSpot | Synced contacts from lead INSERTs |

**Do not treat** a local sibling `stravyx-web` as marketing SoT — it is stale relative to live Replit.

## MVP domains (ERD)

Eight domains (A–H). Demo implements a **subset** of A–E + H. Domains F–G (devices/docks/telemetry, full compliance) and most of D/E (payments/processing) are target schema or stubs.

See [data-model-erd.md](./data-model-erd.md) and [CURRENT_STATE.md](./CURRENT_STATE.md).

## Compliance / regulatory posture (product)

- Supply side: **CASA ReOC** operators; approvals registry is first-class in target ERD (geometry, not only self-declared areas).
- Live DJI telemetry / overseas data paths are **gated** on privacy disclosure (documented; not built).
- Demo security bar is **not** enterprise GA (SSO/MFA/WAF deferred) — see [DECISIONS.md](./DECISIONS.md).

## Key external references (names only)

- Supabase project ref (public): see `.env.example` (`SUPABASE_PROJECT_REF`).
- GitHub repo: `albert-stravyx/prototype-project` (**verify** on new machine).
- Marketing Replit app historically referenced as `jackson322/Stravyx-Main` (**verify**).
- FE reference port historically from `harvey513/Stravyx_App_FE` (**verify**).

## Document authority order

When sources conflict:

1. **ERD v0.3.1** (marketplace mechanics, money, visibility, Domain H)
2. **backend-build-plan.md** (what is demo-ready vs Phase 2)
3. **ADRs 0001–0003** (DJI types, bridge runtime, mobile stack)
4. **This handoff set** (`PROJECT_CONTEXT`, `CURRENT_STATE`, …)
5. Board / MVP timeline docs (may still mention bidding or historical dates)
6. Figma Make gap review (UX inventory + P0–P2 backlog)
