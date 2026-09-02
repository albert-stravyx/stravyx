# ADR 0004 — Governed autonomous engineering control plane

> **Factory baseline (2 Sep 2026):** Stravyx now uses the consolidated v43 runtime/gateway-agnostic factory. Current operating instructions are `AGENTS.md`, `PROJECT_HANDBOOK.md`, project governance/ADRs, and `docs/factory/CURRENT_BASELINE.md`. Older Cursor-only/v33 migration material is historical unless explicitly referenced.

> **Implementation amendment:** The governance decision in this ADR remains accepted, but the original Template-v5/Cursor-specific mechanisms described below are historical implementation detail. v43 replaces them with runtime-neutral task contracts, protected canonical agents, project extensions, SQLite state, deterministic DAG/control-plane execution and portable project governance. Where old mechanism names conflict with v43, the current baseline wins.


- **Status:** Accepted
- **Date:** 2026-08-11
- **Deciders:** Human owner (product/architecture authority)
- **Context docs:** [`DEVELOPMENT_STRATEGY.md`](../DEVELOPMENT_STRATEGY.md), [`FOUR_GATE_WORKFLOW.md`](../FOUR_GATE_WORKFLOW.md), [`QUALITY_GOVERNANCE.md`](../QUALITY_GOVERNANCE.md), [`AGENTS.md`](../../AGENTS.md)

## Context

Most Stravyx implementation work is performed by AI agents. Agentic throughput is high, but it amplifies the failure modes this repository is least able to absorb: silent architecture drift, duplicated patterns, weakened types, placeholder fallbacks in money paths, and "green tests" standing in for human understanding of the visibility firewall.

Before this change the repository had process knowledge only as prose — `AGENTS.md`, five `.cursor/rules/*.mdc` files and the handoff docs. Prose is advisory: nothing mechanically stopped an agent from adding `any` to a pricing projector, hiding margin in the UI instead of the projector, or committing without review. The only merge-blocking gates were `pnpm typecheck` and `pnpm test:contracts`.

## Decision

Adopt the agentic-engineering-template v5 governed-autonomy control plane, layered **over** the existing Stravyx rules rather than replacing them:

1. **Risk-proportional workflow** — FAST / STANDARD / FULL selected from six risk questions, with four approval gates (product brief → system architecture → program design → vertical slices) applied only when risk warrants them.
2. **Task authority** — one bounded task at a time in `.agent/current-task.yaml`, with binding scope, acceptance criteria and path permissions; evidence accumulates in `.agent/runs/<TASK-ID>/`.
3. **Specialist agents** — 27 canonical definitions in `.agent/agents/` used as context firewalls, with independent cross-model review required for high-risk work.
4. **Machine-enforced quality** — `.quality/policy.json` drives `code_quality_guard.py` and `architecture_guard.py`, blocking type escapes, suppressions, swallowed exceptions, unticketed debt, oversized source units and architecture-boundary violations.
5. **Human delivery gate** — commit, push, merge, deploy, migration apply and production mutation remain human-controlled, enforced by the `beforeShellExecution` hook in `.cursor/hooks.json`.

The Stravyx non-negotiables (visibility firewall, first-to-accept dispatch, roles in `app_metadata`, `packages/api-client` only, HubSpot one-way) remain the product/domain layer and take precedence where the two overlap.

## Why layer rather than replace

The template is deliberately project-agnostic; it knows how to plan, scope, test, review and protect delivery, but knows nothing about Network Price, ReOC operators or the margin firewall. The Stravyx rules are the inverse. Replacing either one loses information, so `.cursor/rules/` now holds both: template rules in previously free numeric slots, Stravyx rules unchanged apart from a merged testing rule and a reconciled Git convention.

## Consequences

**Positive**

- Visibility and architecture rules become machine-checked rather than advisory: `architecture_boundaries` in `.quality/policy.json` fails CI when a component imports the Supabase client directly instead of `@stravyx/api-client`, or when `packages/types` reaches for HTTP or React.
- Completion is defined by evidence, not by an agent's assertion. "COMPLETE" is separate from "delivered".
- Cross-model review is a policy, not a habit — `.agent/models.json` and `validate_model_config.py` keep agent/model assignment honest.
- Local telemetry in `.agent/metrics/` allows the workflow itself to be optimised from a real sample rather than intuition.

**Negative / mitigations**

- Python 3.12 becomes a development prerequisite alongside pnpm. **Mitigation:** `.venv-agent/` is documented in [`DEVELOPMENT.md`](../DEVELOPMENT.md) and CI pins the version; the TypeScript build is untouched.
- The 600-line file and 80-line function limits forced splits of five product files. **Mitigation:** splits were mechanical and behaviour-preserving; public exports and import sites are unchanged.
- Ceremony can exceed the value of a small change. **Mitigation:** the complexity budget in `DEVELOPMENT_STRATEGY.md` requires the lightest justified path, and FAST exists precisely for local reversible work.

## Rejections

- **Advisory-only guards.** Non-blocking checks are ignored under delivery pressure, which is the exact condition this ADR exists to survive.
- **Waiving existing violations.** Dated waivers in `.quality/exceptions.json` would have been cheaper than the five refactors, but would have started the policy in a state that normalises exceptions.
- **Enforcing the guards on `scripts/**` and vendored `components/ui/**`.** PDF/ERD tooling and upstream shadcn primitives are not product code; refactoring them is churn that makes upstream re-sync harder. Both are excluded in `.quality/policy.json`.

## Follow-ups

- Expand `architecture_boundaries` as more invariants are proven safe to assert — the initial set is deliberately limited to boundaries that pass today.
- Review aggregate metrics after 20–50 comparable tasks and optimise the measured bottleneck, per [`ENGINEERING_METRICS.md`](../ENGINEERING_METRICS.md).
- Revisit `project.yaml` agent enablement when Phase 1B starts (mobile, data and AI specialists are currently off because that code does not exist).
