# Stravyx Board Deck — Copy-Paste Blocks for PowerPoint / Google Slides

**How to build the deck (5 minutes)**

| Step | PowerPoint                                             | Google Slides              |
| ---- | ------------------------------------------------------ | -------------------------- |
| 1    | File → New → Blank presentation (16:9)                 | slides.google.com → Blank  |
| 2    | View → Notes (speaker notes pane)                      | View → Show speaker notes  |
| 3    | Per slide below: copy **TITLE** into title placeholder | Same                       |
| 4    | Copy **BODY** into content placeholder                 | Same                       |
| 5    | Copy **SPEAKER NOTES** into notes section              | Click Notes area at bottom |
| 6    | Use **LAYOUT** hint if offered                         | Same                       |
| 7    | Optional appendix: Slides 14–16                        | Same                       |

**Design:** Stravyx brand colours · 1 idea per slide · max 6 bullets · 28pt+ titles · 18–22pt body

**Deck:** 13 main slides (Slide 12 = MVP build plan) · optional appendix 14–16

---

══════════════════════════════════════════════════════════════
SLIDE 1 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title slide (centred)

--- TITLE (copy this) ---
Stravyx

--- SUBTITLE (copy this) ---
Australia's On-Demand Drone Services Network
Platform Architecture & Roadmap
Board Briefing · May 2026
CONFIDENTIAL

--- BODY (leave empty or use subtitle only) ---

--- SPEAKER NOTES (copy this) ---
Open with the vision in one sentence: Stravyx is building the Uber of drone services for Australia — a trusted marketplace connecting people and businesses who need aerial work with CASA-licensed operators and an automated dock network.

This session covers: what we are building, how it works technically, DJI and multi-vendor integration, phased plan to market, and what we need from the board (capital, partnerships, regulatory posture).

--- VISUAL / DESIGNER NOTE ---
Full-bleed hero: drone over Australian landscape or Academy Xi product mockup.

══════════════════════════════════════════════════════════════
SLIDE 2 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content

--- TITLE ---
The Opportunity

--- BODY ---
• Fragmented market: 2,800+ licensed AU operators — no national booking layer
• Use cases: real estate, inspections, events, security, logistics, enterprise portfolios
• Stravyx = marketplace + compliance + payments + dock infrastructure
• We own the transaction, not the aircraft

--- SPEAKER NOTES ---
Australia has thousands of licensed drone operators but no dominant platform for on-demand booking. Today, customers find operators via Google, word of mouth, or bespoke contracts — high friction, inconsistent pricing, weak trust signals, and no live tracking.

Enterprises (rail, agriculture, automotive groups in our pipeline) need SLA-backed, compliant, auditable supply at scale.

Stravyx sits in the middle: we do not need to own every drone. We aggregate supply (operators + docks), standardise demand (10 mission types, four urgency tiers), and capture value on GMV (commission), enterprise contracts, and dock revenue share.

Asset-light at core, with optional hardware revenue via dock partnerships (DJI Dock 2).

--- VISUAL / DESIGNER NOTE ---
Two-column: "Today" (fragmented) vs "With Stravyx" (single app, escrow, tracking).

══════════════════════════════════════════════════════════════
SLIDE 3 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content (use table layout if available)

--- TITLE ---
Who We Serve — Six User Types

--- BODY ---
1. Consumer / SME — Book missions fast
2. Enterprise (direct) — Compliant scale
3. Enterprise (reseller) — White-label supply
4. Licensed operator — Earn with less admin
5. Dock partner — Passive + operational value
6. Platform admin — Safe network operations

Source: Stravyx User Journey (Phase 1 Draft)

--- SPEAKER NOTES ---
The product is not one app for one persona — it is a multi-sided platform.

Consumers and SMEs self-serve via web/mobile. Enterprise direct buyers (property portfolios, rail) need bulk scheduling, team access, invoicing, and SLAs.

