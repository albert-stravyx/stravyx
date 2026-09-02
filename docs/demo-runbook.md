# Stravyx — Working Demo Runbook (Phase 1A / 2A)

> **Audience:** Founder / facilitator running the 5-minute marketplace demo  
> **Host:** localhost `apps/app-web` + Supabase project `ruzblzcvnayajmnwyjyc`  
> **Date:** 11 Aug 2026  
> **Branch:** prefer `main` (or the active feature branch from `git status`)

This runbook walks you through starting the app, signing in as customer / operator / admin, booking a Sydney mission, accepting it first-to-accept style, advancing status, and verifying HubSpot lead sync.

---

## 1. What you are demonstrating

| Story beat | What the audience should see |
|------------|------------------------------|
| Customer books | One **Network Price** (not Layer 1 / fee split) |
| Mock pay | Mission becomes `booked` then `dispatched` |
| Operator offer | **Suburb only** + earn amount (no full address, no network price) |
| First-to-accept | Operator accepts → full street address appears |
| Status + upload | Operator advances to flown; upload stub recorded |
| Admin | Full economics (network, flight fee, L2, operator earn, platform fee) + address |
| HubSpot | Marketing lead INSERT → HubSpot contact with `hubspot_contact_id` written back |

**Architecture in one line:** browser → Supabase Auth + Edge Function `api` → Postgres (RLS + visibility firewall). HubSpot is one-way after lead persist via `pg_net` trigger → `hubspot-sync`.

---

## 2. Prerequisites (once)

1. **Repo** checked out on `main` (or the current feature branch).
2. **Node / pnpm** available (`pnpm` via `packageManager` in root `package.json`).
3. **Dependencies installed** from repo root:
   ```bash
   cd <path-to-your-clone>
   pnpm install
   ```
4. **App env file** at `apps/app-web/.env.local` (gitignored). Expected contents:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://ruzblzcvnayajmnwyjyc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable anon JWT>
   NEXT_PUBLIC_API_URL=https://ruzblzcvnayajmnwyjyc.supabase.co/functions/v1
   ```
   - Role shells follow JWT `/me` only (no Account Switch View). Use two browser profiles, or sign out and in between customer / operator / admin.
   - Set `NEXT_PUBLIC_MAPTILER_KEY` for booking/navigation/track maps.
5. **Supabase Edge secrets:** `HUBSPOT_ACCESS_TOKEN` and **required** `HUBSPOT_SYNC_SECRET` (same value in Vault as `hubspot_sync_secret` for pg_net). Required only for the HubSpot beat.
6. Optional: HubSpot portal open in a third tab to show the synced contact.

---

## 3. Demo accounts (seeded)

All passwords: **`DemoPass123!`**

| Email | Role | Notes |
|-------|------|--------|
| `customer@demo.stravyx.com` | customer | Books missions |
| `operator@demo.stravyx.com` | operator | Owns online + verified ReOC; receives offers |
| `admin@demo.stravyx.com` | admin | Sees full mission economics |

Seed script (idempotent): `supabase/seed/demo_users.sql`.

---

## 4. Start the app

From the monorepo root:

```bash
pnpm dev:app
```

Open **http://localhost:3000** (Next.js default).

You should see the Stravyx login screen with demo credentials pre-filled for the customer.

**If login fails:** confirm `.env.local` URL/key match project `ruzblzcvnayajmnwyjyc`, and that you can reach `https://ruzblzcvnayajmnwyjyc.supabase.co`.

**If quote/book fails:** Edge Function `api` must be ACTIVE; smoke check:
```bash
curl -sS 'https://ruzblzcvnayajmnwyjyc.supabase.co/functions/v1/api/health' \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```
Expect `{"ok":true,"service":"stravyx-api",...}`.

---

## 5. Five-minute script (recommended: two browsers)

Use **two browser profiles** (or Chrome normal + Incognito) so customer and operator sessions do not overwrite each other.

### Beat A — Customer books (Browser 1)

1. Go to http://localhost:3000.
2. Sign in as **`customer@demo.stravyx.com`** / `DemoPass123!`.
3. Start a new booking (home → book / service flow).
4. Choose a service (maps to categories such as aerial photography → `aerial_photo`).
5. Enter a **Sydney** address, e.g. `1 Martin Place, Sydney NSW 2000`.
6. Pick urgency **STANDARD** and duration **60 minutes** for a clean `$250` Network Price story.
7. On **Review**, confirm the price label is **Network Price** (not “Total” with a ×1.4 markup). For 60 min standard it should be **$250**.
8. **Confirm Booking** (mock pay). Toast / tracker should show the mission; status moves toward **dispatched** because the online ReOC is fan-out eligible.

**Explain:** Customer only ever sees Network Price. Flight fee, Layer 2, and operator earn are not in the customer payload.

### Beat B — Operator accepts (Browser 2)

