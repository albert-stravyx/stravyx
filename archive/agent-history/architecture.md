# Architecture — conversation archive

> Quoted user turns + distilled decisions from Cursor chats.  
> Canonical live docs: [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md), [`docs/DECISIONS.md`](../../docs/DECISIONS.md), [`docs/adr/`](../../docs/adr/), [`docs/dji-integration-architecture.md`](../../docs/dji-integration-architecture.md).  
> Secrets omitted. Cloud dashboard claims marked **unverified**.

**Archive rebuilt:** 2026-08-22 (covers chats through 2026-08-19).

---

## Source conversations (this workspace)

| Title | Id | Why it matters |
|-------|-----|----------------|
| [App ERD draft and comments](3a113777-f989-43e1-900a-b4976909d15e) | `3a113777` | ERD evolution; NestJS-on-Vercel rejection |
| [Backend integration for users](9301a4c5-1562-4524-a9bf-f83d42eeba49) | `9301a4c5` | 1A/2A vs 1B/2C; Replit marketing SoT; demo backend |
| [DJI API integration resources](fd227dc5-2ba2-440a-9149-1cbe7ecf093e) | `fd227dc5` | ADR 0001 — unified telemetry types |
| [NestJS vs Rust comparison](6dae7d6e-67af-4666-ac7e-ac3b6af3607c) | `6dae7d6e` | ADR 0002 — DJI bridge runtime |
| [Mobile app build options](5644561b-fb17-49dd-a7c1-08e7680c8e7a) | `5644561b` | ADR 0003 — RN vs native vs Flutter |
| [Figma versus Google Labs Stitch](f0fb0800-62aa-4b30-aa5c-8ac925bed6f2) | `f0fb0800` | Design SoT |
| [Frontend draft review](0f1164c4-269e-40fc-82c9-798d51377539) | `0f1164c4` | Figma Make gap → demo slice GO |
| [MVP release planning…](e99c31a8-85e3-41f9-9fe5-61cf25b3c9bd) | `e99c31a8` | Web-first MVP; Figma over Stitch |
| [DJI Cloud disclosure meaning](f706ffac-01eb-47f9-8a0f-caf1e2c95cc4) | `f706ffac` | APP 8 hard build gate |
| [Development compliance checklist](0ee5b7a6-063c-4f33-aba0-ce3df398325c) | `0ee5b7a6` | Phase 1A necessary vs deferred platform |
| [Project migration documentation](3797e346-62b6-4e44-b5ee-a91f851fe0ba) | `3797e346` | Distilled handoff |
| [Project restructuring plan](b4391666-2cf6-4777-9349-dc54938a3692) | `b4391666` | ADR 0004 — governed autonomy control plane |
| [Remove Switch View](8348c06d-c5cc-40fa-bfc7-33e30ce00cca) | `8348c06d` | No client role impersonation; ADR 0005 live-ops; challenger; non-DJI |

**Search index only (no jsonl in this project’s transcripts):** [Drone service architecture design](a314328a-c765-404c-90c9-42910ebb45c1) — May 2026 board pack. Prefer live `docs/` over reconstructing that chat.

---

## Quoted turns — topology and phases

From [Backend integration for users](9301a4c5-1562-4524-a9bf-f83d42eeba49):

> can you build the backend at this stage and allow the website, hubspot, and the app frontend for all users to connect to the backend?

> Can I start with 1A 2A and later move to 1B 2C?

> Current live marketing website is built and hosted on replit.

> is the architecture set up to be grown to a global enterprise app in the future…

**Locked answer in that chat (still true):**

| Code | Meaning | Status |
|------|---------|--------|
| **1A** | Supabase Auth + Postgres + Edge | In use |
| **2A** | Demo vertical slice (app-web + leads→HubSpot) | Demo path |
| **1B** | NestJS modular monolith | Docs only — no Nest code in repo |
| **2C** | Full ERD MVP | Not started |

Migration rules from the same thread:

1. Schema follows **ERD** (not Figma Make field names).
2. Clients use stable REST `/api/...` via **`packages/api-client` only**.
3. HubSpot stays **one-way after persist**.

From [App ERD draft](3a113777-f989-43e1-900a-b4976909d15e):

> can the nestjs backend be hosted on vercel?

**Answer recorded:** Vercel for Next.js frontends; **not** for NestJS workers, WebSocket streams, or DJI MQTT. Target long-running host AWS `ap-southeast-2` (or similar) when 1B starts. Thin serverless lead endpoints on Vercel are an early compromise only.

From [DJI Cloud disclosure](f706ffac-01eb-47f9-8a0f-caf1e2c95cc4):

> What does it mean by 'DJI Cloud overseas disclosure is a hard build gate'?

**Answer:** Do not build Pilot/Dock live video/telemetry until Consent & Privacy Policy discloses overseas processing (APP 8). Partner/ecosystem applications can proceed. Do not conflate with operator-outreach APP 3/5.

