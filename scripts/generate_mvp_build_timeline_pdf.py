#!/usr/bin/env python3
"""Generate Stravyx MVP build timeline PDF (aligned to docs/mvp-build-timeline.md)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-mvp-build-timeline.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - MVP Build Timeline - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "Web MVP - Full Build Breakdown & Timeline",
    "Launch 19 June 2026  |  25 working days  |  10-12 FTE",
    "Stravyx Pty Ltd ACN 696 964 271  |  May 2026  |  CONFIDENTIAL",
  )
  pdf.paragraph(
    "Source: docs/mvp-build-timeline.md. Aligned to Master Business Summary (April 2026). "
    "MVP proves: Stravyx Network Price, Price Guide bidding, BEST MATCH SCORE, Layer 1 (85/15), "
    "Layer 2 processing handoff, live marketing site + one-pager."
  )
  pdf.paragraph("Planning anchor: 26 May 2026 (D1). Platform: web only - consumer, mobile operator (own ReOC), admin.")

  pdf.section("1. Commercial Model at MVP")
  pdf.table_rows(
    ["Element", "MVP build"],
    [
      ["Customer", "Single Stravyx Network Price; processed deliverables in portal"],
      ["Mobile operator", "Price Guide bid; sees flight fee + 85% only"],
      ["BEST MATCH SCORE", "Ranks bids - price, quality, capability, proximity"],
      ["Layer 1", "Stripe 85% operator / 15% Stravyx on flight fee"],
      ["Layer 2", "Queue after raw upload; not visible to operator"],
      ["Supply", "Mobile operators (own ReOC) only at GA"],
      ["Credibility", "Live marketing site + commercial one-pager for DJI"],
    ],
    [38, PAGE_W - 38],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.section("2. P0 Scope")
  pdf.table_rows(
    ["Area", "Deliverable"],
    [
      ["Consumer web", "Wizard, Network Price, pay, tracker, processed output, review"],
      ["Mobile operator web", "Verification, brief, Price Guide bid, fly, raw upload, 85% view"],
      ["Admin", "Verify operators, missions, disputes, pricing config, audit CSV"],
      ["Pricing engine", "Network Price, urgency multipliers, equipment factors, Price Guide"],
      ["Matching", "BEST MATCH SCORE v1, broadcast Urgent/Immediate"],
      ["Processing", "Layer 2 job queue + portal status (manual SLA OK)"],
      ["Marketing", "Professional live website + one-pager PDF"],
    ],
    [32, PAGE_W - 32],
    font_size=7,
    line_h=3.4,
  )

  pdf.subsection("Five live mission categories (of 10)")
  pdf.numbered([
    "Aerial photography and videography",
    "Property and building inspection",
    "Construction / site progress",
    "Event coverage",
    "Security and surveillance",
  ])

  pdf.subsection("Out of scope at 19 Jun")
  pdf.bullets([
    "Stravyx pilot / dock owner portals (ReOC required).",
    "Stravyx Finance in-app checkout (4K Group - parallel track).",
    "Enterprise rate card, API, reseller, patrol block subscriptions.",
    "Full AI processing (manual/placeholder SLA acceptable).",
    "Native iOS/Android apps.",
  ])

  pdf.section("3. Team & Workstreams (10-12 FTE)")
  pdf.table_rows(
    ["Workstream", "FTE"],
    [
      ["Product / design (Figma, visibility rules)", "1.5"],
      ["Platform / backend (pricing, matching, visibility)", "3"],
      ["Consumer + marketing web", "2"],
      ["Operator + admin web", "1"],
      ["Processing / data", "0.5"],
      ["DevOps", "1"],
      ["QA", "1"],
      ["Commercial (one-pager, DJI, ReOC, 4K Group)", "1"],
      ["Compliance", "0.5"],
    ],
    [55, PAGE_W - 55],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.add_page()
  pdf.section("4. Milestones (M0-M6)")
  pdf.table_rows(
    ["Gate", "Date", "Exit criterion"],
    [
      ["M0", "26 May", "Visibility matrix in API spec; founder model locked"],
      ["M1", "1 Jun", "Network Price -> bid -> confirm (staging, mock pay)"],
      ["M2", "8 Jun", "Consumer pay; operator wins; raw upload"],
      ["M3", "12 Jun", "85/15 split; Layer 2 visible in portal"],
      ["M4", "14 Jun", "Feature freeze - P0 only"],
      ["M5", "16 Jun", "RC; marketing site on production domain"],
      ["M6 GA", "19 Jun", "Public booking; Sydney + Melbourne metro"],
    ],
    [12, 22, PAGE_W - 34],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.subsection("Milestone acceptance (summary)")
  pdf.table_rows(
    ["Gate", "Must demonstrate"],
    [
      ["M1", "Staging: mission -> Network Price -> bid -> confirm; API visibility tests pass"],
      ["M2", "Stripe test mode E2E; raw upload; Layer 2 job visible to customer"],
      ["M3", "Prod Stripe 85/15; dispute freeze blocks payout"],
      ["M6", ">= 50 verified operators; war room checklist; one-pager + marketing site live"],
    ],
    [14, PAGE_W - 14],
    font_size=7,
    line_h=3.4,
  )

  pdf.section("5. Week-by-Week Plan")
  pdf.subsection("Week 1 (26 May - 1 Jun) - Foundation")
  pdf.bullets([
    "D1-D2: Figma tokens; pricing + visibility modules; Network Price calculator.",
    "D3-D4: Auth/RBAC; Price Guide; BEST MATCH SCORE formula; bid API.",
    "D5-D6: Marketing shell; audit log; field filters on all API responses.",
    "M1 (1 Jun): Price -> bid -> confirm in staging.",
  ])

  pdf.subsection("Week 2 (2 - 8 Jun) - Core loops")
  pdf.bullets([
    "Consumer: urgency + Network Price; Stripe hold; BEST MATCH SCORE ranking UI.",
    "Operator: brief, bid, winner, address reveal; Ready/Airborne/Complete; raw S3 upload.",
    "Layer 2 job + processed-deliverable state; 85/15 payout; M2 full loop.",
  ])

  pdf.subsection("Week 3 (9 - 15 Jun) - Hardening")
  pdf.bullets([
    "Admin verification queue; Scheduled tier; disputes; legal + one-pager v1.",
    "M4 freeze 14 Jun; UAT D15-D21; DJI credibility sign-off on website.",
  ])

  pdf.subsection("Week 4 (16 - 19 Jun) - Launch")
  pdf.table_rows(
    ["Day", "Date", "Action"],
    [
      ["D22", "16 Jun", "M5 RC; marketing site live on prod domain"],
      ["D23", "17 Jun", "Soft launch: Founding mobile operators"],
      ["D24", "18 Jun", "P0 fixes; ops rehearsal"],
      ["D25", "19 Jun", "M6 GA; war room 08:00-20:00 AEST"],
    ],
    [12, 22, PAGE_W - 34],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.section("6. Feature Epic Breakdown (P0)")
  pdf.table_rows(
    ["Epic", "Key stories", "Week"],
    [
      ["Pricing & visibility", "P-01..P-06: Network Price, urgency, Price Guide, field matrix", "W1-W3"],
      ["Matching & missions", "M-01..M-07: state machine, BEST MATCH SCORE, disputes, audit", "W1-W3"],
      ["Payments & processing", "$-01..$-07: Connect, hold/capture, 85/15, Layer 2 queue", "W2-W3"],
      ["Consumer web", "C-01..C-08: wizard, checkout, tracker, deliverables, review", "W1-W3"],
      ["Operator web", "O-01..O-10: verify, bid, checklist, status, raw upload, earnings", "W1-W3"],
      ["Admin", "A-01..A-05: verification, missions, disputes, config, CSV", "W3"],
      ["Marketing / commercial", "K-01..K-04: site, one-pager, legal, Founding Operator CTA", "W1-W4"],
      ["DevOps & compliance", "D-01..D-05: CI/CD, AWS Sydney, RBAC, CASA copy", "W1-W3"],
    ],
    [38, 118, 18],
    font_size=6.8,
    line_h=3.3,
  )
  pdf.paragraph("Full story IDs and acceptance criteria: docs/mvp-build-timeline.md section 9.")

  pdf.add_page()
  pdf.section("7. Mission Lifecycle")
  pdf.paragraph(
    "DRAFT -> SUBMITTED -> QUOTING (Standard/Scheduled) or DISPATCHING (Immediate/Urgent) -> "
    "CONFIRMED -> READY -> AIRBORNE -> COMPLETE -> IN_REVIEW -> CLOSED (or DISPUTED)."
  )
  pdf.table_rows(
    ["Transition", "Gate", "System action"],
    [
      ["-> CONFIRMED", "Winner + Stripe hold", "Reveal full address"],
      ["READY -> AIRBORNE", "Checklist complete", "Audit log event"],
      ["COMPLETE -> IN_REVIEW", "Raw in S3", "Create Layer 2 job (hidden from operator)"],
      ["IN_REVIEW -> CLOSED", "Processed + review done", "Capture; 85/15 payout"],
    ],
    [38, 38, PAGE_W - 76],
    font_size=7,
    line_h=3.4,
  )

  pdf.subsection("Visibility on API responses")
  pdf.table_rows(
    ["Role", "Sees", "Never sees"],
    [
      ["Customer", "Network Price, processed deliverables", "Operator bids, Layer 2 build-up"],
      ["Mobile operator", "Flight fee, 85% share, Price Guide", "Customer total, processing fee"],
      ["Admin", "Full economics, audit", "-"],
    ],
    [28, 48, PAGE_W - 76],
    font_size=7,
    line_h=3.4,
  )

  pdf.section("8. Backend Modules by Week")
  pdf.table_rows(
    ["Module", "W1", "W2", "W3"],
    [
      ["pricing", "Network Price, urgency", "Price Guide", "Admin tune"],
      ["visibility", "Field matrix", "API tests", "-"],
      ["matching", "-", "BEST MATCH SCORE", "Proximity"],
      ["missions", "State machine", "Bidding", "Disputes"],
      ["payments", "Stub", "Stripe 85/15", "Capture"],
      ["processing", "-", "Layer 2 queue", "SLA monitor"],
      ["compliance", "Checklist", "Ready->Airborne gate", "Audit export"],
    ],
    [28, 38, 38, PAGE_W - 104],
    font_size=7,
    line_h=3.4,
  )

  pdf.section("9. Infrastructure & Environments")
  pdf.table_rows(
    ["Environment", "Purpose", "Ready by"],
    [
      ["Local", "Docker compose API + Postgres + Redis", "D1"],
      ["Staging", "Integration, QA, demos (M1+)", "D3"],
      ["Production", "RC (M5) and GA (M6)", "D16"],
    ],
    [28, 68, PAGE_W - 96],
    font_size=7.5,
    line_h=3.5,
  )
  pdf.bullets([
    "API: NestJS (ap-southeast-2). Web: Next.js consumer, operator, admin, marketing.",
    "Data: RDS PostgreSQL + PostGIS, Redis, S3 + CloudFront. Auth: Auth0 or Cognito.",
    "Payments: Stripe Connect. Maps: Mapbox.",
  ])

  pdf.section("10. QA & UAT Schedule")
  pdf.table_rows(
    ["Phase", "Dates", "Exit"],
    [
      ["Smoke", "W1 daily from D3", "No P0 API regressions"],
      ["Integration", "D8-D14", "M2 sign-off"],
      ["Regression", "D15-D21", "M4 freeze"],
      ["UAT", "D15-D21", "Founder + pilots sign-off D21"],
      ["Launch rehearsal", "D24", "Go/no-go"],
    ],
    [28, 38, PAGE_W - 66],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.add_page()
  pdf.section("11. Risks & Decision Gates")
  pdf.table_rows(
    ["Risk", "Mitigation", "Decision date"],
    [
      ["Stripe Connect onboarding slow", "Founding Operator Connect from D8", "26 May"],
      ["Layer 2 AI not ready", "Manual/placeholder SLA in portal", "12 Jun (M3)"],
      ["< 50 verified operators", "Outreach D1; 48h verification SLA", "15 Jun"],
      ["Scope creep", "M4 freeze; cut lines", "10 Jun (mandatory if behind M2)"],
    ],
    [42, 78, PAGE_W - 120],
    font_size=7,
    line_h=3.4,
  )

  pdf.subsection("Cut lines (choose by EOD 10 Jun if M2 missed)")
  pdf.table_rows(
    ["Option", "Trade-off"],
    [
      ["A", "3 mission categories only at GA"],
      ["B", "Price-only BEST MATCH SCORE (drop rating/capability/proximity)"],
      ["C", "Manual Network Price (flat multipliers)"],
      ["D", "GA slip to 26 Jun (full P0, +1 week)"],
    ],
    [12, PAGE_W - 12],
    font_size=7.5,
    line_h=3.5,
  )
  pdf.paragraph("Only one of A-C may combine with D. Founder + PM decide in writing.")

  pdf.section("12. Parallel Commercial Tracks")
  pdf.table_rows(
    ["Activity", "Window"],
    [
      ["ReOC strategy + HAO identification", "26 May - ongoing"],
      ["4K Group / Stravyx Finance", "26 May - 5 Jun"],
      ["DJI credibility (site + one-pager)", "Complete before 20 Jun outreach"],
      ["Founding mobile operator outreach", "26 May - 19 Jun"],
      ["CASA engagement planning", "Post-GA per founder doc"],
    ],
    [55, PAGE_W - 55],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.section("13. Critical Path")
  pdf.paragraph(
    "Pricing -> Visibility -> Bidding + BEST MATCH SCORE -> Stripe 85/15 -> Raw upload -> "
    "Layer 2 -> Marketing site live -> GA 19 Jun."
  )

  pdf.section("14. Definition of Done (19 Jun GA)")
  pdf.numbered([
    "Customer pays Stravyx Network Price; never sees Layer 1/2 breakdown.",
    "Mobile operator bids in Price Guide; BEST MATCH SCORE selects winner.",
    "Operator uploads raw data; sees 85% of flight fee only.",
    "Customer receives processed deliverable in portal.",
    "Layer 2 fee not exposed to operator.",
    "Marketing website live; one-pager ready for DJI/partners.",
    ">= 50 verified mobile operators in production.",
  ])

  pdf.subsection("Epic delivery heatmap (by week)")
  pdf.table_rows(
    ["Epic", "W1", "W2", "W3", "W4"],
    [
      ["Pricing & visibility", "High", "Med", "Low", "-"],
      ["Matching & missions", "Med", "High", "Med", "-"],
      ["Payments & processing", "Low", "High", "Med", "-"],
      ["Consumer / operator web", "Med", "High", "Med", "Launch"],
      ["Admin / marketing", "Low", "Low", "High", "Launch"],
    ],
    [40, 28, 28, 28, 50],
    font_size=7,
    line_h=3.4,
  )

  pdf.paragraph(
    "Markdown source (full day matrix, Figma handoff): docs/mvp-build-timeline.md. "
    "Founder source: Master Business Summary, April 2026."
  )

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  build_pdf()