Resellers (e.g. security firms) use Stravyx as backend supply; their end clients never touch our UI — critical for B2B2B economics.

Operators are supply: they claim pre-built profiles, pass CASA verification, receive job cards, execute missions, get paid via Stripe Connect.

Dock partners host DJI Dock 2 units in Private, Public, or Hybrid mode (~5 km radius), earning revenue share when the network uses their infrastructure.

Admins run verification queues, live mission oversight, disputes, and compliance.

Board takeaway: revenue and risk scale with each side of this marketplace.

--- VISUAL / DESIGNER NOTE ---
Hub diagram: Stravyx centre, six personas around it.

══════════════════════════════════════════════════════════════
SLIDE 4 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content

--- TITLE ---
How a Mission Works

--- BODY ---
1. Select mission type → dynamic requirements form
2. Choose urgency: Immediate · Urgent · Standard · Scheduled
3. Receive quotes ranked by FLIGHT SCORE
4. Pay → funds held in escrow
5. Track mission: Ready → Airborne → Complete
6. Review deliverables (48h) → release payment → rate operator

--- SPEAKER NOTES ---
Walk through the Consumer/SME journey (User Type 1) as the canonical flow.

Mission type drives a smart form (location, deliverables, hazards). Urgency tier trades speed for price — Immediate/Urgent push to operators in real time; Standard/Scheduled collect competitive quotes.

FLIGHT SCORE is our differentiator: weighted ranking of price, quality, capability, proximity, and history — explained simply in UI so customers choose value, not just cheapest.

Payment is authorised and held in escrow: "Protected until mission complete." Live tracking and push notifications are key delight moments.

After completion: photos, video, reports; 48-hour review window before payout. Proven gig-marketplace flow plus aviation gates (pre-flight checklist, compliance).

--- VISUAL / DESIGNER NOTE ---
Horizontal journey timeline with icons per stage.

══════════════════════════════════════════════════════════════
SLIDE 5 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and two content columns (or two text boxes)

--- TITLE ---
Supply Side: Operators & Docks

--- BODY ---
OPERATORS
• Pre-built profiles
• CASA RePL verification
• Job cards with countdown timer
• In-app pre-flight checklist
• Stripe Connect payouts

DOCKS (DJI Dock 2)
• ~5 km operational radius
• Private / Public / Hybrid modes
• Per-mission revenue share
• Remote monitoring by Stravyx

FOUNDING OPERATOR PROGRAMME
First 1,400 operators: reduced commission, priority dispatch, founding badge

--- SPEAKER NOTES ---
Supply acquisition targets 50% of ~2,800 licensed AU operators pre-registered before launch via "profile already built" outreach.

Operators complete a under-10-minute wizard, upload RePL and insurance, verification target 48 hours.

Job cards show mission type, suburb, urgency, countdown, earnings guide — full address hidden until accept (safety + fairness).

Docks extend the model toward automation: enterprise may start Private (internal fleet), then migrate to Hybrid or Public for passive income. Stravyx handles installation, integration, maintenance SLA — partners see revenue dashboard, not raw hardware.

Dock network density improves dispatch for everyone — a flywheel.

--- VISUAL / DESIGNER NOTE ---
Split: operator phone (job card) + dock with 5 km coverage circle on map.

══════════════════════════════════════════════════════════════
SLIDE 6 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content (diagram-heavy slide)

--- TITLE ---
Platform Architecture

--- BODY ---
CLIENTS
Web · Mobile · Admin · Enterprise API

CORE PLATFORM
Missions · Matching (FLIGHT SCORE) · Dispatch · Payments · Geo · Media · Compliance

DRONE INTEGRATION LAYER
DJI Cloud API / Dock MQTT · Non-DJI adapters (MAVLink, manual)

DATA
PostgreSQL + PostGIS · Redis · S3 · Telemetry time-series DB

Vendor-neutral core · DJI-first integrations · AWS Sydney (AU data residency)