---

## ADRs 0001–0003 (Jul 2026 chats)

### ADR 0001 — unified telemetry types

Chat [DJI API integration resources](fd227dc5-2ba2-440a-9149-1cbe7ecf093e):

> Compile a list of DJI API, resources, functions, features… how we can utilise or integrate it into our app.

Decision: one `packages/types` contract for cloud MQTT path and direct MSDK. Reject cloud-only HUD (offline flight) and dual UI type systems.

### ADR 0002 — NestJS bridge, not Rust first

Chat [NestJS vs Rust](6dae7d6e-67af-4666-ac7e-ac3b6af3607c):

> is a NestJS bridge better than Rust? Make a comprehensive comparison… recommendation.

> write this up as adr/0002-bridge-runtime-nestjs-vs-rust.md

Workload: I/O-bound MQTT remap, OSD ~1–2 Hz. Keep shared TypeScript types. Defer Rust hotspot until metrics prove CPU/p99/cost bound.

### ADR 0003 — React Native + Expo custom client

Chat [Mobile app build options](5644561b-fb17-49dd-a7c1-08e7680c8e7a):

> What's your recommendation for a mobile app build? … ReactNative, Flutter, … Or … native … Kotlin … Swift?

Reject Flutter (forks TS monorepo) and full dual-native. Operator flight app is **not** Expo Go (needs custom native client; MSDK quarantined).

### Design SoT — Figma over Stitch

[Figma versus Google Labs Stitch](f0fb0800-62aa-4b30-aa5c-8ac925bed6f2) + [MVP release planning](e99c31a8-85e3-41f9-9fe5-61cf25b3c9bd):

> Why should I use Figma over Google Labs Stitch?

> For a feasible MVP launched within schedule, which is better? To build a mobile app first or stick to the web platform?

**Locked:** Figma (incl. Make for prototype UX) is design SoT. Web-first MVP; native apps after commercial model is proven.

### Figma Make → eng posture

[Frontend draft review](0f1164c4-269e-40fc-82c9-798d51377539):

> Review the draft frontend for the app built with Figma Make. Check if it aligns with the backend, database, app specifications…

> any update with the review? check if it's okay to start the build of the MVP for demo purposes.

**Conditional GO:** book → offer → accept → status → upload stub → admin list. Do not copy Make status labels / mock auth / catalogue shortcuts. Visibility from ERD/projectors, not UI hiding.

---

## ADR 0004 — governed autonomous engineering (Aug 11)

Chat [Project restructuring plan](b4391666-2cf6-4777-9349-dc54938a3692):

> Plan to restructure the project to follow the development strategy in this template.  
> `/Users/albertpalada/Downloads/agentic-engineering-template-v5-metrics.zip`

> Restructure Stravyx to the Governed Autonomous Engineering strategy

> based on [the zip] how do I use this strategy so I only have to communicate to a single agent and respective tasks will automatically be delegated.

> does the orchestrator fill in the details in task yaml or I have to do it manually?

> can the orchestrator request those information in the chat so I don't forget to provide them.

> is there a way to separate the app/product related files and only have that pushed remotely and only keep the template and cursor related things local?

**Locked (ADR 0004):** Layer the template **over** Stravyx rules — do not replace product invariants. FAST/STANDARD/FULL; four gates when risk warrants; `.agent/current-task.yaml`; Python guards (`pnpm gates`); human commit/push/deploy. Orchestrator asks task YAML fields **in chat** if the manifest is blank. Splitting “template vs product” remotes was discussed; recommended path was **one repo** with policy/gitignore, not two remotes that break CI.

**Orchestrator self-implementation** (same week, continued in `8348c06d`):

> according to the development strategy policy shouldn't you only be responsible for delegating… why … yourself instead of delegating?

> if you feel like it's more efficient and cost-effective … you can ask for approval and state your reason. Then wait for approval…

> even if I approve you to do the task it still needs to be reviewed and challenged by a specialist agent.

Policy now: orchestrator **delegates by default**; self-implement only after stating reason **and** explicit approval; independent review still required.

---

## Switch View removal + SPA auth model (Aug 11)

Same chat [Remove Switch View](8348c06d-c5cc-40fa-bfc7-33e30ce00cca):

> remove the switch view from the customer interface that allows user to switch to different role interface.

**Locked:** The SPA follows `/me` role only. There is **no** Account Switch View / client role impersonation. Demo `NEXT_PUBLIC_DEMO_ROLE_SWITCH` must not impersonate another JWT role (API still uses real `app_metadata`).

---

## ADR 0005 — Live-ops A: Cloud API + manual; FH2 deferred (Aug 12–19)

Quoted from [Remove Switch View](8348c06d-c5cc-40fa-bfc7-33e30ce00cca) (same long thread as Switch View):

