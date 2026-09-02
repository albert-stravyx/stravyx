# Stravyx migration to AI Software Factory v33

Date: 2 September 2026

## What changed
- Replaced the old Cursor-first canonical model/agent control plane with the v33 runtime/gateway-agnostic factory.
- Preserved application code, Supabase assets, tests, docs, ADRs, project-specific quality rules and historical task evidence.
- Preserved all 7 existing Cursor skills under `.cursor/skills/` and created runtime-neutral copies under `skills/project/`.
- Preserved `skills-lock.json` (102 catalog entries).
- Retained MCP connector declarations for GitHub, Vercel, Supabase, HubSpot, Twilio and Playwright. No connector credentials are stored in the repository.
- Kept Stripe disabled because existing project documentation treats it as a future-phase integration.
- Added shared `AGENTS.md`, `CLAUDE.md`, `PROJECT_HANDBOOK.md`, `PROJECT_GOVERNANCE.md`, `PROJECT_POLICY.json`, `COLLABORATION_GUIDE.md` and v33 GitHub governance checks.
- Updated CI and the project quality toolchain to use v33 portability/production regressions instead of obsolete Cursor model/frontmatter validators.
- Archived selected superseded pre-v33 control-plane artefacts under `archive/pre-v33-factory/`.

## Validation completed
- v33 validator: PASS
- v32 production regression tests: PASS
- v33 portability regression tests: PASS
- Project control-plane tests: PASS (14 tests)
- Code-quality guard: PASS
- Architecture guard: PASS
- Project governance check: PASS
- Factory doctor: PASS

## Environment setup still required
The distributable intentionally contains no gateway credentials or provider secrets. `factory production-check` currently reports two expected deployment blockers until configured:
1. Resolve the 14 enabled logical model aliases to exact IDs for the chosen gateway.
2. Provide the selected gateway credential (Requesty is the current default adapter).

After environment configuration, run:

```bash
./factory registry --live
./factory production-check --live
```

Product TypeScript/Vitest tests were not re-run during packaging because `node_modules` is not included in the uploaded archive. Install dependencies with `pnpm install --frozen-lockfile` before normal project verification.
