# Stravyx Platform — Board Presentation Outline

**Document:** Board-ready slide deck (13 slides)  
**Audience:** Board of directors / investors  
**Duration:** 25–35 minutes + Q&A  
**Version:** 1.1 · May 2026

---

## How to use this document

Each slide block includes:
- **On-slide content** — bullets and visuals to show (keep slides sparse)
- **Speaker notes** — detailed narrative for the presenter
- **Visual suggestion** — diagram or asset recommendation

Design guidance: Stravyx brand colours; one idea per slide; use the architecture diagram from Slide 6 as the anchor visual.

---

## Slide 1 — Title

### On-slide
- **Stravyx**
- Australia's On-Demand Drone Services Network
- Platform Architecture & Roadmap
- Board Briefing · May 2026
- *Confidential*

### Speaker notes
Open with the vision in one sentence: Stravyx is building the **Uber of drone services** for Australia — a trusted marketplace connecting people and businesses who need aerial work with CASA-licensed operators and an automated dock network. This session covers what we are building, how it works technically, how we integrate with DJI and other drones, the phased plan to market, and what we need from the board (capital, partnerships, regulatory posture).

### Visual
Full-bleed hero: drone over Australian landscape or product mockup from Academy Xi sprint.

---

## Slide 2 — The opportunity

### On-slide
- Fragmented market: 2,800+ licensed AU operators; no national booking layer
- Use cases: real estate, inspections, events, security, logistics, enterprise portfolios
- **Stravyx = marketplace + compliance + payments + dock infrastructure**
- We own the transaction, not the aircraft

### Speaker notes
Australia has thousands of licensed drone operators but no dominant platform for on-demand booking. Today, customers find operators via Google, word of mouth, or bespoke contracts — high friction, inconsistent pricing, weak trust signals, and no live tracking. Enterprises (rail, agriculture, automotive groups in our pipeline) need **SLA-backed, compliant, auditable** supply at scale. Stravyx sits in the middle: we do not need to own every drone. We aggregate **supply** (operators + docks), standardise **demand** (10 mission types, four urgency tiers), and capture value on **GMV** (commission), **enterprise contracts**, and **dock revenue share**. This is asset-light at core, with optional hardware revenue via dock partnerships (DJI Dock 2).

### Visual
Two-column: "Today" (fragmented) vs "With Stravyx" (single app, escrow, tracking).

---

## Slide 3 — Who we serve (six user types)

### On-slide
| #   | User                  | Goal                        |
| --- | --------------------- | --------------------------- |
| 1   | Consumer / SME        | Book missions fast          |
| 2   | Enterprise (direct)   | Compliant scale             |
| 3   | Enterprise (reseller) | White-label supply          |
| 4   | Licensed operator     | Earn with less admin        |
| 5   | Dock partner          | Passive + operational value |
| 6   | Platform admin        | Safe network ops            |

*Source: Stravyx User Journey (Phase 1 Draft)*

### Speaker notes
The product is not one app for one persona — it is a **multi-sided platform**. Consumers and SMEs self-serve via web/mobile. Enterprise direct buyers (e.g. property portfolios, rail) need bulk scheduling, team access, invoicing, and SLAs. **Resellers** (e.g. security firms) use Stravyx as backend supply; their end clients never touch our UI — critical for B2B2B economics. **Operators** are supply: they claim pre-built profiles, pass CASA verification, receive job cards, execute missions, get paid via Stripe Connect. **Dock partners** host DJI Dock 2 units in Private, Public, or Hybrid mode (~5 km radius), earning revenue share when the network uses their infrastructure. **Admins** run verification queues, live mission oversight, disputes, and compliance. Board should understand: revenue and risk scale with **each side** of this marketplace.

### Visual
Hexagon or hub diagram: Stravyx centre, six personas around it.

---

## Slide 4 — How a mission works (customer journey)

### On-slide
1. Select mission type → dynamic requirements form  
2. Choose urgency: **Immediate · Urgent · Standard · Scheduled**  
3. Receive quotes ranked by **FLIGHT SCORE**  
4. Pay → funds in **escrow**  
5. Track: **Ready → Airborne → Complete**  
6. Review deliverables (48h) → release payment → rate operator  

