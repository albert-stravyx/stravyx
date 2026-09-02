# Decisions — Stravyx

> **Factory baseline (2 Sep 2026):** Stravyx now uses the consolidated v43 runtime/gateway-agnostic factory. Current operating instructions are `AGENTS.md`, `PROJECT_HANDBOOK.md`, project governance/ADRs, and `docs/factory/CURRENT_BASELINE.md`. Older Cursor-only/v33 migration material is historical unless explicitly referenced.


> Locked choices, rejections, and open questions. ADRs: [docs/adr/](./adr/). Schema rationale: [data-model-erd.md](./data-model-erd.md).

## Locked product decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Dispatch | **First-to-accept** fan-out at fixed Network Price | Confirmed product feedback; bidding retired |
| Pricing display | Single **Network Price** to customer | Two-layer revenue must not leak as line items to customer/operator |
| Money storage | Integer **cents** + currency | Avoid float/numeric drift on 85/15 and L1/L2 |
| Payment schema | Provider-agnostic `provider_*_ref` | Rail not locked (Stripe/Xero/etc. open) |
| CRM boundary | HubSpot **one-way after persist** | CRM is not SoT for licence/pricing/missions |
| Marketing host (1A/2A) | Keep **Replit / stravyx.com** | Forms already live; avoid monorepo migration delay |
| Demo backend | **Supabase Edge now**, NestJS later | Fastest path to working demo on existing project |
| Client API surface | **`packages/api-client` only** | Stable cutover Edge → Nest |
| Roles | **`app_metadata`**, never `user_metadata` | Prevent privilege escalation via client-writable metadata |
| Visibility | Structural (API projectors + RLS) | UI-only hiding is insufficient |
| DJI live-ops | **Cloud API + `manual`**; FH2 deferred | ADR 0005; multi-drone without FH2 seats |
| Agent model roster | v33 canonical profiles: **Auto** (recommended), Economy, Balanced, Full Quality. Runtime/gateway mappings are separated from agent definitions; see [agent-model-assignments.md](./agent-model-assignments.md). | Avoid runtime/provider lock-in while preserving risk floors and independent review. |

## Accepted ADRs

| ADR | Decision |
|-----|----------|
| [0001](./adr/0001-dji-telemetry-unified-types.md) | Unified `packages/types` for cloud + MSDK telemetry paths |
| [0002](./adr/0002-bridge-runtime-nestjs-vs-rust.md) | NestJS/TS for DJI MQTT bridge; Rust only as future hotspot shard |
| [0003](./adr/0003-mobile-cross-platform-vs-native.md) | React Native + Expo custom dev client; DJI native in `packages/dji-msdk` |
| [0004](./adr/0004-governed-autonomous-engineering.md) | Governed autonomous engineering control plane |
| [0005](./adr/0005-flight-provider-cloud-api-only.md) | FlightProvider: **Cloud API only** for DJI live-ops; FH2 deferred; `manual` baseline. Layperson write-up: [dji-live-ops-path-comparison.md](./dji-live-ops-path-comparison.md). DJI vs non-DJI journeys: [dji-vs-nondji-operator-journeys.md](./dji-vs-nondji-operator-journeys.md). Challenger findings + fixes: [dji-live-ops-challenger-findings.md](./dji-live-ops-challenger-findings.md) |

Status: 0001–0003 accepted for Phase 1 build planning (**implementations not in this repo yet**). 0005 accepted as direction with **open conditions** before MQTT/auto-media production — see [dji-integration-architecture.md](./dji-integration-architecture.md).

## Rejected approaches

| Rejected | Why |
|----------|-----|
| Competitive bidding / BEST MATCH SCORE assignment | Product direction → first-to-accept |
| FlightHub 2 on Live-ops A critical path | Cloud API sufficient for connect + raw L1 (ADR 0005) |
| NestJS-only from day one for the demo | Too slow; Supabase project already live |
| Raw PostgREST from browser for money/missions | Breaks stable contract + visibility firewall |
| HubSpot as system of record | One-way sync only |
| Cloud-only telemetry funnel (operator reads own HUD via WS) | Breaks offline / low-signal flight |
| Source-specific dual telemetry UI types | Drift + duplicate UI |
| Rust bridge as first implementation | Splits TS type contract; workload I/O-bound ~1–2 Hz |
| Flutter mobile | Forks TS monorepo shared packages |
| Full dual-native mobile apps | Triples cost for mostly shared CRUD/realtime UI |
| Expo Go for operator flight app | MSDK needs custom native client |
| Local `stravyx-web` as marketing SoT | Stale vs live Replit site |
| Production security bar in Phase 1A | Explicitly deferred (SSO/MFA/WAF/enterprise tenancy) |

