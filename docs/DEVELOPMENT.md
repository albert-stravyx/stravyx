# Development — Stravyx

> **Factory baseline (2 Sep 2026):** Stravyx now uses the consolidated v43 runtime/gateway-agnostic factory. Current operating instructions are `AGENTS.md`, `PROJECT_HANDBOOK.md`, project governance/ADRs, and `docs/factory/CURRENT_BASELINE.md`. Older Cursor-only/v33 migration material is historical unless explicitly referenced.


> How to run, test, and ship. Conventions: [CONTRIBUTING.md](../CONTRIBUTING.md). Security rules: `.cursor/rules/30-security.mdc`.

## Prerequisites

| Tool | Version / notes |
|------|-----------------|
| Node | **22** in CI; use 20+ locally (prefer 22) |
| Next.js (app-web) | **16.2.12** (React **19.2.8**) |
| pnpm | **9.15.0** (`packageManager` in root `package.json`; Corepack OK) |
| Git | Feature branches from `main` |
| Python | **3.12+** in `.venv-agent/` — required for the agent control plane and `pnpm gates` |
| Optional | Supabase CLI; Python 3 + `.venv-pdf` (`fpdf2`) for PDF scripts |

The control plane needs 3.10+ language features. A system `python3` of 3.8 will fail with syntax
errors, so keep it in its own venv rather than relying on whatever `python3` resolves to.

## First-time setup

```bash
pnpm install
# apps/app-web/.env.local is pre-created in packaged templates; after a Git clone, run ./factory init
# or copy the tracked browser-safe example:
cp apps/app-web/.env.example apps/app-web/.env.local
# Fill NEXT_PUBLIC_* values (anon key, MapTiler, etc.) — never commit this file
pnpm typecheck
pnpm test:contracts
pnpm dev:app
```

Control plane (once per machine):

```bash
python3.12 -m venv .venv-agent    # .venv-agent/ is gitignored
pnpm gates                        # runs all five quality gates
```

Open http://localhost:3000.

## Environment variable names (no values)

### App / client (`apps/app-web/.env.local`)

| Name | Purpose |
|------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable anon key |
| `NEXT_PUBLIC_API_URL` | Edge functions base (…`/functions/v1`) |
| `NEXT_PUBLIC_MAPTILER_KEY` | Maps (required at Vercel **build** time) |

### Tooling / ops (not for browser)

