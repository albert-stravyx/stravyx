# Deployment & infrastructure — conversation archive

> Quoted turns + ops lessons.  
> Canonical: [`docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md), [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md), [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

**Archive rebuilt:** 2026-08-22.

---

## Source conversations

| Title | Id | Focus |
|-------|-----|--------|
| [Vercel deployment environment setup](ee51ac3b-6f50-40e3-8ae7-d4b70995fd4e) | `ee51ac3b` | Prod/preview, env, MapTiler, 401, workflow scope |
| [Vercel MCP integration skills](fe3b64b4-a5aa-4bdf-9849-a9e3a5be3d1f) | `fe3b64b4` | Vercel MCP + deploy skills |
| [Vercel CLI installation](100d2adf-ca38-4a59-8b01-f7db115f9576) | `100d2adf` | Local CLI |
| [User dashboard redirection](f35bfd6a-6123-4c57-b831-63a413273f62) | `f35bfd6a` | Squash-merge; commit author vs Vercel |
| [Frontend app changes review](b8c75d03-7f8b-4e71-8483-c9f6e8d9329d) | `b8c75d03` | Deployment Protection |
| [Development compliance checklist](0ee5b7a6-063c-4f33-aba0-ce3df398325c) | `0ee5b7a6` | CI gates; what *not* to build yet |
| [Replit MCP connection](cbfcf18f-b21e-4de3-8ed3-2e045abdef89) | `cbfcf18f` | Marketing host; OAuth `redirect_uri` |
| [App ERD draft](3a113777-f989-43e1-900a-b4976909d15e) | `3a113777` | NestJS ≠ Vercel |
| [Project restructuring plan](b4391666-2cf6-4777-9349-dc54938a3692) | `b4391666` | Guardrails CI job; delete merged `feature/**` |
| [Project migration documentation](3797e346-62b6-4e44-b5ee-a91f851fe0ba) | `3797e346` | What cannot migrate automatically |

---

## Quoted turns

From [Vercel deployment environment setup](ee51ac3b-6f50-40e3-8ae7-d4b70995fd4e):

> You are a CI/CD engineer setup a deployment environment on Vercel for the app. Need to have a production and testing environment. Make sure that deployments follow the best practices CI/CD, PR, etc.

> Command failed: git push … (refusing to allow an OAuth App to create or update workflow .github/workflows/ci.yml without workflow scope)

> split out the workflow change so the current branch can push cleanly

From [User dashboard redirection](f35bfd6a-6123-4c57-b831-63a413273f62):

> should I squash and merge or rebase and merge? which one would be more ideal for a cleaner and easy to follow commit history.

**Answer recorded:** prefer **squash-merge** onto `main`.

From [Frontend app changes review](b8c75d03-7f8b-4e71-8483-c9f6e8d9329d):

> I checked the preview on vercel but I can't see the edit tiers in the Admin interface

> the preview is nlocked again on vercel

From [Replit MCP connection](cbfcf18f-b21e-4de3-8ed3-2e045abdef89):

> connect to replit mcp

> error=redirect_uris must only contain web uris

> can you access this https://replit.com/@jackson322/Stravyx-Main …

From [Project restructuring](b4391666-2cf6-4777-9349-dc54938a3692):

> add it as a rule for this project to delete the branch in local and remote once the branch has been successfully merged to main and all the tests have passed.

From [Project migration](3797e346-62b6-4e44-b5ee-a91f851fe0ba):

> We are migrating this project to a different computer and a different Cursor account. Future Cursor agents will NOT have access to this conversation.

---

## Topology chats converged on

```text
stravyx.com          → Replit (marketing SoT)
app.stravyx.com      → Vercel project for apps/app-web (production)
*.vercel.app         → Preview deploys from PRs / branches
Supabase             → Auth + Postgres + Edge Functions api / hubspot-sync
HubSpot              → CRM only (one-way from leads)
```

Demo Supabase region may still be Tokyo; target later Sydney `ap-southeast-2` — **verify**.

**Do not** host NestJS + DJI MQTT + long-running HubSpot workers on Vercel as the 1B plan.

---

## CI / CD

- Trunk: **`main`**. Features: `feature/<area>-<intent>` (CI triggers `main` and `feature/**` only).
- Prefer squash-merge.
- GitHub Actions: `pnpm typecheck` + `pnpm test:contracts`; after Aug 11 also **Python guardrails** (`pnpm gates` / `scripts/quality_check.py`).
- Playwright BDD **skips** without `PLAYWRIGHT_BASE_URL`.

**Push gotcha:** OAuth App without **`workflow`** scope cannot push `.github/workflows/*`. Use a PAT/`gh` session with workflow scope, or split workflow commits.

**Merged-branch cleanup (human `git_push` gate for remote delete):** after `origin/main` has the merge **and** contracts + guardrails are green, delete local + remote `feature/**`. Agents must not run `git push origin --delete` autonomously.

Deliberately **not** built for 1A: ephemeral full-stack E2E envs, blue-green, automated rollback, container scanning, SBOM, WAF.

---

## Vercel lessons

- Dedicated Vercel project; Root Directory **`apps/app-web`** in **project settings**, not `rootDirectory` inside `vercel.json` (schema rejects it).
- Production vs Preview env vars.

Required **names** (never values in git):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_MAPTILER_KEY` — **build-time** inlined; missing → blank maps
- Keep demo role-switch **false** in production (feature later removed from UI)

After changing `NEXT_PUBLIC_*`, **rebuild**.

Commit author must match Vercel allowlist (`albert-stravyx` vs historical `albert-axi`). Sessions do not carry from `*.vercel.app` to `app.stravyx.com`.

---

## Replit (marketing)

- SoT: Replit **Stravyx Main** → [stravyx.com](https://stravyx.com).
- Forms: anon insert into Supabase lead tables; **never** HubSpot token in the marketing client.
- Cursor Replit MCP: register a **web** OAuth redirect, not `cursor://`.

---

## Supabase Edge ops (manual)

1. Apply migrations (incl. HubSpot sync secret header).
2. Edge secrets: `HUBSPOT_ACCESS_TOKEN`, `HUBSPOT_SYNC_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (server only).
3. Vault `hubspot_sync_secret` = sync secret.
4. Redeploy `api` and `hubspot-sync`.
5. CORS origins for marketing + app hosts.

Deployed function versions vs git: **unverified** until checked in dashboard.

---

## What will not survive a computer migration

`.env.local`, Vercel env, Supabase/HubSpot secrets, MCP OAuth, unpushed branches, Replit access, gitignored outreach CSVs. This archive is **not** a secret store.

```bash
pnpm install && pnpm typecheck && pnpm test:contracts && pnpm gates
pnpm dev:app
```