## Important implementation decisions (demo)

| Area | Decision |
|------|----------|
| App shell | Single SPA with role views (not three apps yet) |
| Edge JWT gateway | `verify_jwt: false` at gateway; auth inside handlers / sync secret for HubSpot |
| Lead inserts | Anon insert **without** `.select()` (insert-only RLS) |
| HubSpot trigger auth | Header `x-hubspot-sync-secret` + Vault `hubspot_sync_secret` (**required**) |
| Map config | `NEXT_PUBLIC_MAPTILER_KEY` (no hardcoded keys) |
| Demo role switch | **Retired 2026-08-11** — Account Switch View / `ViewToggle` removed; shell follows `/me` (`app_metadata.role`). Demo uses separate customer / operator / admin logins |
| Auth refresh | Refresh access token before Edge calls; avoid racing refresh that caused intermittent 401s |
| App-web stack (2026-08-22) | Next **16.2.12** + React **19.2.8** in `apps/app-web` to match the FE prototype pin; marketplace API stays on `@stravyx/api-client` |
| Access consent | First-visit Terms/Privacy gate persisted in `localStorage` (`stravyx_access_accepted`) only — not an audit log |
| Emergency Response copy | Private aerial support; unskippable 000 disclaimer; not affiliated with police/fire/ambulance |
| Scheduled datetime | Client overlay on `Job` after create; not persisted on Edge/Postgres yet |
| Media deletion (2026-08-23) | `DELETE /missions/:id/media/:mediaId` — only the assigned operator who uploaded the file, or admin. **Released (delivered) files are immutable for everyone**; an admin-only exception was deliberately not implemented (needs its own approval). DB row is deleted first with a `visibility='held'` predicate as the race guard against a concurrent deliver, then the Storage object; a partial cleanup failure orphans an unreachable object (private bucket) and returns 200 success with `storageRemoved: false` + `cleanup` warning `media_storage_delete_failed` (the row delete did succeed). Failed API calls throw a typed `ApiError` (status/code/detail) from `@stravyx/api-client`; the UI maps stable codes to human messages. **Idempotent (2026-08-23, review round 4):** after mission access + mutate authz pass, an already-absent row returns 200 `{ ok: true, storageRemoved: false, cleanup: media_already_absent }` — a retry, duplicate tab, or lost-response replay converges on success instead of a spurious 404 |
| Storage-cleanup warning is not operator-facing (2026-08-23) | Reviewers split: frontend review wanted the `storageRemoved: false` cleanup warning surfaced to the operator; backend review considered it noise. **Human ruling: no operator-facing notice.** Reasoning: the orphan is unreachable (signed URLs are only minted from `media_files` rows), the file genuinely is off the mission, and the operator has no available action — the message would be unactionable noise. `console.warn` is kept for diagnostics; orphans stay recoverable via the deterministic `storage_path` set difference (see KNOWN_ISSUES). Do not relitigate without new evidence |
| Operator live-job slot (2026-08-23) | Sticky "Current Job" fresh pick is `in_progress ?? accepted` only (policy in `apps/app-web/src/lib/operatorJobSelection.ts`). Flown-not-delivered missions surface in an **Awaiting delivery** dashboard queue instead of hijacking the slot (fixes the 9eab54b regression that hid Mark Complete). A successful deliver closes job details, clears the slot and returns the operator to the dashboard. Slot state is race-hardened (review rounds 3–4): responses apply only through a monotonic fetch gate; a locally-completed pin records a per-mission **monotonic watermark** (`apps/app-web/src/lib/pinnedAtSeq.ts` — `max(existing, seq)`, never lowered) so later fetches are authoritative (can release/revert the pin) while stale in-flight rows can never erase a local completion; slot + queue move atomically via `useOperatorJobSlot` (no value read out of a React updater closure) |
| Operator availability (2026-08-25) | `reoc_profiles.online` is the fan-out source of truth. Signup stays `online=false`. Admin approve does **not** auto-set online. The operator toggle writes `POST /operator/availability` (403 `operator_not_verified` until `verified=true`). `/me` projects `online`; the shell shows ONLINE only when `verified && online`. |
| Pending-review credential freeze (2026-08-25) | While `verification_status=pending_review`, operators cannot replace or confirm documents (409 `credentials_pending_review`). `markPendingDocs` only runs on `rejected` resubmit. Admin approve compare-and-sets `pending_review` → `verified` only when all three required kinds are confirmed. |