| Name | Where |
|------|--------|
| `SUPABASE_PROJECT_REF` | Local tooling |
| `HUBSPOT_ACCESS_TOKEN` | Supabase Edge secrets |
| `HUBSPOT_SYNC_SECRET` | Edge secrets; **same value** in Vault as `hubspot_sync_secret` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never client |
| `PLAYWRIGHT_BASE_URL` | Enables BDD suite |

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev:app` | Next.js dev server |
| `pnpm build:app` | Production build |
| `pnpm test:contracts` | Visibility / pricing / authz Vitest |
| `pnpm test` | All Vitest |
| `pnpm test:bdd` | Playwright (skips without base URL) |
| `pnpm typecheck` | Recursive typecheck (`packages/*` + `apps/app-web`) |
| `pnpm lint` | Recursive lint if present |
| `pnpm gates` | Project-owned quality/architecture/control-plane guardrails (`scripts/quality_check.py`); does not require the local factory |
| `pnpm models:show` | Print the active specialist model profile |
| `./factory routing <agent> --profile full_quality --risk Rn --complexity N` | Inspect Full Quality routing for a task |
| `./factory routing <agent> --profile economy --risk Rn --complexity N` | Inspect Economy routing for a task |

### Control-plane commands

Run these with `.venv-agent/bin/python`:

| Command | Purpose |
|---------|---------|
| `scripts/risk_classify.py` | Six risk questions → FAST / STANDARD / FULL path |
| `scripts/start_agent_task.py` | Create `.agent/current-task.yaml` from `.agent/tasks/TEMPLATE.yaml` |
| `scripts/autonomous_task.py` | Drive a task through gates and record the run ledger |
| `scripts/agent_guard.py` | Check a proposed action against `.agent/policy.json` |
| `scripts/code_quality_guard.py` | Type escapes, suppressions, size limits, sensitive fallbacks |
| `scripts/architecture_guard.py` | Dependency boundaries from `.quality/policy.json` |
| `scripts/metrics.py` | Legacy project engineering telemetry helper; canonical factory telemetry is `.agent/local/factory.db` |
| `./factory audit` / `scripts/validate_v43.py` | Current local factory consistency and baseline validation |
| `scripts/registry_check.py` | Logical alias/provider ID resolution and optional live gateway inventory validation |
| `scripts/model_router.py` | Auto/Economy/Balanced/Full Quality routing without runtime-specific frontmatter rewrites |
| `scripts/build_judge_packet.py` | Compact Other Model judge packet under `.agent/packets/` |

Task state (`.agent/current-task.yaml`, `.agent/runs/`, `.agent/locks/*.json`, `.agent/packets/`) is **local and
gitignored** — it is working state, not durable knowledge. Durable outcomes belong in the docs.

### Test suites

| Path | Runner | Command |
|------|--------|---------|
| `tests/contracts/` | Vitest | `pnpm test:contracts` |
| `tests/bdd/` | Playwright | `pnpm test:bdd` (skipped without `PLAYWRIGHT_BASE_URL`) |
| `tests/control-plane/` | Python unittest | part of `pnpm gates` |

The Python suite is discovered with `-s tests/control-plane -t tests/control-plane` so it never
collides with the TypeScript suites. Note the directory name contains a hyphen, so it cannot be
imported as a package — do not switch the discovery root to the repository root.

### Verifying the Edge function locally

`pnpm typecheck` does not cover `supabase/functions/**` (Deno, JSR imports). To typecheck it:

```bash
DENO_DIR=tmp/denocheck/cache npx --yes deno@2.5.3 check supabase/functions/api/index.ts
```

Three pre-existing errors remain from untyped PostgREST embedded relations; they are unrelated to
handler logic and also present before the module split. Generating Supabase database types would
remove them.

## Branching & commits

- Trunk: `main` (keep demo-deployable).
- Branches: `feature/<area>-<intent>` (short-lived).
- Prefer **squash-merge**.
- After the branch is on `origin/main` **and** CI (`contracts` + `guardrails`) is green on that merge commit: delete the local branch (`git branch -d`) and the remote branch (`git push origin --delete …`). Remote delete remains a human `git_push` gate — see `.cursor/rules/70-git-workflow.mdc`.
- Conventional prefixes: `test:`, `feat:`, `fix:`, `security:`, `chore:`, `docs:`.
- Never commit secrets, `.env*`, HubSpot tokens.

## TDD / BDD expectations

1. Write a failing contract or BDD test first for behaviour changes.
2. Implement minimum to green.
3. Visibility leaks are **merge-blocking**.
4. Schema/RLS changes: prefer tests + manual Supabase advisors Critical/High check before demo.

## Working with Supabase

- Migrations: `supabase/migrations/` — additive preferred.
- Seed: `supabase/seed/demo_users.sql`.
- Functions: `supabase/functions/api`, `supabase/functions/hubspot-sync`.
- After function logic changes: deploy via Supabase CLI or dashboard/MCP; git alone does not update cloud.
- The `api` function must stay `verify_jwt = false` at the gateway (`supabase/config.toml` `[functions.api]`, or `supabase functions deploy api --no-verify-jwt`). Auth is inside handlers. A JWT-required gateway 401s logged-out signup.
- After migration that changes Vault/trigger secret wiring: confirm Vault + Edge secret still match.

## Working with HubSpot sync

Lead tables (marketing → Postgres → HubSpot):

| Table | Typical form |
|-------|----------------|
| `academy_enquiries` | `/academy` |
| `operator_leads` | `/for-operators` |
| `contact_leads` | `/contact` |
| `enterprise_leads` | `/enterprise` |
| `business_leads` | `/free-flight` |
| `home_owner_leads` | Home owners |
| `talent_interests` | About / talent |

Proof: row has `hubspot_contact_id` **and** contact exists in HubSpot.

## Working with Vercel

- Config: `apps/app-web/vercel.json` (install/build from monorepo root).
- Set all `NEXT_PUBLIC_*` on Production **and** Preview.
- After adding/changing MapTiler key: **trigger a new build** (env is inlined at build time).

## Working with Replit marketing

- SoT: live [stravyx.com](https://stravyx.com) / Replit app (historically `jackson322/Stravyx-Main` — **verify**).
- Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` only for forms.
- Do not point agents at stale local `stravyx-web`.

## Demo smoke (5 minutes)

Follow [demo-runbook.md](./demo-runbook.md): customer book → operator accept → status/upload → admin economics → optional HubSpot lead.

## Coding conventions (practical)

- TypeScript strict at root; shared domain logic in `packages/types`.
- Prefer role projectors in `visibility.ts` over ad-hoc response shaping in UI.
- Keep Edge CORS allowlist intentional when adding domains.
- Do not add NestJS/DJI packages unless Phase 1B kickoff is explicit.
- Avoid editing unrelated files; do not commit PDF churn unless requested.
- Source files cap at **600 lines**, Python functions at **80** ([.quality/policy.json](../.quality/policy.json)). Split by responsibility, not by line count.
- `scripts/**` (doc tooling) and `apps/app-web/src/stravyx/components/ui/**` (vendored shadcn) are excluded from the guard. Do not widen the exclusions to dodge a finding — fix the code or file a reviewed waiver in `.quality/exceptions.json`.

## New-machine verification checklist

1. `pnpm install && pnpm typecheck && pnpm test:contracts`
2. `python3.12 -m venv .venv-agent && pnpm gates`
3. `.env.local` present with working anon key + API URL
4. `pnpm dev:app` login as each demo role
5. `GET {API}/api/health` OK
6. Book → accept → status path works
7. Confirm Edge secrets exist (names above) without pasting values into docs/chat
8. Optional: one marketing form INSERT → `hubspot_contact_id`
9. Confirm Vercel/Replit still wired if deploying
10. `agent models` → reconcile `.agent/models.json` (slugs there are CLI-unverified)
