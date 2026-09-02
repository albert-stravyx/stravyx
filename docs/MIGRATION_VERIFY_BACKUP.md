# Migration verify & backup checklist

> **Historical migration evidence:** Developer-local paths in this document are snapshots from the original migration and are intentionally non-portable. They are not current setup instructions; use `docs/factory/CURRENT_BASELINE.md`.

> Use this when moving to a new computer / Cursor account.  
> **Never paste secret values into git, chat, or this file.**  
> Related: [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) · [DEVELOPMENT.md](./DEVELOPMENT.md)

**Project ref (public):** `ruzblzcvnayajmnwyjyc`  
**Supabase URL (public):** `https://ruzblzcvnayajmnwyjyc.supabase.co`

---

## A. What could not be verified — step-by-step checks

### A1. Supabase — migrations applied

**Goal:** Confirm every repo migration exists on the live project.

**Expected migration versions (from `supabase/migrations/`):**

1. `20260725010000` — lead tables  
2. `20260725020000` — marketplace MVP  
3. `20260725021000` — profile on signup  
4. `20260725022000` — API grants  
5. `20260725023000` — HubSpot lead webhooks  
6. `20260725030000` — extra lead tables  
7. `20260728010000` — HubSpot sync secret header  

**Option 1 — Dashboard**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project `ruzblzcvnayajmnwyjyc`.
2. Go to **Database → Migrations** (or **SQL → migration history** depending on UI).
3. Tick each version above as **Applied**.
4. If any are missing: do **not** invent SQL — apply from repo with CLI (below) or known migration files only.

**Option 2 — CLI (from repo root)**

```bash
# Link once (uses project ref; will prompt for access token)
npx supabase link --project-ref ruzblzcvnayajmnwyjyc

# List remote migration history
npx supabase migration list
```

Compare **Local** vs **Remote**. All seven should show on both sides.

**Option 3 — SQL proof of objects**

In **SQL Editor**, run:

```sql
-- Lead tables
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'academy_enquiries','operator_leads','contact_leads','enterprise_leads',
    'business_leads','home_owner_leads','talent_interests'
  )
order by 1;

-- Marketplace core
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles','organizations','reoc_profiles','missions','mission_locations',
    'mission_offers','mission_status_events','payments','media_files',
    'urgency_tiers','pricing_configs','mission_categories','equipment_classes'
  )
order by 1;
```

Expect **7** lead tables and the marketplace set above.

**Pass criteria:** All seven migration versions present; lead + marketplace tables exist.

---

### A2. Supabase — Edge Function deploy versions

**Goal:** Confirm `api` and `hubspot-sync` are deployed and healthy.

1. Dashboard → **Edge Functions**.
2. Confirm functions named **`api`** and **`hubspot-sync`** exist and are **Active**.
3. Open each → check **last deployed** time vs your last known good commit on the branch you care about.
4. Health check (no secrets):

```bash
curl -sS "https://ruzblzcvnayajmnwyjyc.supabase.co/functions/v1/api/health"
```

Expect JSON roughly like `{ "ok": true, ... }`.

5. Optional — compare deployed source to git:
   - Dashboard → function → source, **or**
   - `npx supabase functions download api` / `hubspot-sync` into a temp folder and `diff` against `supabase/functions/`.

**Repo tip:** `hubspot-sync/index.ts` header comments mention version notes (`v4` mapping behaviour). Treat dashboard “version number” as deploy generation, not necessarily that comment.

**Pass criteria:** Both functions Active; `/api/health` OK; source matches the git revision you intend to run.

---

### A3. Supabase — Edge secrets + Vault `hubspot_sync_secret`

**Goal:** Confirm secret **names** exist (do not export values into notes casually).

#### Edge Function secrets

1. Dashboard → **Project Settings → Edge Functions → Secrets**  
   (or per-function secrets UI if shown).
2. Confirm these **names** exist:

| Secret name | Required for |
|-------------|--------------|
| `HUBSPOT_ACCESS_TOKEN` | `hubspot-sync` → HubSpot API |
| `HUBSPOT_SYNC_SECRET` | `hubspot-sync` auth header check |
| `SUPABASE_SERVICE_ROLE_KEY` | Often used by functions (confirm if set for this project) |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Sometimes auto-injected — confirm project docs/UI |

