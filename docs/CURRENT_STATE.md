# Current state — Stravyx

> **Factory baseline (2 Sep 2026):** Stravyx now uses the consolidated v43 runtime/gateway-agnostic factory. Current operating instructions are `AGENTS.md`, `PROJECT_HANDBOOK.md`, project governance/ADRs, and `docs/factory/CURRENT_BASELINE.md`. Older Cursor-only/v33 migration material is historical unless explicitly referenced.


> Snapshot for agent handoff. Update when merges change demo readiness. Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md). Roadmap: [ROADMAP.md](./ROADMAP.md).

**Snapshot date:** 2026-08-25  
**Branch at capture:** `feature/operator-availability-verify-lock` (not deployed; verify locally)  
**Unverified on new machine:** live Supabase/Vercel/Replit/HubSpot dashboard state — re-confirm with [DEVELOPMENT.md](./DEVELOPMENT.md) checklist.

## Verdict

Phase **1A/2A working demo is implemented in-repo** and was marked **demo-ready** in [backend-build-plan.md](./backend-build-plan.md) (2026-07-25 progress table). Phase **1B/2C NestJS + full ERD MVP has not started** (no NestJS service in tree).

## Completed work (verified in repository)

### Monorepo harness

- pnpm workspace: `apps/*`, `packages/*`
- Shared `@stravyx/types` (pricing, visibility, mission-authz)
- Shared `@stravyx/api-client` with stable `/api/...` paths + 401 refresh retry
- Vitest contract tests; Playwright BDD scaffold
- GitHub Actions CI — two jobs: `contracts` (pnpm typecheck + contract tests) and `guardrails` (Python control-plane gates)
- CONTRIBUTING + backend build plan + ERD v0.3.1 + ADRs 0001–0005
- Demo runbook + Figma Make gap review
- **DJI live-ops architecture** documented 2026-08-12: [dji-integration-architecture.md](./dji-integration-architecture.md) + [ADR 0005](./adr/0005-flight-provider-cloud-api-only.md) (Cloud API + manual; FH2 deferred; **no NestJS/MQTT code yet**). Challenger follow-up 2026-08-16: [dji-live-ops-challenger-findings.md](./dji-live-ops-challenger-findings.md) (SUPPORT WITH CONDITIONS; A-01/A-02 new BLOCKERs). Operator comparison: [dji-vs-nondji-operator-journeys.md](./dji-vs-nondji-operator-journeys.md)

### Agent control plane (added 2026-08-11, [ADR 0004](./adr/0004-governed-autonomous-engineering.md))

- `project.yaml` + `PROJECT.md` — machine-readable configuration and root brief
- `.agent/` — policy, engineering policy, 23 model assignments, task templates, run/metrics scaffolding
- `.agent/agents/` (27 canonical specialists), `.cursor/skills/` (6 skills), `.cursor/hooks.json` (blocks delivery commands)
- `.cursor/rules/` — universal process rules layered over the Stravyx domain rules
- `.quality/` — policy, toolchain, empty waiver file; four enforced architecture boundaries
- 13 control-plane scripts in `scripts/`, Python 3.12 via `.venv-agent/`
- `tests/control-plane/` — 7 Python unit tests; all five gates green via `pnpm gates`

### Database migrations (`supabase/migrations/`)