> Plan and research how we can integrate DJI's API … customers to book/schedule a mission and have drone operators accept … submit … photos and videos back to the client…

> Can we just use the Cloud API? Is FlightHub 2 Public necessary? If so, can we just use the business plan and not the enterprise plan. We need to connect multiple drones to our app.

> what are the benefits of adding FlightHub 2? … nice to have or … great value.

> Clearly define what is 'L2', 'APP8'. Can the benefits of having FH2 not be implemented with just Cloud API?

> How does non-DJI drone operators complete missions compared to DJI drone operators? Do non-DJI drone operators also have to use DJI Cloud API?

> Is the APP8 essential only for the live maps and auto sync feature? if those features are not needed is APP8 gate still necessary if all photos and videos are to be uploaded by the operator manually per mission?

> /architecture-challenger challenge the recommended architecture

**Locked (ADR 0005 + live docs):**

1. Stravyx remains marketplace SoT (book, first-to-accept, Network Price, visibility). DJI never owns dispatch or pricing.
2. **Live-ops A DJI path = Cloud API only** (`dji_cloud_api`). Multi-drone = many Pilot 2 / Dock gateways into **Stravyx-hosted** MQTT — not FH2 device seats.
3. **FlightHub 2 deferred** (`dji_fh2` documented). Not required for connect / telemetry / raw L1. Later L2 Modeling/Sync/Analyzer: prefer **Business** (unlimited devices), not Enterprise per-device.
4. **Non-DJI (and rollback) = `manual` adapter** — signed upload + status taps. Every customer-visible outcome must remain reachable via `manual`. Non-DJI operators **do not** use DJI Cloud API.
5. Bind aircraft↔mission at **`allocated`**, not as accept precondition.
6. Media: STS → upload → quarantine → explicit release. No silent `delivered` on wrong-mission media.
7. **No NestJS/MQTT packages in tree** until Phase 1B + APP 8 are explicitly approved.
8. Independent challenger (2026-08-16) findings live in `docs/dji-live-ops-challenger-findings.md` (A-01–A-10). APP 8 close-out brief: `docs/app8-live-ops-gate-closeout.md`.

**Layperson glossary from that chat (keep using in docs):**

- **RC** = remote controller (Pilot 2 handset), the gateway that joins Stravyx’s third-party cloud.
- **L1** = raw operator media (photos/video) delivered to the customer.
- **L2** = optional processing/analytics (not the Network Price the customer pays as a split they should never see as “margin”).
- **APP 8** = Australian Privacy Principle on cross-border disclosure. Manual-only upload to AU-hosted storage can shrink the live-ops gate; **legal still owns** residual hops (DJI licence servers, etc.). Engineering D0/D1/D2 labels are in the APP 8 close-out doc.

---

## Visibility firewall (repeated across ERD / backend / compliance)

- Network Price to customers; operators never see L2 / margin / customer total.
- Money as integer cents.
- Enforce via `@stravyx/types` projectors + Edge + RLS — **never UI-only**.

---

## Rejected approaches (chat → durable)

| Rejected | Source | Why |
|----------|--------|-----|
| Bidding / BEST MATCH / FLIGHT SCORE | ERD feedback | Product → first-to-accept |
| NestJS-only from day one | `9301a4c5` | Too slow for demo |
| NestJS monolith on Vercel | `3a113777` | No durable workers/WS/MQTT |
| Rust bridge first | `6dae7d6e` | Splits shared types |
| Flutter / dual-native mobile | `5644561b` | Cost / type fork |
| Cloud-only operator HUD | ADR 0001 | Offline flight |
| FH2 on Live-ops A critical path | `8348c06d` / ADR 0005 | Cloud API + manual suffice for L1 |
| HubSpot as SoT | ERD U24 | Persist first, sync after |
| Local `stravyx-web` as marketing SoT | `9301a4c5` | Live site is Replit |
| Client Switch View / role impersonation | `8348c06d` | JWT `/me` only |
| Production zero-trust bar in 1A | `0ee5b7a6` | Explicitly deferred |
| Two remotes (product vs Cursor template) | `b4391666` | Breaks one CI/handoff story |

---

## Open items still called out in chats

- Offer fan-out cap / waves; no-acceptance path.
- Payment rail (Stripe vs Xero left open).
- Telemetry store tech (gated on DJI privacy / APP 8).
- MQTT/STS COGS quantification (challenger HIGH).
- Pin Cloud API doc version (~v1.14.x) before S2.
- IdP long-term (Auth0/Cognito later).
- Supabase region Tokyo → Sydney (**verify** live project).

---

## How to use this archive

1. Prefer **`docs/DECISIONS.md` + ADRs + ERD + `dji-integration-architecture.md`**.
2. Use quoted turns here when someone asks *“what did we actually decide in chat?”*.
3. Re-open `agent-transcripts/<id>/` only if you still have this machine.
