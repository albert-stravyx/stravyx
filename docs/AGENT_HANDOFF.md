# Agent handoff — Stravyx

> **Factory baseline (2 Sep 2026):** Stravyx now uses the consolidated v43 runtime/gateway-agnostic factory. Current operating instructions are `AGENTS.md`, `PROJECT_HANDBOOK.md`, project governance/ADRs, and `docs/factory/CURRENT_BASELINE.md`. Older Cursor-only/v33 migration material is historical unless explicitly referenced.


> **Start here** on a new computer or Cursor account. Future agents will not see prior chats.

## What this project is

Stravyx marketplace **Phase 1A/2A demo**: Next.js app + Supabase (Auth, Postgres, Edge Functions) + HubSpot one-way lead sync. NestJS / DJI live ops / RN mobile are **documented targets**, not present code. DJI Live-ops A direction is locked in [dji-integration-architecture.md](./dji-integration-architecture.md) + [ADR 0005](./adr/0005-flight-provider-cloud-api-only.md) (Cloud API + manual; FH2 deferred) — still **no MQTT/NestJS packages in tree**. DJI vs non-DJI operator journeys: [dji-vs-nondji-operator-journeys.md](./dji-vs-nondji-operator-journeys.md).

This repository runs a **governed autonomous engineering** workflow ([ADR 0004](./adr/0004-governed-autonomous-engineering.md)): risk-classified work, four approval gates, machine-enforced quality, and commit/push/deploy reserved for humans.

Read in order:

1. [CURSOR_BOOTSTRAP_PROMPT.md](../CURSOR_BOOTSTRAP_PROMPT.md) — paste into a fresh main chat to run as orchestrator
2. [project.yaml](../project.yaml) — machine-readable stack, enabled agents, autonomy and delivery policy
3. [.agent/policy.json](../.agent/policy.json) — delegation limits, remediation caps, human gates
4. [DEVELOPMENT_STRATEGY.md](./DEVELOPMENT_STRATEGY.md) — FAST/STANDARD/FULL paths, completion vs delivery
5. [AGENTS.md](../AGENTS.md) — operating contract plus Stravyx non-negotiables
6. [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)
7. [CURRENT_STATE.md](./CURRENT_STATE.md)
8. [ARCHITECTURE.md](./ARCHITECTURE.md)
9. [DECISIONS.md](./DECISIONS.md)
10. [KNOWN_ISSUES.md](./KNOWN_ISSUES.md)
11. [ROADMAP.md](./ROADMAP.md)
12. [DEVELOPMENT.md](./DEVELOPMENT.md)

Then deep-dive as needed: [backend-build-plan.md](./backend-build-plan.md), [data-model-erd.md](./data-model-erd.md), [demo-runbook.md](./demo-runbook.md), [dji-integration-architecture.md](./dji-integration-architecture.md), [docs/adr/](./adr/), [FOUR_GATE_WORKFLOW.md](./FOUR_GATE_WORKFLOW.md), [TEMPLATE_USAGE_GUIDE.md](./TEMPLATE_USAGE_GUIDE.md), [standards/](./standards/).

## Hard rules (short)

- No secrets in git or docs.
- Visibility firewall is structural (`packages/types` + Edge + RLS).
- Roles in `app_metadata` only.
- Marketplace via `packages/api-client` only.
- HubSpot one-way after persist.
- First-to-accept, not bidding.
- Prefer ERD v0.3.1 + backend-build-plan over older board/Make language.
- Do not invent NestJS/DJI packages until Phase 1B starts.
- Marketing SoT = Replit / stravyx.com.
- Commit, push, merge and deploy are **human** gates — never autonomous.
- Do not widen `.quality/policy.json` exclusions or add waivers to make a gate pass.

## Immediate next actions for a new agent

1. Run `git status` / `git log -5` — confirm branch and dirty tree.
2. Create the control-plane venv if missing: `python3.12 -m venv .venv-agent` (see [DEVELOPMENT.md](./DEVELOPMENT.md)).
3. Run `pnpm install && pnpm typecheck && pnpm test:contracts && pnpm gates`.
4. Run `agent models` and reconcile [.agent/models.json](../.agent/models.json) — the current slugs are **unverified** by CLI (recorded in that file).
5. Ensure `apps/app-web/.env.local` exists (use tracked `apps/app-web/.env.example` or run `./factory init`) — values come from local/human configuration, not git.
6. Smoke the demo path ([demo-runbook.md](./demo-runbook.md)).
7. Ask the human to confirm Supabase / Vercel / Replit / HubSpot access on the new account.
8. Pick work from [ROADMAP.md](./ROADMAP.md); classify it with `python scripts/risk_classify.py` before implementing.

## What chat history will not give you

Prior Cursor conversations are **not** available after account/machine migration. Durable knowledge was distilled into this docs set on **2026-08-10**, and the conversation archive was **rebuilt 2026-08-22** (includes Aug 11–19 control-plane, Switch View removal, and DJI Live-ops A / ADR 0005). Anything not written here, in git, or in that archive is lost unless backed up manually.

**Conversation insurance (narrative):** high-value chat decisions and debugging notes live in [`archive/agent-history/`](../archive/agent-history/) (`architecture`, `authentication`, `deployment`, `database-redesign`, `debugging-history`). Prefer the docs above for authority; use the archive when you need *why* / quoted questions / incident history.

## Context maintenance

When you make a durable change, update the matching doc in the same PR/change set:

| Change type | Update |
|-------------|--------|
| Phase / demo readiness | `CURRENT_STATE.md`, maybe `ROADMAP.md` |
| Architecture / new service | `ARCHITECTURE.md`, `AGENTS.md` |
| Product rule / rejection | `DECISIONS.md` |
| Bug/gotcha | `KNOWN_ISSUES.md` |
| How to run/test | `DEVELOPMENT.md` |
| New always-on agent rule | `.cursor/rules/*.mdc` + `AGENTS.md` |
| Stack / enabled agents / autonomy | `project.yaml` |
| Delegation, remediation caps, human gates | `.agent/policy.json` |
| Quality thresholds, exclusions, boundaries | `.quality/policy.json` + `docs/QUALITY_GOVERNANCE.md` |

Rule file: `.cursor/rules/90-context-maintenance.mdc`.

## Manual backup reminder (human)

Agents cannot migrate:

- `.env.local` / Vercel env values / Supabase secrets / HubSpot tokens
- Cursor MCP OAuth connections (HubSpot, Supabase, Figma, Replit, etc.)
- Local git worktrees / unpushed branches
- Replit account access
- Private CSVs under `data/operator-outreach/` (gitignored)

## Migration report index

Produced with this handoff (2026-08-10):

1. **Preserved** — repo docs, ADRs, migrations, Edge source, app, contracts, new handoff docs + Cursor rules.
2. **Unverified** — live cloud secret presence, deployed function versions, HubSpot portal property parity, Replit/Vercel linkage on the new account.
3. **Manual backup** — env/secret values, MCP auth, unpushed work, private outreach data, Cursor user rules/skills outside the repo.
