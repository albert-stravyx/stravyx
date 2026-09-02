# Authentication & authorisation — conversation archive

> Quoted turns + distilled rules.  
> Canonical: [`docs/DECISIONS.md`](../../docs/DECISIONS.md), [`docs/KNOWN_ISSUES.md`](../../docs/KNOWN_ISSUES.md), [`.cursor/rules/30-security.mdc`](../../.cursor/rules/30-security.mdc).

**Archive rebuilt:** 2026-08-22.

---

## Source conversations

| Title | Id | Focus |
|-------|-----|--------|
| [Backend integration for users](9301a4c5-1562-4524-a9bf-f83d42eeba49) | `9301a4c5` | Demo auth, `app_metadata`, Edge JWT |
| [Development compliance checklist](0ee5b7a6-063c-4f33-aba0-ce3df398325c) | `0ee5b7a6` | Authz hole; 1A vs zero-trust |
| [User dashboard redirection](f35bfd6a-6123-4c57-b831-63a413273f62) | `f35bfd6a` | Role → dashboard |
| [Vercel deployment environment setup](ee51ac3b-6f50-40e3-8ae7-d4b70995fd4e) | `ee51ac3b` | 401 / token refresh |
| [Frontend app changes review](b8c75d03-7f8b-4e71-8483-c9f6e8d9329d) | `b8c75d03` | Vercel Authentication ≠ app auth |
| [MVP release planning…](e99c31a8-85e3-41f9-9fe5-61cf25b3c9bd) | `e99c31a8` | HubSpot sync secret must stay required |
| [Remove Switch View](8348c06d-c5cc-40fa-bfc7-33e30ce00cca) | `8348c06d` | No client role switch |
| [Project migration documentation](3797e346-62b6-4e44-b5ee-a91f851fe0ba) | `3797e346` | Roles / JWT / insert-only RLS |

Play Academy magic-link chats (April 2026) are **another product** — omitted.

---

## Quoted turns

From [User dashboard redirection](f35bfd6a-6123-4c57-b831-63a413273f62):

> Make it so that when a customer, operator, or admin user logs in they will be directed to their respective dashboard interfaces.

From [Remove Switch View](8348c06d-c5cc-40fa-bfc7-33e30ce00cca):

> remove the switch view from the customer interface that allows user to switch to different role interface.

From [Development compliance checklist](0ee5b7a6-063c-4f33-aba0-ce3df398325c):

> Check if the development is following a loop engineering structure, infrastructure as code, CI pipeline checks for [formatting through post-deployment]…

> fill in the missing gaps but only do so if it's necessary for the current phase of the build.

From [MVP release planning](e99c31a8-85e3-41f9-9fe5-61cf25b3c9bd) (security regression): HubSpot sync must **not** accept unauthenticated requests. Secret restored to required.

---

## Locked rules (do not regress)

### Roles live in `app_metadata` only

- Store role in Auth **`app_metadata`** (mirror `profiles.primary_role`).
- **Never** trust `user_metadata` for privilege — clients can write it.

### SPA follows `/me` only

- After Switch View removal: **no** Account Switch View, no client impersonation of another role.
- Initial dashboard = `/me` role. Demo env flags must not change the JWT the API sees.

### Marketplace auth path

1. Browser signs in via **Supabase Auth** (JWT).
2. App calls Edge Function **`api`** through **`packages/api-client`**.
3. Gateway may use `verify_jwt: false`; **handlers still validate JWT**.
4. Responses are **role-projected** via `@stravyx/types`.

### HubSpot sync is not end-user JWT

- Header **`x-hubspot-sync-secret`**.
- Same value in Edge `HUBSPOT_SYNC_SECRET` and Vault `hubspot_sync_secret`.
- Required — never optional.

### Lead forms: insert-only RLS

- Anon **INSERT** only. Do not `.select()` the inserted row.

### Mission mutation authz

From `0ee5b7a6` gap-fill: `POST /missions/:id/status` and upload stub require **assigned operator** or **admin**. Earlier hole: any authenticated user could mutate status. Contracts: `tests/contracts/mission-authz.test.ts`.

---

## Debugging discoveries (auth)

### Role redirect vs leftover demo switch

**Chat** `f35bfd6a`: Admin login landed on customer UI when `NEXT_PUBLIC_DEMO_ROLE_SWITCH=true` because `viewMode` defaulted to customer.

**Later** `8348c06d`: Switch View **removed** from the product UI. Production should not reintroduce impersonation.

### Intermittent 401 to Edge API

**Chat** `ee51ac3b`: Operator board empty; `/api/missions` alternating 200/401.

**Cause:** JWT refresh race. Refresh **before** Edge calls; send `apikey`; `getUser(jwt)` in Edge; sign out/in on the production origin.

### Vercel Deployment Protection ≠ app auth

**Chat** `b8c75d03`: Preview **BLOCKED** by Vercel Authentication / commit-author allowlist. Fix infra protection separately from Stravyx RBAC.

### Switch View while logged in as the wrong role (historical)

**Chat** `ee51ac3b`: UI flipped to Operator via Switch View but `listMissions()` still used JWT role — empty boards. This is why impersonation was deleted.

---

## Phase 1A vs production zero-trust

**Present for demo:** Supabase Auth, in-handler JWT, RLS, visibility firewall, contract tests.

**Deferred:** SSO/MFA, WAF, rate limits, SBOM, signed artefacts, DR, central IdP. Do not invent Auth0/Cognito packages until scheduled.

---

## Auth URL checklist (from deploy chats)

1. Supabase Auth Site URL + Redirect URLs include the app origin (`https://<host>/**`).
2. Edge CORS allowlist updated **intentionally**.
3. Vercel: `NEXT_PUBLIC_SUPABASE_URL`, anon key, `NEXT_PUBLIC_API_URL`.
4. Confirm Deployment Protection matches the intended audience.

Demo users: `supabase/seed` / demo runbook. Never commit passwords.
