# Database redesign — conversation archive

> Quoted turns + ERD evolution.  
> Canonical SoT: [`docs/data-model-erd.md`](../../docs/data-model-erd.md) (**v0.3.1**), `supabase/migrations/`.

**Archive rebuilt:** 2026-08-22.

---

## Source conversations

| Title | Id | Focus |
|-------|-----|--------|
| [App ERD draft and comments](3a113777-f989-43e1-900a-b4976909d15e) | `3a113777` | v0.1→v0.3; bidding→first-to-accept; HubSpot; payment open |
| [Supabase changes overview](fb7d8051-5eec-48c0-a04d-c8a399861cd9) | `fb7d8051` | Non-Edge schema; Domain H sync to ERD |
| [Backend integration for users](9301a4c5-1562-4524-a9bf-f83d42eeba49) | `9301a4c5` | Marketplace MVP schema + lead sync |
| [Marketing website form sync](32ea0fc4-8590-40ea-bdc2-d716965198f4) | `32ea0fc4` | Lead table map; writeback |
| [PDF copy of the ERD](b24cd108-7bf4-4592-9e2b-c739cd25ea0c) | `b24cd108` | Render pipeline |
| [MVP build timeline](4b1d9e10-f595-45a1-8b22-e8a2da87f131) | `4b1d9e10` | MVP vs full ERD |
| [Remove Switch View](8348c06d-c5cc-40fa-bfc7-33e30ce00cca) | `8348c06d` | FlightProvider / bind / media quarantine (docs; not demo schema yet) |
| [Project migration documentation](3797e346-62b6-4e44-b5ee-a91f851fe0ba) | `3797e346` | Demo subset vs full domains |

---

## Quoted turns — ERD thread (`3a113777`)

> Create a draft ERD needed to support the app. Provide detailed comments/explanation for each tables and their associations.

> Update the ERD to meet the changes needed specified in this feedback file.  
> `Stravyx — Data Model ERD Feedback.pdf`

> Here's the feedback regarding the changes done in v2. … Let the decision whether to use Stripe or Xero payment for now open … don't tie it down to a specific payment platform.

> work on the field mapping based on the suggested fields by Liz. We are planning to use the hubspot ticketing system so plan out the integration. … wait for my approval before implementing them.

> the plan is to have the website send all the forms to the backend … and simply sync everything to hubspot. so the main source of truth is the backend which is planned to connect to supabase … is this the best method?

> add into consideration that the app frontend will also connect to the backend. here is the link to the app frontend — Figma Make …

**Approved pattern (U24):** Persist in **Postgres first**; async HubSpot upsert (email dedupe); store HubSpot ids on lead rows. HubSpot is **not** SoT for licence, pricing, or missions.

---

## Evolution timeline

### v0.1 — draft

U1 created the first marketplace ERD. Early language still included **bidding**.

### v0.2 — first-to-accept

External PDF feedback: bidding → **first-to-accept**; operator identity split (ReOC, offers, roster); academy/leads expanded; diagrams regenerated (palette + structure).

### v0.3 / v0.3.1

- Payment rail **open** (`provider_*_ref`).
- HubSpot contact properties + ticketing **plan**; CRM not SoT.
- Domain **H** lead tables aligned to live Supabase (`fb7d8051`); drop fake `WEBSITE_FORMS` entity.

Current authority: **ERD v0.3.1**.

Quoted from [Supabase changes overview](fb7d8051-5eec-48c0-a04d-c8a399861cd9):

> what are the changes done on supabase other than the changes with the edge functions

> sync the schema changes to the ERD diagram here in the docs and regenerate the respective artifacts

---

## Structural product rules in the ERD

| Rule | Storage / enforcement |
|------|------------------------|
| First-to-accept | Offers / assignment; race safety via unique constraints (target) |
| Network Price | Customer sees single total; no L1/L2 line items |
| Two-layer revenue | Operators must not read L2 / network fee |
| Money | `bigint` cents + currency |
| Roles | `profiles.primary_role` + Auth `app_metadata` |
| Visibility | Projectors + RLS — not UI-only |

Older board/MVP docs that still say bidding: **ignore**.

---

## Demo schema vs full ERD

| Domain | Full ERD | Phase 1A/2A demo |
|--------|----------|------------------|
| Identity | Users, orgs, ReOC | Thin: `profiles`, `organizations`, `reoc_profiles` |
| Catalogue | Categories, equipment, urgency, pricing | Seeded tables |
| Missions / dispatch | Full state machine, geo | First-to-accept path |
| Payments | Escrow, splits | Stubs / provider refs open |
| Media | Real pipeline | Upload stub |
| Leads (Domain H) | Marketing capture | **Seven lead tables** + HubSpot |
| DJI / telemetry | Live ops | Spec / ADR 0005 — privacy gated |

Marketplace MVP migration cited in chats: `supabase/migrations/20260725020000_marketplace_mvp.sql` (+ grant/security follow-ons).

Live-ops bind/quarantine/FlightProvider tables are **documented** (ADR 0005); do **not** invent NestJS MQTT schema in this repo until 1B.

---

## Lead tables (marketing → Supabase → HubSpot)

Confirmed while debugging [Marketing website form sync](32ea0fc4-8590-40ea-bdc2-d716965198f4):

| Form / page | Table |
|-------------|--------|
| Academy | `academy_enquiries` |
| For operators | `operator_leads` |
| Contact | `contact_leads` |
| Enterprise | `enterprise_leads` |
| Free flight | `business_leads` |
| Home owners | `home_owner_leads` |
| About (talent) | `talent_interests` |

Writeback: `hubspot_contact_id` on the row.

Quoted:

> check and test that all the marketing website forms submitted are captured in the backend and synced on hubspot.

> I can confirm it is in hubspot. which table in supabase can I check to confirm that the contact is also saved in the backend.

```sql
select id, email, created_at, hubspot_contact_id
from public.contact_leads
order by created_at desc
limit 20;
```

Triggers: `notify_hubspot_lead_sync` / pg_net → Edge `hubspot-sync` with `x-hubspot-sync-secret`. Dashboard “Database Webhooks” UI may be missing — **pg_net path is durable**.

Quoted from `9301a4c5`:

> "Database Webhook on lead-table INSERT → hubspot-sync" elaborate on what I need to do here

> I can't find "Webhooks" under database menu

> Do I still need to create the Database Webhooks?

**Answer recorded:** migration/pg_net covers it; Dashboard UI is optional/confusing.

Custom HubSpot properties discussed: `stravyx_lead_table`, `stravyx_lead_id` (portal state **unverified** after migration).

---

## Schema fixes discovered in chats

| Issue | Lesson |
|-------|--------|
| “Invalid urgency” on quote/book | Often missing **`service_role` grants**, not bad enum — `20260725022000_fix_api_grants.sql` |
| HubSpot sync after hardening | Trigger must send secret header; Vault name must match |
| Insert-only RLS | Forms must not `.select()` inserted leads |

When Phase 1B starts: keep ERD enums/cents/visibility and `/api/...` via `packages/api-client`; move workers off Edge as needed.

## Open schema / product questions

- Offer fan-out / no-acceptance behaviour
- Payment & payout rail
- Category / urgency seed SoT
- Telemetry store (after APP 8)
- Region move to Sydney
- Capture-session / binding-history attribution (challenger open condition)
