# Figma Make Frontend — Spec Alignment Gap Review

> **Status:** Re-reviewed (25 Jul 2026) — **conditional GO for demo MVP build** (see §12)  
> **Prototype:** [Stravyx v.2 Pre-alpha](https://otter-duct-93081646.figma.site/) (Figma Make; bundle dated **2026-07-24 07:26 UTC**; prior review was 2026-07-08)  
> **Authoritative spec:** [`data-model-erd.md`](./data-model-erd.md) **v0.3** (first-to-accept dispatch, visibility firewall)  
> **Supporting specs:** [`mvp-build-timeline.md`](./mvp-build-timeline.md), [`executive-summary.md`](./executive-summary.md), [`dji-frontend-integration.md`](./dji-frontend-integration.md)  
> **Scope note:** This review captured the Make prototype (Jul 2026). Alignment is **prototype UI ↔ product/data specs**, not live API contract tests.  
> **Later (2026-08-11):** Account **Switch View** / `ViewToggle` was removed from `apps/app-web`. Role shell follows JWT `/me` only; remaining P1 for this row is Terms/Privacy links, not the demo switcher.

---

## 1. Verdict

The Make prototype is a **strong customer-booking demo** with a workable multi-role shell, but it is **not yet a build source of truth**. Two **critical visibility leaks** and several **major domain mismatches** (statuses, pricing engine, operator/admin ops) must be fixed before engineering treats frames as implementation targets.

| Signal | Count |
|---|---|
| Critical gaps | 2 |
| Major gaps | 6 |
| Minor / scope gaps | 3 |
| Already aligned | 7+ areas |

**Baseline rule:** Where MVP timeline / exec summary still describe **Price Guide bidding** and **BEST MATCH SCORE**, prefer **ERD v0.3** (bidding retired; first-to-accept). The prototype correctly follows the newer dispatch model.

---

## 2. What was reviewed

### 2.1 Surfaces (same URL for all)

All of the following resolve to one SPA at `/`:

| Intended surface | URL | How you reach it in the prototype |
|---|---|---|
| Login / register | `https://otter-duct-93081646.figma.site/` | Default entry |
| Customer | same | Sign In (any credentials) → customer home |
| Operator | same | Account → **Switch View** → Operator |
| Admin | same | Account → **Switch View** → Admin |

There are **no path-based role routes** (`/admin`, `/operator`, etc.).

### 2.2 Prototype inventory (what exists)

| Role | Present |
|---|---|
| **Auth** | Sign in, forgot password, Create account → Customer vs Operator, Google button (mock), Terms/Privacy labels |
| **Customer** | Home, Book a Job wizard (service → location → AI requirements chat → timing → review), My Jobs, Alerts, Account, active-job tracker timeline, service catalogue cards, Host a Node CTA |
| **Operator** | Dashboard (online toggle, available jobs, accept / start / complete), Activity, Verify ID (photo ID + licence card), Profile, Cash Out / earnings |
| **Admin** | Dashboard metrics, Revenue Breakdown (85/15 + L2 100%), All Jobs table |

---

## 3. Already aligned

These areas match current product direction (ERD v0.3 + commercial model) well enough to keep.

| Area | Prototype behaviour | Spec match |
|---|---|---|
| **Dispatch model** | No bid form, no Price Guide, no BEST MATCH SCORE. Jobs are matched; operator **Accept**s. Copy: “Get Matched Instantly”, “Auto-dispatch”. | First-to-accept; bidding retired |
| **Urgency tiers** | `SCHEDULED` 0.85 · `STANDARD` 1.0 · `URGENT` 1.35 · `IMMEDIATE` 2.25 with sensible time windows | Four `urgency_tiers` with multipliers + dispatch feel |
| **Layer split (admin)** | Admin Revenue Breakdown: Flight Fees (Operators 85%), Network Fee (15%), Data Processing (100%) | Admin/system may see full L1/L2 |
| **Operator earnings math** | Offer cards use `flightFee × 0.85` for displayed earn | Operator sees 85% of flight fee only (intent) |
| **~70/30 commercial split** | `totalPrice = flightFee × 1.4` ≈ 71% L1 / 29% L2 | Roughly matches ~70% flight / ~30% processing |
| **Customer booking shell** | Multi-step wizard, urgency, duration, AI brief, jobs list, tracker, notifications, account | Covers shape of C-01–C-08 (mock depth) |
| **Sydney-centric geo** | Default map / address suggestions around Sydney CBD | MVP metro focus |

**Keep these patterns** when revising Make — especially first-to-accept and admin-only full revenue breakdown.

---

## 4. Critical gaps (P0 — fix before build handoff)

### 4.1 Customer sees L1 / L2 fee breakdown

| | |
|---|---|
| **Where** | Booking **Review** screen: Total + “Flight service” + “AI data processing” |
| **Why it fails** | Customer visibility layer must show a **single Stravyx Network Price** only. Layer 2 processing margin must be structurally invisible to customers (and to operators). |
| **Spec** | ERD §0 (five visibility layers); exec summary “Information architecture”; MVP visibility DoD |
| **Fix** | Show one Network Price (and optional duration/urgency explanation). Remove L1/L2 line items from customer UI. Keep breakdown on **Admin** only. |

### 4.2 Full address shown to operators before accept

| | |
|---|---|
| **Where** | Operator “Available Jobs Near You” cards render `location.address` |
| **Why it fails** | Pre-accept offers must show **suburb only**; full address is revealed after first-to-accept win. |
| **Spec** | ERD §2b; O-03 mission brief; O-06 win → address |
| **Fix** | Offer card: suburb / area label only. Post-accept / current job: full address + map. |

---

## 5. Major gaps (P1)

### 5.1 Mission status machine does not match ERD

| Prototype tracker | ERD v0.3 status | Notes |
|---|---|---|
| `submitted` | `booked` | After pay/hold |
| `matching` | `dispatched` | Offers fanned out |
| `confirmed` | `accepted` | First accept wins |
| — | `allocated` | Pilot or dock assigned (missing) |
| — | `assessed` | Restricted-ops RP sign-off (missing) |
| `enroute` / `onsite` | — | Fine as UX substeps, not DB statuses |
| `flying` | `flown` | After compliance gate |
| `processing` | — | Belongs to `processing_jobs`, not `missions.status` |
| `complete` | `delivered` | Deliverables ready |
| — | `disputed` / `cancelled` | Missing branches |

**Fix:** Remap tracker labels to ERD statuses (or map UX steps → underlying status explicitly in a legend). Add allocated / assessed / disputed / cancelled. Do not use “processing” as a mission status.

### 5.2 Pricing engine ≠ Network Price formula

| Prototype | Spec |
|---|---|
| `flightFee = service.basePrice × (durationMinutes / 30) × urgencyMultiplier` | `base_rate ($250/hr) × equipment_factor × urgency` |
| Catalogue “from $150 / $200 / $300 / $500” | Versioned `pricing_configs`; mission snapshots config at booking |
| Money as display dollars | Store **integer cents** + `AUD` |

**Fix:** Drive quote UI from Network Price formula; treat catalogue “from” prices as marketing only or remove them from the quote path. Show one total to the customer.

### 5.3 Operator credentials incomplete

| Present | Missing vs O-01 / ERD |
|---|---|
| RePL number on signup | **ReOC** credential upload |
| Photo ID verification | **Insurance** credential upload |
| Decorative “CASA Registered” ID card | Admin **approve/reject** queue with reason |
| | Expiry handling (`pending \| approved \| rejected \| expired`) |

**Fix:** Credential upload set = RePL + ReOC + insurance; wire Admin verification queue (A-01).

### 5.4 Operator mission ops incomplete

| Present | Missing |
|---|---|
| Online / offline | **Decline** offer (and expired state) |
| Accept | Offer expiry / “already taken” |
| Begin / Start Job · Mark Complete | Pre-flight **compliance checklist** (blocks airborne) |
| Cash Out | **Raw media upload** (S3) triggering Layer 2 |
| | Suburb-only brief → address after accept (see P0) |

**Fix:** Complete O-03–O-10 flow on operator screens before calling the prototype “MVP-complete”.

### 5.5 Admin ops incomplete

| Present | Missing (A-01–A-05) |
|---|---|
| Totals, revenue split, All Jobs + Total Price | Operator **verification queue** |
| | **Dispute freeze** (blocks payout / progress) |
| | **Pricing / visibility config** |
| | **Audit CSV** export |

**Fix:** Add admin ops screens; keep revenue breakdown as-is (aligned).

### 5.6 Auth, legal links, and role architecture

| Issue | Detail |
|---|---|
| Mock auth | Sign In accepts any email/password |
| Google CTA | Button only — no OAuth |
| Terms / Privacy | Styled as links; **no `href`** — dead |
| Role switcher | Account → Switch View is demo-only |
| Apps | Specs expect `consumer-web` · `operator-web` · `admin-web` (or hard RBAC routes) |

**Fix:** For Make: at least link Terms/Privacy; document Switch View as demo. For build: Auth0/Cognito + separate apps/routes; never ship client-side role impersonation without audit.

---

## 6. Minor / scope gaps (P2)

| ID | Gap | Guidance |
|---|---|---|
| **M1** | Home shows **4** service cards; schema has 10 categories with **5** `mvp_enabled` | Confirm launch set of 5; add/remove cards to match |
| **M2** | **Host a Node** / dock hosting is prominent on customer home | Post-MVP / dock-owner persona; demote or gate — ERD docks are ReOC-operated for MVP schema |
| **M3** | Payment = mock confirm; thin rating / 48h review / Stripe hold | Acceptable for Make; must be real in MVP build (C-04, C-07, $-*) |
| **M4** | Live map / telemetry / livestream | Phase 1 per DJI frontend docs — not required for Make MVP parity |

---

## 7. Interaction checklist

| Control | Result | Status |
|---|---|---|
| Sign In | Enters customer home (mock) | Works (mock) |
| Forgot password → Back | Reset form works | Works (mock) |
| Create one → Customer / Operator | Role choose works | Works |
| Continue with Google | No OAuth | Broken / mock |
| Terms of Service / Privacy Policy | Non-navigating spans | Broken |
| Signup Continue | Gated on local validation | Works |
| Book a Job / service Book | Opens wizard | Works |
| Sidebar Home / My Jobs / Alerts / Account | In-app navigation | Works |
| Active job “Finding operator…” | Opens tracker | Works |
| Switch View → Operator / Admin | Demo role swap | Works (demo only) |
| Operator Accept / Start / Complete | Present | Partial |
| Operator Decline / upload / checklist | Absent | Missing |
| Admin verification / dispute / audit / pricing | Absent | Missing |
| Deep links `/admin` `/operator` `/customer` | Same SPA at `/` | Missing |

---

## 8. What needs to be fixed (prioritised backlog)

### P0 — Visibility firewall (do first)

1. Customer checkout: **one Network Price** only — remove Flight service / AI processing split.
2. Operator offers: **suburb only** until accept; reveal full address after win.
3. Regression check: operator earnings never show customer `totalPrice` or L2 line.

### P1 — Domain sync

4. Remap mission statuses to ERD (`booked` … `delivered` + `disputed`/`cancelled`).
5. Quote from **$250/hr × equipment × urgency** (cents); drop engine dependency on catalogue “from $X”.
6. Operator credentials: RePL + **ReOC** + **insurance**; Admin verification queue.
7. Operator ops: Decline, expiry / already-taken, checklist, raw upload.
8. Admin ops: dispute freeze, pricing config, audit CSV.
9. Auth/legal: real links for Terms/Privacy; document mock Google/Sign In.

### P2 — Product shell & scope

10. Plan split into `consumer-web` / `operator-web` / `admin-web` (retire Switch View for production).
11. Align category count to 5 MVP-enabled.
12. Demote Host a Node to post-MVP / separate persona.
13. Stub payment hold + review/rating window for later wiring.

---

## 9. Recommended “definition of ready” for Make → eng

Do **not** hand frames to engineering until:

- [ ] P0 visibility items (customer price + operator address) are fixed in Make
- [ ] Status labels map 1:1 to ERD enums (or a published mapping table lives next to the frames)
- [ ] Operator happy path includes Accept **and** post-accept address + checklist + upload placeholders
- [ ] Admin includes verification + dispute placeholders (even if non-functional)
- [ ] Frame index uses `{app}/{feature}/{screen}` naming per MVP timeline §5.1
- [ ] Explicit note on each money screen: **which visibility layer** may see which fields

---

## 10. Spec conflict reminder (for readers)

| Topic | Older MVP / exec docs | ERD v0.3 (use this) |
|---|---|---|
| Dispatch | Bid within Price Guide; BEST MATCH SCORE | **First-to-accept**; no bids / guides / ranking |
| Mission status | Ready → Airborne → Complete → In Review… | `draft → booked → dispatched → accepted → allocated → assessed → flown → delivered` |
| Payments | Stripe assumed | Provider-agnostic `provider_*_ref` |

The Figma Make prototype already follows the **newer** dispatch model. Update older board/MVP wording so design and eng do not reintroduce bidding UX.

---

## 11. Related artefacts

| Artefact | Location |
|---|---|
| Data model (authoritative) | [`docs/data-model-erd.md`](./data-model-erd.md) |
| MVP epics | [`docs/mvp-build-timeline.md`](./mvp-build-timeline.md) §9 |
| Frontend route map | [`docs/dji-frontend-integration.md`](./dji-frontend-integration.md) |
| Live prototype | https://otter-duct-93081646.figma.site/ |

---

## 12. Re-review (24–25 Jul 2026) — demo MVP build readiness

**Bundle:** `214954030b880f7cf3b22db6b3faac89bbff5879` · created `2026-07-24 07:26:09 UTC` (~600 KB; prior ~378 KB). New operator navigation component and clearer customer/operator/admin split in source paths.

### 12.1 P0 / P1 scorecard vs prior review

| ID | Gap (18 Jul) | Status after update | Notes |
|---|---|---|---|
| **P0** Customer L1/L2 fee split on Review | **Fixed** | Review shows single **Total** only; “Flight service” / “AI data processing” labels gone |
| **P0** Full street on operator offers | **Mostly fixed** | Offer cards use `address.split(",")[1]` (suburb-ish) + distance; full address still on post-accept / navigation (correct). Fragile if address format lacks a comma |
| **P1** Mission statuses ≠ ERD | **Open** | Still `submitted → matching → confirmed → enroute → onsite → flying → processing → complete` |
| **P1** Pricing ≠ $250/hr × equipment × urgency | **Open** | Still `basePrice × (duration/30) × urgency`; `totalPrice = flightFee × 1.4` internally |
| **P1** ReOC + insurance credentials | **Open** | RePL + photo ID only; no ReOC upload; “insurance” is marketing copy, not credential flow |
| **P1** Operator Decline / checklist / raw upload | **Open** | Accept / Start / Complete / nav remain; no Decline, checklist, or raw upload |
| **P1** Admin verify / dispute / audit / pricing | **Open** | Still metrics + revenue split + All Jobs |
| **P1** Auth / Terms / Privacy / role apps | **Partial** | Terms/Privacy still non-href; Switch View removed 2026-08-11 (`/me` role shell) |
| Dispatch = first-to-accept | **Still aligned** | No Price Guide / BEST MATCH / bid UX |
| Urgency tiers + admin 85/15/L2 | **Still aligned** | Unchanged and correct |
| Operator 85% earn math | **Still aligned** | `flightFee × 0.85` on offers |

**Residual visibility nits (not P0 blockers for demo):** Job history can show `Flight $…` separately from total — prefer one Network Price on all customer money surfaces.

### 12.2 Demo MVP build — go / no-go

| Question | Answer |
|---|---|
| **Start coding a demo MVP now?** | **Yes — conditional GO** |
| Treat Make as pixel/schema source of truth? | **No** — UX flows + screen inventory only |
| Implement data model from? | **ERD v0.3** (statuses, offers, cents, visibility projections) |
| Blocked on more Make work? | **No** for a staged demo; yes if you need design-complete operator/admin ops first |

**Safe to build for demo if eng locks these rules day one:**

1. API visibility: customer = one Network Price; operator offers = suburb only until accept; never return L2 fields to customer/operator.
2. Persist ERD mission statuses (`booked`…`delivered`), map UI labels in the frontend if needed.
3. Price with `$250/hr × equipment × urgency` (cents); ignore catalogue `basePrice` / `×1.4` as Make scaffolding.
4. Ship vertical slice first: auth → book → pay(mock) → dispatch offer → accept → status → raw upload stub → admin list — leave dispute/audit/Host-a-Node for later.

**Do not wait for** perfect Make parity on Decline, checklist, ReOC uploads, or admin dispute — stub those screens against the ERD while building.

### 12.3 Suggested demo MVP cut line

| In for first demo | Defer |
|---|---|
| Customer book + single price + track | Live DJI map / video |
| Operator online + offer (suburb) + accept + status | Bidding (retired) |
| Admin job list + verification stub | Dispute freeze, audit CSV, pricing admin |
| Mock pay / mock auth OK | Production Auth0 + real rail |
| 4–5 categories | Host a Node / dock owner portal |

---

*Initial review (18 Jul): published site HTML/JS + crawl. Re-review (25 Jul): new bundle JS inspection vs P0/P1 backlog and ERD v0.3.*
