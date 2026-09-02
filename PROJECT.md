# Project Brief — Stravyx

> Root brief for the governed autonomous engineering workflow. The deep, durable
> context is [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) — this file is the short
> answer an agent needs before reading further, not a second source of truth.

## Problem

Commercial drone work in Australia is brokered manually. Customers cannot get a
trustworthy price without a quoting round-trip, and CASA-licensed ReOC operators spend
unpaid effort chasing jobs they may not win. Both sides absorb the coordination cost.

## Users

- **Customers** — businesses that need a drone job done: quote, book, track, collect deliverables.
- **Operators** — CASA ReOC holders who receive fixed-price offers and accept the ones they want.
- **Admin** — Stravyx staff, the only role that sees full mission economics.

## Outcomes

A customer receives a single **Network Price** and books without negotiation; the first
eligible operator to accept wins the mission; margin and Layer 2 processing revenue stay
invisible to operators, and line splits stay invisible to customers. Success for the
current phase is a demo that runs this path end to end on real Supabase infrastructure.

## Non-goals

- Competitive bidding and BEST MATCH SCORE ranking — retired, deliberately.
- NestJS platform, DJI live operations and React Native apps — documented Phase 1B
  targets with no present code. Do not scaffold them.
- The marketing site. Its source of truth is Replit → [stravyx.com](https://stravyx.com), not this monorepo.
- Enterprise security GA (SSO, MFA, WAF) — deferred, recorded in [docs/DECISIONS.md](docs/DECISIONS.md).

## Constraints

- **Visibility is structural.** Money and full-address exposure are enforced by
  `@stravyx/types` projectors, Edge handlers and RLS. UI-level hiding does not count.
- **Money is integer cents.** No floats in pricing paths.
- **Roles live in `app_metadata`** and `profiles.primary_role`, never `user_metadata`.
- **HubSpot is one-way after persist** and is never a second system of record.
- Marketplace clients reach the API through `packages/api-client` only.
- Phase 1A/2A runtime is Supabase (Auth, Postgres, Edge Functions) plus Next.js on Vercel.

## Architecture notes

Runtime topology and the phase plan live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md);
the schema authority is [docs/data-model-erd.md](docs/data-model-erd.md) (v0.3.1). Accepted
decisions that constrain implementation are in [docs/adr/](docs/adr/) — including
[ADR 0004](docs/adr/0004-governed-autonomous-engineering.md), which adopts this workflow.
