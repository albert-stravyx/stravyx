# Known issues & technical debt — Stravyx

> **Factory baseline (2 Sep 2026):** Stravyx now uses the consolidated v43 runtime/gateway-agnostic factory. Current operating instructions are `AGENTS.md`, `PROJECT_HANDBOOK.md`, project governance/ADRs, and `docs/factory/CURRENT_BASELINE.md`. Older Cursor-only/v33 migration material is historical unless explicitly referenced.


> Bugs, gotchas, and debt worth knowing before changing code. Update when issues are fixed.

## Critical behavioural invariants (regressions = P0)

1. Customer responses must expose **Network Price only** (no L1/L2 line items).
2. Operator offers: **suburb only** until accept; never customer total / L2 / platform fee.
3. Admin may see full economics + address.
4. Enforce via `@stravyx/types` projectors + Edge — **not** CSS/UI omission alone.
5. Contract tests in `tests/contracts/` are merge-blocking for visibility leaks.

## Debugging discoveries (durable)

| Symptom | Root cause / fix |
|---------|------------------|
| “Invalid urgency” on quote/book | Missing **`service_role` grants** on marketplace tables — migration `20260725022000_fix_api_grants.sql`, not bad enum input |
| HubSpot sync stops after hardening | Trigger/pg_net must send **`x-hubspot-sync-secret`**; Edge requires it; Vault key `hubspot_sync_secret` |
| Lead insert “works” but client can’t read row | **Insert-only RLS** — forms must not `.select()` the inserted row |
| `home_owner_leads` HubSpot writeback fails | Mapper/property mismatch — keep HubSpot properties aligned with `hubspot-sync` |
| MapTiler blank on Vercel (`?key=` empty) | `NEXT_PUBLIC_MAPTILER_KEY` must exist at **build** time; cached builds without the env stay broken until rebuild. Booking/signup geocoding uses the same key. |
| Admin/customer/operator panes could not scroll | Flex ancestors needed `min-h-0`; admin root is `h-full overflow-y-auto` inside `AuthenticatedShell` (`fixed inset-0 overflow-hidden`). |
| Admin lands on customer UI | Fixed 2026-08-11: Switch View removed; shell always follows `/me` role |
| Intermittent 401 to Edge API | Racey auth refresh — refresh token before API calls; avoid overlapping refresh |
| Previous session's operator slot/role visible after a session change | Two complementary rules in `App.tsx` + `sessionScopedReset.ts`: (1) abort poll-effect continuations after every `await` unless `sessionUserIdRef.current` still equals the user id the effect started with (`isSessionContinuationCurrent`) — `cancelled` only flips in cleanup, which is too late to stop a resolved `api.me()` from `setRole` or starting a *new* `refreshLists` that passes the advanced fetch gate; (2) `shouldResetSessionScopedState` is true whenever the two user ids differ, including login (`null → user`); same-user token refresh and `null → null` stay no-reset. `applySessionTransition` remains the **single reset authority**; `handleLogout` only signs out. Do not treat login as hydration, invent a second generation counter, or zero the freshness gate. |
| In-app “Host a Node” / operator apply modal | May still post to placeholder hooks — **live** operator leads come from marketing site forms, not necessarily in-app modal |
| Root `pnpm test:contracts` cannot `import "react"` from `tests/contracts/` | `react` lives in `apps/app-web`. Hook tests may import `@testing-library/react` and an `apps/app-web` `.ts` hook (see `operator-job-slot-hook.test.ts`). Do not import `react` or app-web `.tsx` from the contract file itself — CI failed on `mission-artifacts-download-refresh.test.ts` for that reason. Test the extracted helper instead. |
| Cloud signup UI fails until Functions are updated | Unauthenticated `POST /api/signup` lives on the Edge `api` function. Deploy that function to the linked project before the SPA can create Auth users with `app_metadata.role`. |
| Logged-out `POST /api/signup` returns gateway 401 | Hosted `api` had `verify_jwt: true` (hubspot-sync was already false). The SPA only sent `Authorization` when a user session existed, so the gateway rejected signup before the handler ran. Fix: `[functions.api] verify_jwt = false` plus send the anon key as Bearer when logged out. Redeploy with `supabase functions deploy api --no-verify-jwt`. |
| Demo signup uses Admin `createUser` with `email_confirm: true` | Required so the SPA can `signInWithPassword` immediately without SMTP. This skips email verification and bypasses GoTrue’s built-in `/signup` rate limits. Acceptable for the demo; production needs verification + IP rate limiting. Distinct 409 `email_already_registered` also allows email enumeration. |
| Operator signup landed on the customer shell | GoTrue applies `app_metadata` on a follow-up `UPDATE` of `auth.users`, so `handle_new_user` (AFTER INSERT) stored `profiles.primary_role = customer`. `/me` prefers `primary_role`. Signup now upserts `profiles.primary_role` after `createUser`; if that write fails, the handler deletes the Auth user (`profiles` cascade) so a retry is not stuck on `email_already_registered` with a customer-default profile. Migration `20260824030000_sync_profile_role_on_auth_metadata.sql` also mirrors a later valid role. Apply that migration on the linked project. Existing mis-tagged operator profiles need a one-off `primary_role` update. If compensating `deleteUser` also fails, the orphan remains until an admin deletes the Auth user. |
| Unique AU mobile / signup extras not live in cloud yet | In-repo: migration `20260824040000_profile_phone_and_signup_extras.sql` plus Edge `/signup` and `/me` `MeProfile`. **Human residual:** `supabase db push` of that migration and `supabase functions deploy api` (with `--no-verify-jwt`). Until then, wizard extras will 400/ignore on the hosted API and shells will show empty/`Not set` for phone and extras. |
| Operator Verification pending until admin approve | P0.2 is on `main`; follow-up on `feature/operator-availability-verify-lock`: new operators land `pending_docs` + `online=false`; documents lock during `pending_review`; admin approve requires all three confirmed kinds and does **not** set `online=true`. Fan-out still needs `online=true AND verified=true`, so a newly verified operator must toggle availability (`POST /operator/availability`). Operator poll refreshes `/me` so verify gating updates without remount. Banner and upload lock merge `/me` with the last successful credentials-list snapshot, preferring the fresher source (seq) when statuses disagree; seqs come from one shared monotonic clock, not independent counters. There is still **no CASA live API**. Do not restore the fake “CASA licence valid · 270 days” / ARN `2024-0078415` / auto-verify timeout. **Human residual:** `supabase db push` of `20260824180000_operator_verification.sql` if not applied, and `supabase functions deploy api --no-verify-jwt`. Demo seed operator stays verified+online via trigger (seed file untouched). SMS OTP / verified-phone uniqueness is **P0.3, not this slice**. |
| Operator cash-out pending is $0 | Intentional. Stripe Connect is not wired. Activity shows `$0` not connected. The cash-out **modal UI** remains but cannot withdraw. Do not restore `PENDING_BALANCE` 842 or mock `WEEKLY_EARNINGS`. |
| Operator earn buckets use `missions.updated_at` as completion time | There is no dedicated `flown_at` / `delivered_at`. `offerToJob` maps `createdAt`/`updatedAt` from the operator list (never `new Date()` on poll). Completed jobs use `updated_at` as a proxy. Until hosted `api` is redeployed with those fields, missing timestamps fall back to epoch so they do **not** all land in Today. |

