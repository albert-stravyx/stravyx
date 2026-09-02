# Contributing to Stravyx

Start with `COLLABORATION_GUIDE.md`, `PROJECT_HANDBOOK.md`, `PROJECT_GOVERNANCE.md`, `AGENTS.md`, and relevant ADRs. You do not need the AI factory installed to contribute through GitHub.

Before opening a PR, run the project tests/checks that apply to your change and ensure no secrets or factory-local runtime state are staged. Architecture, migration, auth/RLS, infrastructure and other consequential changes require the corresponding approval/review gates.

## Existing project-specific contribution notes

# Contributing to Stravyx (demo → NestJS MVP)

## Branching

- Trunk: `main` (always demo-deployable).
- Work on `feature/<area>-<intent>` (short-lived).
- One concern per PR; prefer **squash-merge**.
- After merge to `main` and CI green on that commit: delete the local and remote feature branch. Remote delete is a human push; do not discard unmerged work.

## Commits

Conventional prefixes: `test:`, `feat:`, `fix:`, `security:`, `chore:`, `docs:`.
Explain **why** in the subject/body. Never commit secrets, `.env`, or HubSpot tokens.

## TDD / BDD

1. Write a failing contract or BDD test first.
2. Implement the minimum to green.
3. Refactor; re-run `pnpm test:contracts`.
4. Visibility leaks are merge-blocking.

## Commands

```bash
pnpm install
pnpm test:contracts
pnpm dev:app
```

## Secrets

- Client: only `NEXT_PUBLIC_*` publishable values (see `.env.example`), including `NEXT_PUBLIC_MAPTILER_KEY`.
- HubSpot + service role: Supabase Edge Function secrets only.
- `HUBSPOT_SYNC_SECRET` is **required** on `hubspot-sync`; callers must send header `x-hubspot-sync-secret`. Store the same value in Vault as `hubspot_sync_secret` for the `pg_net` lead trigger.
- Roles: `app_metadata` — never `user_metadata`.
- Advisors Critical/High clean remains a **manual** pre-demo check (not automated in CI).

## Reference

See [docs/backend-build-plan.md](docs/backend-build-plan.md) for Phase 1 (demo) and Phase 2 (NestJS + full MVP).