1. Open a second profile → http://localhost:3000.
2. Sign in as **`operator@demo.stravyx.com`** / `DemoPass123!`.
3. On the operator board, find the new offer:
   - Shows **suburb** (e.g. Sydney) and **earn** amount.
   - Must **not** show full street address or network / L2 money fields.
4. Click **Accept**.
5. After accept, the UI should reveal the **full address** (`1 Martin Place...`).
6. Advance the mission:
   - Begin / allocate → status `allocated` (UI may say in progress).
   - Mark complete / flown → status `flown`; an **upload stub** is written to `media_files`.

**Explain:** First-to-accept is enforced in the database (unique accepted offer per mission). Other operators would see the offer as taken.

### Beat C — Admin economics (either browser)

Sign out, then sign in as `admin@demo.stravyx.com` (or use a third browser profile).

Confirm the mission row shows:
- Network price (~25000 cents / $250)
- Flight fee, Layer 2, operator earn, platform fee
- Full address

**Explain:** Admin projection is the only surface that combines money + address. This is the visibility firewall.

### Beat D — HubSpot lead path (optional but powerful)

1. Insert a test lead (SQL editor or marketing form once Replit points here). Example already proven:
   - Table: `contact_leads`
   - Trigger `hubspot_sync_on_insert` → Edge Function `hubspot-sync`
2. In Supabase, the row’s `hubspot_contact_id` should populate within a few seconds.
3. In HubSpot, search that email; custom properties `stravyx_lead_table` / `stravyx_lead_id` should be set.

**Explain:** CRM is never system of record for missions or pricing — one-way sync after Postgres persist.

---

## 6. Single-browser shortcut

If you only have one window, sign out between roles (the shell follows JWT `/me`, not an in-app switcher):

1. Log in as **customer**, book the mission, then **Log Out**.
2. Log in as **operator**, accept and complete, then **Log Out**.
3. Log in as **admin**, show economics.

Prefer two browser profiles so customer and operator sessions stay live together.

---

## 7. What “good” looks like (checklist)

- [ ] Customer login works with seeded password  
- [ ] Review shows **Network Price** only  
- [ ] Create mission returns dispatched (offer created for online ReOC)  
- [ ] Operator list is suburb + earn only before accept  
- [ ] Accept reveals full address  
- [ ] Status → flown + media stub row exists  
- [ ] Admin sees full split + address  
- [ ] (Optional) Lead → HubSpot contact id written  

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Sign-in error | Wrong project / anon key | Fix `.env.local` |
| Quote works, book fails “Invalid urgency” | Old grant bug (should be fixed) | Confirm migration `20260725022000_fix_api_grants` applied |
| Operator sees no offers | ReOC offline / unverified, or no mission | Ensure operator seed ReOC `online=true, verified=true`; re-book as customer |
| Accept 409 | Already taken | Reset missions or book a new one |
| HubSpot 500 / no contact id | Missing `HUBSPOT_ACCESS_TOKEN` / `HUBSPOT_SYNC_SECRET` / Vault `hubspot_sync_secret`, or custom props | Set Edge + Vault secrets; header `x-hubspot-sync-secret`; properties `stravyx_lead_*` already created |
| Wrong role shell after login | Signed in as a different demo user | Sign out and use the matching seeded account (`customer@` / `operator@` / `admin@`) |
| Stale missions on board | Prior smoke tests | Truncate missions/offers (keep users) or book fresh |

Reset marketplace board (keeps users/catalogue) — SQL:

```sql
truncate table
  public.media_files,
  public.payments,
  public.mission_status_events,
  public.mission_offers,
  public.mission_locations,
  public.missions
restart identity cascade;
```

---

## 9. Talking points (30 seconds each)

1. **Same contracts later:** Edge Functions today; NestJS can replace the runtime without rewriting `packages/api-client`.
2. **Money in cents:** `$250/hr × equipment × urgency × hours` → integer cents; no float FX surprises.
3. **Visibility firewall:** not a UI-only hide — API projectors + RLS; customer never receives fee fields.
4. **HubSpot boundary:** leads land in Postgres first; CRM follows.

---

## 10. Out of scope for this demo (say so if asked)

- Live payment rail (mock hold only)  
- DJI / FlightHub telemetry  
- PostGIS eligibility (fan-out is “all online verified ReOCs”)  
- Google OAuth  
- NestJS / Sydney region migration  

Marketing forms on Replit now insert into this Supabase project and sync to HubSpot (Beat D can use a live form or SQL insert).

---

## 11. Quick reference

| Item | Value |
|------|--------|
| App | http://localhost:3000 |
| Start | `pnpm dev:app` |
| Supabase | `https://ruzblzcvnayajmnwyjyc.supabase.co` |
| API | `.../functions/v1/api` |
| HubSpot sync | `.../functions/v1/hubspot-sync` |
| Password | `DemoPass123!` |
| Plan doc | `docs/backend-build-plan.md` |
| Seed users | `supabase/seed/demo_users.sql` |

---

*Stravyx Pty Ltd — Confidential — Demo runbook Phase 1A/2A*
