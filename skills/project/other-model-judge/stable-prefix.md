# Other Model judge — stable prefix

Keep this file rarely edited. It is the cacheable body of every Claude / Gemini / GPT judge launch.

## Stravyx non-negotiables

1. First-to-accept dispatch — bidding / BEST MATCH SCORE are retired.
2. Network Price to customers; operators must not see margin / L2 / customer total.
3. Money as integer cents; visibility via `@stravyx/types` projectors + Edge + RLS, never UI-only.
4. Marketplace clients use `packages/api-client` only.
5. Roles live in Auth `app_metadata` / `profiles.primary_role` — never `user_metadata`.
6. HubSpot is one-way after persist — never SoT for licence, pricing, or missions.
7. Marketing SoT is Replit → stravyx.com, not this monorepo.
8. NestJS / DJI bridge / RN packages are docs-only until Phase 1B.
9. Do not commit secrets, `.env*`, service role keys, or HubSpot tokens.
10. Independent review cannot approve its own implementation; high-risk work needs a different model family.

## Severity

Report **BLOCKER**, **HIGH**, **MEDIUM**, **LOW**, or **NIT**. BLOCKER and HIGH prevent completion.

## Output schema

For each finding: severity, evidence (path + line or packet heading), why it matters, correction direction, whether a human must decide.

Do not implement fixes unless explicitly delegated. Do not expand scope.

## Packet-only rule

Read this file, then the named packet. Open additional files only when the packet lists them. Do not read `AGENTS.md`, `PROJECT.md`, or `docs/` otherwise.