| Migration | Purpose |
|-----------|---------|
| `20260725010000_lead_tables.sql` | Academy/operator/contact/enterprise/business leads + insert-only RLS |
| `20260725020000_marketplace_mvp.sql` | Marketplace MVP tables + catalogue seed + RLS |
| `20260725021000_profile_on_signup.sql` | `profiles` from `auth.users` / `app_metadata.role` |
| `20260824030000_sync_profile_role_on_auth_metadata.sql` | Mirror `auth.users.raw_app_meta_data.role` onto `profiles.primary_role` on UPDATE (GoTrue writes app_metadata after INSERT) |
| `20260725022000_fix_api_grants.sql` | `service_role` / `authenticated` grants (fixes “Invalid urgency” class of bugs) |
| `20260725023000_hubspot_lead_webhooks.sql` | pg_net → `hubspot-sync` on INSERT |
| `20260725030000_extra_lead_tables.sql` | `home_owner_leads`, `talent_interests` + triggers |
| `20260728010000_hubspot_sync_secret_header.sql` | Vault secret header for sync authz |
| `20260822121500_media_delivery_pipeline.sql` | Private `mission-media` Storage bucket (50MB file limit) + `media_files` quarantine columns (`visibility` held/released, `byte_size`, `content_type`, `original_name`, `released_at`, `confirmed_at`) + `(mission_id, visibility)` index. RLS on `media_files` stays deny-all (Edge service role is the only accessor). |
| `20260824040000_profile_phone_and_signup_extras.sql` | Additive `profiles` columns: unique `phone_e164`, `company`, `default_location`, `operator_licence_number`, `service_area`. **Not applied on the linked project until a human `db push`.** |
| `20260824180000_operator_verification.sql` | Operator CASA gate (P0.2): `reoc_profiles.arn` / `reoc_number` / `verification_status` / `rejection_reason`; `operator_credential_files`; private Storage bucket `operator-credentials` (10MB, MIME PDF/JPEG/PNG). Trigger keeps demo seed `verified=true`. **Not applied until a human `db push`.** |

### Edge Functions

- `supabase/functions/api` — marketplace REST vertical slice. `index.ts` is the Deno entrypoint (routing, env, auth, `/health`, `/me`, `/pricing/quote`, unauthenticated `POST /signup`); handlers live in `routes/`, with `http.ts` (CORS + JSON), `pricing.ts`, `missionAuthz.ts` and `client.ts` (Supabase client factories) alongside. `POST /signup` uses service-role `createUser` with `app_metadata.role` ∈ {customer, operator} only (never `user_metadata.role`); must be deployed before cloud UI signup works. Operator signup requires format-valid ARN (6–7 digits) and ReOC (`CASA.ReOC.` + 4 digits), creates `organizations` + `reoc_profiles` (`verified=false`, `online=false`, `pending_docs`), and still compensates with `deleteUser` on profile/ReOC failure. `POST /offers/:id/accept` returns 403 `operator_not_verified` unless that offer’s ReOC is `verified=true`. Fan-out still requires `online=true AND verified=true`. Credential routes: `POST /operator/credentials/upload-url`, `POST /operator/credentials/:id/confirm`, `GET /operator/credentials` — upload/confirm are locked with 409 `credentials_pending_review` while `pending_review`. Admin: `GET /admin/operators/pending`, `POST /admin/operators/:reocId/verify` (approve requires all three credential kinds confirmed). `POST /operator/availability` persists `reoc_profiles.online` for verified operators only (approve does not auto-set online). `/me` projects `arn`, `reocNumber`, `verificationStatus`, `verified`, `rejectionReason`, `online` for operators. Operator mission polling also refreshes `/me` so admin verify unlocks the signed-in shell without remount.
- **Media pipeline (added on `feature/media-delivery`)** — `routes/media.ts` + `routes/mediaShared.ts` + `mediaVisibility.ts` (Edge mirror of the `packages/types` media projector, parity-tested): `POST /missions/:id/media/upload-url` (assigned operator/admin; held `media_files` row + signed upload URL), `POST /missions/:id/media/:mediaId/confirm` (verifies the object exists in Storage, persists storage-reported size, sets `confirmed_at`), `POST /missions/:id/deliver` (requires status `flown` + ≥1 confirmed held file; compare-and-set transition to `delivered`, releases media, writes status event, best-effort rollback on release failure), `GET /missions/:id/media` (role-projected metadata + ~10-min signed GET URLs served as attachments; customers only ever see released files, never `storage_path`), `DELETE /missions/:id/media/:mediaId` (added on `feature/media-delivery-fixes`; assigned uploader operator or admin; released files immutable → 409 `media_already_released`; held-only conditional row delete before Storage removal; CORS allow-methods extended to include DELETE). `upload-stub` removed. `POST /missions/:id/status` rejects `delivered` (`use_deliver_endpoint`) — delivery only via the deliver route; `delivered` is only reachable from `flown` (authz helper in package + Edge mirror).
- `supabase/functions/hubspot-sync` — multi-table lead sync, property hardening, required sync secret

