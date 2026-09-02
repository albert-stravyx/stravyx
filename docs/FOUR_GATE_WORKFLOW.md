# Four-gate agentic engineering workflow

This repository moves human judgement upstream. The autonomous zone starts only after the level of design appropriate to the task has been approved.

## Gate 1 — Product requirements
Output: `01-product-brief.md`.
Define user/pain, desired outcome, measurable success evidence, in/out/deferred scope, user experience, constraints, assumptions and acceptance scenarios. Keep implementation ideas out unless feasibility blocks the product decision.

## Gate 2 — System architecture
Output: `02-architecture.md`.
Record component responsibilities, data ownership/source of truth/lifecycle, requests/events/queues, trust boundaries, authentication/authorisation/secrets, retries/idempotency/timeouts/partial failure/recovery, observability, rollout/rollback, alternatives and trade-offs.

## Gate 3 — Program design
Output: `03-program-design.md`.
Record file-tree diff, types/contracts, method signatures, critical call-stack trees, state transitions, structured error model, exact test assertions and proposed vertical slices. No implementation before required approval.

## Gate 4 — Vertical slices
Output: `04-vertical-slices.yaml`.
Implement thin end-to-end, runnable, demonstrable and testable slices. Do not horizontally build all migrations/services/endpoints/frontend before anything works. Review and verify after each slice.

## Proportional governance
- **Small/reversible**: short plan + automated checks + light independent review.
- **Medium/bounded**: combined product/architecture plan + program design + 2–4 slices.
- **Large/consequential**: all four gates, explicit human approvals, incremental rollout and monitoring.
- **Critical/regulated**: all four gates plus security/privacy/rollback/audit/operational sign-off.

### Risk questions
If two or more are `yes`, use the full four-gate process unless a human documents why a lighter path is safe:
1. Could misunderstanding expose, delete or corrupt important data?
2. Does the change cross authentication, payment or permission boundaries?
3. Will multiple services, repositories or teams depend on the decision?
4. Would rollback/recovery be difficult?
5. Is the code poorly understood or weakly tested?
6. Could the change create a long-term platform constraint?

## Human accountability
Agents research, draft, implement and verify. Humans approve consequential product intent, architecture, program design, critical code understanding and production delivery.