--- SPEAKER NOTES ---
Technical centrepiece: marketplace logic separated from drone connectivity via adapter pattern.

All clients → API gateway + realtime WebSocket. Core services own missions, quotes, escrow, ratings.

Drone Integration Layer normalises telemetry, media, mission commands. DJI Dock 2 via MQTT (Cloud API); operators on DJI use Pilot 2 + Cloud API — not consumer DJI Fly alone. Non-DJI: MAVLink or operator-mediated upload until vendor SDKs added.

Geospatial "near me" on PostGIS. Media on S3 + CDN. Event-driven dispatch, notifications, payouts (Kafka or managed queues).

Built for AWS ap-southeast-2 data residency.

--- VISUAL / DESIGNER NOTE ---
Layered diagram: Clients → Gateway → Core → Integration → Data → External (Stripe, CASA, Maps). This is the anchor visual for the deck.

══════════════════════════════════════════════════════════════
SLIDE 7 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content (table)

--- TITLE ---
DJI & Multi-Vendor Strategy

--- BODY ---
AUTOMATED DOCK
DJI: Dock 2 + Cloud API (MQTT)
Non-DJI: Partner / future adapters

OPERATOR (BRING YOUR OWN DRONE)
DJI: Pilot 2 + Cloud API sync
Non-DJI: MAVLink · vendor SDKs · manual operator app

LIVE VIDEO
DJI: RTMP / WebRTC relay
Non-DJI: Adapter-specific

MEDIA / DELIVERABLES
DJI: Cloud sync → Stravyx storage
Non-DJI: Operator upload to Stravyx

Principle: Stravyx owns the marketplace; DJI owns hardware/protocols where applicable.

--- SPEAKER NOTES ---
DJI Fly (consumer app) is NOT our primary integration path. Enterprise reliability: DJI Cloud API, DJI Pilot 2, Dock 2 / FlightHub-class workflows — 750+ cloud developers globally.

We abstract vendors behind IDroneAdapter so Parrot, Autel, Skydio, custom fleets onboard without rewriting the marketplace.

Early MVP may use manual operator updates (Ready/Airborne/Complete + upload) while DJI telemetry depth rolls out — acceptable if compliance checklist is enforced.

Pursue DJI developer partnership early: API access, co-marketing, dock supply terms. Vendor lock-in mitigated by adapter layer and manual fallback.

--- VISUAL / DESIGNER NOTE ---
Three-layer stack: Stravyx Platform → Adapter Layer → DJI | MAVLink | Manual.

══════════════════════════════════════════════════════════════
SLIDE 8 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content

--- TITLE ---
Trust, Payments & FLIGHT SCORE

--- BODY ---
PAYMENTS
Stripe Connect · Escrow · 48-hour review window · Dispute workflow

FLIGHT SCORE (matching)
Price · Rating · Capability · Distance · History · Founding operator boost

ENTERPRISE
PO invoicing · Reseller billing (Stravyx invoices reseller only)

DOCK PARTNERS
Per-mission revenue share · Monthly statements · Hybrid = internal priority first

--- SPEAKER NOTES ---
Trust is the product. Escrow: customer pays upfront, operator sees confirmed payment, funds release after deliverable acceptance window.

Disputes freeze payout → admin with evidence bundle (GPS track, media hashes, timestamps).

FLIGHT SCORE transparent to operators ("what drives my score") and simple for customers. Commission at release; net payout via Connect in 2–5 business days.

Enterprise and reseller: Stravyx does not bill reseller end-clients — clean B2B2B. Dock partners earn passive income in Public/Hybrid; Hybrid always prioritises internal missions.

Familiar to investors who know Uber, Airbnb, Stripe marketplaces.

--- VISUAL / DESIGNER NOTE ---
Flow: Authorise → Hold in escrow → Mission complete → 48h review → Release OR Dispute.

══════════════════════════════════════════════════════════════
SLIDE 9 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content