## Known product / eng gaps

### From gap review (P1–P2)

- Mission status **labels** may not match ERD vocabulary end-to-end. Customer `accepted` is now **Operator Assigned** (not En Route); Live Tracking is only for `in_progress` after Start Job. No separate `assessed` / arrived Edge status this slice.
- Booking duration is a platform 60 min estimate on quote + `createMission`; the pricing formula is unchanged. Site polygon / CASA / SMS OTP are out of scope.
- Operator decline, expiry UX, checklist incomplete. (Real raw upload implemented on `feature/media-delivery` — see media pipeline below.)
- Admin dispute / audit CSV / live pricing config incomplete.
- Real auth/legal links (Terms/Privacy still non-href in-app). Switch View was removed 2026-08-11.
- Split apps and Host-a-Node demotion are P2.

### Platform debt

- `apps/app-web` Next config ignores TypeScript errors during builds (`ignoreBuildErrors`) — type safety relies on `pnpm typecheck` in CI. Next 16 dropped `eslint.ignoreDuringBuilds` from `next.config`.
- No root ESLint config for the monorepo.
- `refreshSeqRef` / `refreshGateRef` bookkeeping lives inline in `App.tsx` and is duplicated in `MissionArtifacts.tsx`. The `fetchSequenceGate.ts` primitives are unit-tested, but nothing binds `App.tsx`'s use of them, so a future edit could reintroduce the zeroed-gate defect (see the session-reset row above) without failing a test. Follow-up: extract a `useFetchSequenceGate` hook — as `useOperatorJobSlot` was — so the wiring is `renderHook`-testable and shared.
- Playwright BDD is a placeholder and skipped without `PLAYWRIGHT_BASE_URL`.
- Scheduled booking date/time is kept on the client `Job` only; it is not stored via `CreateMissionInput` / Edge.
- Access consent is `localStorage` only; clearing site data re-prompts.
- Customer push alerts use the browser Web Notification API only (not APNs/FCM/Web Push); no background delivery without an open tab.
- iOS Safari requires Add to Home Screen plus granted notification permission before web notifications can appear.
- Customer notification unread state and push preference are per-browser localStorage values (`stravyx.notifications.seenAt:*`, `stravyx.webNotify.enabled:*`), not server-synced.
- Advisors Critical/High clean is **manual** pre-demo, not CI.
- Demo uses simplified eligibility (online verified ReOC) vs full PostGIS approvals registry.
- Payments are stubs (mock `mock_held`; Stripe Connect test mode is the ratified fast-follow). Media is real as of `feature/media-delivery` — see media pipeline debt below.
- NestJS / DJI / RN packages documented but absent → risk of agents inventing parallel scaffolds.