## Engineering process

| Area | Decision |
|------|----------|
| Development workflow | **Governed autonomous engineering** — risk-classified FAST/STANDARD/FULL paths, four approval gates, human-only delivery ([ADR 0004](./adr/0004-governed-autonomous-engineering.md)) |
| Orchestrator vs specialists | Default **delegate**. Self-implement in the parent chat only after an in-chat efficiency/cost/quality reason and explicit human yes; no/silence → specialist workflow. Does not waive independent review or delivery gates (`.agent/policy.json` `orchestrator_self_implementation`) |
| Frontend review pairing | After **frontend-engineer** finishes a production frontend slice, **senior-frontend-reviewer** always reviews the diff before COMPLETE. Not waivable on FAST. Reviewer is launched by the parent/orchestrator, never nested under the implementer (`.agent/policy.json` `required_review_pairs`) |
| Rule layering | Template process rules **layered over** Stravyx domain rules in `.cursor/rules/`, not replacing them; Stravyx invariants win on conflict |
| Quality enforcement | Machine-enforced via `.quality/policy.json` — type escapes, suppressions, swallowed exceptions, 600-line files, 80-line Python functions, architecture boundaries |
| Guard scope | `scripts/**` (doc tooling) and vendored `components/ui/**` excluded as non-product code; everything else in scope including tests |
| Existing violations | **Fixed, not waived** — five oversized files split, five type escapes removed, nine placeholder fallbacks corrected. `.quality/exceptions.json` starts empty |
| Architecture boundaries | Started with four boundaries that provably pass; expand incrementally rather than asserting aspirational ones |
| Control-plane runtime | Python 3.12 in `.venv-agent/`; product code stays TypeScript |
| CI | Two independent jobs — `contracts` (pnpm) and `guardrails` (Python) — on `main` + `feature/**` |
| Control-plane `--show` test | Asserts `--show` output matches `.agent/models.json` for whichever profile is active; no longer pins `quality`, since that made merge-blocking guardrails fail on a valid `pnpm models:economy` switch (`AGENTS.md`) |
| Branch convention | Kept `feature/<area>-<intent>`; the template's `feat/*` was edited to match, since CI triggers on `feature/**` |
| Merged-branch cleanup | Delete local and remote `feature/**` branches once they are on `origin/main` **and** CI (`contracts` + `guardrails`) passed on that commit. Remote delete stays a human `git_push` gate; agents must not run `git push --delete`. Never delete `main` or unmerged work. |
| Task/run state | `.agent/current-task.yaml`, `.agent/runs/`, `.agent/locks/*.json`, `.agent/packets/` are gitignored working state, not durable knowledge |

### Rejected

| Option | Why not |
|--------|---------|
| Advisory-only guards | Non-blocking checks get ignored under delivery pressure |
| Dated waivers for existing violations | Cheaper than five refactors, but starts the policy by normalising exceptions |
| Enforcing guards on `scripts/**` and vendored `ui/**` | PDF/ERD tooling and upstream shadcn primitives are not product code; churn there makes re-sync harder |
| Replacing the Stravyx rules with the template rules | Loses the domain layer (Network Price, visibility firewall, first-to-accept) the template knows nothing about |
| Running `scripts/init_project.py` to generate `project.yaml` | The generator drops the type-safety, cross-model-review and metrics blocks; hand-written instead |

## Open / unresolved

See also ERD §15 and [ROADMAP.md](./ROADMAP.md).

| Topic | Status |
|-------|--------|
| Offer fan-out cap / waves | Open (Joel) |
| No-acceptance / all offers expired | Open (Joel + Liz) |
| Payment & payout rail | Open |
| Telemetry store tech | Open (gated on DJI privacy) |
| APP 8 live-ops gate (Consent v4 + DPIA) | Open (Liz + Joel) — close-out: [app8-live-ops-gate-closeout.md](./app8-live-ops-gate-closeout.md). Manual S0 upload not blocked |
| Category / urgency seed SoT | Open |
| IdP long-term | Open |
| Supabase region move (Tokyo → Sydney) | Open |
| HubSpot property ownership / consent | Open with CRM owner |

## Document conflicts to be aware of

- Older **board / MVP timeline** materials may still describe **bidding** — prefer ERD v0.3+.
- ADR/docs describe **four Next.js apps** and NestJS packages that **do not exist** yet — treat as target architecture.
- Gap review “Make fixed” ≠ automatically fixed in `apps/app-web` — re-check eng UI when touching visibility.
