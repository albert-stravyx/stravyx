# Implement Feature
1. Load task manifest and relevant ADRs/rules.
2. Confirm acceptance criteria and allowed paths.
3. Create/confirm BDD scenario for customer-visible behaviour.
4. Acquire locks for files/paths that will be edited.
5. Write failing tests for deterministic behaviour where appropriate.
6. Implement the minimum change.
7. Refactor only within approved scope.
8. Run targeted tests, type checks/lint, security/accessibility checks as applicable.
9. Run `python scripts/agent_guard.py validate-scope --task .agent/current-task.yaml`.
10. Release locks and hand off for independent review. Frontend production diffs always go to `senior-frontend-reviewer` next (`.agent/policy.json` `required_review_pairs`); the parent/orchestrator launches that review — do not nest it under `frontend-engineer`.
Never commit/push/deploy unless separately authorised.
