# Governed Autonomous Engineering Strategy

## Purpose
This repository uses a risk-proportional, human-governed autonomous development system. The objective is not maximum agent activity. It is to produce software that is correct, understandable, maintainable, recoverable and reviewable while allowing agents to automate bounded engineering work.

## Who is responsible?
**Human owner:** owns product intent, consequential architecture, security/privacy trade-offs, financial behaviour, production delivery and acceptance of residual risk. Humans remain accountable even when agents perform most implementation work.

**Autonomous Orchestrator:** converts an approved task into the minimum justified workflow, prepares bounded context, **delegates** non-overlapping specialist work, collects evidence, runs remediation loops and stops at approval or safety boundaries. Default is controller-only: intake, classify, bound context, delegate, verify evidence. The orchestrator must not silently implement product slices.

**Exception — self-implement only with in-chat approval.** If the orchestrator judges that doing the slice itself is materially more efficient, cost-effective, or higher quality than nested specialists, it must **ask in this chat**, state the reason (efficiency / cost / quality), and **wait**. Explicit yes → it may implement in the parent chat. Explicit no, or no reply → follow the specialist workflow. That approval does not waive independent review, model-diversity for high-risk work, path/scope limits, or the human delivery gate.

**Specialist agents:** research, design, implement, test, evaluate and review within their declared scope. Reviewers are independent and high-risk reviews use a different model family where available.

## What is the strategy?
The system combines:
1. Risk-proportional FAST, STANDARD and FULL workflows.
2. Human approval before consequential decisions.
3. Product, architecture, program-design and vertical-slice gates when risk warrants them.
4. Existing-pattern-first implementation and strict architecture boundaries.
5. Strong static typing plus runtime validation at trust boundaries.
6. TDD/BDD, contract, integration and E2E testing as applicable.
7. Independent cross-model review for high-risk changes.
8. Bounded autonomous remediation with finite retry limits.
9. Structured, actionable errors rather than hidden failures or fake defaults.
10. Reproducible toolchains, dependency governance and release evidence.
11. Human-controlled commit/push/merge/deploy and production mutations.

## Why use it?
Agentic coding increases throughput but can also amplify misunderstanding, duplicated patterns, weak typing, silent fallbacks and architecture drift. The workflow therefore moves expensive judgement upstream and automates execution downstream. A green test suite is necessary but is not sufficient: maintainability, data ownership, failure behaviour, security and human understanding must remain explicit.

## How does a task choose its workflow?
The risk classifier answers six questions: data harm; auth/payment/permission boundaries; cross-service impact; difficult rollback; weakly understood/tested code; long-term platform constraints.

### FAST
Use for small, local and easily reversible changes. Typical flow: implement -> targeted tests/type/lint -> lightweight independent review. No design artefact should be created merely for ceremony.

### STANDARD
Use for bounded features with meaningful behaviour. Typical flow: concise product brief -> program design -> vertical slices -> verification -> independent review.

### FULL
Use when two or more risk questions are positive, or when a protected domain requires it. Flow: Product Requirements -> human approval -> System Architecture -> human approval -> Program Design -> human approval -> Vertical Slice Plan -> bounded autonomous implementation -> verification -> independent review -> remediation -> final verification -> human delivery gate.

## Design principles
### Existing pattern before new abstraction
Agents search for a suitable existing repository pattern first. A new cross-cutting abstraction must be proposed in Program Design and approved when consequential. Avoid both copy-paste drift and speculative generic frameworks.

### Vertical slices over horizontal layers
Prefer a small end-to-end capability that is runnable, demonstrable and testable. Example: availability domain rule -> typed API -> connected UI state -> browser journey -> failure recovery, rather than building every database/service/UI layer before integration.

### Strict types, no escape-hatch fixes
Do not introduce `any`/`Any`, double assertions, blanket type ignores, fake defaults, swallowed exceptions or unjustified nullable returns merely to make code compile. External input remains unknown until runtime validation creates a trusted domain type. Legitimate nullability must represent an intentional domain state.

### Errors are diagnostic contracts
Expected failures use stable codes and safe user-facing messages. Diagnostics include correlation identifiers, safe context, retryability and suggested remediation. Unexpected exceptions retain causal information in logs and are not converted into success-like values.