--- TITLE ---
Compliance & Safety

--- BODY ---
• CASA RePL and insurance verification on every operator
• Mission-type mapped to licence class requirements
• In-app pre-flight checklist — customer notified at each state change
• Airspace and NOTAM checks via third-party APIs
• Admin live map, anomaly flags, and mission intervention
• Immutable audit trail for regulators

--- SPEAKER NOTES ---
Australia's CASA framework is a moat for compliant platforms and a risk if we cut corners.

Enterprise buyers evaluate risk before technology — pitch leads with compliance, SLA, reliability.

Platform enforces: verified operators only, checklist before Airborne, optional AI safety monitoring (telemetry deviations, unauthorised airspace) on admin dashboards.

BVLOS and advanced operations feature-flagged as regulations evolve. Admin tooling not optional — verification queue high-volume at launch.

Budget compliance counsel and aviation advisors in Phase 1.

--- VISUAL / DESIGNER NOTE ---
Shield + checklist mock; admin live mission map wireframe.

══════════════════════════════════════════════════════════════
SLIDE 10 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content (table — shrink font to 16pt if needed)

--- TITLE ---
Suggested Technology Stack

--- BODY ---
Frontend — Next.js (web) for MVP (19 Jun 2026); React Native iOS/Android in Phase 2 — One team, shared types
Design — Figma (not Google Labs / Stitch) — Design system and dev handoff; Stitch optional for ideation only
API — NestJS (Node) or Go — Realtime + scale telemetry
Data — PostgreSQL + PostGIS, Redis — Geo queries + ACID transactions
Media — S3 + CloudFront — Scale and cost
Realtime — WebSocket + Redis pub/sub — Live mission tracking
IoT (docks) — AWS IoT Core (MQTT) — DJI Dock bridge
Payments — Stripe Connect — Marketplace escrow standard
Maps — Mapbox — Custom map UX
Cloud — AWS ap-southeast-2 (Sydney) — Australian data residency
Observability — Datadog or Grafana — Ops and investor metrics

Phase 1: modular monolith acceptable — extract services when volume justifies.

--- SPEAKER NOTES ---
Stack optimises for speed to MVP and hireability in Australia, not novelty.

Web MVP 19 Jun 2026; mobile apps in H2 2026 roadmap. Figma is design source of truth (six personas, compliance flows). Academy Xi wireframes → Figma → Next.js. PostGIS for "drones/docks near me" and 5 km dock polygons. Redis: sessions, rate limits, live position cache.

Phase 1 modular monolith with clear boundaries — extract microservices when mission volume justifies ops overhead.

DJI dock telemetry: MQTT → AWS IoT Core → telemetry service (TimescaleDB or Influx). Do not build payments — Stripe Connect is standard. Mapbox for consumer map delight. DR to second AU zone in Phase 2.

--- VISUAL / DESIGNER NOTE ---
Layered cake: Presentation → API → Data → External services.

══════════════════════════════════════════════════════════════
SLIDE 11 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content (table)

--- TITLE ---
Phased Roadmap & Investment

--- BODY ---
PHASE 1 — MVP (WEB) — Launch 19 June 2026
Web platform: consumer booking, operator portal (responsive), FLIGHT SCORE v1, Stripe escrow, admin

PHASE 2 — MOBILE (H2 2026)
iOS + Android apps (React Native / Expo); push notifications; native operator job cards

PHASE 3 — ENTERPRISE (2027)
Portal, API, bulk missions, invoicing, reseller accounts

PHASE 4 — DOCK NETWORK (2027–2028)
DJI Dock 2 integration, partner portal, automated routing

PHASE 5 — SCALE (2028+)
Safety ML, additional drone vendors, finance system integrations

Phase 1 team: ~10–12 FTE
Indicative Phase 1 burn: AUD 1.5–2.5M (web MVP through Jun 2026)

--- SPEAKER NOTES ---
Do not promise everything at launch.

