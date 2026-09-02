# Stravyx — Executive Summary

**Stravyx Pty Ltd** · ACN 696 964 271 · stravyx.com  
Board Briefing · May 2026 · Confidential · Aligned to *Master Business Summary* (April 2026)

> **PDF:** [`stravyx-executive-summary.pdf`](./stravyx-executive-summary.pdf) — includes business summary + MVP build timeline · Regenerate: `python3 scripts/generate_executive_summary_pdf.py`  
> **Build plan PDF (extended):** [`stravyx-mvp-build-timeline.pdf`](./stravyx-mvp-build-timeline.pdf) — Figma/Cursor handoff detail · Regenerate: `python3 scripts/generate_mvp_build_timeline_pdf.py`  
> **Source of truth:** *Stravyx — Founder's Mission Statement / Master Business Summary* (April 2026)

---

## Vision

Stravyx is an **AI-powered two-sided marketplace** for commercial drone services in Australia. It is **asset-light** — Stravyx does not own or operate drones in the mobile operator model. It connects customers who need drone services with **CASA-licensed mobile operators** (own ReOC) and, over time, a network of **dock-based missions** supervised by **Stravyx pilots** (RPL only, under Stravyx's ReOC).

The long-term vision is a transition from a human-operated marketplace to a **fully autonomous drone services network**, powered by fixed dock infrastructure (DJI Dock 2/3) at enterprise sites and public network locations.

**Strategic reframe:** As Stravyx obtains its own **ReOC**, it becomes Australia's largest drone operator in practice — unlocking **100,000+ qualified RPL pilots** who can fly on the Stravyx network under Stravyx's licence (~30× the ~3,000 existing ReOC operator pool).

---

## Two-layer revenue model

Every mission generates two distinct revenue streams. The customer sees **one price** — the **Stravyx Network Price**. Behind it:

| Layer                         | What it is                                                                         | Who gets what                                                          | ~Share of customer price |
| ----------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------ |
| **Layer 1 — Flight fee**      | Onsite time × per-minute rate × equipment factor (base **$250/hr**)                | Mobile operator: **85%** of winning bid · Stravyx: **15%** network fee | ~70%                     |
| **Layer 2 — Data processing** | Stravyx AI transforms raw data into finished deliverable (starts after raw upload) | **100% Stravyx** — invisible to operator, pilot, dock owner            | ~30%                     |

**Stravyx blended revenue:** ~**40%** of total mission value (15% of flight fee + 100% of processing fee).

### Information architecture (by design)

Five separated visibility layers protect margin and UX:

1. **Customer** — Stravyx Network Price only.  
2. **Mobile operator (own ReOC)** — flight fee and **85% share**; never customer total price or processing fee.  
3. **Stravyx pilot (dock, RPL)** — offered mission price only (contractor to Stravyx).  
4. **Dock owner** — fixed per-flight fee only.  
5. **Layer 2 processing** — entirely post-flight; never shown to operator, pilot, or dock owner.

---

## Problem & opportunity

- **~3,000** ReOC operators nationally today; **100,000+** RPL pilots once Stravyx holds ReOC.  
- No national platform with **single network price**, **operator bidding within Price Guide**, and **AI-processed deliverables**.  
- Enterprises need compliant, auditable supply; docks and **Stravyx Finance** (4K Group white-label) lower hardware barriers.  
- **DJI ~70%** enterprise share — Stravyx integrates Pilot-to-Cloud and Dock-to-Cloud, not consumer DJI Fly alone.

---

## Product — seven user types

| #   | User type                            | Role at MVP (19 Jun)                                                                |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------- |
| 1   | **Consumer / SME**                   | Self-serve web booking; one Stravyx Network Price; processed output in portal       |
| 2   | **Enterprise (direct)**              | Rate card / invoicing — **post-MVP** (Phase 1 programme)                            |
| 3   | **Enterprise (reseller)**            | B2B2B supply — **post-MVP**                                                         |
| 4   | **Mobile operator (own ReOC)**       | Mission brief, Price Guide, bid, fly, deliver **raw data**; paid 85% of winning bid |
| 5   | **Stravyx pilot (RPL, dock)**        | Remote supervisory oversight — **post-MVP** (requires ReOC path)                    |
| 6   | **Public network dock owner**        | Passive per-flight fee — **post-MVP**                                               |
| 7   | **Private enterprise dock customer** | Subscription / internal ops — **post-MVP**                                          |

**Mission flow (consumer):** Requirements → urgency tier → **Stravyx Network Price** (or operator bids ranked by **BEST MATCH SCORE**) → pay → Ready → Airborne → Complete → **raw deliverables to Stravyx** → **AI-processed output** in portal → review → rating.

> **BEST MATCH SCORE** is the working name for the ranking algorithm (replaces earlier “FLIGHT SCORE”). Factors: price competitiveness vs Price Guide, quality track record, capability match, proximity. Dock nodes gain structural proximity advantage as the network grows.

---

## Pricing & urgency (customer-facing)

| Tier          | Multiplier  | Dispatch                | Best for                      |
| ------------- | ----------- | ----------------------- | ----------------------------- |
| **Immediate** | 2.0–2.5×    | Seconds / auto-dispatch | Emergency, security callout   |
| **Urgent**    | 1.25–1.5×   | 30–60 min               | Same-day ops                  |
| **Standard**  | 1.0× (base) | 24–48 hr                | Planned commercial work       |
| **Scheduled** | 0.85–0.90×  | Pre-booked              | Recurring enterprise, patrols |

Operators **bid within Price Guide floor and ceiling**; highest **BEST MATCH SCORE** wins. Suburb shown on job card; **full address after win**.

---

## Mission service (summary)

- **Lifecycle:** Draft → Submitted → Quoting/Dispatching → Confirmed → Ready → Airborne → Complete → In Review → Closed (or Disputed).  
- **Ten mission categories** (catalogue): aerial photo/video, property inspection, land survey/mapping, agriculture, search/emergency, security/surveillance, infrastructure inspection, 3D/digital twin, package delivery, custom.  
- **MVP (19 Jun):** five categories live (see [MVP build timeline](#mvp-build-timeline-19-june-2026)); remainder feature-flagged.  
- **Compliance gate** on Ready→Airborne; immutable audit log; Layer 2 processing triggered after raw upload.

---

## Supply-side models

|           | **Mobile operator (own ReOC)**  | **Stravyx pilot (dock-based)**          |
| --------- | ------------------------------- | --------------------------------------- |
| Licence   | Own RePL + ReOC                 | RePL only; flies under **Stravyx ReOC** |
| Equipment | BYO drone                       | Stravyx dock drone                      |
| Travel    | To every job site               | Remote supervision; no travel           |
| MVP       | **Yes** — responsive web portal | **No** — Phase 1 after ReOC/partner     |
| Earnings  | 85% of Layer 1 flight fee (bid) | Offered mission price (post dock fee)   |

**ReOC strategy (parallel track):** Own ReOC application + HAO candidate; short-term ReOC partner for dock ops until Stravyx certificate granted.

---

## Architecture (summary)

- **Vendor-neutral core:** missions, matching (BEST MATCH SCORE), dispatch, payments, geo, media, **processing pipeline**, compliance.  
- **DJI Phase 1:** Pilot-to-Cloud (mobile operators); Dock-to-Cloud (enterprise docks).  
- **MVP operator path:** manual status + raw upload; Layer 2 processing queue (stub → AI engine).  
- **Data:** PostgreSQL + PostGIS · Redis · S3 + CDN · AWS ap-southeast-2.  
- **Global capability:** DJI Cloud API can dispatch docks worldwide from day one; **Australia = primary revenue**.

---

## Suggested technology stack

| Layer       | Technology                      | Rationale                                                      |
| ----------- | ------------------------------- | -------------------------------------------------------------- |
| Web         | **Next.js 14+**                 | Consumer + mobile operator + admin for **19 Jun MVP**          |
| Mobile apps | **React Native** (Expo)         | Consumer/operator native — Phase 1 programme post-GA           |
| Design      | **Figma**                       | Source of truth (not Google Labs / Stitch)                     |
| API         | **NestJS** modular monolith     | Pricing engine, bidding, visibility rules, Stripe              |
| Payments    | **Stripe Connect**              | Hold/release aligned to Layer 1 split (85/15)                  |
| Processing  | **Queue + AI pipeline**         | Layer 2; Roboflow/Pix4D integrations per mission type (phased) |
| Maps        | **Mapbox**                      | Geocode, coverage, tracker                                     |
| DJI         | **Cloud API** (Pilot 2, Dock 2) | MSDK V5 custom app Phase 1 programme                           |
| Finance     | **Stravyx Finance** (4K Group)  | White-label dock finance — parallel commercial track           |
| Identity    | **Auth0 / Cognito** + RBAC      | Seven user types; field-level price visibility                 |

---

## Design platform (decision)

**Figma** — not Google Labs (Stitch) — for production UI, six+ persona flows, and dev handoff. Stitch optional for marketing spikes only.

---

## Phased roadmap (founder model)

| Phase                     | Period          | Focus                                                                        |
| ------------------------- | --------------- | ---------------------------------------------------------------------------- |
| **Platform launch (MVP)** | **19 Jun 2026** | Live **website** + web marketplace (see build timeline below)                |
| **Phase 1**               | **2026–2027**   | ReOC; RPL pilot pool; Stravyx Finance; CASA; docks; DJI partner; MSDK V5 app |
| **Phase 2**               | **2028+**       | Autonomous dock network; multi-flight supervision; international expansion   |

**Phase 1 investment (indicative):** AUD **1.5–2.5M** · **10–12 FTE** (full plan). Smaller teams require a reduced pilot scope — see cut lines in build timeline.

---

## MVP build timeline (19 June 2026)

**Target launch:** Thursday **19 June 2026** · **Day 1:** Monday **26 May 2026** · **Duration:** 25 working days (5 weeks)  
**Platform:** Web only — consumer booking, **mobile operator** (own ReOC) responsive portal, admin  
**Design:** Figma → engineering handoff (not Google Labs / Stitch)

**Goal:** Prove the commercial model on web — customer sees **Stravyx Network Price**, pays once, receives **processed deliverables**; **mobile operator** bids within **Price Guide**, wins on **BEST MATCH SCORE**, flies mission, uploads **raw data** (Layer 1 payout 85%); Layer 2 processing queued for Stravyx AI pipeline.

> Extended detail (Figma naming, Cursor annotations, day-by-day tables): [`mvp-build-timeline.md`](./mvp-build-timeline.md) · PDF: [`stravyx-mvp-build-timeline.pdf`](./stravyx-mvp-build-timeline.pdf)

### Commercial model at MVP

| Element             | Implementation                                                               |
| ------------------- | ---------------------------------------------------------------------------- |
| Customer price      | Single **Stravyx Network Price** (base $250/hr × equipment factor × urgency) |
| Operator economics  | Flight fee + **85%** share only; bid within **Price Guide**                  |
| BEST MATCH SCORE    | Ranks bids: price vs guide, rating, capability, proximity                    |
| Layer 2 processing  | Raw upload → queue; processed output in portal (manual SLA OK at GA)         |
| Visibility          | API hides customer total and processing fee from operators                   |
| Supply at launch    | **Mobile operators (own ReOC)** only                                         |
| Credibility package | **Live marketing website** + **commercial one-pager** before DJI outreach    |

### P0 scope (launch blockers)

| Area                    | Deliverable                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| **Consumer web**        | Mission wizard · Network Price · Stripe hold · tracker · processed deliverables · review · rating |
| **Mobile operator web** | RePL/ReOC verification · mission brief · Price Guide bid · status + raw upload · 85% payout view  |
| **Admin**               | Verification queue · mission oversight · dispute freeze · audit CSV · pricing config              |
| **Pricing / matching**  | Network Price engine · Price Guide · **BEST MATCH SCORE v1**                                      |
| **Payments**            | Stripe Connect · 15% Stravyx / 85% operator on Layer 1                                            |
| **Processing**          | Layer 2 job queue + portal status                                                                 |
| **Marketing**           | Professional live site + one-pager PDF                                                            |

**Five mission categories at launch:** (1) aerial photo/video (2) property inspection (3) construction progress (4) events (5) security/surveillance. Remaining five categories feature-flagged post-GA.

**Out of scope for 19 Jun:** Stravyx pilot / dock portals · enterprise API/reseller · full Layer 2 AI · native iOS/Android · patrol block subscriptions · Stravyx Finance in-app checkout (parallel commercial track).

### Milestones

| Gate                      | Date       | Exit criterion                                      |
| ------------------------- | ---------- | --------------------------------------------------- |
| **M0** Kickoff            | 26 May     | Founder model locked; visibility matrix in API spec |
| **M1** Vertical slice     | 1 Jun      | Network Price → bid → confirm in staging (mock pay) |
| **M2** Two-sided          | 8 Jun      | Consumer pays; operator wins bid; raw upload        |
| **M3** Money + processing | 12 Jun     | 85/15 split; Layer 2 visible in portal              |
| **M4** Feature freeze     | 14 Jun     | P0 only                                             |
| **M5** RC + credibility   | 16 Jun     | Prod deploy; **marketing site live**                |
| **M6** **GA**             | **19 Jun** | Public booking; Sydney + Melbourne metro            |

### Week-by-week plan

| Week  | Dates          | Theme      | Highlights                                                                                                |
| ----- | -------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| **1** | 26 May – 1 Jun | Foundation | Pricing engine, visibility rules, auth, Price Guide + BEST MATCH SCORE API, marketing site shell · **M1** |
| **2** | 2 – 8 Jun      | Core loops | Consumer pay, operator bid/win, Stripe 85/15, raw upload, Layer 2 status · **M2**                         |
| **3** | 9 – 15 Jun     | Hardening  | Admin verification, disputes, legal, one-pager, UAT · **M3** · **M4 freeze 14 Jun**                       |
| **4** | 16 – 19 Jun    | Launch     | **M5 RC** → soft launch Founding Operators → **M6 GA** war room                                           |

**Week 1 exit:** Operator API returns flight fee + 85% only; customer API returns Network Price only.  
**Week 2 exit:** BEST MATCH SCORE in UI; 85/15 payout test in staging.  
**Week 3 exit:** Live website; one-pager ready; ≥10 pilot operators verified.

### Team (full plan: 10–12 FTE)

| Workstream                                         | FTE |
| -------------------------------------------------- | --- |
| Product / design (Figma, 7 user types)             | 1.5 |
| Platform / backend (pricing, matching, visibility) | 3   |
| Consumer + marketing web                           | 2   |
| Operator + admin web                               | 1   |
| Processing / data                                  | 0.5 |
| DevOps                                             | 1   |
| QA                                                 | 1   |
| Commercial (one-pager, DJI, ReOC, 4K Group)        | 1   |
| Compliance                                         | 0.5 |

### Backend delivery (by week)

| Module       | W1                                        | W2                          | W3             |
| ------------ | ----------------------------------------- | --------------------------- | -------------- |
| `pricing`    | Network Price, urgency, equipment factors | Price Guide                 | Admin tuning   |
| `matching`   | —                                         | BEST MATCH SCORE, broadcast | Proximity      |
| `visibility` | Field matrix                              | Integration tests           | —              |
| `missions`   | State machine                             | Bidding, confirm            | Disputes       |
| `payments`   | Stub                                      | Stripe 85/15                | Capture        |
| `processing` | —                                         | Layer 2 queue               | SLA monitoring |
| `compliance` | Checklist                                 | Ready→Airborne gate         | Audit export   |

### Design handoff (summary)

- **Week 1:** Design tokens + core components → `packages/ui`; consumer/operator frame naming `{app}/{feature}/{screen}`.
- **Per-frame annotations:** route, role, API touchpoints, visibility rules, mission status, pricing/matching notes — so engineering matches founder information architecture.
- **Week 4:** Launch assets only — no new product flows.

### Critical path & cut lines

```
Pricing engine → Visibility rules → Bidding + BEST MATCH SCORE → Stripe 85/15
  → Raw upload → Layer 2 handoff → Marketing site live → GA 19 Jun
```

**Cut lines if behind (decide by 10 Jun):** three mission categories only · price-only ranking · manual Network Price · GA slip to 26 Jun.

### Parallel commercial tracks

| Activity                                   | Window                 |
| ------------------------------------------ | ---------------------- |
| ReOC strategy + HAO identification         | 26 May – ongoing       |
| 4K Group / Stravyx Finance                 | 26 May – 5 Jun         |
| DJI credibility package (site + one-pager) | Before 20 Jun outreach |
| Founding mobile operator outreach          | 26 May – 19 Jun        |
| CASA engagement planning                   | Post-GA                |

### Definition of done (19 June GA)

1. Customer books at **Stravyx Network Price** and pays.  
2. **Mobile operator** bids within Price Guide; **BEST MATCH SCORE** selects winner.  
3. Operator uploads **raw data**; sees **85% of flight fee** only.  
4. Customer receives **processed deliverable** in portal.  
5. Layer 2 fee not exposed to operator.  
6. **Marketing website** live and professional.  
7. **Commercial one-pager** ready for DJI/partner meetings.

**Launch checklist:** Network Price correct · operator cannot see processing fee · ≥50 verified mobile operators · marketing site live · one-pager available.

### Post-launch (20 Jun – Jul 2026)

| Window    | Focus                                                                  |
| --------- | ---------------------------------------------------------------------- |
| 20–27 Jun | BEST MATCH SCORE tuning; operator feedback; processing automation      |
| Jul 2026  | Mission categories 6–10; patrol blocks; dock flows; native app scoping |

---

## Key metrics (illustrative)

- 500+ verified **mobile operators** pre-launch · 1,000+ missions in first 90 days  
- Median dispatch &lt; 15 min (Immediate/Urgent, metro) · dispute rate &lt; 2%  
- 3 enterprise pilot logos · 2–3 dock LOIs for DJI credibility package  

---

## Risks & mitigations

| Risk                         | Mitigation                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------- |
| ReOC timeline                | Short-term ReOC partner; mobile-only MVP first                               |
| Supply cold start            | Pre-built profiles; Founding Operator programme                              |
| Two-layer pricing complexity | Strict visibility rules in API; MVP: simplified processing SLA               |
| DJI outreach too early       | Website + one-pager complete before partnership approach                     |
| Regulatory / CASA            | Research-partner framing; 6-month BVLOS demonstration schedule (post-launch) |

---

## Board ask

1. **Approve** web MVP **19 June 2026** and Phase 1 budget (AUD 1.5–2.5M; 10–12 FTE).  
2. **Endorse** ReOC strategy (HAO candidate, parallel partner track) and CASA engagement post-launch.  
3. **Support** DJI Enterprise introductions after credibility package (live site + one-pager).  

**Contact:** joel@stravyx.com · Confidential — not for external distribution without approval

---

*Board deck: `docs/board-slide-outline.md` · Founder source: Master Business Summary, April 2026*