### App (`apps/app-web`)

- Next.js **16.2.12** + React **19.2.8** SPA: login, customer book/quote, operator offers/accept/status, admin list
- Role shell follows JWT `/me` only (Account Switch View / `ViewToggle` removed 2026-08-11)
- Access consent (Terms/Privacy) is a first-visit `localStorage` gate before login
- Emergency Response booking requires an unskippable 000 disclaimer; copy is private aerial support, not SES/police
- Scheduled bookings stay on home with a toast; Track is available from Job History and the home banner
- Operator job details are a closable overlay with Google Maps link (fake GPS navigation removed)
- After accept, the operator Mission details Customer Information card shows `profiles.full_name` (demo seed: Demo Customer); unaccepted offers still map to generic "Customer"
- MapTiler env externalized
- Booking location uses MapTiler AU search plus an overlay pin (tap or drag); `createMission` receives that lat/lng, formatted address and suburb — not randomized Sydney coords
- Signup default location / service area pick a MapTiler AU suggestion (`place.label`); Skip still posts `{}`
- Customer accepted copy is **Operator Assigned**; Track header says Live Tracking only after Start Job (`in_progress`)
- Booking duration is a platform 60-minute estimate (not a customer chip); pricing formula unchanged; no site-area billable units
- Admin / customer / operator shells scroll via `h-full overflow-y-auto` / `min-h-0` inside the fixed `AuthenticatedShell` clipper
- Editable pricing tiers UI + mission artifacts UI (recent commits)
- **Real media upload/delivery (on `feature/media-delivery`)** — `MissionArtifacts` does the real per-file flow (upload-url → PUT to signed URL → confirm; 50MB client cap, per-file retry that re-mints the URL after a failed PUT); operator gets "Deliver to customer" once `flown` (disabled until ≥1 confirmed file); customer `TrackJob`/`JobHistory` fetch `listMissionMedia` fresh on view-open and download via short-TTL signed URLs; `delivered` state shown; the TrackJob download panel reloads when the mission-list poll merges `delivered`; the old in-memory blob/`uploadStub` path is deleted
- **Operator delivery-flow fixes (on `feature/media-delivery-fixes`, 2026-08-23)** — upload panel gained a two-step-confirm delete for held files (released rows immutable; deleting the last file re-disables Deliver); the sticky Current Job picks `in_progress ?? accepted` only (pure policy module `lib/operatorJobSelection.ts`) while flown-not-delivered missions live in a new "Awaiting delivery" dashboard queue (reachable after reload); a successful deliver closes job details, clears the slot and lands on a clean dashboard; delivered jobs no longer stay pinned
- **Customer notifications are now live mission-status events** — Notifications tab reads `GET /api/notifications` via `api.listNotifications()` (live-only empty/error/loading states; Sarah Johnson/Oak Street/$420 mocks removed), maps copy with `notificationCopyForStatus`, and keeps unread watermark locally per user.
- **Signup creates a real Auth user, then signs in** — the wizard posts `POST /signup` with `role` customer|operator from the account-type step (`fullName` = first + last) plus step-3 extras (`phone`, `company`, `defaultLocation` for customers; `phone`, `arn`, `reocNumber`, `serviceArea` for operators). Operators cannot skip credentials; invented ARN/ReOC digits are `400 invalid_arn` / `invalid_reoc`. Empty phone is still allowed for this slice (SMS OTP is P0.3); invalid AU mobile is `400 invalid_phone`; a phone already stored as `phone_e164` is `409 phone_already_registered` and the Auth user from that request is deleted. After `createUser`, the handler upserts `profiles.primary_role` because GoTrue applies `app_metadata` too late for the INSERT trigger, then inserts organization + unverified `reoc_profiles`. A failed profile/ReOC write deletes the Auth user so a retry is not blocked by `email_already_registered`. Success no longer signs in as the demo customer. Drone types / years-of-experience stay UI-only (not in `SignupInput`). Track Job has an always-visible Back to Home control (not only after completion). **Cloud signup extras and the verification gate need the Edge `api` function deployed** — this slice does not deploy.
- **Signed-in shells use `/me` identity** — `api.me()` stores `MeProfile` (name, email, phone display, company, default location, operator licence, service area). Customer Account / sidebar / home hero and operator header / profile / verification card show that profile (`Not set` when null), not John Smith or Sarah Johnson. Session reset clears `meProfile`.
- **Dashboards use live jobs or honest empty** — customer Total Spent sums live `Job.totalPrice`; operator Jobs Done / Today / weekly chart derive from completed live jobs using the existing `Math.round(flightFee * 0.85)` earn formula and mission `created_at` / `updated_at` (not `new Date()` on each poll). Rating, Avg Response and Avg Rating are an em dash. Cash-out pending is `$0` (Stripe not connected). Operator Verification tab is **honest pending_docs / pending_review / rejected / verified** (in-app admin, no CASA API). Unverified operators cannot accept jobs (API + UI). Admin shell has a pending-operator queue. Demo seed `operator@demo.stravyx.com` stays `verified=true` so the runbook still works.
- Vercel monorepo config (`vercel.json`)
- Screen components are split by responsibility to stay under the 600-line guard: booking (`BookingPage` + `Booking*Step` + `bookingData`), customer home (`CustomerHome` + sidebar/tab-bar/feed + `customerHomeData`), operator (`OperatorDashboard` + tab/modal components + `operatorMockData`), login (`LoginScreen` + `LoginAuthUi` + per-step forms). Shared tokens live in `theme.ts` / `services.ts`.
- `pnpm typecheck` now covers this package (a `typecheck` script was added; previously only `packages/*` were checked)