19 June 2026 = web MVP only. Prove marketplace liquidity in browser; operators use responsive web until native apps ship.
Phase 2 (H2 2026): iOS + Android — not required for first revenue.
Phase 3: enterprise ACV and resellers (e.g. security firms).
Phase 4: dock network effects and infrastructure revenue.
Phase 5: optimisation and expansion.

Design: Figma (not Google Labs Stitch) for production UI. Academy Xi sprint (April 2026) feeds Figma wireframes into web build.

Success metrics: missions/month, GMV, active operators, median dispatch by tier, dispute rate under 2%, NPS, enterprise logos signed.

--- VISUAL / DESIGNER NOTE ---
Four-phase chevron or Gantt with gates between phases.

══════════════════════════════════════════════════════════════
SLIDE 12 OF 13 — MVP BUILD PLAN
══════════════════════════════════════════════════════════════

LAYOUT: Title and content (table + short bullets)

--- TITLE ---
MVP Build Plan — Launch 19 June 2026

--- BODY ---
25 working days · 26 May → 19 Jun · Web only (consumer + mobile operator + admin)

WEEK 1 (26 May–1 Jun) — Foundation → M1 (1 Jun): Network Price → bid → confirm in staging
WEEK 2 (2–8 Jun) — Core loops → M2 (8 Jun): Stripe 85/15, BEST MATCH SCORE, raw upload
WEEK 3 (9–15 Jun) — Hardening → M3 (12 Jun); feature freeze 14 Jun; UAT + one-pager + live marketing site
WEEK 4 (16–19 Jun) — RC 16 Jun → Founding Operators → GA 19 Jun (Sydney + Melbourne metro)

P0: Stravyx Network Price · Price Guide bidding · BEST MATCH SCORE · 85/15 Layer 1 · Layer 2 portal status · 5 mission categories

Critical path: Pricing → Visibility → Matching → Stripe → Raw upload → Layer 2 → Marketing site live

Cut-line decision: 10 Jun if behind (3 categories · price-only rank · GA slip to 26 Jun)

Detail: docs/mvp-build-timeline.md · docs/stravyx-mvp-build-timeline.pdf

--- SPEAKER NOTES ---
Answers "how do we ship by 19 June?" — 25 working days from 26 May, not a vague Q2 date.

Week 1 locks commercial model in code: Network Price for customers, Price Guide for operators, API visibility so operators never see customer total or Layer 2 margin.

M1 (1 Jun): staging vertical slice with mock pay. M2 (8 Jun): Stripe hold, 85/15 split, BEST MATCH SCORE winner, raw upload, Layer 2 visible to customer. M3 (12 Jun): prod Stripe paths; manual processing SLA OK at GA. M4 (14 Jun): feature freeze — no dock portals, native apps, or enterprise API.

Week 3: admin verification, disputes, legal, commercial one-pager, live marketing website (DJI credibility gate before partnership outreach). Week 4: RC 16 Jun, soft launch Founding Operators (own ReOC), GA 19 Jun with war room and target >= 50 verified operators.

Team: 10–12 FTE; AUD 1.5–2.5M Phase 1. Cut lines decided in writing by 10 Jun if M2 at risk.

Board ask: endorse milestone gates and credibility package timing (site + one-pager before DJI intros).

--- VISUAL / DESIGNER NOTE ---
Four-week Gantt with M0–M6 milestone diamonds; critical path row below. Brand colours; 18pt minimum on table.

══════════════════════════════════════════════════════════════
SLIDE 13 OF 13
══════════════════════════════════════════════════════════════

LAYOUT: Title and content

--- TITLE ---
Risks, Mitigations & The Ask

--- BODY ---
RISKS
Supply cold start · DJI API terms · Safety incident · Regulatory change

MITIGATIONS
Founding Operator campaign (1,400) · Adapter abstraction · Checklists + insurance · Compliance service

