# Project History

## 2026-09-02 — Migrated to AI Software Factory v33
- Replaced the old Cursor-first canonical agent/model control plane with the v33 runtime/gateway-agnostic factory.
- Preserved existing project code, docs, task evidence, quality rules and repository history artefacts.
- Preserved all seven existing Cursor skills and `skills-lock.json`; added portable copies under `skills/project/`.
- Retained current connector declarations for GitHub, Vercel, Supabase, HubSpot, Twilio and Playwright without embedding credentials.
- Left Stripe disabled because existing project docs classify it as a later-phase target.
- Added shared project governance, collaboration guide, portable `AGENTS.md`/`CLAUDE.md`, v33 runtime/gateway switching, local SQLite telemetry/context and production-readiness checks.

See `archive/pre-v33-factory/` for selected superseded control-plane artefacts retained for audit/history.

## 2026-09-02 — Factory v43 consolidation
- Consolidated v34–v42 factory upgrades into a single current baseline without changing Stravyx product invariants.
- Added protected local `.env` loading, consistency audit, complete factory ownership exclusions and project-extension tracking.
- Removed GitHub CI dependencies on ignored factory-local validators while retaining project code-quality/architecture gates.
- Refreshed active project/factory docs and preserved older migration material only as history.
