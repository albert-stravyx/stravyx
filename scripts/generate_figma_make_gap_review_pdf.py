#!/usr/bin/env python3
"""Generate Stravyx Figma Make frontend gap-review PDF (aligned to docs/figma-make-frontend-gap-review.md)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-figma-make-frontend-gap-review.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - Figma Make Frontend Gap Review - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "Figma Make Frontend - Spec Alignment Gap Review",
    "Prototype vs ERD v0.3  |  Critical visibility leaks  |  P0-P2 fix backlog",
    "Stravyx Pty Ltd ACN 696 964 271  |  Jul 2026  |  CONFIDENTIAL",
  )
  pdf.paragraph(
    "Source: docs/figma-make-frontend-gap-review.md. Prototype: https://otter-duct-93081646.figma.site/ "
    "(Stravyx v.2 Pre-alpha, Figma Make, bundle 2026-07-08). Authoritative spec: docs/data-model-erd.md v0.3 "
    "(first-to-accept, visibility firewall). Supporting: mvp-build-timeline.md, executive-summary.md, "
    "dji-frontend-integration.md."
  )
  pdf.paragraph(
    "This review captured the Make prototype (Jul 2026). Alignment is prototype UI to product/data specs, "
    "not live API contract tests. Later (2026-08-11): Account Switch View / ViewToggle was removed from "
    "apps/app-web; the SPA shell follows JWT /me only. Remaining P1 is Terms/Privacy links, not a demo switcher."
  )

  pdf.section("1. Verdict")
  pdf.paragraph(
    "Strong customer-booking demo with a workable multi-role shell, but not yet a build source of truth. "
    "Two critical visibility leaks and several major domain mismatches (statuses, pricing engine, "
    "operator/admin ops) must be fixed before engineering treats frames as implementation targets."
  )
  pdf.table_rows(
    ["Signal", "Count"],
    [
      ["Critical gaps", "2"],
      ["Major gaps", "6"],
      ["Minor / scope gaps", "3"],
      ["Already aligned", "7+ areas"],
    ],
    [50, PAGE_W - 50],
    font_size=8,
    line_h=3.6,
  )
  pdf.paragraph(
    "Baseline rule: where older MVP/exec docs still describe Price Guide bidding and BEST MATCH SCORE, "
    "prefer ERD v0.3 (bidding retired; first-to-accept). The prototype correctly follows the newer dispatch model."
  )

  pdf.section("2. What Was Reviewed")
  pdf.subsection("2.1 Surfaces (same URL for all)")
  pdf.paragraph(
    "Admin, Operator, Customer, and login/register all resolve to one SPA at /. Role changes use "
    "Account -> Switch View (demo). No path-based role routes (/admin, /operator, etc.)."
  )
  pdf.table_rows(
    ["Intended surface", "How reached in prototype"],
    [
      ["Login / register", "Default entry at /"],
      ["Customer", "Sign In (any credentials) -> customer home"],
      ["Operator", "Account -> Switch View -> Operator"],
      ["Admin", "Account -> Switch View -> Admin"],
    ],
    [40, PAGE_W - 40],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.subsection("2.2 Prototype inventory")
  pdf.table_rows(
    ["Role", "Present"],
    [
      ["Auth", "Sign in, forgot password, Create account (Customer/Operator), Google (mock), Terms/Privacy labels"],
      ["Customer", "Home, Book wizard, My Jobs, Alerts, Account, tracker, catalogue, Host a Node CTA"],
      ["Operator", "Dashboard (online, jobs, accept/start/complete), Activity, Verify ID, Profile, Cash Out"],
      ["Admin", "Metrics, Revenue Breakdown (85/15 + L2 100%), All Jobs table"],
    ],
    [22, PAGE_W - 22],
    font_size=7,
    line_h=3.4,
  )

  pdf.add_page()
  pdf.section("3. Already Aligned")
  pdf.paragraph("Keep these patterns when revising Make - especially first-to-accept and admin-only full revenue breakdown.")
  pdf.table_rows(
    ["Area", "Prototype", "Spec match"],
    [
      ["Dispatch", "No bid / Price Guide / BEST MATCH; Accept jobs", "First-to-accept; bidding retired"],
      ["Urgency tiers", "0.85 / 1.0 / 1.35 / 2.25 with time windows", "Four urgency_tiers"],
      ["Admin L1/L2", "85% / 15% / Data Processing 100%", "Admin may see full split"],
      ["Operator earn", "flightFee x 0.85 on offer cards", "85% of flight fee only"],
      ["~70/30 split", "totalPrice = flightFee x 1.4", "Roughly ~70% L1 / ~30% L2"],
      ["Customer shell", "Wizard, urgency, jobs, tracker, alerts", "Shape of C-01-C-08 (mock depth)"],
      ["Geo focus", "Sydney CBD defaults", "MVP metro focus"],
    ],
    [28, 55, PAGE_W - 83],
    font_size=7,
    line_h=3.4,
  )

  pdf.section("4. Critical Gaps (P0)")
  pdf.subsection("4.1 Customer sees L1 / L2 fee breakdown")
  pdf.bullets([
    "Where: Booking Review shows Total + Flight service + AI data processing.",
    "Why: Customer must see a single Stravyx Network Price; Layer 2 margin must be invisible.",
    "Fix: One Network Price on customer UI. Keep breakdown on Admin only.",
  ])
  pdf.subsection("4.2 Full address shown to operators before accept")
  pdf.bullets([
    "Where: Operator Available Jobs cards render location.address (full street).",
    "Why: Pre-accept offers must show suburb only; full address after first-to-accept win.",
    "Fix: Suburb/area on offer card; full address + map post-accept / current job.",
  ])

  pdf.section("5. Major Gaps (P1)")
  pdf.subsection("5.1 Mission status machine")
  pdf.table_rows(
    ["Prototype", "ERD v0.3", "Notes"],
    [
      ["submitted", "booked", "After pay/hold"],
      ["matching", "dispatched", "Offers fanned out"],
      ["confirmed", "accepted", "First accept wins"],
      ["-", "allocated", "Pilot/dock assign (missing)"],
      ["-", "assessed", "Restricted-ops RP (missing)"],
      ["enroute / onsite", "-", "UX substeps only"],
      ["flying", "flown", "After compliance gate"],
      ["processing", "-", "processing_jobs, not mission status"],
      ["complete", "delivered", "Deliverables ready"],
      ["-", "disputed / cancelled", "Missing branches"],
    ],
    [35, 35, PAGE_W - 70],
    font_size=7,
    line_h=3.3,
  )
  pdf.paragraph(
    "Fix: Remap tracker to ERD statuses (or publish an explicit UX-to-status mapping). "
    "Add allocated / assessed / disputed / cancelled. Do not use processing as a mission status."
  )

  pdf.add_page()
  pdf.subsection("5.2 Pricing engine != Network Price formula")
  pdf.table_rows(
    ["Prototype", "Spec"],
    [
      ["flightFee = basePrice x (duration/30) x urgency", "base $250/hr x equipment_factor x urgency"],
      ["Catalogue from $150 / $200 / $300 / $500", "Versioned pricing_configs; snapshot at booking"],
      ["Display dollars", "Integer cents + AUD"],
    ],
    [55, PAGE_W - 55],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.subsection("5.3 Operator credentials incomplete")
  pdf.bullets([
    "Present: RePL number, photo ID, decorative CASA ID card.",
    "Missing: ReOC upload, insurance upload, admin approve/reject queue with reason, expiry states.",
  ])

  pdf.subsection("5.4 Operator mission ops incomplete")
  pdf.bullets([
    "Present: Online/offline, Accept, Begin/Start, Mark Complete, Cash Out.",
    "Missing: Decline, offer expiry / already-taken, pre-flight checklist, raw S3 upload, suburb-only brief.",
  ])

  pdf.subsection("5.5 Admin ops incomplete")
  pdf.bullets([
    "Present: Totals, revenue split, All Jobs + Total Price.",
    "Missing: Verification queue (A-01), dispute freeze (A-03), pricing/visibility config (A-04), audit CSV (A-05).",
  ])

  pdf.subsection("5.6 Auth, legal links, role architecture")
  pdf.bullets([
    "Mock auth (any credentials); Google CTA has no OAuth.",
    "Terms / Privacy styled as links but have no href.",
    "Switch View is demo-only; specs expect consumer-web / operator-web / admin-web (or hard RBAC routes).",
  ])

  pdf.section("6. Minor / Scope Gaps (P2)")
  pdf.table_rows(
    ["ID", "Gap", "Guidance"],
    [
      ["M1", "4 service cards vs 5 mvp_enabled categories", "Align launch set of 5"],
      ["M2", "Host a Node prominent on customer home", "Demote; post-MVP / dock-owner persona"],
      ["M3", "Mock pay; thin rating / 48h review", "OK for Make; required in MVP build"],
      ["M4", "No live map / telemetry / livestream", "Phase 1 per DJI frontend docs"],
    ],
    [12, 48, PAGE_W - 60],
    font_size=7,
    line_h=3.4,
  )

  pdf.add_page()
  pdf.section("7. Interaction Checklist")
  pdf.table_rows(
    ["Control", "Result", "Status"],
    [
      ["Sign In", "Enters customer home (mock)", "Works (mock)"],
      ["Forgot password", "Reset form; back works", "Works (mock)"],
      ["Create one", "Customer / Operator paths", "Works"],
      ["Continue with Google", "No OAuth", "Broken / mock"],
      ["Terms / Privacy", "Non-navigating spans", "Broken"],
      ["Book a Job", "Opens wizard", "Works"],
      ["Sidebar nav", "Home / Jobs / Alerts / Account", "Works"],
      ["Active job pill", "Opens tracker", "Works"],
      ["Switch View", "Demo role swap", "Works (demo)"],
      ["Operator Accept path", "Accept / Start / Complete", "Partial"],
      ["Operator Decline / upload / checklist", "Absent", "Missing"],
      ["Admin verify / dispute / audit / pricing", "Absent", "Missing"],
      ["Deep links /admin /operator", "Same SPA at /", "Missing"],
    ],
    [42, 55, PAGE_W - 97],
    font_size=6.5,
    line_h=3.2,
  )

  pdf.section("8. Prioritised Fix Backlog")
  pdf.subsection("P0 - Visibility firewall (do first)")
  pdf.numbered([
    "Customer checkout: one Network Price only - remove Flight service / AI processing split.",
    "Operator offers: suburb only until accept; reveal full address after win.",
    "Regression: operator earnings never show customer totalPrice or L2.",
  ])
  pdf.subsection("P1 - Domain sync")
  pdf.numbered([
    "Remap mission statuses to ERD (incl. allocated / assessed / disputed / cancelled).",
    "Quote from $250/hr x equipment x urgency (cents); drop engine dependency on catalogue from $X.",
    "Operator credentials: RePL + ReOC + insurance; Admin verification queue.",
    "Operator ops: Decline, expiry / already-taken, checklist, raw upload.",
    "Admin ops: dispute freeze, pricing config, audit CSV.",
    "Auth/legal: real Terms/Privacy links; document mock Google/Sign In.",
  ])
  pdf.subsection("P2 - Product shell and scope")
  pdf.numbered([
    "Plan split into consumer-web / operator-web / admin-web (retire Switch View for production).",
    "Align category count to 5 MVP-enabled.",
    "Demote Host a Node to post-MVP / separate persona.",
    "Stub payment hold + review/rating window for later wiring.",
  ])

  pdf.section("9. Definition of Ready (Make -> Eng)")
  pdf.bullets([
    "P0 visibility items (customer price + operator address) fixed in Make.",
    "Status labels map 1:1 to ERD enums (or published mapping table beside frames).",
    "Operator happy path includes Accept and post-accept address + checklist + upload placeholders.",
    "Admin includes verification + dispute placeholders (even if non-functional).",
    "Frame index uses {app}/{feature}/{screen} naming per MVP timeline section 5.1.",
    "Each money screen states which visibility layer may see which fields.",
  ])

  pdf.add_page()
  pdf.section("10. Spec Conflict Reminder")
  pdf.table_rows(
    ["Topic", "Older MVP / exec docs", "ERD v0.3 (use this)"],
    [
      ["Dispatch", "Bid within Price Guide; BEST MATCH SCORE", "First-to-accept; no bids / guides / ranking"],
      ["Mission status", "Ready -> Airborne -> Complete -> In Review", "draft -> booked -> ... -> delivered"],
      ["Payments", "Stripe assumed", "Provider-agnostic provider_*_ref"],
    ],
    [28, 55, PAGE_W - 83],
    font_size=7,
    line_h=3.5,
  )
  pdf.paragraph(
    "The Figma Make prototype already follows the newer dispatch model. Update older board/MVP wording "
    "so design and eng do not reintroduce bidding UX."
  )

  pdf.section("11. Related Artefacts")
  pdf.table_rows(
    ["Artefact", "Location"],
    [
      ["Gap review (Markdown source)", "docs/figma-make-frontend-gap-review.md"],
      ["Data model (authoritative)", "docs/data-model-erd.md"],
      ["MVP epics", "docs/mvp-build-timeline.md section 9"],
      ["Frontend route map", "docs/dji-frontend-integration.md"],
      ["Live prototype", "https://otter-duct-93081646.figma.site/"],
    ],
    [45, PAGE_W - 45],
    font_size=7.5,
    line_h=3.5,
  )
  pdf.paragraph(
    "Review method: published site HTML/JS bundle inspection + interactive crawl of login, signup, "
    "customer shell, and role-switch surfaces; compared to ERD v0.3 and MVP epic lists. Reviewed 18 Jul 2026."
  )

  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
  build_pdf()