THE ASK
1. Approve Phase 1 budget and timeline
2. Support DJI Enterprise and CASA partnership introductions
3. Endorse 2–3 enterprise pilot logos before launch

--- SPEAKER NOTES ---
Be direct about risks.

Cold start: pre-built operator profiles and founding incentives (first 1,400).
DJI dependency: adapter layer and manual operator path.
Safety: insurance requirements, pre-flight gates, admin intervention, human-in-loop on early dock missions.
Regulation: feature flags and legal monitoring.

Close with clear asks. Board value = capital, network, credibility with enterprise and regulators — not day-to-day product decisions.

--- VISUAL / DESIGNER NOTE ---
Risk matrix (likelihood × impact); bold "The Ask" callout box.

---
---
# OPTIONAL APPENDIX SLIDES (copy if needed)
---
---

══════════════════════════════════════════════════════════════
SLIDE 14 (APPENDIX) — KPI Dashboard
══════════════════════════════════════════════════════════════

LAYOUT: Title and content

--- TITLE ---
KPI Dashboard (Appendix)

--- BODY ---
• GMV · Missions per month · Take rate
• Active operators · Acceptance rate · Time to first mission
• Median dispatch time (by urgency tier)
• FLIGHT SCORE distribution · Dispute rate
• Dock uptime · Revenue per dock

--- SPEAKER NOTES ---
For finance-focused board members. Maps to admin analytics and investor reporting. Some metrics may be manual at Phase 1 launch.

--- VISUAL / DESIGNER NOTE ---
Dashboard mockup or metric tiles.

══════════════════════════════════════════════════════════════
SLIDE 15 (APPENDIX) — Competitive Positioning
══════════════════════════════════════════════════════════════

LAYOUT: Title and content

--- TITLE ---
Competitive Positioning

--- BODY ---
We are NOT
• A drone manufacturer or flight school
• Generic gig labour (Airtasker) — we are aviation-compliant and mission-typed
• DJI FlightHub alone — we add demand, payments, matching, consumer UX

Stravyx IS
National marketplace + escrow + dock network + enterprise SLAs

--- SPEAKER NOTES ---
Preempt "why won't DJI/Amazon/Google do this?"

DJI sells hardware and fleet tools; we aggregate demand and trust. General marketplaces lack CASA workflows and operator scoring. First-mover in AU on-demand drone services network with dock partnerships is the wedge.

--- VISUAL / DESIGNER NOTE ---
2×2 positioning matrix or simple "Not / Is" columns.

══════════════════════════════════════════════════════════════
SLIDE 16 (APPENDIX) — Q&A
══════════════════════════════════════════════════════════════

LAYOUT: Title slide (centred)

--- TITLE ---
Questions?

--- SUBTITLE ---
Stravyx
[CEO name] · [CTO name]
[email] · stravyx.com

--- BODY ---
Appendix available:
Architecture deep-dive · User journey PDF · Financial model · Executive summary PDF · MVP build timeline PDF

--- SPEAKER NOTES ---
Park detailed technical questions for follow-up. Offer sessions on security architecture, data model, and DJI integration test plan for technical board members.

--- VISUAL / DESIGNER NOTE ---
Clean closing slide with logo and contact details.

---
---
# QUICK REFERENCE — Slide titles only
---
1. Stravyx (Title)
2. The Opportunity
3. Who We Serve — Six User Types
4. How a Mission Works
5. Supply Side: Operators & Docks
6. Platform Architecture
7. DJI & Multi-Vendor Strategy
8. Trust, Payments & FLIGHT SCORE
9. Compliance & Safety
10. Suggested Technology Stack
11. Phased Roadmap & Investment
12. MVP Build Plan — Launch 19 June 2026
13. Risks, Mitigations & The Ask
14. KPI Dashboard (Appendix) — optional
15. Competitive Positioning (Appendix) — optional
16. Questions? (Appendix) — optional

---
*End of copy-paste deck · Stravyx Board Briefing May 2026*
