# Stravyx — Project Handbook

## Project at a Glance
Stravyx is a monorepo for the working Phase 1A/2A marketplace demo. The current implemented stack is Next.js/TypeScript, Supabase Edge/Deno, PostgreSQL, Vercel and Supabase. The documented NestJS full-MVP architecture is a later phase, not current code.

## Current Architecture
Browser → Supabase Auth + Edge Function `api` → PostgreSQL with RLS/visibility firewall. Marketing leads persist first, then `pg_net` invokes `hubspot-sync`; HubSpot is secondary and never the system of record. See `docs/ARCHITECTURE.md`, `docs/CURRENT_STATE.md`, and `docs/backend-build-plan.md`.

## Repository Map
- `apps/app-web` — Next.js marketplace UI.
- `packages/types` — shared models, pricing and visibility projectors.
- `packages/api-client` — stable API client boundary.
- `supabase/migrations` — schema migrations.
- `supabase/functions/api` — marketplace Edge REST API.
- `supabase/functions/hubspot-sync` — persist-first lead sync worker.
- `tests/contracts` / `tests/bdd` — contract and Playwright coverage.
- `docs/` — architecture, ADRs, runbooks and current-state documentation.
- `skills/project` — portable project skills; `.cursor/skills` keeps Cursor-compatible copies.

## Important Decisions and Constraints
1. First-to-accept dispatch.
2. Money represented as integer cents.
3. Visibility enforced structurally through projectors + API/Edge + RLS.
4. Roles derive from `app_metadata`, not `user_metadata`.
5. Marketplace browser operations use `packages/api-client`.
6. HubSpot is one-way after persist.
7. Human-controlled commit/push/merge/deploy/production mutation.

## Current Work
Use `docs/CURRENT_STATE.md` and `docs/ROADMAP.md` as the authoritative live status. Existing `.agent/tasks/` evidence from the previous factory has been preserved.

## Integrations / MCP
Retained declarations: GitHub, Vercel, Supabase, HubSpot, Twilio and Playwright. Credentials are intentionally not stored. Stripe remains a future-phase connector.

## Testing / Quality
Run `pnpm typecheck`, `pnpm test:contracts`, project-specific quality gates, and applicable BDD/E2E/security/accessibility checks. v43 factory audit/validation and governance checks are additional local control-plane checks, not replacements for product tests.

## Security / Privacy
Do not place secrets, service-role keys, HubSpot/Twilio credentials, raw prompts, source contents or customer data into telemetry. Production/destructive actions remain gated.

## Where to Find More Detail
Start with `docs/AGENT_HANDOFF.md`, `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/DEVELOPMENT.md`, `docs/KNOWN_ISSUES.md`, and `docs/ROADMAP.md`.


## Current Factory Baseline
v43. See `docs/factory/CURRENT_BASELINE.md`. Project agents/skills/teams are Git-trackable; canonical factory internals and SQLite/control-plane state remain local.
