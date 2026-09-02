#!/usr/bin/env python3
"""Generate Stravyx working-demo runbook PDF from the Phase 1A/2A script."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-demo-runbook.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - Working Demo Runbook - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "Working Demo Runbook (Phase 1A / 2A)",
    "Customer book -> operator accept -> admin economics -> HubSpot lead sync",
    "Stravyx Pty Ltd  |  25 Jul 2026  |  CONFIDENTIAL  |  localhost + Supabase",
  )
  pdf.paragraph(
    "Source: docs/demo-runbook.md. Branch: feature/harness-monorepo. "
    "Host: apps/app-web (Next.js) against Supabase project ruzblzcvnayajmnwyjyc "
    "(Tokyo). Edge Functions: api + hubspot-sync. Password for all demo users: DemoPass123!"
  )

  pdf.section("1. What you are demonstrating")
  pdf.table_rows(
    ["Story beat", "What the audience should see"],
    [
      ["Customer books", "One Network Price (not Layer 1 / fee split)"],
      ["Mock pay", "Mission booked then dispatched"],
      ["Operator offer", "Suburb + earn only (no full address / network)"],
      ["First-to-accept", "Accept reveals full street address"],
      ["Status + upload", "Flown + media_files upload stub"],
      ["Admin", "Full economics + address"],
      ["HubSpot", "Lead INSERT -> contact + hubspot_contact_id"],
    ],
    [42, PAGE_W - 42],
    font_size=7.5,
    line_h=3.6,
  )
  pdf.paragraph(
    "Architecture: browser -> Supabase Auth + Edge api -> Postgres (RLS + visibility firewall). "
    "HubSpot is one-way after lead persist via pg_net trigger -> hubspot-sync."
  )

  pdf.section("2. Prerequisites (once)")
  pdf.numbered(
    [
      "Repo on branch feature/harness-monorepo.",
      "From repo root: pnpm install",
      "apps/app-web/.env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, "
      "NEXT_PUBLIC_API_URL=.../functions/v1. Role shell follows JWT /me only; "
      "use two browser profiles or sign out/in between roles.",
      "Edge secret HUBSPOT_ACCESS_TOKEN set (for HubSpot beat only).",
      "Optional: HubSpot portal tab open to show the synced contact.",
    ]
  )

  pdf.section("3. Demo accounts (seeded)")
  pdf.table_rows(
    ["Email", "Role", "Notes"],
    [
      ["customer@demo.stravyx.com", "customer", "Books missions"],
      ["operator@demo.stravyx.com", "operator", "Online verified ReOC"],
      ["admin@demo.stravyx.com", "admin", "Full economics"],
    ],
    [70, 28, PAGE_W - 98],
    font_size=7.5,
    line_h=3.6,
  )
  pdf.paragraph("Password for all: DemoPass123!  Seed: supabase/seed/demo_users.sql (idempotent).")

  pdf.section("4. Start the app")
  pdf.paragraph("From monorepo root:")
  pdf.paragraph("    pnpm dev:app", size=8.5)
  pdf.paragraph("Open http://localhost:3000. Login should pre-fill customer demo credentials.")
  pdf.subsection("Health check (if book fails)")
  pdf.paragraph(
    "curl the Edge health endpoint: GET .../functions/v1/api/health with apikey + Authorization "
    "Bearer anon. Expect ok:true, service stravyx-api."
  )

  pdf.section("5. Five-minute script (two browsers recommended)")
  pdf.paragraph(
    "Use two browser profiles (or Chrome + Incognito) so customer and operator sessions do not clash."
  )

  pdf.subsection("Beat A - Customer books (Browser 1)")
  pdf.numbered(
    [
      "Open localhost:3000; sign in as customer@demo.stravyx.com / DemoPass123!",
      "Start a booking; pick a service (e.g. aerial photography -> category aerial_photo).",
      "Enter Sydney address, e.g. 1 Martin Place, Sydney NSW 2000.",
      "Urgency STANDARD, duration 60 minutes -> Network Price should be $250.",
      "On Review, confirm label is Network Price (not a client-side x1.4 Total).",
      "Confirm Booking (mock pay). Mission should reach dispatched (online ReOC fan-out).",
    ]
  )
  pdf.paragraph(
    "Talk track: customer only sees Network Price. Flight fee, Layer 2, and operator earn are not "
    "in the customer API payload."
  )

  pdf.subsection("Beat B - Operator accepts (Browser 2)")
  pdf.numbered(
    [
      "Second profile: sign in as operator@demo.stravyx.com / DemoPass123!",
      "Offer board: suburb + earn only; no full address / network / L2.",
      "Accept -> full address appears (1 Martin Place...).",
      "Begin/allocate -> allocated (UI may say in progress).",
      "Mark complete/flown -> flown; upload stub written to media_files.",
    ]
  )
  pdf.paragraph(
    "Talk track: first-to-accept is DB-enforced (unique accepted offer per mission)."
  )

  pdf.subsection("Beat C - Admin economics")
  pdf.bullets(
    [
      "Sign out, then sign in as admin@demo.stravyx.com (or a third browser profile).",
      "Confirm network, flight fee, L2, operator earn, platform fee, and full address.",
    ]
  )
  pdf.paragraph(
    "Talk track: admin is the only surface that combines money + address - the visibility firewall."
  )

  pdf.subsection("Beat D - HubSpot lead path (optional)")
  pdf.numbered(
    [
      "INSERT into contact_leads (or any of the five lead tables).",
      "Trigger hubspot_sync_on_insert calls Edge hubspot-sync via pg_net.",
      "Row hubspot_contact_id fills within seconds; HubSpot contact has "
      "stravyx_lead_table / stravyx_lead_id.",
    ]
  )
  pdf.paragraph(
    "Talk track: CRM is never SoT for missions or pricing - one-way after Postgres persist."
  )

  pdf.section("6. Single-browser shortcut")
  pdf.numbered(
    [
      "Login as customer -> book -> Log Out.",
      "Login as operator -> accept + complete -> Log Out.",
      "Login as admin -> show economics.",
    ]
  )
  pdf.paragraph(
    "Prefer two browser profiles so customer and operator sessions stay live together. "
    "The SPA shell follows JWT app_metadata.role via /me; there is no in-app Switch View."
  )

  pdf.section("7. Success checklist")
  pdf.bullets(
    [
      "Customer login with seeded password",
      "Review shows Network Price only",
      "Create mission dispatches offer to online ReOC",
      "Operator list suburb + earn only before accept",
      "Accept reveals full address",
      "Status flown + media stub exists",
      "Admin sees full split + address",
      "(Optional) Lead -> HubSpot contact id written",
    ]
  )

  pdf.section("8. Troubleshooting")
  pdf.table_rows(
    ["Symptom", "Likely cause / fix"],
    [
      ["Sign-in error", "Wrong .env.local URL/anon key"],
      ["Book: Invalid urgency", "Confirm grants migration 20260725022000 applied"],
      ["No operator offers", "ReOC must be online+verified; re-book as customer"],
      ["Accept 409", "Already taken - book a new mission"],
      ["No HubSpot id", "Set HUBSPOT_ACCESS_TOKEN; props stravyx_lead_* exist"],
      ["Wrong role shell", "Sign out; use matching seeded account"],
      ["Stale board", "Truncate missions/offers or book fresh"],
    ],
    [48, PAGE_W - 48],
    font_size=7.5,
    line_h=3.6,
  )
  pdf.subsection("Reset marketplace board (keeps users)")
  pdf.paragraph(
    "TRUNCATE media_files, payments, mission_status_events, mission_offers, "
    "mission_locations, missions RESTART IDENTITY CASCADE;",
    size=8,
  )

  pdf.section("9. Talking points (30 seconds each)")
  pdf.numbered(
    [
      "Same contracts later: Edge today; NestJS can replace runtime without rewriting api-client.",
      "Money in cents: $250/hr x equipment x urgency x hours -> integer cents.",
      "Visibility firewall: API projectors + RLS, not UI-only hiding.",
      "HubSpot boundary: leads land in Postgres first; CRM follows.",
    ]
  )

  pdf.section("10. Out of scope (say so if asked)")
  pdf.bullets(
    [
      "Live payment rail (mock hold only)",
      "DJI / FlightHub telemetry",
      "PostGIS eligibility (fan-out = online verified ReOCs)",
      "Google OAuth",
      "Live stravyx.com forms until Replit Secrets point here",
      "NestJS / Sydney region migration",
    ]
  )

  pdf.section("11. Quick reference")
  pdf.table_rows(
    ["Item", "Value"],
    [
      ["App", "http://localhost:3000"],
      ["Start", "pnpm dev:app"],
      ["Supabase", "https://ruzblzcvnayajmnwyjyc.supabase.co"],
      ["API", ".../functions/v1/api"],
      ["HubSpot sync", ".../functions/v1/hubspot-sync"],
      ["Password", "DemoPass123!"],
      ["Plan", "docs/backend-build-plan.md"],
      ["Seed", "supabase/seed/demo_users.sql"],
      ["Markdown", "docs/demo-runbook.md"],
    ],
    [40, PAGE_W - 40],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.ln(4)
  pdf.paragraph(
    "Stravyx Pty Ltd ACN 696 964 271 - Confidential - Demo runbook Phase 1A/2A",
    size=8,
  )

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
  build_pdf()