### Speaker notes
Walk through the Consumer/SME journey (User Type 1) as the canonical flow. Mission type drives a smart form (location, deliverables, hazards). Urgency tier trades speed for price — Immediate/Urgent push to operators in real time; Standard/Scheduled collect competitive quotes. **FLIGHT SCORE** is our differentiator: a weighted ranking of price, quality, capability, proximity, and history — explained simply in UI so customers choose value, not just cheapest. Payment is authorised and held in escrow with clear messaging: *"Protected until mission complete."* Live tracking and push notifications are key delight moments. After completion, customers get photos/video/reports; a **48-hour review window** protects quality before payout. This flow is proven in gig marketplaces; we add aviation-specific gates (pre-flight checklist, compliance).

### Visual
Horizontal journey timeline with icons per stage.

---

## Slide 5 — Supply side: operators & docks

### On-slide
**Operators:** Pre-built profiles · CASA RePL verification · Job cards · In-app pre-flight · Stripe payouts  

**Docks (DJI Dock 2):** ~5 km radius · Private / Public / Hybrid · Revenue share · Remote monitoring  

**Founding Operator programme:** First 1,400 operators — reduced commission, priority dispatch  

### Speaker notes
Supply acquisition targets 50% of ~2,800 licensed AU operators pre-registered before launch via "profile already built" outreach. Operators complete a <10 min wizard, upload RePL and insurance, and go through verification (target 48h). Job cards show mission type, suburb, urgency, countdown timer, earnings guide — **full address hidden until accept** (safety + fairness). Docks extend the model from human-piloted-only toward automation: enterprise clients may start **Private** (internal fleet only), then migrate to **Hybrid** or **Public** for passive income. Stravyx handles installation, platform integration, and maintenance SLA — partners see a revenue dashboard, not raw hardware complexity. Dock network density improves dispatch times for everyone — a flywheel.

### Visual
Split screen: operator phone (job card) + dock photo with coverage circle on map.

---

## Slide 6 — Platform architecture (high level)

### On-slide
**Clients:** Web · Mobile · Admin · Enterprise API  

**Core:** Missions · Matching (FLIGHT SCORE) · Dispatch · Payments · Geo · Media · Compliance  

**Integration layer:** DJI Cloud API / Dock MQTT · Non-DJI adapters (MAVLink, manual)  

**Data:** PostgreSQL + PostGIS · Redis · S3 · Telemetry TSDB  

*Vendor-neutral core; DJI-first integrations*

### Speaker notes
This is the technical centrepiece. We separate **marketplace logic** (missions, quotes, escrow, ratings) from **drone connectivity** via an adapter pattern. All clients hit an API gateway and realtime WebSocket layer. Core microservices (or well-bounded modules in early phase) own domain rules. The **Drone Integration Layer** normalises telemetry, media upload, and mission commands — DJI Dock 2 speaks MQTT via DJI Cloud API; operators on DJI use **Pilot 2 + Cloud API** (not consumer DJI Fly alone). Non-DJI drones use MAVLink or operator-mediated upload until vendor SDKs are added. Geospatial queries (docks/operators near me) run on **PostGIS**. Media lands in object storage with CDN delivery. Event-driven architecture (Kafka or managed queues) decouples dispatch, notifications, and payouts. Built for **AWS Sydney** data residency.

### Visual
Architecture diagram (from architecture doc): Clients → Gateway → Core → Integration → Data → External (Stripe, CASA, Maps).

---

## Slide 7 — DJI & multi-vendor strategy

### On-slide
| Tier           | DJI                          | Non-DJI                            |
| -------------- | ---------------------------- | ---------------------------------- |
| Automated dock | Dock 2 + Cloud API (MQTT)    | Partner / future adapters          |
| Operator BYO   | Pilot 2 + Cloud API sync     | MAVLink · vendor SDKs · manual app |
| Live video     | RTMP / WebRTC relay          | Adapter-specific                   |
| Media          | Cloud sync → Stravyx storage | Operator upload                    |

**Principle:** Stravyx owns marketplace; DJI owns hardware/protocols where applicable.

### Speaker notes
Board should know: **DJI Fly (consumer app) is not our primary integration path.** Enterprise reliability comes from **DJI Cloud API**, **DJI Pilot 2**, and **Dock 2 / FlightHub-class** workflows — already used by 750+ cloud developers globally. We abstract vendors behind `IDroneAdapter` so Parrot, Autel, Skydio, or custom fleets can onboard without rewriting the marketplace. Early MVP may rely on **manual operator updates** (mark Ready/Airborne/Complete + upload media) while DJI telemetry depth rolls out — acceptable for launch if compliance checklist is enforced. Pursue **DJI developer partnership** early for API access, co-marketing, and dock supply terms. Risk: vendor lock-in mitigated by adapter layer and manual fallback.

