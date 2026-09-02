# AGENTS.md — Stravyx portable agent entry point

This repository uses the v43 consolidated AI Software Factory baseline (runtime/gateway agnostic since v33). The project rules below apply regardless of Cursor, Codex, Claude Code, VS Code/Copilot, or another compatible runtime.

## Read first
1. `PROJECT_HANDBOOK.md` — current project state and repository map.
2. `PROJECT_GOVERNANCE.md` and `PROJECT_POLICY.json` — binding safeguards and machine policy.
3. `PROJECT.md`, `project.yaml`, `docs/PROJECT_CONTEXT.md`, `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`.
4. Current `.agent/tasks/` artefacts and relevant ADRs under `docs/adr/`.
5. `COLLABORATION_GUIDE.md` for Git/GitHub collaboration.

## Stravyx non-negotiables
- Never commit secrets or customer data.
- Visibility firewall is structural: `@stravyx/types` projectors + API/Edge + RLS; never UI-only.
- Roles come from `app_metadata` / `profiles.primary_role`, not `user_metadata`.
- Marketplace browser code uses `packages/api-client` for business operations.
- HubSpot is one-way after persist and is never a second system of record.
- Dispatch is first-to-accept; retired bidding/BEST MATCH SCORE language is not authoritative.
- Prefer ERD v0.3.1 and `docs/backend-build-plan.md` over stale board/Figma language.
- Do not introduce NestJS, DJI or Stripe implementation until the corresponding phase is explicitly approved.
- Commit, push, merge, deploy, production mutation, destructive operations and infrastructure apply remain human delivery gates.
- High-risk work requires independent cross-family review, rollback/recovery evidence and human understanding.
- Frontend production diffs require `senior-frontend-reviewer`.

## Skills
Portable project skills live in `skills/project/`. Cursor-compatible copies remain in `.cursor/skills/`. `skills-lock.json` is preserved. Use the portable path unless the active runtime specifically requires Cursor skill discovery.

## MCP/tool connectors
Current connector declarations are in `config/mcp/registry.json` and `config/mcp/project-connectors.json`. GitHub, Vercel, Supabase, HubSpot, Twilio and Playwright are retained. No credentials are stored in the repo. Stripe remains disabled until its approved project phase.

## Factory usage
Use `./factory runtime detect`, `./factory switch --auto`, `./factory gateway list`, `./factory doctor`, and `./factory production-check` as needed. Exact gateway model IDs and credentials are environment configuration, not repository data.

## Durable project references
- `docs/AGENT_HANDOFF.md`
- `docs/DEVELOPMENT_STRATEGY.md`
- `docs/data-model-erd.md`
- `docs/backend-build-plan.md`
- `docs/demo-runbook.md`
- `docs/QUALITY_GOVERNANCE.md`
- `docs/CODING_STANDARDS.md`
- `.quality/policy.json`

When this file conflicts with project governance or a newer accepted ADR, the stricter/current project rule wins.
## Universal orchestrator entry point
For substantial project work, the canonical human entry point is `./factory orchestrate "<objective>"`. When launched this way, activate `.agent/agents/autonomous-orchestrator.md` as the controlling agent and preserve all project governance, routing, review, MCP and skill policies.



## Runtime-neutral project factory extensions

When present, `agents/project/`, `skills/project/`, and `teams/project/` contain project-owned software-factory extensions. They supplement but never override canonical project governance, risk floors, security/privacy requirements, independent review or human approval gates.
## v42 control plane

For substantial software changes, use the runtime-neutral v42 control plane (`config/control-plane.json` / `factory control-plan`) so execution follows dependency-ready DAG phases, phase-scoped context, least-privilege capabilities, deterministic gates, isolated writers, and bounded verification/replan. Review agents should receive isolated diff/spec evidence rather than an unrestricted repository dump.

## Current factory baseline

The current local factory baseline is v43. Run `./factory audit` after upgrades or when drift is suspected. Historical manifests and old runtime-specific documents do not override repository governance or this current baseline.
