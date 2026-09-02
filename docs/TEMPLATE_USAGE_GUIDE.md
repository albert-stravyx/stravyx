# Agentic Engineering Template — Comprehensive Usage Guide

> **Factory baseline (2 Sep 2026):** Stravyx now uses the consolidated v43 runtime/gateway-agnostic factory. Current operating instructions are `AGENTS.md`, `PROJECT_HANDBOOK.md`, project governance/ADRs, and `docs/factory/CURRENT_BASELINE.md`. Older Cursor-only/v33 migration material is historical unless explicitly referenced.


## 1. What this template does
This template turns a Cursor repository into a governed engineering workspace where one main chat can delegate to specialist/nested agents and autonomously drive a **bounded, approved task** to an objective completion state.

It is deliberately project-agnostic. The reusable core knows how to plan, scope, test, review, remediate and protect delivery. `project.yaml`, `PROJECT.md`, ADRs and task manifests tell it what your actual project is.

## 2. Core mental model
```text
Human product authority
       |
       v
Task manifest (scope + acceptance + approvals)
       |
       v
Autonomous Orchestrator
       |
       +-- research specialists (read-only)
       +-- implementation specialists (isolated ownership/worktrees)
       +-- test/eval specialists
       +-- accessibility/security/code reviewers
       |
       v
Persisted state + objective gates + finite remediation loop
       |
       v
COMPLETE / BLOCKED
       |
       v
Human delivery decision (commit/push/merge/deploy)
```

## 3. Initialise a project
```bash
python scripts/init_project.py
```
or non-interactively:
```bash
python scripts/init_project.py --profile fullstack-ai --name acme-assistant
```
Then complete `PROJECT.md`. Review `project.yaml`; it is configuration, not generated truth. Change it deliberately when the architecture changes.

## 4. Profiles
Profiles are useful defaults:
- `web-saas`: frontend/UI/accessibility centric.
- `api-backend`: API/domain/testing centric.
- `fullstack`: frontend + backend.
- `ai-application`: AI/backend/evals.
- `fullstack-ai`: web + backend + AI + accessibility/evals.
- `mobile`: mobile specialist enabled.
- `data-ml`: data/ML-oriented defaults.

Do not enable specialists only to collect technologies on a portfolio. Enable them because the project needs those responsibilities.

## 5. Define the project before tasks
`PROJECT.md` should state problem, users, outcomes, non-goals and constraints. Architectural decisions that materially constrain implementation belong in `docs/adr/`.

## 6. Create a task
You can hand-edit YAML, but you do not have to. In the orchestrator chat, state the outcome (or say you want to start a task). The orchestrator asks for missing fields, drafts `.agent/current-task.yaml`, and waits for approval before implementing.

To scaffold the file yourself:
```bash
python scripts/start_agent_task.py
```
Then edit objective, acceptance criteria, allowed paths, forbidden paths, autonomy and approval gates — or let the orchestrator fill a draft from the chat answers.

Good objective: `Allow an authenticated user to export one invoice as PDF.`
Bad objective: `Improve billing.`

Good criteria are externally observable and testable.

## 7. Start the run ledger
```bash
python scripts/autonomous_task.py init
```
This creates `.agent/runs/<TASK-ID>/state.json`.

## 8. Start Cursor
Paste `CURSOR_BOOTSTRAP_PROMPT.md` in a fresh main Cursor chat. Then say:

> Complete the current task autonomously until all applicable gates pass or an approval/blocker is reached. Do not expand scope and do not perform delivery actions.

You normally need only this single primary chat. Specialist chats are internal delegation details. The orchestrator implements in that chat only if it asks and you explicitly approve a self-implement exception; otherwise it delegates.

## 9. Risk and autonomy
Use autonomous production writes for **well-defined, reversible tasks with stable contracts**. Use assisted/manual mode for architecture, authentication/authorisation redesign, risky migrations, money movement, production IAM, destructive operations or ambiguous product behaviour.

Autonomy does not mean unlimited loops. Policy defaults cap iterations, remediation cycles, repeated failures, nesting and parallel writers.

## 10. Parallel work and worktrees
Read-only research can run in parallel freely inside task scope. Concurrent writers require:
1. frozen shared contracts;
2. non-overlapping path ownership;
3. separate Git worktrees;
4. integration and full relevant verification afterward.

Example:
```text
frozen OpenAPI/schema
       |
       +-- worktree/frontend
       +-- worktree/backend
       +-- worktree/tests
       |
       v
integration worktree -> full gates
```

## 11. File locks and scope
For occasional shared paths:
```bash
python scripts/agent_guard.py lock --agent frontend-engineer --path src/ui/widget.tsx
python scripts/agent_guard.py unlock --agent frontend-engineer --path src/ui/widget.tsx
```
Validate changed files before handoff:
```bash
python scripts/agent_guard.py validate-scope --task .agent/current-task.yaml
```