3. **Do not** screenshot values into chat/git. If backing up, store in a password manager only.

#### Vault secret (for pg_net trigger)

1. Dashboard → **Database → Vault** (or SQL).
2. Confirm a secret named **`hubspot_sync_secret`** exists.
3. **Critical:** Its value must **equal** Edge secret `HUBSPOT_SYNC_SECRET` (same string). If they diverge, INSERTs will hit the function and get rejected.

**SQL check (existence only, not value):**

```sql
select name, created_at
from vault.secrets
where name = 'hubspot_sync_secret';
```

**Functional proof (recommended):**

1. Insert a throwaway lead on a staging/test email via marketing form or SQL as `anon`/`authenticated` path you normally use.
2. Confirm row gets `hubspot_contact_id` populated within ~1 minute.
3. Delete/cleanup the test contact in HubSpot if needed.

**Pass criteria:** Named secrets present; Vault name exists; a test lead writeback succeeds.

---

### A4. HubSpot — property parity for all 7 lead tables

**Goal:** Every property `hubspot-sync` may send either **exists** on Contact, or is safely stripped/retried by the function.

#### Tables to cover

| Supabase table | `lead_type` / `form_source` |
|----------------|-----------------------------|
| `academy_enquiries` | Academy enquiry |
| `operator_leads` | ReOC / operator interest |
| `contact_leads` | General enquiry |
| `enterprise_leads` | Enterprise / dock |
| `business_leads` | Free flight claim (business) |
| `home_owner_leads` | Homeowner |
| `talent_interests` | Talent / careers |

#### Properties the worker may set

**Shared / base**

- Standard: `email`, `firstname`, `lastname`, `phone`, `company`, `city`, `description`
- UTM (if present on row): `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- Custom (expected): `stravyx_lead_id`, `lead_type`, `form_source`, `onboarding_status`

**Per table (custom unless noted)**

| Table | Extra properties |
|-------|------------------|
| `academy_enquiries` | `academy_state`, `academy_current_status`, `academy_timeline`, `academy_qualifications` |
| `operator_leads` | `operator_licences_held`, `operator_service_area`, `raw_contact_value` |
| `contact_leads` | `contact_topic`, `contact_message` |
| `enterprise_leads` | `enterprise_industry`, `enterprise_sites_count`, `enterprise_need` |
| `business_leads` | `abn`, `raw_contact_value` |
| `home_owner_leads` | `homeowner_need` (+ `description`, `city` for suburb) |
| `talent_interests` | `talent_area_of_interest`, `talent_linkedin_url`, `talent_note` |

#### How to verify in HubSpot

1. HubSpot → **Settings → Properties → Contact properties**.
2. Search each custom name above.
3. Missing customs: either **create** them (text/string, contact object) **or** rely on worker’s “strip unknown property and retry” behaviour (data for that field will be dropped).
4. Confirm the **private app** token used as `HUBSPOT_ACCESS_TOKEN` has scopes to create/update contacts and read/write the properties you use.

#### E2E parity proof (best)

For each of the 7 forms on [stravyx.com](https://stravyx.com) (or SQL insert matching form shape):

1. Submit unique test email `migration-test+<table>@yourdomain`.
2. In Supabase: `select id, email/contact, hubspot_contact_id, created_at from <table> order by created_at desc limit 3;`
3. In HubSpot: open contact → confirm properties + `stravyx_lead_id` matches row id.
4. Mark table ✅ / ❌ on a private checklist (not in git if it contains test PII).

**Pass criteria:** All 7 tables produce `hubspot_contact_id`; no repeated “property does not exist” failures in Edge logs for fields you care about.

**Edge logs:** Supabase → Edge Functions → `hubspot-sync` → Logs.

---

### A5. Vercel — Production/Preview env + MapTiler rebuild state

**Goal:** `NEXT_PUBLIC_*` set for Production **and** Preview; MapTiler key baked into the **current** deployment.

1. Vercel → team/project that hosts **`apps/app-web`** (Root Directory / monorepo filter per `apps/app-web/vercel.json`).
2. **Settings → Environment Variables** — confirm for **Production** and **Preview**:

| Name | Notes |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ruzblzcvnayajmnwyjyc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable |
| `NEXT_PUBLIC_API_URL` | `https://ruzblzcvnayajmnwyjyc.supabase.co/functions/v1` |
| `NEXT_PUBLIC_MAPTILER_KEY` | publishable MapTiler key |

