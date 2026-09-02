#!/usr/bin/env python3
"""Generate Stravyx executive summary PDF (aligned to Master Business Summary, April 2026)."""

import sys
from pathlib import Path
from typing import List, Tuple

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-executive-summary.pdf"
COMPANY = "Stravyx Pty Ltd  |  ACN 696 964 271  |  stravyx.com"


def build_mission_section(pdf: StravyxPDF) -> None:
  pdf.add_page()
  pdf.section("5. Mission Flow & Catalogue")
  pdf.paragraph(
    "Mission Service owns lifecycle from customer intent through raw delivery, Layer 2 processing, "
    "and closure. Matching runs BEST MATCH SCORE on operator bids within the Price Guide."
  )
  pdf.subsection("Lifecycle")
  pdf.bullets([
    "DRAFT -> SUBMITTED: requirements locked; Network Price or bidding begins.",
    "QUOTING (Standard/Scheduled): mobile operators bid within Price Guide; BEST MATCH SCORE ranks.",
    "DISPATCHING (Immediate/Urgent): broadcast brief; auto or accept.",
    "CONFIRMED: winner selected; payment authorised; full address revealed.",
    "READY -> AIRBORNE -> COMPLETE: compliance gate before Airborne.",
    "Raw data uploaded by operator; Layer 2 processing job created (invisible to operator).",
    "IN_REVIEW -> CLOSED: customer receives processed output; 85/15 Layer 1 settlement.",
  ])

  pdf.subsection("Ten mission categories (full catalogue)")
  pdf.table_rows(
    ["#", "Category", "MVP 19 Jun"],
    [
      ["1", "Aerial photography / videography", "Live"],
      ["2", "Property / building inspection", "Live"],
      ["3", "Construction / site progress", "Live"],
      ["4", "Event coverage", "Live"],
      ["5", "Security / surveillance", "Live"],
      ["6-10", "Survey, agriculture, infrastructure, 3D twin, delivery, custom", "Post-GA"],
    ],
    [8, 62, PAGE_W - 70],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.subsection("Urgency tiers (Network Price multipliers)")
  pdf.table_rows(
    ["Tier", "Multiplier", "Dispatch"],
    [
      ["Immediate", "2.0-2.5x", "Seconds / auto-dispatch"],
      ["Urgent", "1.25-1.5x", "30-60 minutes"],
      ["Standard", "1.0x base", "24-48 hours"],
      ["Scheduled", "0.85-0.90x", "Pre-booked"],
    ],
    [28, 28, PAGE_W - 56],
    font_size=7.5,
    line_h=3.5,
  )


def build_pdf() -> None:
  pdf = StravyxPDF()
  pdf.add_page()
  pdf.cover_block(
    "Executive Summary",
    "Web MVP 19 June 2026  |  Master Business Summary aligned",
    f"{COMPANY}  |  CONFIDENTIAL  |  May 2026",
  )
  pdf.paragraph(
    "Source: Stravyx Founder's Mission Statement / Master Business Summary (April 2026). "
    "Working document - single source of truth for commercial model."
  )

  pdf.section("1. What Stravyx Is")
  pdf.paragraph(
    "Stravyx is an AI-powered two-sided marketplace for commercial drone services in Australia. "
    "Asset-light in the mobile operator model - Stravyx does not own or operate customer-facing "
    "drones for mobile missions. Long-term vision: autonomous network via DJI Dock 2/3 infrastructure."
  )
  pdf.paragraph(
    "Strategic reframe: Stravyx ReOC unlocks 100,000+ RPL pilots (30x vs ~3,000 ReOC operators). "
    "Stravyx becomes operator of record for dock missions; mobile operators remain independent (own ReOC)."
  )

  pdf.section("2. Two-Layer Revenue Model")
  pdf.table_rows(
    ["Layer", "Description", "Split"],
    [
      ["Layer 1 - Flight fee", "Onsite mins x rate x equipment factor. Base $250/hr.", "Operator 85% / Stravyx 15%"],
      ["Layer 2 - Processing", "AI deliverable after raw upload. Independent of flight.", "100% Stravyx"],
      ["Customer sees", "Stravyx Network Price only", "~40% blended Stravyx revenue"],
    ],
    [32, 78, PAGE_W - 110],
    font_size=7.5,
    line_h=3.5,
  )
  pdf.subsection("Information architecture (five visibility layers)")
  pdf.bullets([
    "Customer: Network Price only.",
    "Mobile operator (own ReOC): flight fee + 85% share - never customer total or processing fee.",
    "Stravyx pilot (dock): offered mission price only - contractor under Stravyx ReOC.",
    "Dock owner: fixed per-flight fee only.",
    "Layer 2 begins after raw upload - never visible to operator, pilot, or dock owner.",
  ])

  pdf.section("3. Seven User Types")
  pdf.table_rows(
    ["Type", "MVP 19 Jun"],
    [
      ["Consumer / SME", "Web booking - live"],
      ["Enterprise direct / reseller", "Post-MVP (Phase 1 programme)"],
      ["Mobile operator (own ReOC)", "Bid within Price Guide - live"],
      ["Stravyx pilot (RPL, dock)", "Post-MVP - requires ReOC"],
      ["Public dock owner", "Post-MVP"],
      ["Private enterprise dock customer", "Post-MVP"],
      ["Platform admin", "Verification, ops - live"],
    ],
    [55, PAGE_W - 55],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.section("4. Supply-Side Models")
  pdf.table_rows(
    ["", "Mobile operator", "Stravyx pilot (dock)"],
    [
      ["Licence", "Own RePL + ReOC", "RePL under Stravyx ReOC"],
      ["Equipment", "BYO drone", "Dock-based Stravyx drone"],
      ["Travel", "To job site", "Remote supervision"],
      ["MVP", "Responsive web portal", "Not at launch"],
    ],
    [28, 58, PAGE_W - 86],
    font_size=7.5,
    line_h=3.5,
  )
  pdf.paragraph(
    "ReOC strategy: parallel track - own ReOC application (HAO required) + short-term ReOC partner "
    "for dock ops until Stravyx certificate granted."
  )

  build_mission_section(pdf)

  pdf.section("6. BEST MATCH SCORE & Bidding")
  pdf.paragraph(
    "Working name for ranking algorithm (replaces earlier FLIGHT SCORE). Customer-centric: "
    "finds best result, not cheapest bid alone."
  )
  pdf.bullets([
    "Operators bid within Price Guide floor and ceiling.",
    "Factors: price competitiveness, quality track record, capability match, proximity.",
    "Dock nodes (future): structural proximity advantage within coverage radius.",
  ])

  pdf.section("7. Stravyx Finance & DJI")
  pdf.bullets([
    "Stravyx Finance: white-label via 4K Group - dock hardware finance (~$30k installed, TBC).",
    "DJI Phase 1: Pilot-to-Cloud (mobile operators); Dock-to-Cloud (enterprise docks).",
    "DJI outreach gate: live professional website + commercial one-pager before partnership meeting.",
    "Global: DJI Cloud API can dispatch docks internationally from MVP - AU primary revenue.",
  ])

  pdf.add_page()
  pdf.section("8. Design & Technology")
  pdf.paragraph("Figma (not Google Labs Stitch) for production UI. NestJS modular monolith for MVP.")
  stack: List[Tuple[str, str, str]] = [
    ("Web", "Next.js 14+", "Consumer + mobile operator + admin - GA 19 Jun 2026."),
    ("Mobile apps", "React Native - later", "Phase 1 programme post-GA."),
    ("Design", "Figma", "Seven personas; visibility-aware flows."),
    ("Pricing", "In-platform engine", "Network Price, Price Guide, urgency, equipment factors."),
    ("Matching", "BEST MATCH SCORE v1", "Bid ranking; dispatch rules by tier."),
    ("Payments", "Stripe Connect", "85/15 Layer 1 split; hold until review."),
    ("Processing", "Layer 2 queue", "AI pipeline post-raw upload (stub OK at GA)."),
    ("DJI", "Cloud API", "Pilot 2 sync; manual path at MVP."),
    ("Data", "Postgres+PostGIS, S3", "AWS ap-southeast-2."),
    ("Finance", "4K Group white-label", "Parallel commercial - Stravyx Finance."),
  ]
  pdf.tech_stack_table(stack)

  pdf.section("9. Phased Roadmap")
  pdf.table_rows(
    ["Phase", "Period", "Milestones"],
    [
      ["MVP (web)", "19 Jun 2026", "Network Price, bidding, BEST MATCH SCORE, 85/15, raw+processed portal, live site"],
      ["Phase 1", "2026-2027", "ReOC, RPL pool, Finance live, docks, CASA, DJI partner, MSDK app, patrol blocks"],
      ["Phase 2", "2028+", "Autonomous dock network, multi-flight supervision, Series A scale"],
    ],
    [22, 28, PAGE_W - 50],
    font_size=7.5,
    line_h=3.5,
  )
  pdf.bullets([
    "Investment: AUD 1.5-2.5M; 10-12 FTE (full plan). Smaller teams: reduced scope per cut lines.",
  ])

  pdf.add_page()
  pdf.section("10. MVP Build Timeline (19 June 2026)")
  pdf.paragraph(
    "25 working days: 26 May - 19 Jun 2026. Web only: consumer, mobile operator (own ReOC), admin. "
    "Figma handoff to engineering. Goal: prove Network Price, Price Guide bidding, BEST MATCH SCORE, "
    "85/15 Layer 1, raw upload, Layer 2 processing handoff, live marketing site + one-pager."
  )
  pdf.subsection("Milestones")
  pdf.table_rows(
    ["Gate", "Date", "Criterion"],
    [
      ["M0", "26 May", "Visibility matrix; founder model locked"],
      ["M1", "1 Jun", "Network Price -> bid -> confirm (staging)"],
      ["M2", "8 Jun", "Pay; operator wins; raw upload"],
      ["M3", "12 Jun", "85/15 split; Layer 2 in portal"],
      ["M4", "14 Jun", "Feature freeze"],
      ["M5", "16 Jun", "RC; marketing site live"],
      ["M6 GA", "19 Jun", "Public booking; Sydney + Melbourne metro"],
    ],
    [12, 22, PAGE_W - 34],
    font_size=7,
    line_h=3.4,
  )
  pdf.subsection("P0 scope (summary)")
  pdf.bullets([
    "Consumer: wizard, Network Price, Stripe, tracker, processed deliverables.",
    "Mobile operator: verification, Price Guide bid, status, raw upload, 85% view.",
    "Admin: verification, disputes, audit CSV.",
    "Five mission categories at launch; five deferred post-GA.",
    "Out: dock pilot portals, enterprise API, native apps, full Layer 2 AI at GA.",
  ])
  pdf.subsection("Week-by-week")
  pdf.table_rows(
    ["Week", "Dates", "Focus"],
    [
      ["1", "26 May-1 Jun", "Pricing, visibility, auth, M1"],
      ["2", "2-8 Jun", "Stripe 85/15, bidding UI, upload, M2"],
      ["3", "9-15 Jun", "Admin, one-pager, UAT, M3/M4 freeze"],
      ["4", "16-19 Jun", "RC, soft launch, M6 GA"],
    ],
    [14, 28, PAGE_W - 42],
    font_size=7.5,
    line_h=3.5,
  )
  pdf.subsection("Critical path and cut lines")
  pdf.paragraph(
    "Pricing -> Visibility -> BEST MATCH SCORE + bidding -> Stripe 85/15 -> Raw upload -> "
    "Layer 2 -> Marketing site -> GA. Cut lines: 3 categories; price-only rank; GA slip to 26 Jun."
  )
  pdf.subsection("Definition of done (GA)")
  pdf.numbered([
    "Customer pays Network Price.",
    "Operator bids; BEST MATCH SCORE selects winner; 85% payout view only.",
    "Processed deliverable in portal; Layer 2 hidden from operator.",
    "Marketing site live; one-pager for DJI.",
  ])
  pdf.paragraph("Full detail: docs/mvp-build-timeline.md and stravyx-mvp-build-timeline.pdf")

  pdf.section("11. Risks & Board Ask")
  pdf.table_rows(
    ["Risk", "Mitigation"],
    [
      ["ReOC delay", "Mobile-only MVP; short-term partner"],
      ["Two-layer complexity", "API visibility matrix; manual processing SLA at GA"],
      ["DJI premature outreach", "Website + one-pager first"],
      ["Supply cold start", "Founding Operator programme"],
    ],
    [40, PAGE_W - 40],
  )
  pdf.numbered([
    "Approve web MVP 19 Jun 2026 and Phase 1 budget (AUD 1.5-2.5M; 10-12 FTE).",
    "Endorse ReOC strategy (HAO, parallel partner) and post-GA CASA engagement.",
    "Support DJI introductions after credibility package is live.",
  ])
  pdf.paragraph(f"Contact: joel@stravyx.com  |  {COMPANY}  |  Confidential")

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  build_pdf()