### Contracts between independently changing layers
APIs/events/tool schemas are versioned or centrally defined where practical. Consumer/provider contract tests verify that frontend, backend and agent tools agree at runtime. Compile success in two separate components is not proof of compatibility.

### Reproducibility
Pin runtime/tool versions and commit lockfiles. CI and local workflows should use equivalent commands. Dependency changes are reviewed rather than silently introduced by agents.

### Dependency policy
Before adding a package, document the problem, why existing capabilities are insufficient, maturity/maintenance, licence, security and runtime/bundle implications, and alternatives. New production dependencies require approval.

### Feature flags and rollback
Consequential behaviour should be releasable behind a simple typed feature flag where appropriate. Every high-risk task documents rollback/recovery; database changes additionally document forward compatibility and data recovery.

### Performance budgets
Performance requirements are explicit and proportional. Do not optimise without evidence, but do not allow unbounded bundle size, API latency, image weight or AI latency to accumulate unnoticed.

### Test data
Tests use deterministic factories/fixtures/seed data. Production data is not copied into tests. External services use test/sandbox doubles at clear boundaries.

### AI tool authority
Classify AI tools as READ, LOW_RISK_WRITE, CONSEQUENTIAL_WRITE, or FINANCIAL_DESTRUCTIVE. READ may be autonomous; low-risk writes require audit/idempotency where appropriate; consequential writes require explicit confirmation/approval policy; financial/destructive actions require explicit human authorisation. The LLM is never the source of truth for deterministic business facts.

### Idempotency
Consequential commands that can be retried use idempotency keys or equivalent deterministic deduplication at the service boundary. Prompt wording is not an idempotency mechanism.

### Human understanding gate
For HIGH/CRITICAL work, a human must be able to explain entry point, validation, business rule ownership, source of truth, mutation, failure/retry behaviour, observability and rollback before delivery approval.

## Completion vs delivery
Engineering COMPLETE means all applicable acceptance criteria and quality gates pass, architecture/scope drift is absent or approved, unresolved HIGH/BLOCKER findings are zero, and the completion report is generated. COMPLETE does not authorise commit, push, merge, deployment, production data mutation or infrastructure application.

## Completion report
Each significant run should record: workflow path, approved decisions, slices, changed files, type/lint/test/contract/E2E/security/a11y/AI-eval evidence, reviewer/model provenance, resolved and unresolved findings, known limitations, performance evidence, rollback/recovery, human-review targets and follow-up recommendations that were deliberately kept out of scope.

## Complexity budget
Process must be proportional to risk. The Orchestrator should report workflow path, agent count, approvals and expected overhead. If the process is materially more complicated than the change warrants, use a lighter path. Do not add agents, artefacts or tools solely to make the system look sophisticated. A lighter path still means FAST *specialists* (one implementer + targeted checks + lightweight independent review), not an unapproved collapse of implementer and controller into the same chat. Skipping delegation requires the self-implement approval above.

## Worked examples
**Copy change:** FAST; one implementer, targeted checks, lightweight review.

**Date-based catalogue availability:** STANDARD; product intent + program design, domain/API/UI vertical slices, contract test, unit/integration/E2E checks, reviewer.

**AI reserves inventory:** FULL; product/architecture/program-design approvals, explicit tool authority, deterministic availability, idempotent reservation command, audit trail, failure/recovery tests, security and independent cross-model review, human delivery approval.

## Questions the system should always answer
- Who owns this decision and the resulting risk?
- What observable user/business outcome defines success?
- Why is this design preferable to the simplest viable alternative?
- How is input validated and invalid state represented?
- Where is the source of truth?
- How does failure surface and how is it diagnosed?
- How is retry made safe?
- How is the change tested across its actual boundaries?
- How is it rolled back or recovered?
- How can another engineer understand and modify it later?
- Which decisions remain human-only?


## Evidence-driven optimisation

The workflow itself is instrumented. Task lifecycle, workflow selection, planned approvals, unplanned interventions, agent/model runs, review findings, remediation, quality-guard catches and completion outcomes can be recorded as local append-only metrics. Token and cost values are recorded only when supplied by a trustworthy runtime/provider source. After a representative sample (normally 20–50 tasks), optimise measured bottlenecks rather than adding theoretical process. See `ENGINEERING_METRICS.md`.
