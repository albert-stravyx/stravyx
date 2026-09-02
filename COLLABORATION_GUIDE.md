# Stravyx Collaboration Guide

## You do not need the AI factory
Clone the repository, install its normal project dependencies, work on a branch and open a pull request. Factory-local routing, telemetry, credentials and model configuration are not required for ordinary collaboration.

## Start here
Read `README.md`, `PROJECT_HANDBOOK.md`, `PROJECT_GOVERNANCE.md`, `CONTRIBUTING.md`, `AGENTS.md`, `docs/CURRENT_STATE.md`, and relevant ADRs.

## Normal development
```bash
pnpm install
pnpm typecheck
pnpm test:contracts
pnpm dev:app
```
Run additional BDD/E2E/security/accessibility checks when your change touches those areas.

## Git/GitHub
Use short-lived `feature/<area>-<intent>` branches. Keep diffs within approved scope. Do not commit secrets or `.agent/local/` runtime state. Open a PR and satisfy required CI/governance/review checks before merge.

## AI tools
If you use Codex, Cursor, Claude Code, VS Code/Copilot or another agent, give it the repository-owned rules. `AGENTS.md` is the portable entry point; Claude Code also gets `CLAUDE.md`. Portable project skills are in `skills/project/`; Cursor-compatible copies remain in `.cursor/skills/`.

## Consequential changes
Architecture boundaries, database migration application, auth/RLS, infrastructure/IAM, payments/pricing, secrets, production writes and destructive operations are human-gated. Follow `PROJECT_GOVERNANCE.md` and the relevant ADR/runbook.

## MCP connectors
Connector declarations are retained for GitHub, Vercel, Supabase, HubSpot, Twilio and Playwright. Each collaborator authenticates through their own approved runtime/environment. Do not add credentials to the repository.
