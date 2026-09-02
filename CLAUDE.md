# Claude Code project bridge

Read `AGENTS.md` first, then `PROJECT_HANDBOOK.md`, `PROJECT_GOVERNANCE.md`, `PROJECT_POLICY.json`, the active task artefacts, and relevant ADRs. The same safeguards apply in Claude Code as in every other runtime. Portable skills are under `skills/project/`. Never weaken human delivery gates, risk floors, independent review, privacy/security controls, or MCP production-write approvals.
## Universal orchestrator entry point
For substantial project work, the canonical human entry point is `./factory orchestrate "<objective>"`. When launched this way, activate `.agent/agents/autonomous-orchestrator.md` as the controlling agent and preserve all project governance, routing, review, MCP and skill policies.



## Runtime-neutral project factory extensions

When present, `agents/project/`, `skills/project/`, and `teams/project/` contain project-owned software-factory extensions. They supplement but never override canonical project governance, risk floors, security/privacy requirements, independent review or human approval gates.
## v42 control plane

For substantial software changes, use the runtime-neutral v42 control plane (`config/control-plane.json` / `factory control-plan`) so execution follows dependency-ready DAG phases, phase-scoped context, least-privilege capabilities, deterministic gates, isolated writers, and bounded verification/replan. Review agents should receive isolated diff/spec evidence rather than an unrestricted repository dump.

## Current factory baseline

The current local factory baseline is v43. Run `./factory audit` after upgrades or when drift is suspected. Historical manifests and old runtime-specific documents do not override repository governance or this current baseline.