### Media delivery pipeline (feature/media-delivery, 2026-08-22) — accepted deferrals

Reviewed by senior-backend-reviewer (APPROVED after 2 remediation rounds) and senior-frontend-reviewer (APPROVED after 1). Deliberately deferred with review sign-off:

- **Deliver is not fully transactional.** The flow is: confirmed-held precondition → compare-and-set `flown→delivered` (serialises concurrent delivers) → release media → status event, with a best-effort rollback to `flown` if the release fails. Narrow residual risk: if the release UPDATE commits but the client sees an error (post-commit timeout), the rollback re-holds nothing (media already released) and re-delivery 409s. Real fix (reviewer-suggested): make `/deliver` re-entrant (proceed when already `delivered` with confirmed-held rows remaining; insert the event only when the CAS changed the row) or a Postgres RPC (`deliver_mission_media`) doing all writes in one transaction — needs a migration + human approval.
- **Transition-table tightening is coupled to the above.** Backwards transitions (e.g. `delivered→flown` via the status route) remain allowed and are currently the manual recovery path for a stuck deliver. Do not tighten the transition table without first making deliver re-entrant/transactional.
- **No MIME allowlist** on the `mission-media` bucket or upload-url validation. Mitigated: bucket private, 50MB `file_size_limit`, signed GET URLs force attachment disposition (no inline HTML render). 50MB will be too small for 4K drone video — resumable/TUS upload is post-MVP.
- **`tests/**` has no typecheck project** — contract tests are runtime-checked by Vitest only (root `pnpm typecheck` covers the three workspaces). Adding a tests tsconfig is a small follow-up.
- **Legacy `upload-stub` rows** (if any exist in the deployed DB) are backfilled to `held` with `storage_path` values that point at no real object; `confirmed_at` is null so deliver ignores them, but they'd appear (broken) to operators/admins in media lists. Clean up with a one-off DELETE if they surface.
- **Unreachable defence-in-depth branch** in `missionMutate.ts` (`invalid_status_transition`) — can never fire now that `delivered` is rejected up front; delete or comment on next touch.
- **`media.ts` is at 597/600 lines** — next addition must split by responsibility (upload/confirm vs deliver vs list). (Followed on `feature/media-delivery-fixes`: the delete route went into its own `routes/mediaDelete.ts`.)

### Media delete + operator flow fixes (feature/media-delivery-fixes, 2026-08-23) — accepted deferrals

