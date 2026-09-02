# Stravyx — v43.1 Factory Baseline

Working Phase 1A/2A marketplace demo monorepo. Current application code is Next.js/TypeScript + Supabase Edge/Deno + PostgreSQL, deployed through the Vercel/Supabase architecture described in the project docs. The later NestJS/full-MVP architecture is not current implementation.

## Start here

Humans/agents: `AGENTS.md`, `PROJECT_HANDBOOK.md`, `PROJECT_GOVERNANCE.md`, `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE.md` and relevant ADRs.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:contracts
pnpm dev:app
```

Copy `.env.example` to the appropriate local `.env.local` only when wiring local services. Never commit secrets.

## Current software factory

The optional local factory baseline is **v43** (runtime/gateway agnostic since v33). Use:

```bash
./factory audit
./factory
./factory orchestrate "Implement the approved Stravyx slice"
```

v43 includes the 27 canonical agents, project agents/skills/teams, bounded collaboration, reliability/intelligence, Workspace chat and deterministic DAG/control-plane execution. Factory files/state are not application dependencies and should not be required by GitHub CI or ordinary collaborators.

Current connector declarations: GitHub, Vercel, Supabase, HubSpot, Twilio and Playwright. Stripe remains disabled until its approved project phase. Credentials are environment-local.