### Visual
Three-layer stack: Stravyx Platform → Adapter Layer → DJI | MAVLink | Manual.

---

## Slide 8 — Trust, payments & FLIGHT SCORE

### On-slide
**Payments:** Stripe Connect · Escrow · 48h review · Dispute workflow  

**FLIGHT SCORE:** Price · Rating · Capability · Distance · History · Founding boost  

**Enterprise:** PO invoicing · Reseller billing (Stravyx → reseller only)  

**Dock:** Per-mission revenue share · Monthly statements  

### Speaker notes
Trust is the product. Escrow mirrors best marketplaces: customer pays upfront, operator sees confirmed payment, funds release after deliverable acceptance window. Disputes freeze payout and route to admin with evidence bundle (GPS track, media hashes, timestamps). FLIGHT SCORE must be **transparent** to operators ("what drives my score") and **simple** to customers. Commission is deducted at release; net payout via Connect in 2–5 business days. Enterprise and reseller models avoid billing end-clients of resellers — clean B2B2B. Dock partners earn passive income in Public/Hybrid modes; Hybrid guarantees internal missions always get priority. These mechanics are defensible and familiar to investors who know Uber/Airbnb/Stripe marketplaces.

### Visual
Escrow flow diagram: Authorise → Hold → Complete → 48h → Release / Dispute.

---

## Slide 9 — Compliance & safety (non-negotiable)

### On-slide
- CASA RePL / insurance verification on every operator  
- Mission-type → licence class rules  
- In-app **pre-flight checklist** (customer notification on each state)  
- Airspace / NOTAM checks (third-party APIs)  
- Admin live map + anomaly flags + intervention  
- Immutable audit trail for regulators  

### Speaker notes
Australia's CASA framework is a **moat** for compliant platforms and a **risk** if we cut corners. Enterprise buyers (rail, automotive groups) evaluate risk before technology — our pitch leads with compliance, SLA, reliability. Platform enforces: verified operators only, checklist before Airborne, optional AI safety monitoring (telemetry deviations, unauthorised airspace) feeding admin dashboards. BVLOS and advanced operations are feature-flagged as regulations evolve. Admin tooling is not optional — verification queue at launch will be high-volume. Budget for compliance counsel and aviation advisors in Phase 1.

### Visual
Shield icon + checklist screenshot mock; admin mission map wireframe.

---

## Slide 10 — Suggested technology stack

### On-slide
| Layer         | Choice                                                    | Why                                               |
| ------------- | --------------------------------------------------------- | ------------------------------------------------- |
| Frontend      | Next.js (web) for MVP; React Native (iOS/Android) Phase 2 | Web launch 19 Jun 2026; one team, shared types    |
| Design        | Figma                                                     | Source of truth; Academy Xi → engineering handoff |
| API           | Node.js (NestJS) or Go                                    | Realtime + JSON ecosystem                         |
| Data          | PostgreSQL + PostGIS, Redis                               | Geo + ACID transactions                           |
| Media         | S3 + CloudFront                                           | Scale, cost                                       |
| Realtime      | WebSocket + Redis pub/sub                                 | Live tracking                                     |
| IoT (docks)   | AWS IoT Core (MQTT)                                       | DJI Dock bridge                                   |
| Payments      | Stripe Connect                                            | Marketplace standard                              |
| Maps          | Mapbox                                                    | Custom styling, geospatial                        |
| Cloud         | AWS ap-southeast-2                                        | AU data residency                                 |
| Observability | Datadog or Grafana stack                                  | Ops + investor metrics                            |

### Speaker notes
Stack optimises for **speed to MVP** and **hireability in Australia**, not novelty. **MVP ships web-only on 19 June 2026** — Next.js for consumer, operator (responsive), and admin. **iOS and Android** (React Native / Expo) are Phase 2 roadmap items, not launch blockers. **Figma** (not Google Labs / Stitch) is the design platform of record: six personas, compliance flows, and board-ready artifacts need a stable design system; Stitch may be used optionally for marketing or ideation spikes only. Academy Xi wireframes flow Figma → production. PostgreSQL + PostGIS is the right choice for "drones/docks near me" and 5 km dock polygons. Redis handles sessions, rate limits, and live position cache. For Phase 1, a **modular monolith** with clear boundaries is acceptable — extract services when mission volume justifies ops overhead. DJI dock telemetry lands via MQTT into AWS IoT Core, then into a telemetry service (TimescaleDB or Influx for time series). Stripe Connect is industry standard for escrow and operator payouts — do not build payments. Mapbox gives control over map UX for consumer delight. All production workloads in Sydney region; DR plan to second AU zone in Phase 2.

