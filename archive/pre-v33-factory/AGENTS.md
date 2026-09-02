# AGENTS.md — Stravyx monorepo

Guidance for AI agents working in this repository. Prefer durable docs over chat history.

This repository uses **governed autonomous engineering**: human judgement upstream, bounded
autonomy downstream. Sections are ordered deliberately — the universal operating contract sets
*how* work happens, the Stravyx non-negotiables set *what is true here*. Where they overlap,
the Stravyx rules win.

## Universal agent operating contract

1. Read `PROJECT.md` / `project.yaml`, `.agent/policy.json`, `.agent/models.json`, the current task and approved gate artefacts before implementation.
2. Intent precedes implementation. Do not turn an ambiguous request directly into code when governance requires product/architecture/program-design approval.
3. Apply the four gates proportionally: Product Requirements → System Architecture → Program Design → Vertical Slices.
4. The task objective, acceptance criteria, in/out scope and path permissions are binding. Decompose scope; never expand it.
5. Use subagents as context firewalls. Child context must be current, bounded and approved. The orchestrator delegates implementation by default. Self-implement in the parent chat only after stating an efficiency/cost/quality reason in chat and receiving explicit human approval; otherwise follow the specialist workflow (`.agent/policy.json` `orchestrator_self_implementation`).
6. High-risk implementation must receive independent cross-model review where a different model family is available. Frontend production diffs always require `senior-frontend-reviewer` after `frontend-engineer` (`.agent/policy.json` `required_review_pairs`); the parent/orchestrator launches that review as a sibling of the implementer.
7. Concurrent writers require separate worktrees, non-overlapping ownership and frozen shared contracts.
8. Strong type checking is mandatory. Do not silence type errors with broad `any`, unchecked casts, blanket ignores or disabled compiler rules.
9. Errors must be actionable and safe: stable code, clear message, correlation id where applicable, retryability, safe diagnostic context, suggested action. Internal logs retain the causal chain without leaking secrets to clients.
10. Tests include failure paths. Passing tests are necessary but do not replace architecture/maintainability/human review.
11. Finite remediation only. Repeated identical failure becomes BLOCKED with evidence.
12. Commit, push, merge, release, deploy and production/infrastructure/destructive actions remain explicit human delivery gates.
13. Never bypass hooks, scope validation, strict type checks, test thresholds or reviewer findings to manufacture completion.

### Risk-proportional workflow

Use FAST, STANDARD or FULL as defined in [docs/DEVELOPMENT_STRATEGY.md](docs/DEVELOPMENT_STRATEGY.md). Never create ceremony disproportionate to task risk. New production dependencies require approval. High-risk work requires rollback/recovery evidence and a human-understanding gate. Independently changing boundaries require contract tests. Start a task with `python scripts/risk_classify.py`; run gates with `pnpm gates`.

### Metrics discipline

- Preserve local engineering telemetry in `.agent/metrics/` so the workflow can be optimised from evidence.
- Never record secrets, source contents, customer data or prompt bodies in metrics.
- Record token/cost values only when the runtime supplies them; never fabricate estimates.
- Planned approval gates are not `human_intervention` — use that event only for unplanned help.
- Do not optimise a metric by weakening tests, review, type safety, accessibility, security or scope controls.
- Review aggregates after 20–50 comparable tasks, not after one noisy run.

## Read first