3. **Deployments** → open the **latest Production** deployment:
   - Note deployment time vs when MapTiler env was last changed.
   - If MapTiler was added/changed **after** that build → **Redeploy** (do not rely on “Restart”; need a new build so Next inlines `NEXT_PUBLIC_*`).

4. **Runtime proof:**
   - Open production URL (e.g. `app.stravyx.com` or the `*.vercel.app` alias).
   - Booking / track / navigation map should load tiles (not empty `?key=`).
   - Browser DevTools → Network → map iframe/tile requests include a non-empty key param (**do not** paste the key into docs).

**Pass criteria:** Env present on Production + Preview; latest deploy is **after** last MapTiler change; maps render.

---

### A6. Replit — Secrets point at project `ruzblzcvnayajmnwyjyc`

**Goal:** Live marketing site inserts into **this** Supabase project.

1. Log into Replit → open the **Stravyx marketing** app (historically referenced as `jackson322/Stravyx-Main` — confirm actual name in your Replit account).
2. **Secrets / Tools → Secrets** — check:

| Secret | Expected shape |
|--------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | contains `ruzblzcvnayajmnwyjyc` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | JWT-like anon key for **that** project |

3. Confirm **no** HubSpot token and **no** service_role in Replit secrets.
4. Smoke: submit Contact (or Academy) form on [stravyx.com](https://stravyx.com) with a unique test email → row appears in Supabase **this** project → `hubspot_contact_id` fills.

**Pass criteria:** URL ref matches; form INSERT lands in this project.

---

### A7. External repo names (historical — verify only)

These are **references**, not required clones for demo runtime.

| Reference | How to verify |
|-----------|----------------|
| `albert-stravyx/prototype-project` | `git remote -v` in this repo |
| `harvey513/Stravyx_App_FE` | GitHub search / org access — FE port source history |
| `jackson322/Stravyx-Main` | Replit / GitHub — marketing SoT identity |

```bash
git remote -v
gh repo view --json nameWithOwner,url
```

**Pass criteria:** You know which remotes you still need access to on the new account; update docs if names changed.

---

### A8. Dirty tree / remote reflection

**Goal:** Know what exists only locally vs on `origin`.

#### On this machine (capture-time findings)

Run from main checkout:

```bash
git fetch --all --prune
git status -sb
git worktree list
git branch -vv
```

**Expected useful checks:**

1. **Current feature branch** `cursor/role-based-dashboard-redirect`  
   - At capture: **in sync** with `origin` (0 ahead / 0 behind) at HubSpot sync commit.  
   - **Uncommitted handoff docs** may still be local only: `AGENTS.md`, `docs/*handoff*`, `.cursor/rules/`, README index edits.  
   - **Action:** commit + push those if you want them on the new machine via git (recommended).

2. **`main` worktree** at `tmp/main-merge-worktree`  
   - At capture: **ahead 2, behind 4** vs `origin/main`.  
   - **Action:** inspect `git log origin/main..HEAD` and `git log HEAD..origin/main`; merge/rebase or discard intentionally before losing the worktree.

3. **Other worktree** `prototype-project-main-rewrite` on branch `rewrite-main-author`  
   - Confirm whether it has unique commits; push or archive.

4. **Conversation-start dirty files** (ERD PDFs, `hubspot-sync`, etc.)  
   - Re-check:

```bash
git log --oneline -- supabase/functions/hubspot-sync docs/data-model-erd.md docs/stravyx-data-model-erd*.pdf | head
git status -- supabase/functions/hubspot-sync docs/
```

If clean and commits exist on the remote-tracking branch, they are preserved in git. If modified locally and uncommitted, copy/commit before wipe.

5. **Cloud agent branches** (`cursor/cloud-agent-*`) — decide keep/delete on remote.

**Pass criteria:** Written inventory of unpushed commits, dirty files, and worktrees; anything needed is pushed or copied out.

---

## B. Manual backup — step-by-step

Store backups in a **password manager** and/or **encrypted archive** (1Password, Bitwarden, age/gpg zip). Prefer not leaving plaintext `.env` on USB forever.

### B1. Local env files

```bash
# From repo root — copy only; do not print to terminal/chat
mkdir -p ~/Desktop/stravyx-migration-backup
cp -p .env.local ~/Desktop/stravyx-migration-backup/root.env.local
cp -p apps/app-web/.env.local ~/Desktop/stravyx-migration-backup/app-web.env.local
```

Also copy if present: `apps/app-web/.env`, root `.env` (should be rare).

Encrypt before cloud sync:

```bash
# Example with zip + password (macOS)
cd ~/Desktop && zip -e stravyx-env-backup.zip stravyx-migration-backup/*
```

**Restore on new machine:** place as `apps/app-web/.env.local` (and root if you use it); never commit.

---

### B2. Supabase Edge secrets + Vault

1. In a password manager secure note **“Stravyx Supabase ruzblzcvnayajmnwyjyc”**, record **names** and **values** for:
   - `HUBSPOT_ACCESS_TOKEN`
   - `HUBSPOT_SYNC_SECRET` (= Vault `hubspot_sync_secret`)
   - `SUPABASE_SERVICE_ROLE_KEY` (if you store it; also available by regenerating in dashboard — regenerating **breaks** old clients)
   - Database password / pooler URL if you use CLI/ORM outside dashboard
2. Optional: Dashboard → **Settings → API** — copy URL, anon, service_role into the same vault note (service_role especially sensitive).
3. You **cannot** reliably “download” Vault secret values after insert in all setups — if the UI won’t reveal them, treat **password manager** as SoT and re-set both Edge + Vault to a new shared sync secret if unknown.

**Restore:** recreate Edge secrets + Vault secret with identical sync secret values; redeploy functions if needed; retest lead sync.

---

### B3. Vercel project env vars

1. Vercel → Project → Settings → Environment Variables.
2. For each var, copy name + value + environments (Production/Preview/Development) into the password manager note **“Stravyx Vercel app-web”**.
3. Note **Project ID**, team slug, production domain(s), and that install/build use monorepo root (`vercel.json`).

**Alternative:** Vercel CLI `vercel env pull` into a **gitignored** file, then encrypt — still don’t commit.

**Restore:** recreate project link + env vars → **Redeploy**.

---

### B4. HubSpot private app token / portal access

1. Confirm you can log into the HubSpot portal (SSO/password).
2. **Settings → Integrations → Private Apps** (or legacy app) → open the app used by Stravyx.
3. Copy into password manager:
   - Portal ID  
   - Private app name  
   - Access token (**shown once** on create — if lost, **rotate** and update Supabase `HUBSPOT_ACCESS_TOKEN`)  
   - Scopes list  
4. Export or screenshot **Contact property** list for Stravyx customs (optional CSV via HubSpot) for parity restore.

**Restore:** ensure portal access on new account email; set Edge secret to current token; retest sync.

---

### B5. Cursor MCP OAuth

MCP tokens live in the **Cursor application account/machine**, not in this git repo.

For each server you use (Supabase, HubSpot, Figma, Replit, GitHub, Vercel, AWS, Notion, Datadog, …):

1. In Cursor on the **old** machine: note which MCPs show as connected.
2. On the **new** machine / account: re-add the same MCP configs and complete **Sign in / mcp_auth** flows.
3. Backup any **client IDs** you own (e.g. HubSpot MCP OAuth app) in the password manager — not the temporary OAuth access tokens.

There is no reliable “export all MCP sessions” — plan on **re-auth**.

---

### B6. Cursor user rules / skills outside the repo

**In-repo (already portable via git once committed):**

- `.cursor/rules/*.mdc`
- `AGENTS.md`
- `.agents/skills` is **gitignored** — see below

**Outside repo (manual):**

1. Cursor **Settings → Rules** (user rules) — copy text into a private note or encrypted file.
2. Global skills under `~/.cursor/skills-cursor/` — copy folder to encrypted backup if you customized them.
3. Project `skills-lock.json` is in git; reinstall skills on new machine as needed (`npx skills` / vendor docs).
4. Chat/agent transcripts under `~/.cursor/projects/.../agent-transcripts` — **optional** archive if you want history; new account won’t see old cloud chats.

```bash
# Example inventory (adjust paths)
ls ~/.cursor/skills-cursor 2>/dev/null | head
ls "/Users/albertpalada/.cursor/projects/Users-albertpalada-Documents-Stravyx-prototype-project/agent-transcripts" 2>/dev/null | head
```

---

### B7. Unpushed branches / worktrees

```bash
git fetch --all --prune
git worktree list
git branch -vv

# Commits on main worktree not on origin:
git -C tmp/main-merge-worktree log --oneline origin/main..HEAD

# Commits on origin not in that worktree:
git -C tmp/main-merge-worktree log --oneline HEAD..origin/main
```

**Backup actions:**

1. Push any branch you need: `git push -u origin <branch>`.
2. Or create patches: `git format-patch origin/main..<branch> -o ~/Desktop/stravyx-migration-backup/patches`.
3. Record worktree paths before deleting the old disk image:
   - `.../prototype-project` (feature)
   - `.../prototype-project/tmp/main-merge-worktree` (`main`, diverged)
   - `.../prototype-project-main-rewrite` (`rewrite-main-author`)

**Do not** force-push `main` unless you explicitly intend to rewrite shared history.

---

### B8. Gitignored outreach CSVs + `tmp/`

```bash
mkdir -p ~/Desktop/stravyx-migration-backup/outreach
cp -p data/operator-outreach/*.csv ~/Desktop/stravyx-migration-backup/outreach/ 2>/dev/null
cp -p data/operator-outreach/summary.json ~/Desktop/stravyx-migration-backup/outreach/ 2>/dev/null
# HTML may be fine in git already (README/html); CSVs contain phones — treat as PII

# Review tmp before copying (may be large / disposable)
ls -la tmp/
# Copy only what you need, e.g. compare folders — skip node_modules-like junk
```

Encrypt the outreach folder; do **not** commit CSVs.

---

### B9. Replit access for stravyx.com

1. Confirm login email/org for the Replit account that owns the marketing app.
2. Confirm custom domain [stravyx.com](https://stravyx.com) DNS/hosting still points at that deployment.
3. Backup Replit **Secrets** names/values into password manager (same as A6).
4. Optional: export/download Replit project if you rely on it as SoT without GitHub mirror.

**Restore:** log in on new machine; confirm Secrets; submit one form smoke test.

---

## C. Suggested order (half-day runbook)

1. **Git inventory** (A8) + push/commit handoff docs + resolve `main` worktree divergence.  
2. **Copy env + outreach** to encrypted backup (B1, B8).  
3. **Password manager notes** for Supabase / Vercel / HubSpot / Replit (B2–B4, B9).  
4. **Live verify** Supabase migrations + Edge + Vault (A1–A3).  
5. **HubSpot property + 7-table sync smoke** (A4).  
6. **Vercel env + MapTiler redeploy check** (A5).  
7. **Replit Secrets + form smoke** (A6).  
8. **Cursor user rules/skills + plan MCP re-auth** (B5–B6).  
9. On new machine: clone → restore `.env.local` → `pnpm install` → `pnpm test:contracts` → demo runbook.

---

## D. Uncommitted handoff files (this repo)

Still local until you commit (as of handoff work):

- `AGENTS.md`
- `docs/AGENT_HANDOFF.md`, `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `CURRENT_STATE.md`, `ROADMAP.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`, `DEVELOPMENT.md`, this file
- `.cursor/rules/*.mdc`
- `README.md` / `docs/README.md` index edits

**Recommendation:** commit and push these on your feature branch before wiping the old machine so the new Cursor account gets them via `git pull`.

Say if you want that commit created.