Fixes four live-testing defects: media delete capability, delivered job stuck in the Current Job slot, deliver not returning to the dashboard, and the 9eab54b regression where stale flown missions hid Mark Complete. Reviewed by senior-backend-reviewer (BLOCKER: CORS lacked DELETE — fixed; HIGH: untested held-only race guard — route contract tests added) and senior-frontend-reviewer (MEDIUM: duplicate rows after reload — reconciliation added). Deliberately deferred:

- **No deletion audit trail.** A deleted `media_files` row leaves only Edge logs (`[media-route]` codes); no `mission_status_events`-style record. Fine for the demo; revisit before production.
- **Partial delete failure orphans a Storage object.** If the row delete succeeds but `storage.remove` fails, the route returns **200 with `storageRemoved: false` and a `cleanup` warning** (`media_storage_delete_failed` — changed from 500 after review round 2: the delete genuinely succeeded from the caller's perspective); the orphaned object is unreachable (private bucket, URLs only minted from DB rows) but occupies storage until an admin cleans it up. Edge logs carry the code, but orphans remain recoverable after log retention lapses: `storage_path` is deterministic, so the orphan set is exactly the difference between the `mission-media` bucket's objects and `media_files.storage_path` values — a one-off reconciliation script can enumerate and remove them at any time.
- **Production data backlog:** the demo operator has ~8 `flown` never-delivered missions on project `ruzblzcvnayajmnwyjyc`. They now sit harmlessly in the Awaiting-delivery queue; if a cleaner demo is wanted, a human can run a one-off `UPDATE missions SET status='delivered' ...` (or deliver/cancel them via UI) — agents must not mutate production data.
- **Operator job selection is covered at two levels.** `tests/contracts/operator-dashboard-freshness.test.ts` covers the pure functions (`operatorJobSelection.ts`, `fetchSequenceGate.ts`, `pinnedAtSeq.ts`): stale-response rejection, dismissal suppression, authoritative cancellation/reversion vs stale-row protection, monotonic pin watermark, and the atomic slot+queue transition. React update-queue timing — the class of defect found in review round 3, which no pure test can reach — is covered against the real hook by `tests/contracts/operator-job-slot-hook.test.ts`, running under `happy-dom` + React Testing Library (approved dev-deps, DOM scoped per-file via a `// @vitest-environment happy-dom` docblock so the other contract suites stay on node).

### Docs drift risk

- Board slides / early MVP docs vs ERD first-to-accept.
- Demo runbook still mentions branch `feature/harness-monorepo` — current work may be on other feature branches; prefer `main` + active feature branch from `git status`.
- Absolute local paths in older docs will be wrong on a new computer.

## Engineering control plane / local factory

- **`pnpm typecheck` does not cover `supabase/functions/**`.** Deno + JSR imports are outside the pnpm workspace. Typecheck the Edge graph separately when changing it. The previously observed upstream JSR/npm graph issue remains a dependency/tooling concern until verified against the currently pinned environment.
- **Pre-existing Edge/PostgREST type gaps may remain** where embedded relations were inferred as arrays without generated database types. Generating and consuming Supabase database types is the preferred durable fix.
- **Live factory model execution is local configuration.** The distributable intentionally leaves enabled provider model IDs unresolved and does not include a Requesty/OpenRouter/LiteLLM credential. Use verified provider IDs plus local secrets, then run `./factory production-check --live`. This is not a product-code blocker and must not be solved by committing credentials/model guesses.

## Security notes (non-secret)

- Never put HubSpot token or service role in the browser / Replit client beyond anon key.
- Rotate MapTiler key if it was ever hardcoded in client history (**verify** whether rotation already done).
- `data/operator-outreach/*.csv` is gitignored (PII/phones) — do not force-add.
- `.env.local` and `.vercel` are local/deploy artifacts — back up manually, never commit.

## Unverified on migration

Mark these as **needs live confirmation** after move:

- Whether all seven lead tables currently succeed HubSpot writeback in production HubSpot portal
- Exact deployed Edge function versions vs git `main` / feature branch
- Whether Vercel production env includes MapTiler + correct API URL
- Whether Replit still points at project `ruzblzcvnayajmnwyjyc`
