#!/usr/bin/env python3
"""Generate PDF from docs/dji-vs-nondji-operator-journeys.md."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-dji-vs-nondji-operator-journeys.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - DJI vs non-DJI operators - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "How DJI and non-DJI operators complete a Stravyx job",
    "Same shop  |  Non-DJI never uses Cloud API  |  Manual is the spare tyre",
    "Stravyx Pty Ltd ACN 696 964 271  |  17 Aug 2026  |  CONFIDENTIAL",
  )
  pdf.paragraph(
    "Source: docs/dji-vs-nondji-operator-journeys.md. Authority: ADR 0005 and "
    "docs/dji-integration-architecture.md. Glossary: docs/dji-live-ops-path-comparison.md."
  )
  pdf.paragraph(
    "One-line answer: Non-DJI operators never use DJI Cloud API. They finish jobs in Stravyx "
    "with status taps and manual upload. Supported DJI operators may also plug Pilot 2 into "
    "Stravyx for live status and auto photos - same booking, same customer downloads."
  )

  pdf.section("1. What is the same for everyone")
  pdf.paragraph("Stravyx is the marketplace (the shop):")
  pdf.numbered([
    "Customer books and pays one Network Price.",
    "Eligible licensed companies (ReOC) see the offer.",
    "First to Accept wins; others are locked out. Full street address appears after Accept (suburb only before).",
    "Operator flies the site.",
    "Files land in Stravyx, sit held (quarantine), then the operator Releases them.",
    "Customer downloads from Stravyx - not from DJI, Autel, or email.",
  ])
  pdf.paragraph(
    "The customer never needs a DJI or Autel login. Brand of aircraft must not change who can "
    "win the job or what the customer pays. Connecting a DJI remote is never required to tap Accept."
  )

  pdf.section("2. What is different (the plug, not the shop)")
  pdf.table_rows(
    ["", "Non-DJI (Autel, Skydio, others)", "Supported DJI (after privacy)"],
    [
      ["Fly in", "Their own flying app", "DJI Pilot 2 on the handheld remote"],
      ["DJI Cloud API", "Never", "Optional hose: remote talks to our cloud"],
      ["Progress in Stravyx", "Operator taps Ready -> Airborne -> Complete", "Taps can be filled from live radio; optional coarse map pin"],
      ["Files into Stravyx", "Copy off card/drone, upload in the website for this job", "Pilot 2 can auto-upload, or still upload by hand"],
      ["If radio/privacy off", "This is their path", "They fall back to the same taps + upload"],
    ],
    [36, (PAGE_W - 36) / 2, (PAGE_W - 36) / 2],
    font_size=7.5,
    line_h=3.6,
  )
  pdf.paragraph(
    "DJI Cloud API = DJI's protocol where Pilot 2 (or a Dock) talks to Stravyx-hosted servers "
    "(not FlightHub 2). Autel/Skydio cannot speak it. A later Autel connector would be their API, not DJI's."
  )
  pdf.paragraph(
    "Manual path = no live drone-to-Stravyx link. Status taps + signed upload. Spare tyre for "
    "non-DJI, unsupported DJI, APP 8 gate still open, or radio down."
  )

  pdf.section("3. Side-by-side journey")
  pdf.table_rows(
    ["Step", "Customer", "Non-DJI operator", "DJI operator (live plug on)"],
    [
      ["Book", "One price", "Same offer board", "Same"],
      ["Accept", "Job taken", "First tap; then address", "Same - no connect DJI first"],
      ["Fly", "-", "Autel/Skydio/etc. app", "Pilot 2 as usual"],
      ["Progress", "Track Job", "Taps in Stravyx", "Live postcards; optional pin"],
      ["Files", "-", "Manual upload for this job", "Auto-upload and/or manual"],
      ["Release", "Downloads appear", "Confirms files belong to this job", "Same"],
      ["Cloud API", "Never", "Never", "Only if Pilot 2 joined Stravyx"],
    ],
    [28, 36, 55, PAGE_W - 28 - 36 - 55],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.section("4. User stories")
  pdf.subsection("Story 1 - Brooke (Autel only)")
  pdf.paragraph(
    "Priya books a roof inspection. Brooke's Autel-only company taps Accept first. Brooke flies "
    "in Autel's app. In Stravyx she taps Ready, Airborne, Complete. She copies photos to a laptop "
    "and Uploads for this job. Files are held. She presses Release. Priya downloads from Stravyx. "
    "She never opened DJI software. DJI Cloud API is not involved."
  )
  pdf.subsection("Story 2 - Alex (supported DJI, live radio allowed)")
  pdf.paragraph(
    "Same booking. Alex wins. His remote is already in his company's Stravyx room. He assigns "
    "aircraft SN-123, flies in Pilot 2. Priya may see a pin. Photos can auto-land in our cupboard. "
    "He Releases. Priya still downloads from Stravyx, not FlightHub. If the radio dies, he finishes "
    "like Brooke: taps + manual upload. The job must not be stuck."
  )
  pdf.subsection("Story 3 - Alex (DJI kit) while APP 8 is still open")
  pdf.paragraph(
    "Live radio is off in production. Alex flies in Pilot 2 locally (screen on the remote, files "
    "on the card) and completes exactly like Brooke. Owning DJI hardware does not force Cloud API."
  )
  pdf.subsection("Story 4 - Mixed fleet (one company)")
  pdf.paragraph(
    "Chris has a Matrice 30 and an Autel. Matrice job (after privacy): he may use Cloud API. "
    "Autel job: always manual for that aircraft. The Autel cannot join DJI Cloud API. Accept is "
    "one tap either way. He does not need the Matrice online to take an Autel job."
  )
  pdf.subsection("Story 5 - DJI model we do not support")
  pdf.paragraph(
    "Dana flies a consumer DJI Mini. It is not on our Cloud API hardware list. She is manual, "
    "same as Autel. We do not tell her to use Cloud API anyway."
  )
  pdf.subsection("Story 6 - Two operators racing; customer does not pick a brand")
  pdf.paragraph(
    "Priya sees one Network Price, not DJI vs Autel. We must not rank who gets the job by whose "
    "DJI is online. Winner might be Brooke (manual) or Alex (live). Priya still gets raw photos "
    "from Stravyx after Release."
  )
  pdf.subsection("Story 7 - Radio outage on a DJI job already accepted")
  pdf.paragraph(
    "Alex accepted, then the controller cannot reach Stravyx. He still taps Complete and uploads. "
    "Same Release. Same customer download."
  )
  pdf.subsection("Story 8 - Later (not Live-ops A)")
  pdf.paragraph(
    "If we add an Autel/Skydio connector, Brooke might one day get auto-upload via their cloud, "
    "not DJI's. Maps/3D (Layer 2) stay a Stravyx processing product - Brooke is not sent to FlightHub."
  )

  pdf.section("5. What we will not do")
  pdf.bullets([
    "Require DJI Cloud API (or any DJI account) to Accept or to be paid.",
    "Make customers log into a drone-maker website.",
    "Leave a job stranded because live radio failed.",
    "Rank dispatch by device-online.",
    "Pretend manual Track Job is a live map (status labels only, unless we later add something like phone GPS - separate product/privacy decision).",
  ])

  pdf.section("6. Related")
  pdf.paragraph(
    "Path and glossary: docs/dji-live-ops-path-comparison.md. APP 8 (live radio vs files-only): "
    "docs/app8-live-ops-gate-closeout.md section 1a. Architecture Story C: "
    "docs/dji-integration-architecture.md."
  )

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  build_pdf()
