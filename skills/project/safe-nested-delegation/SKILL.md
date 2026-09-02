# Safe Nested Delegation

Use this skill when a parent agent would benefit from delegating independent analysis or bounded test/eval work.

## Preconditions
1. Read `.agent/current-task.yaml` when it exists.
2. Read `.agent/policy.json`.
3. Confirm the proposed child is allowlisted for the parent.
4. Keep total nested depth within `.agent/policy.json` (currently <= 3).
5. Child scope must be a strict subset of the parent scope.

## Default pattern
Prefer A1 read-only delegation:
- `codebase-researcher`
- `test-case-researcher`
- `ai-eval-analyst`

These children may run in parallel.

## A2 pattern
Use `bounded-test-implementer` only from Test Engineer, only after contracts/acceptance criteria are fixed, and only for explicit tests/evals paths with isolated/non-overlapping ownership.

## Never delegate autonomously
Architecture, migrations, dependencies, auth/RLS/security policy, infrastructure/IAM, pricing/payments, destructive operations, production writes, commits, pushes, merges, releases or deploys.

## Handoff
Each child returns:
- evidence/files inspected;
- result/findings;
- commands/tests run;
- uncertainties;
- recommendations (not implemented).

The parent remains responsible for synthesis and cannot treat a recommendation as approval.

## Other Model judges
Before launching `architecture-challenger`, `senior-*-reviewer`, `security-reviewer`, or `ai-eval-analyst`, build a judge packet (`scripts/build_judge_packet.py` / `skills/project/other-model-judge/SKILL.md`) and pass only the stable preamble plus packet path. Nested `codebase-researcher` under those parents returns findings into the packet, not a raw file dump.