### Visual
Stack diagram as layered cake (Presentation → API → Data → External).

---

## Slide 11 — Phased roadmap & investment

### On-slide
| Phase              | Timeline        | Deliverables                                                                                        |
| ------------------ | --------------- | --------------------------------------------------------------------------------------------------- |
| **1 — MVP (Web)**  | **19 Jun 2026** | Web platform: consumer booking, operator portal (responsive), FLIGHT SCORE v1, Stripe escrow, admin |
| **2 — Mobile**     | H2 2026         | **iOS + Android** apps (React Native); push; native operator job cards                              |
| **3 — Enterprise** | 2027            | Portal, API, bulk, invoicing, reseller                                                              |
| **4 — Docks**      | 2027–2028       | DJI Dock 2, partner portal, automated routing                                                       |
| **5 — Scale**      | 2028+           | Safety ML, more vendors, finance integrations                                                       |

**Phase 1 team:** ~10–12 FTE · **Indicative burn:** AUD 1.5–2.5M (web MVP through Jun 2026; mobile/enterprise in later tranches)

### Speaker notes
Do not promise everything at launch. **19 June 2026** is the **web MVP** gate — prove **marketplace liquidity** in the browser: missions booked, completed, paid, rated. Native **iOS and Android** follow in Phase 2 (H2 2026); operators can use responsive web at launch. Phase 3 unlocks **ACV** via enterprise and resellers (EGroup-style security firms). Phase 4 turns docks into network effects and recurring infrastructure revenue. Phase 5 is optimisation and expansion. Academy Xi UX sprint (April 2026) feeds **Figma** wireframes into the web build. Success metrics for board: missions/month, GMV, active operators, median dispatch time by tier, dispute rate <2%, NPS, enterprise logos. Ask slide follows: funding tranche for Phase 1, intro to DJI enterprise partnership, enterprise pilot LOIs.

### Visual
Gantt or four-phase chevron with gates between phases.

---

## Slide 12 — MVP build plan (19 June 2026)

### On-slide
**25 working days · 26 May → 19 Jun · Web MVP only**

| Week  | Focus                                                      | Gate                               |
| ----- | ---------------------------------------------------------- | ---------------------------------- |
| **1** | Pricing engine, visibility rules, auth, marketing shell    | **M1** 1 Jun — bid flow in staging |
| **2** | Stripe 85/15, BEST MATCH SCORE, raw upload, Layer 2 status | **M2** 8 Jun — full two-sided loop |
| **3** | Admin, legal, one-pager, UAT · freeze **14 Jun**           | **M3** 12 Jun — money + processing |
| **4** | RC **16 Jun** → Founding Operators → **GA 19 Jun**         | **M6** — Sydney + Melbourne metro  |

**P0 at launch:** Consumer + mobile operator (own ReOC) + admin · 5 mission categories · Network Price · Price Guide bidding · processed deliverables portal

**Critical path:** Pricing → Visibility → BEST MATCH SCORE → Stripe → Raw upload → Layer 2 → Marketing site live

**Cut-line decision:** 10 Jun if behind schedule (3 categories · price-only rank · GA slip to 26 Jun)

*Detail: `docs/mvp-build-timeline.md` · `docs/stravyx-mvp-build-timeline.pdf`*

### Speaker notes
This slide answers “how do we actually ship by 19 June?” The build is **25 working days** starting **26 May**, not a vague “Q2 launch.” Week 1 locks the **commercial model in code**: **Stravyx Network Price** for customers, **Price Guide** bidding for operators, and **API visibility rules** so operators never see customer total or Layer 2 processing margin — this is non-negotiable founder architecture.