### Seed

- `supabase/seed/demo_users.sql` — customer / operator / admin demo accounts (credentials documented in `.env.example` comments — do not copy secrets into chat)

## Docs-only / not implemented in this repo

| Item | Evidence |
|------|----------|
| NestJS `services/api` | Absent from tree; Phase 1B in build plan |
| `packages/realtime`, `packages/dji-msdk`, MQTT bridge | ADRs 0001–0005 + [dji-integration-architecture.md](./dji-integration-architecture.md) only |
| React Native apps | ADR 0003 only |
| Full PostGIS eligibility / approvals registry | ERD target; demo uses simplified eligibility |
| Real payment rail (Stripe/etc.) | ERD provider-agnostic; demo mock pay |
| Split `consumer-web` / `operator-web` / `admin-web` | Gap review P2 |
| Marketing app inside monorepo | Intentionally Replit for 1A/2A |
| Playwright CI vertical slice | Deferred; BDD skips without `PLAYWRIGHT_BASE_URL` |

## Current work (as of capture)

Uncommitted on `feature/operator-availability-verify-lock` (availability persist, live `/me` poll, pending-review upload lock, approve completeness). Not deployed. Human delivery remaining: commit (when asked), `db push` of P0.2 schema if not already applied, `supabase functions deploy api --no-verify-jwt`. P0.3 SMS OTP is next.

## External systems (claimed live — re-verify)

Per [backend-build-plan.md](./backend-build-plan.md) progress (2026-07-25) and later HubSpot conversations:

| Claim | Verify how |
|-------|------------|
| Migrations applied on project `ruzblzcvnayajmnwyjyc` | Supabase dashboard / `list_migrations` |
| Edge `api` + `hubspot-sync` deployed | Functions list + `GET /api/health` |
| HubSpot token + sync secret set | Edge secrets + Vault `hubspot_sync_secret` |
| Replit Secrets point at same Supabase project | Replit secrets / form INSERT smoke |
| Vercel app-web env (`NEXT_PUBLIC_*`) | Vercel project env + redeploy after MapTiler key changes |
| CORS allowlist includes production hosts | Deployed `api` function source / OPTIONS smoke |

## Demo accounts

Emails (public demo names):

- `customer@demo.stravyx.com`
- `operator@demo.stravyx.com`
- `admin@demo.stravyx.com`

Password: see `.env.example` / seed file — **not repeated here**.

## Known incomplete relative to “full MVP”

See [ROADMAP.md](./ROADMAP.md) and [KNOWN_ISSUES.md](./KNOWN_ISSUES.md): NestJS cutover, real payments, DJI live bridge, full ERD tables, production auth hardening, BDD automation.