## 12. TDD and BDD
Use TDD primarily for deterministic domain behaviour: write a failing test, implement the minimum correct behaviour, refactor with green tests.

Use BDD for important cross-layer business journeys. Scenarios should describe behaviour, not internal functions.

Example:
```gherkin
Scenario: Customer cannot reserve already allocated inventory
  Given 100 units exist
  And 80 overlap the requested event
  When the customer requests 30
  Then the reservation is rejected
  And the customer is told only 20 are available
```

## 13. Accessibility
When UI exists, target the project's configured accessibility standard. Prefer semantic HTML, keyboard operability, visible focus, correct labels/errors, sensible focus management and automated axe/Playwright checks plus human-style review.

## 14. Security
Treat every trust boundary explicitly: input validation, authentication, authorisation, tenant isolation, secrets, webhooks, dependency risk, logging/PII and rate limits. For AI systems additionally defend against prompt injection, untrusted retrieved content, excessive tool authority and model-output trust.

## 15. AI engineering mode
If AI is enabled, add eval datasets before repeatedly tuning prompts. Use typed outputs/tools, capture a baseline, change one meaningful dimension at a time, rerun evals and turn real failures into regression cases. Deterministic rules should decide deterministic facts.

## 16. Review/remediation loop
Independent reviewers return severity-tagged findings. BLOCKER/HIGH findings prevent completion. The orchestrator delegates a bounded fix to the responsible implementation role, reruns affected tests/evals/reviews and continues until gates pass or loop limits are reached.

## 17. State and evidence
Use:
```bash
python scripts/autonomous_task.py status TASK-001
python scripts/autonomous_task.py gate TASK-001 unit_tests passed --evidence "pytest: 45 passed"
python scripts/autonomous_task.py finding TASK-001 HIGH "Missing tenant boundary check"
```
Detailed outputs belong in `.agent/runs/<TASK-ID>/`; the main chat should summarise rather than reproduce every subagent conversation.

## 18. Completion vs delivery
`COMPLETE` means engineering acceptance is satisfied. It does **not** automatically mean pushed, merged or deployed. Review the final diff/report, then explicitly authorise the delivery action you want.

## 19. CI/CD
Your project should translate local quality gates into CI. Typical PR gates: configuration validation, lint, typecheck, unit/integration tests, critical E2E, accessibility, security scans, AI eval regressions and container/IaC validation when applicable. Main should stay releasable.

## 20. Branching and commits
Prefer trunk-based development with short-lived branches (`feat/...`, `fix/...`, `test/...`, `docs/...`). Use Conventional Commits and one coherent engineering decision per commit. Agents may prepare a commit plan/message but do not commit by default.

## 21. Containers
Containerise where it improves reproducibility/deployability, not by default. Managed databases, serverless functions and local frontend hot-reload often should not be wrapped solely for aesthetic consistency. Record material container/runtime decisions in an ADR.

## 22. Infrastructure
Use IaC and least privilege. Autonomous agents may propose infrastructure but should not apply production changes by default. Require explicit approval for paid resources and configure budget alerts early.

## 23. Example tasks
### Frontend
`Add an accessible filter drawer to the product catalogue without changing the API.`

### Backend
`Add idempotency to POST /payments/webhook using the existing data model.`

### AI
`Improve support-answer groundedness to >=95% on eval/support.jsonl without changing authoritative refund policy.`

### Bug
`Fix duplicate reservation creation reproduced by test case X; do not refactor unrelated booking code.`

## 24. When the orchestrator must stop
- acceptance criteria are ambiguous in a way that changes product behaviour;
- an explicit approval gate is reached;
- same failure exceeds repetition limit;
- required external credential/service is unavailable;
- task scope cannot contain the necessary fix;
- security or data integrity risk cannot be safely resolved inside current authority.

The correct outcome is `BLOCKED` with evidence and the smallest decision required from the human.

## 25. Porting the template
Keep `.cursor/`, `.agent/`, `scripts/`, `docs/TEMPLATE_USAGE_GUIDE.md`, `AGENTS.md`, `CURSOR_BOOTSTRAP_PROMPT.md` and policy files. Replace project-specific source/CI/IaC and regenerate `project.yaml` from an appropriate profile.

## 26. Customise Cursor rules for your stack
The template ships broad optional specialist rules. After initialisation, update rule `globs` to match your repository layout and disable/remove rules that do not apply. For example, the supplied frontend rules assume an `apps/web/` convention; a Vue project in `frontend/` should update those globs instead of forcing the template directory shape onto the project. AI rules are optional and should be activated only when `project.yaml` enables AI or the current task changes AI behaviour.

## 27. Keep template and project responsibilities separate
A useful rule of thumb is: if a change improves how *any* project is engineered, consider upstreaming it to this template; if it expresses product/domain/stack truth, keep it in the generated project. This prevents the reusable control plane from slowly becoming coupled to one application.
