# Debugging history — conversation archive

> Incidents and root causes copied from chats. Living table: [`docs/KNOWN_ISSUES.md`](../../docs/KNOWN_ISSUES.md).  
> **No secret values.** Tokens pasted in chat must be rotated; they are not repeated here.

**Archive rebuilt:** 2026-08-22.

---

## Source conversations (primary)

| Title | Id |
|-------|-----|
| [Marketing website form sync](32ea0fc4-8590-40ea-bdc2-d716965198f4) | `32ea0fc4` |
| [Backend integration for users](9301a4c5-1562-4524-a9bf-f83d42eeba49) | `9301a4c5` |
| [Vercel deployment environment setup](ee51ac3b-6f50-40e3-8ae7-d4b70995fd4e) | `ee51ac3b` |
| [User dashboard redirection](f35bfd6a-6123-4c57-b831-63a413273f62) | `f35bfd6a` |
| [Frontend app changes review](b8c75d03-7f8b-4e71-8483-c9f6e8d9329d) | `b8c75d03` |
| [Development compliance checklist](0ee5b7a6-063c-4f33-aba0-ce3df398325c) | `0ee5b7a6` |
| [MVP release planning…](e99c31a8-85e3-41f9-9fe5-61cf25b3c9bd) | `e99c31a8` |
| [Replit MCP connection](cbfcf18f-b21e-4de3-8ed3-2e045abdef89) | `cbfcf18f` |
| [Frontend draft review](0f1164c4-269e-40fc-82c9-798d51377539) | `0f1164c4` |
| [Supabase changes overview](fb7d8051-5eec-48c0-a04d-c8a399861cd9) | `fb7d8051` |
| [Remove Switch View](8348c06d-c5cc-40fa-bfc7-33e30ce00cca) | `8348c06d` |

Play Academy (April 2026) magic-link / child-profile incidents are **out of scope**.

---

## Incident log

### 1. HubSpot sync stopped after security hardening

**Chats:** `32ea0fc4`, `0ee5b7a6`, `e99c31a8`

**Quoted:**

> check and test that all the marketing website forms submitted are captured in the backend and synced on hubspot.

> wire the https://replit.com/@jackson322/Stravyx-Main website to the backend and test that the backend sync all the records to hubspot

**Symptoms:** Row in Supabase; `hubspot_contact_id` stays null; HubSpot missing.

**Causes:**

1. pg_net trigger omitted `x-hubspot-sync-secret` after Edge began requiring it.
2. Vault `hubspot_sync_secret` must equal Edge `HUBSPOT_SYNC_SECRET`.
3. Property-error retry regex used **literal backslash-quotes** and never matched HubSpot text — unknown properties not stripped.
4. `HUBSPOT_SYNC_SECRET` briefly optional → unauthenticated sync. **Required again.**

**Fix direction:** migration `20260728010000_hubspot_sync_secret_header.sql`; redeploy `hubspot-sync` + `api`; regex with normal quotes; portal custom properties or safe strip.

### 2. Lead insert “works” but client cannot read the row

Insert-only RLS. `.insert(...).select()` fails for anon. Show success without reading the row.

### 3. “Invalid urgency” on quote / book

Looks like a bad enum. **Actual cause:** missing **`service_role` grants**. Fix: `20260725022000_fix_api_grants.sql`.

### 4. Operator Recent Jobs empty / intermittent API 401

**Chat:** `ee51ac3b`. Edge `/api/missions` 200 then 401. JWT refresh race — not primarily CORS. Refresh token before calls; `apikey` header; `getUser(jwt)`.

### 5. Blank MapTiler maps on Vercel

`NEXT_PUBLIC_MAPTILER_KEY` missing at **build** time. Set in Vercel → **redeploy**. Key was pasted in chat — **rotate**.

### 6. Admin always lands on customer dashboard

**Chat:** `f35bfd6a`. Quoted:

> Make it so that when a customer, operator, or admin user logs in they will be directed to their respective dashboard interfaces.

`viewMode` ignored `/me` when demo switch was on. **Later** Switch View was removed (`8348c06d`).

### 7. Operator accept / complete not reflected for customer

**Chat:** `9301a4c5`. Quoted:

> when the operator accepts the booking it doesn't reflect to the customer. it still says finding operator.

> when the operator has successfully completed a mission, it doesn't reflect under the recent jobs section.

> The fixes both worked. Just another issue - in the admin the urgency always appear as standard…

API + polling/mapping; then join `urgency_tiers` instead of hardcoded `standard`.

### 8. Mission status / upload authz hole

**Chat:** `0ee5b7a6`. Any authenticated user could `POST` status/upload. Fix: assigned operator or admin; `tests/contracts/mission-authz.test.ts`.

### 9. Vercel preview blocked / wrong commit author

**Chats:** `f35bfd6a`, `b8c75d03`. Deployment Protection / Vercel Authentication / allowlist (`albert-axi` vs `albert-stravyx`). Not an app login bug.

### 10. Cannot push `.github/workflows/ci.yml`

OAuth App lacks **workflow** scope. Split the workflow commit or use a scoped token.

### 11. `vercel.json` schema: `rootDirectory`

Must not include `rootDirectory`. Set Root Directory in Vercel UI.

### 12. Replit MCP OAuth failure

`redirect_uris must only contain web uris` — Cursor `cursor://` rejected.

### 13. Sign-out dead on operator UI

Combined with deploy/author issues; also session domain mismatch (`vercel.app` vs `app.stravyx.com`).

### 14. Figma Make fee / address leaks (pre-eng)

**Chat:** `0f1164c4`. Customer Review showed Flight / AI processing split; operator offers could expose full address. Make fixes are **not** a security boundary — projectors + Edge + RLS are.

### 15. HubSpot property writeback / Domain H

**Chat:** `fb7d8051`. Mapper vs portal properties; ERD Domain H synced to live lead tables.

### 16. Switch View impersonation vs API role

**Chats:** `ee51ac3b`, `8348c06d`. UI showed Operator; JWT still customer → empty missions. Product response: **delete Switch View**.

### 17. Orchestrator skipped specialist review

**Chat:** `8348c06d`. Quoted:

> why did you not call the specialist agents?

> even if I approve you to do the task it still needs to be reviewed and challenged by a specialist agent.

Process bug, not product runtime. Policy: self-implement only with explicit approval; still independent review. Live-ops architecture then went through product / architect / **architecture-challenger**.

### 18. Secrets pasted into chat

Treat as exposed and rotate: HubSpot PAT (`9301a4c5`), HubSpot MCP OAuth client secret (`fed4c309`), MapTiler key (`ee51ac3b`). Never re-paste into docs.

---

## Debugging playbooks (short)

### Lead → HubSpot

1. Row in the correct lead table.
2. Edge `hubspot-sync` logs + HubSpot contact by email.
3. `hubspot_contact_id` writeback.
4. Vault + Edge secret match; trigger sends header.

### Marketplace 401 / empty boards

1. Network: Authorization + apikey.
2. Edge logs 401 vs CORS.
3. Sign out/in on the **same** origin as Site URL.
4. Confirm `/me` role matches the UI (no impersonation).

### Blank maps

MapTiler URL `key` param empty → Vercel env + rebuild.

### Role wrong UI

Decode JWT `app_metadata` (not `user_metadata`). Hit `/me`. Switch View must not exist.

---

## Maintenance

New major incident: numbered entry here **and** a row in `docs/KNOWN_ISSUES.md`.
