#!/usr/bin/env python3
"""Generate PDF from docs/app8-live-ops-gate-closeout.md."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-app8-live-ops-gate-closeout.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - APP 8 live-ops gate close-out - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "APP 8 live-ops gate - close-out brief for Liz and Joel",
    "Gate open  |  Files-only may ship  |  Live radio / auto-upload blocked",
    "Stravyx Pty Ltd ACN 696 964 271  |  16 Aug 2026  |  CONFIDENTIAL  |  Not legal advice",
  )
  pdf.paragraph(
    "Source: docs/app8-live-ops-gate-closeout.md. Audience: Liz (Consent & Privacy Policy v4, DPIA) "
    "and Joel (gate owner). Purpose: list every decision, notice, and sign-off needed to lift the "
    "DJI live-ops APP 8 blocker (ERD section 13.16). Not legal advice, not an engineering build "
    "ticket, and not the APP 3/5 operator-outreach review."
  )
  pdf.paragraph(
    "Status: Gate open. Manual photo cupboard (S0) and DJI Cloud API licence application may proceed. "
    "Production live radio / live map / auto-upload / livestream / dock remote-control may not. Until "
    "the sign-off block is completed, the product fails closed: operators finish jobs by tapping "
    "status and uploading files by hand."
  )

  pdf.section("1. One-page brief")
  pdf.paragraph(
    "Stravyx is a shop: customers book a drone job; a licensed operator (ReOC) wins it; files come "
    "back through us. Some operators will later plug a DJI remote into our cloud so a live map and "
    "automatic photos can work. That radio can involve personal information (photos of people's homes, "
    "a pin over a house) and computers outside Australia (including DJI checking a licence)."
  )
  pdf.paragraph(
    "Australian Privacy Principle 8 (APP 8) is the rule about sending personal information overseas. "
    "A DPIA is the written list of every stop the data makes and who is responsible. Joel locked: do "
    "not start production live-ops until Consent & Privacy Policy v4 discloses that overseas story (Liz)."
  )
  pdf.table_rows(
    ["Allowed now", "Blocked until this pack is signed"],
    [
      ["Book -> Accept -> operator manually uploads in Stravyx", "Live map of the aircraft"],
      ["Real signed upload, hold, Release, customer download (S0)", "Automatic photos from the DJI remote"],
      ["Apply for DJI developer / Cloud API licence", "Livestream to the customer"],
      ["Ordinary we collect site photos notices for the manual path", "Dock fly from the office commands"],
      ["", "Production MQTT radio (remote to us)"],
    ],
    [PAGE_W / 2, PAGE_W / 2],
    font_size=7.5,
    line_h=3.6,
  )
  pdf.paragraph(
    "Do not mix this review with APP 3/5 operator-database outreach. Different data, different notices."
  )
  pdf.table_rows(
    ["Who", "Owns"],
    [
      ["Liz", "v4 redline; DPIA / hop list; customer and operator notices; APP 3/5 stays separate; DJI DPA countries (verify, do not guess)"],
      ["Joel", "What Live-ops A actually offers (live map? auto photos?); commercial fail-closed; written gate closed"],
      ["Engineering", "Hide Connect Pilot / live map / auto-upload until sign-off; never put secrets in the phone; S0 cupboard can ship without this gate"],
    ],
    [28, PAGE_W - 28],
    font_size=7.5,
  )

  pdf.section("1a. What if we never use live radio or automatic sync?")
  pdf.paragraph(
    "Then you do not need to close this live-ops APP 8 gate to ship the product. You simply do not enter it. "
    "Live radio means the DJI remote is logged into a Stravyx room and sends live location to our servers. "
    "Automatic sync means the remote puts photos in our cupboard after landing, without the website upload button."
  )
  pdf.table_rows(
    ["What customers still get", "What they do not get"],
    [
      ["Book, pay Network Price, first-to-accept", "A moving pin on Track Job"],
      ["Operator taps Ready -> Airborne -> Complete", "Photos appearing by themselves after landing"],
      ["Operator uploads files by hand for that job", "Livestream, dock remote-fly, FlightHub"],
      ["Hold -> Release -> customer download", "Any Pilot 2 join Stravyx cloud in production"],
    ],
    [PAGE_W / 2, PAGE_W / 2],
    font_size=7.5,
  )
  pdf.paragraph(
    "This live-ops gate (ERD 13.16) is about Pilot-to-Cloud / Dock-to-Cloud ingest. No ingest -> the "
    "blocker for those features stays parked, not failed. Engineering must not turn on MQTT, Connect "
    "Pilot, live map, or auto-upload. The marketplace file loop can still go live (S0)."
  )
  pdf.paragraph(
    "APP 8 does not disappear entirely. Photos of someone's house are still personal information. If "
    "our cupboard is in Tokyo, sending those files overseas is APP 8 because of our hosting, not "
    "because of DJI. Liz still needs collection notices and a residency call (decision D3)."
  )
  pdf.paragraph(
    "How Joel can record this (recommended): Live-ops A is files-only. No live radio, no auto-upload. "
    "Section 13.16 gate remains open; production must fail-closed for Connect Pilot. S0 manual path "
    "approved. You can apply for a DJI licence now so Layer 2 is possible later; that application is "
    "not turning the radio on."
  )

  pdf.section("2. Glossary")
  pdf.table_rows(
    ["Term", "Plain meaning"],
    [
      ["APP 8", "Australian Privacy Principle 8 - cross-border disclosure of personal information."],
      ["DPIA", "Written map: what we collect, where it goes, which country, who is responsible."],
      ["Personal information", "Photos/video of a site that can identify a person or their home; a live map pin."],
      ["ReOC", "Licensed Australian drone company. Stravyx never holds this licence."],
      ["Pilot 2", "DJI flying app on the handheld remote's screen."],
      ["Stravyx room", "The company hotel Pilot 2 checks into so status and photos go to us, not FlightHub 2."],
      ["MQTT", "The industrial walkie-talkie the remote uses to our servers. Browsers never use it."],
      ["STS", "Temporary luggage tag so the remote can put files in our cupboard without our permanent password."],
      ["Fail-closed", "If the gate is open or later withdrawn, live connect disappears. The job can still finish by hand."],
      ["FlightHub 2", "DJI's own hotel. Not on the Live-ops A path. A later maps/3D buy would be a new APP 8 pass."],
    ],
    [36, PAGE_W - 36],
    font_size=7.5,
  )

  pdf.section("3. What is in this gate vs out")
  pdf.table_rows(
    ["Operator / product behaviour", "This live-ops APP 8 gate?", "Still think about privacy?"],
    [
      ["Taps status; uploads in the Stravyx website", "No - S0 may ship", "Yes, lightly: where we store files; collection notices"],
      ["Customer live map of the aircraft", "Yes", "Yes"],
      ["Automatic photos from Pilot 2", "Treat as yes until you exclude auto site imagery", "Yes"],
      ["Live video in the browser", "Yes (named in 13.16)", "Yes - out of Live-ops A until a later gate"],
      ["Dock remote commands", "Yes (named in 13.16)", "Yes - out of Live-ops A"],
      ["DJI licence / heartbeat while using our Sydney radio", "Yes - hosting in Australia does not delete this hop", "List it in the DPIA even if unverified country"],
      ["Alex's own DJI app cloud backup", "Not this gate", "Policy should say we are not that cloud"],
      ["HubSpot leads / operator outreach", "Out of this pack (APP 3/5)", "Separate Liz track"],
    ],
    [58, 52, PAGE_W - 58 - 52],
    font_size=7,
    line_h=3.4,
  )
  pdf.paragraph(
    "Recommended default until you write otherwise: auto site imagery is inside this gate. Do not "
    "turn on production auto-upload without a signed exclusion."
  )

  pdf.section("4. User stories (language you can sign)")
  pdf.subsection("Priya - customer")
  pdf.paragraph(
    "Given Priya books and pays the Network Price. When the operator flies her site. Then she has "
    "been told, in plain language at booking (and in Policy v4), that site photos are collected to "
    "deliver the job; if a live map is on, that her job location may be shown to her while it runs; "
    "she downloads files from Stravyx only after the operator Releases them; she does not get a live "
    "pin unless that path is approved and disclosed. Fail-closed: if live map is not approved, she "
    "still gets files via manual upload."
  )
  pdf.subsection("Alex - operator (ReOC)")
  pdf.paragraph(
    "When the live-ops gate is open: he does not see Connect DJI Pilot as a live production action; "
    "he taps status and uploads by hand. When the gate is closed for the features you approved: he "
    "may check Pilot 2 into his company's Stravyx room; Brooke's company must never see his jobs or "
    "drones; upload tags only apply to this flight on this job."
  )
  pdf.subsection("Stravyx admin")
  pdf.paragraph(
    "Given disclosure is withdrawn or a subprocessor changes country. Then admin (or a config flag) "
    "can turn live connect off without taking down booking or manual upload."
  )

  pdf.section("5. Scenarios")
  pdf.subsection("P1 - Manual only, cupboard in Australia")
  pdf.paragraph(
    "Alex flies, goes home, uploads 40 photos in Stravyx. Files stay in Sydney. This gate: No. Write: "
    "collection notice for site photos; retention; who the ReOC vs Stravyx is."
  )
  pdf.subsection("P2 - Manual only, cupboard in Tokyo (today's demo)")
  pdf.paragraph(
    "Same as P1; file lands in Japan. Overseas because of our hosting, not DJI. This gate: still no "
    "for DJI radio. Write: APP 8 for Stravyx storage region. Decide: live customer files must be Sydney?"
  )
  pdf.subsection("P3 - Live map, photos still manual")
  pdf.paragraph(
    "Pilot 2 is in Alex's Stravyx room. Priya watches a pin. This gate: Yes. Write: v4 + DPIA for live "
    "location; customer notice that a pin may appear; fail-closed if they reject live map."
  )
  pdf.subsection("P4 - Auto photos, no live map")
  pdf.paragraph(
    "After landing the remote puts photos in our cupboard. This gate: Yes, until you exclude auto imagery. "
    "Recommended: in."
  )
  pdf.subsection("P5 - Radio is in Sydney so APP 8 is done")
  pdf.paragraph(
    "Alex's remote talks to Sydney. The remote may still check its DJI licence with DJI overseas. "
    "This gate: Yes for any live radio. Write: name DJI as overseas recipient of licence/technical data. "
    "Liz confirms with DJI. Do not invent fields."
  )
  pdf.subsection("P6 - Alex also uses DJI's own cloud")
  pdf.paragraph(
    "Outside Stravyx. This gate: No. Write: one sentence that Stravyx is not responsible for the "
    "operator's own DJI account cloud."
  )
  pdf.subsection("R1 - Two companies, one shared hotel")
  pdf.paragraph(
    "If all operators shared one DJI Stravyx room, Brooke might see Alex's drones. Write: Joel/Liz "
    "accept one room per ReOC (or accept shared-room risk in writing)."
  )
  pdf.subsection("R2 - Wrong job's photos")
  pdf.paragraph(
    "The remote asks for an upload tag while paired to a different aircraft. Write: support hold then "
    "Release; engineering's this-flight wristband (capture session). Release is the customer-safety catch."
  )

  pdf.section("6. Hop inventory (DPIA homework)")
  pdf.paragraph("Unverified = Liz to confirm with DJI DPA / vendor, not engineering guesswork.")
  pdf.table_rows(
    ["ID", "Hop", "Country today"],
    [
      ["H1", "Browser -> Stravyx API (account, job, suburb/address by role)", "Demo often Tokyo API/DB"],
      ["H2", "Manual file upload -> object storage", "Demo often not Sydney; target Sydney"],
      ["H3", "Optional malware/type scan", "TBD - if overseas, APP 8"],
      ["H4", "Pilot 2 -> our MQTT/HTTPS (live status; bind; STS request)", "Intended Sydney"],
      ["H5", "STS put -> S3/MinIO (auto photos)", "Must match residency ruling"],
      ["H6", "DJI licence / Cloud API control plane", "Unverified, likely overseas"],
      ["H7", "Customer browser <- Stravyx signed download", "Same as H2"],
      ["H8", "Livestream CDN / WebRTC", "TBD - new gate"],
      ["H9", "FlightHub 2 (later L2, not Live-ops A)", "DJI SaaS overseas likely; new DPIA"],
      ["H10", "HubSpot leads (not mission photos)", "Out of this pack (APP 3/5)"],
    ],
    [16, 92, PAGE_W - 16 - 92],
    font_size=7,
    line_h=3.4,
  )
  pdf.paragraph(
    "Visibility firewall (product, not APP 8): operators must not see customer total / Layer 2 "
    "economics; customers must not see the L1/L2 price split. Live pins must not leak full address "
    "to the wrong role."
  )

  pdf.section("7. Decision log (this is what removes the blocker)")
  pdf.paragraph("Recommended defaults in the middle column. Tick after Liz/Joel fill.")
  pdf.table_rows(
    ["#", "Decision", "Recommended default"],
    [
      ["D0", "Ship files-only (no live radio, no auto-upload) for this release?", "Yes, if you want to launch without closing 13.16. Gate stays open; Connect Pilot stays off. Does not skip D3-D6 for manual photos."],
      ["D1", "Is automatic site imagery inside Consent v4 / this gate?", "Yes - in-gate until explicitly excluded."],
      ["D2", "Is a live map part of first live-ops, or files-only?", "Files-only unless you choose to close this pack for live map."],
      ["D3", "Storage residency for customer files", "Sydney for any production customer imagery. Demo Tokyo must not be production SoT."],
      ["D4", "Lawful basis - customer", "Notified collection for delivering the job + consent if you offer optional live map. Counsel, not this doc."],
      ["D5", "Lawful basis - operator", "Spell the split: operator as independent collector in the field vs Stravyx as platform."],
      ["D6", "Retention after delivered / dispute hold", "e.g. job files N months; legal hold longer."],
      ["D7", "Subprocessors named in v4", "Stravyx hosting region; DJI (licence/technical); scanner TBD; no FH2 until L2."],
      ["D8", "Fail-closed commercially OK?", "Yes - live connect off, manual still completes the job."],
      ["D9", "Docks / livestream / DRC in this sign-off?", "No - later gates, later v4 delta."],
      ["D10", "Gate closed for which features?", "List explicitly. Engineering will not infer."],
    ],
    [14, 52, PAGE_W - 14 - 52],
    font_size=7,
    line_h=3.4,
  )

  pdf.section("8. Consent v4 - draft clauses (for counsel; not legal advice)")
  pdf.paragraph(
    "Live location. If you use live tracking, the operator's controller may send the aircraft's "
    "approximate position to Stravyx so you can see job progress. That signal is processed on Stravyx "
    "systems [in Australia / see DPIA]. The controller may also exchange licence or technical data "
    "with DJI, which may be outside Australia."
  )
  pdf.paragraph(
    "Photos and video. Site imagery is collected to deliver your job. If automatic upload is enabled, "
    "the controller may send files to Stravyx storage after the flight. Files are held until the "
    "operator confirms they belong to this job, then you may download them from Stravyx. We are not "
    "DJI FlightHub; we do not use FlightHub for this service."
  )
  pdf.paragraph(
    "Manual path. You can complete a job by the operator uploading files in Stravyx without connecting "
    "a live controller. That path does not use the live radio."
  )
  pdf.paragraph(
    "Withdraw / fail-closed. If live connect is unavailable or you do not want live tracking, the "
    "operator can still finish the job by manual upload. Contact privacy@ to ask questions or complain "
    "to the OAIC."
  )
  pdf.paragraph(
    "Operators. You must only upload or auto-send imagery for jobs you are engaged to fly. You must "
    "not use Stravyx to access another operator's jobs. Your own DJI account cloud is outside this policy."
  )

  pdf.section("9. Action checklist")
  pdf.subsection("Liz")
  pdf.bullets([
    "Redline Consent & Privacy Policy v4 for live radio + (if D1 yes) auto imagery + DJI overseas licence hop.",
    "DPIA covering hops H1-H7 (H8-H9 later); mark H6 verified or assumed.",
    "Customer notice at booking; operator notice at onboarding / Connect Pilot.",
    "Confirm APP 3/5 outreach is a different document.",
    "Request DJI DPA / subprocessors / regions. Do not block licence application.",
  ])
  pdf.subsection("Joel")
  pdf.bullets([
    "Fill D1-D10 (especially D1 auto imagery, D2 live map, D3 residency, D10 feature list).",
    "Accept fail-closed (D8) as production behaviour until/unless gate stays closed.",
    "Record gate closed (or closed for features X, still open for Y) in the sign-off block and DECISIONS.md.",
  ])
  pdf.subsection("Engineering (after sign-off - not a substitute)")
  pdf.bullets([
    "Fail-closed UX: no production Connect Pilot / live map / auto-upload while gate open.",
    "S0 manual cupboard may ship without waiting.",
    "No production MQTT until D10 list is closed.",
  ])
  pdf.subsection("Parallel (does not close the gate)")
  pdf.bullets([
    "DJI developer account + Cloud API licence application (Platform / Joel).",
    "One ReOC partner + supported hardware list (Product).",
  ])

  pdf.section("10. Sign-off")
  pdf.paragraph(
    "Not legal advice. Completing this block is the product/privacy signal engineering needs. Fields: "
    "Date; Liz (v4 + DPIA + notices); Joel (D1-D10 + gate); features explicitly in this close-out; "
    "features explicitly out (livestream, dock remote command, FlightHub 2, MSDK); fail-closed confirmed; "
    "auto site imagery in-gate?; storage residency for production files; link to v4 + DPIA."
  )
  pdf.paragraph(
    "Until this table is filled, the live-ops APP 8 gate remains open. Manual per-mission upload in "
    "Stravyx remains the legal production path for files."
  )

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  build_pdf()