**M1 (1 Jun)** is the first vertical slice in staging: price → bid → confirm with mock payment. **M2 (8 Jun)** proves the money path: Stripe hold on Network Price, **85/15 Layer 1 split**, operator wins on **BEST MATCH SCORE**, raw upload to S3, Layer 2 job visible to the customer. **M3 (12 Jun)** moves Stripe to production test paths and shows processed-deliverable status (manual SLA acceptable at GA). **M4 (14 Jun)** is feature freeze — no dock portals, no native apps, no enterprise API.

Week 3 adds **admin verification**, disputes, legal pages, and the **commercial one-pager** plus **live marketing website** — the DJI credibility gate before partnership outreach. Week 4 is RC (**16 Jun**), soft launch to **Founding Operators** (mobile, own ReOC), and **GA on 19 Jun** with a war-room checklist including **≥50 verified operators**.

Team assumption: **10–12 FTE** (AUD 1.5–2.5M Phase 1). Smaller teams must invoke **cut lines** decided in writing by **10 Jun** if M2 is at risk. Board ask on this slide: endorse the milestone gates and credibility package timing (website + one-pager before DJI intros).

### Visual
Four-week Gantt with M0–M6 diamonds; optional second row showing critical path arrows. Use Stravyx brand colours; keep table readable at 18pt.

---

## Slide 13 — Risks, mitigations & board ask

### On-slide
**Risks:** Supply cold start · DJI API terms · Safety incident · Regulatory change  

**Mitigations:** Founding Operator campaign · Adapter abstraction · Checklists + insurance · Compliance service  

### **Board ask**
1. Approve Phase 1 budget & timeline  
2. Support DJI / CASA partnership introductions  
3. Endorse 2–3 enterprise pilot logos pre-launch  

### Speaker notes
Be direct about risks. **Cold start:** solved by pre-built operator profiles and founding incentives (first 1,400). **DJI dependency:** mitigated by adapter layer and manual operator path. **Safety:** insurance requirements, pre-flight gates, admin intervention, phased automation (human-in-loop on early dock missions). **Regulation:** feature flags and legal monitoring. Close with clear asks — board value is capital, network, and credibility with enterprise and regulators, not day-to-day product decisions.

### Visual
Risk matrix (likelihood × impact) with mitigations; bold "The Ask" box.

---

## Optional Slide 14 — KPI dashboard (appendix)

### On-slide
- GMV · Missions/month · Take rate  
- Active operators · Acceptance rate · Time-to-first-mission  
- Median dispatch time (by urgency)  
- FLIGHT SCORE distribution · Dispute %  
- Dock uptime · Revenue per dock  

### Speaker notes
Use as appendix for finance-focused board members. These metrics map to admin analytics service and investor reporting. Target Phase 1 launch dashboards even if some data is manual initially.

---

## Optional Slide 15 — Competitive positioning (appendix)

### On-slide
- **Not** a drone manufacturer or flight school  
- **Not** generic gig labour (Airtasker) — aviation-compliant, mission-typed  
- **Not** DJI FlightHub alone — we add demand, payments, matching, consumer UX  
- **Stravyx:** National marketplace + escrow + docks + enterprise SLAs  

### Speaker notes
Preempt "why won't DJI/Amazon/Google do this?" DJI sells hardware and fleet tools; we aggregate **demand** and **trust**. General marketplaces lack CASA workflows and operator scoring. First-mover in **AU on-demand drone services network** with dock partnerships is the wedge.

---

## Optional Slide 16 — Q&A

### On-slide
- **Stravyx**  
- Questions?  
- Contact: [CEO / CTO]  
- Appendix: Architecture deep-dive · User journey PDF · Financial model  

### Speaker notes
Park detailed technical questions for appendix. Offer follow-up sessions on security architecture, data model, and integration test plan with technical board members.

---

## Appendix A — Demo flow (if live or video)

1. Open consumer app → select "Roof inspection" → pin location  
2. Show urgency tiers and price range  
3. Show quote list sorted by FLIGHT SCORE  
4. Confirm payment (test mode)  
5. Switch to operator view → job card → accept  
6. Show map tracking Ready → Airborne → Complete  
7. Show deliverable gallery and rating prompt  

---

## Appendix B — Pre-read materials for board pack

1. This slide outline  
2. One-page executive summary PDF (`docs/stravyx-executive-summary.pdf`)  
3. MVP build timeline PDF (`docs/stravyx-mvp-build-timeline.pdf`)  
4. Stravyx User Journey (DRAFT) PDF  
5. Phase 1 budget model (separate spreadsheet)  

---

*End of board slide outline*