1. [docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md) — start here after a machine/account migration
2. [CURSOR_BOOTSTRAP_PROMPT.md](CURSOR_BOOTSTRAP_PROMPT.md) — paste into a fresh main chat to run as orchestrator (it will ask for task YAML fields in chat if the manifest is missing)
3. [PROJECT.md](PROJECT.md) + [project.yaml](project.yaml) — brief and machine-readable project configuration
4. [docs/DEVELOPMENT_STRATEGY.md](docs/DEVELOPMENT_STRATEGY.md) — workflow paths, design principles, completion vs delivery
5. [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) — product purpose and business rules
6. [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) — what is implemented vs docs-only
7. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — runtime topology and phase plan
8. [docs/DECISIONS.md](docs/DECISIONS.md) — locked choices and rejections
9. [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — how to run, test, and ship
10. [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — bugs, debt, gotchas
11. [docs/ROADMAP.md](docs/ROADMAP.md) — next priorities
12. [archive/agent-history/](archive/agent-history/) — optional narrative insurance from prior chats (not a substitute for the docs above)

Canonical deep references (do not duplicate blindly):

| Topic | Source of truth |
|-------|-----------------|
| Schema / domains | [docs/data-model-erd.md](docs/data-model-erd.md) (v0.3.1) |
| Backend phases / demo DoD | [docs/backend-build-plan.md](docs/backend-build-plan.md) |
| Demo script | [docs/demo-runbook.md](docs/demo-runbook.md) |
| ADRs | [docs/adr/](docs/adr/) (incl. [0005 FlightProvider / Cloud API](docs/adr/0005-flight-provider-cloud-api-only.md)) |
| DJI live-ops architecture | [docs/dji-integration-architecture.md](docs/dji-integration-architecture.md) |
| DJI live-ops challenger findings (layperson) | [docs/dji-live-ops-challenger-findings.md](docs/dji-live-ops-challenger-findings.md) |
| DJI vs non-DJI operator journeys | [docs/dji-vs-nondji-operator-journeys.md](docs/dji-vs-nondji-operator-journeys.md) (HTML pack: [docs/stravyx-live-ops-briefings.html](docs/stravyx-live-ops-briefings.html)) |
| Contributing / secrets | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Approval gates | [docs/FOUR_GATE_WORKFLOW.md](docs/FOUR_GATE_WORKFLOW.md) |
| Coding standards | [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md), [docs/standards/](docs/standards/) |
| Errors and type safety | [docs/ERROR_AND_TYPE_SAFETY.md](docs/ERROR_AND_TYPE_SAFETY.md) |
| Quality policy | [docs/QUALITY_GOVERNANCE.md](docs/QUALITY_GOVERNANCE.md), [.quality/policy.json](.quality/policy.json) |
| Operating manual | [docs/TEMPLATE_USAGE_GUIDE.md](docs/TEMPLATE_USAGE_GUIDE.md) |

## Non-negotiables

1. **Do not commit secrets** (`.env`, HubSpot tokens, service role keys, private keys).
2. **Visibility firewall is structural** — use `@stravyx/types` projectors + Edge/API + RLS. Never hide money/margin only in the UI.
3. **Roles live in `app_metadata`** (and `profiles.primary_role`) — never `user_metadata`.
4. **Clients use `packages/api-client`** for marketplace REST. Do not call PostgREST for money/mission business logic from the browser.
5. **HubSpot is one-way after persist** — never a second system of record for licence, pricing, or mission state.
6. **First-to-accept dispatch** — bidding / BEST MATCH SCORE are retired (older board docs may still say bidding; prefer ERD).
7. **Prefer ERD v0.3.1 + backend-build-plan** over Figma Make field names or outdated MVP bidding language.
8. **Do not invent NestJS / DJI / Stripe packages** until Phase 1B is explicitly started — those are documented targets, not present code.
9. **Marketing site SoT is Replit → [stravyx.com](https://stravyx.com)** — not a local `stravyx-web` sibling and not this monorepo for Phase 1A/2A.
10. **Update handoff docs** when durable decisions, architecture, or current state change ([docs/AGENT_HANDOFF.md](docs/AGENT_HANDOFF.md) § maintenance).

## Repo map (implemented)

| Path | Role |
|------|------|
| `apps/app-web` | Next.js 14 marketplace demo UI (SPA under `src/stravyx/`) |
| `packages/types` | Shared models, pricing, visibility projectors, mission authz |
| `packages/api-client` | Stable `/api/...` REST client |
| `supabase/migrations` | Lead + marketplace MVP schema |
| `supabase/functions/api` | Marketplace Edge REST |
| `supabase/functions/hubspot-sync` | Lead → HubSpot worker |
| `supabase/seed` | Demo users |
| `tests/contracts` | Visibility / pricing / authz Vitest contracts |
| `tests/bdd` | Playwright (skipped without `PLAYWRIGHT_BASE_URL`) |
| `tests/control-plane` | Python unittest suite for the agent guards |
| `docs/` | Board, ERD, plans, ADRs, handoff docs, engineering standards |
| `scripts/` | PDF / ERD render helpers **and** the agent control plane |
| `.agent/` | Policy, model assignments, task manifests, run ledger, metrics |
| `.quality/` | Quality policy, toolchain gates, waivers |
| `.cursor/agents` | 23 specialist subagent definitions |

## Commands

```bash
pnpm install
pnpm test:contracts
pnpm typecheck
pnpm dev:app

pnpm gates            # all control-plane quality gates
pnpm models:show      # active specialist model profile
pnpm models:quality   # flagship / performance roster
pnpm models:economy   # Cursor-first / sustainable roster
```

The control plane needs **Python 3.12** in `.venv-agent/`:

```bash
/usr/local/bin/python3.12 -m venv .venv-agent
.venv-agent/bin/python scripts/quality_check.py
```

Copy `.env.example` → `apps/app-web/.env.local` (values never committed). See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Cursor rules

Project rules live in `.cursor/rules/`. Stravyx domain rules and universal engineering rules are layered; the Stravyx layer wins on conflict.

**Stravyx layer**

- `00-project-context.mdc` — always-on product/architecture context
- `10-development-standards.mdc` — tooling / monorepo / phase discipline
- `20-testing.mdc` — contract gates plus TDD/BDD practice
- `30-security.mdc` — secrets, RLS, visibility, authz
- `90-context-maintenance.mdc` — keep handoff docs current

**Universal layer**

- `01-agent-authority.mdc` — scope and approval authority
- `02-engineering.mdc` — boundaries, contracts, ADR discipline
- `15-code-quality.mdc` — anti-slop contracts and the guards
- `21-frontend.mdc` / `22-design-system.mdc` / `23-accessibility.mdc` — `apps/app-web` scoped
- `50-security.mdc` — general trust boundaries
- `70-git-workflow.mdc` — branching and commit discipline; delete merged `feature/**` branches after CI on `main` is green (remote delete remains a human `git_push` gate)
- `80-code-review.mdc` — independent review expectations
- `95-ai-engineering.mdc` — dormant until `project.yaml` enables AI
