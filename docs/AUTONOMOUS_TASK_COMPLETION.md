# Autonomous Task Completion

> **Factory baseline (2 Sep 2026):** Stravyx now uses the consolidated v43 runtime/gateway-agnostic factory. Current operating instructions are `AGENTS.md`, `PROJECT_HANDBOOK.md`, project governance/ADRs, and `docs/factory/CURRENT_BASELINE.md`. Older Cursor-only/v33 migration material is historical unless explicitly referenced.


## Purpose
This template supports a single primary Cursor chat acting as an autonomous engineering command centre. The user supplies one bounded task. The `autonomous-orchestrator` may research, plan, delegate, implement, test, review, remediate and repeat until the task reaches an objective completion state.

Autonomous completion is **not** autonomous product ownership. The task objective, acceptance criteria, scope, architecture approvals and delivery authority remain human-owned.

## Lifecycle

```text
PLANNING
  -> RESEARCH
  -> CONTRACT_FREEZE
  -> IMPLEMENTATION
  -> VERIFICATION
  -> REVIEW
  -> REMEDIATION (only when needed)
  -> FINAL_VERIFICATION
  -> COMPLETE
```

At any stage an approval gate or repeated failure may transition the run to `BLOCKED`.

## Single-chat workflow
1. Start Cursor Agent in the repository root as **autonomous-orchestrator** (or paste `CURSOR_BOOTSTRAP_PROMPT.md`).
2. State the outcome in one sentence, or just ask to start a task. You do not have to hand-edit YAML first.
3. The orchestrator **asks in chat** for anything missing (outcome, success evidence, in/out of scope, allowed paths, constraints, six risk questions), drafts `.agent/current-task.yaml`, and waits for your approval.
4. Then say: `Complete the current task autonomously until all gates pass or an approval/blocker is reached.`
5. The orchestrator **delegates nested specialists** by default and maintains `.agent/runs/<TASK-ID>/state.json`. It may implement in the parent chat only after asking in this conversation, stating why (efficiency, cost, or quality), and receiving explicit approval; otherwise it must not skip specialists. After `frontend-engineer` finishes a production frontend slice, it must launch `senior-frontend-reviewer` on the diff before COMPLETE (`.agent/policy.json` `required_review_pairs`).
6. When COMPLETE, inspect the completion report and Git diff.
7. Explicitly approve commit/push/PR/deployment separately.

## Safe autonomy
Autonomous implementation is allowed only inside paths listed by the task manifest. Parallel writers require separate worktrees. Shared API/schema contracts must be frozen before concurrent implementation. Review agents do not silently rewrite production code; findings become remediation items owned by the appropriate implementation agent.

## Loop limits
Default policy limits are intentionally finite: 8 implementation iterations, 5 remediation cycles, 2 repeats of the same failure and 3 parallel writers. Repeated identical failures should end in BLOCKED with evidence rather than endless rewriting.

## Human approval gates
Approval remains mandatory for architecture changes, new dependencies/providers, database migration application, RLS intent/auth/IAM/infrastructure changes, paid resources, pricing/payment policy, destructive operations, production writes and delivery actions.

## Completion evidence
A run is complete only when acceptance criteria and applicable gates pass, no BLOCKER/HIGH findings remain, scope validation passes, and `.agent/runs/<TASK-ID>/completion-report.md` exists.
