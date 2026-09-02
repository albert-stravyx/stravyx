#!/usr/bin/env python3
"""Generate PDF from docs/dji-live-ops-path-comparison.md."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-dji-live-ops-path-comparison.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - How we connect drones - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "How Stravyx connects drones - recommended path",
    "Cloud API + manual  |  FlightHub 2 later for Layer 2 only",
    "Stravyx Pty Ltd ACN 696 964 271  |  Aug 2026  |  CONFIDENTIAL",
  )
  pdf.paragraph(
    "Source: docs/dji-live-ops-path-comparison.md. Authority: ADR 0005 and "
    "docs/dji-integration-architecture.md. Written for founders, operators, and anyone who should "
    "understand the choice without industry jargon."
  )
  pdf.paragraph(
    "Recommended: drones talk to Stravyx using DJI's Cloud API, plus a manual upload path for everyone "
    "else. FlightHub 2 is a later option for processed maps and 3D, not how we connect aircraft for the "
    "first live-ops slice."
  )

  pdf.section("1. Picture the shop")
  pdf.paragraph(
    "Stravyx is the marketplace: customers book a drone job, licensed operators tap Accept (first one "
    "wins), the customer sees one price, and files come back through Stravyx."
  )
  pdf.paragraph(
    "A drone still needs a radio-to-internet link so live progress and photos can reach that marketplace. "
    "The question is: whose cloud does the remote controller talk to?"
  )

  pdf.section("2. Glossary")
  pdf.paragraph(
    "Every technical term used in this note is defined here. Later sections assume these meanings."
  )
  pdf.table_rows(
    ["Term", "Meaning in plain English"],
    [
      ["Stravyx", "Our Australian marketplace that matches customers with licensed drone operators, holds the booking, the price, and the customer's files."],
      ["Marketplace", "The booking, payment, job-status, and download product - not the flying itself."],
      ["Customer", "The person or company who books and pays for the job (for example a roof inspection)."],
      ["Operator", "The licensed drone business that flies the job."],
      ["ReOC", "Remote Operator's Certificate - the CASA company licence that lets an Australian drone business take commercial work."],
      ["CASA", "Civil Aviation Safety Authority - Australia's aviation regulator."],
      ["DJI", "The drone manufacturer whose enterprise controllers and docks we integrate with first. Other brands use the manual path."],
      ["Aircraft / drone", "The flying machine. For Cloud API it usually talks to the handheld controller, not to the internet by itself."],
      ["RC", "Remote Controller - the handheld box with sticks and a screen (for example DJI RC Plus)."],
      ["Pilot 2", "DJI Pilot 2 - DJI's official flying app that runs on the RC's screen. Pilots fly with it and can log it into a company cloud."],
      ["Dock", "A ground box that stores, charges, and can launch a drone with less human on site. Another doorway to the internet, like an RC."],
      ["Gateway", "The device that actually talks to the cloud: the RC running Pilot 2, or a Dock."],
      ["SN", "Serial number - unique hardware ID on an RC, Dock, or aircraft."],
      ["Workspace", "Stravyx's Cloud API organisation room that Pilot 2 logs into - like joining a company Slack, but for drones."],
      ["Cloud API", "DJI's protocol where Pilot 2 or a Dock talk to our servers (not to DJI FlightHub). Stravyx hosts that cloud."],
      ["MQTT", "An industrial messaging protocol the RC/Dock uses to send live status to Stravyx. Browsers never use MQTT. Think: a private radio-to-server chat."],
      ["HTTPS", "Ordinary secure web requests. Pilot 2 also uses HTTPS to log in, bind devices, and report that a photo upload finished."],
      ["STS", "Security Token Service - short-lived keys so files upload directly into Stravyx storage without our permanent passwords."],
      ["Manual path", "No live drone-to-Stravyx link. The operator taps Ready / Airborne / Complete in Stravyx and uploads files by hand."],
      ["FlightHub 2 / FH2", "DJI's own fleet-ops website and cloud. Not required to connect drones or deliver raw photos."],
      ["OpenAPI", "A documented set of web addresses a program can call. FH2 OpenAPI is how Stravyx would talk to FlightHub, if we ever did."],
      ["API", "Application Programming Interface - a defined way for one computer system to ask another to do something."],
      ["SaaS", "Software as a Service - software you use on someone else's website (FlightHub 2 is DJI's SaaS)."],
      ["Layer 1 / L1", "Raw capture: photos, video, and logs from the flight."],
      ["Layer 2 / L2", "Processed products: maps, 3D models, analytics. Stravyx processing revenue; operators must not see that economics."],
      ["Orthomosaic", "A map-like photo stitched from many overlapping pictures, as if looking straight down."],
      ["Photogrammetry", "Turning many photos into maps or 3D models with software."],
      ["Network Price", "The single price the customer sees. Operators must not see our margin or Layer 2."],
      ["Visibility firewall", "Rules in the server (not just hiding things on screen) so the wrong role never receives forbidden money or address fields."],
      ["First-to-accept", "Eligible operators are offered the job; the first who taps Accept wins; others are locked out."],
      ["Track Job", "The customer screen that shows job progress (and later a live map pin) while the job runs."],
      ["WebSocket / WS", "How the phone or browser gets live updates from Stravyx. The browser talks only to Stravyx, never to the drone."],
      ["Release / quarantine", "Photos land in Stravyx first as held. The operator confirms they belong to this job, then releases them so the customer can download."],
      ["SoT", "System of record - the one system whose answer is official. For bookings, price, and customer files, that is Stravyx."],
      ["Live-ops A", "The first live-operations slice: book -> accept -> fly -> return raw photos. Not livestream, not docks, not 3D maps."],
      ["COGS", "Cost of goods sold - what it costs us to run the service (servers, storage, support)."],
      ["Device seats", "A FlightHub pricing style that charges per connected aircraft or device per year."],
      ["APP 8", "Australian Privacy Principle 8 - rules about sending personal information overseas. Live video, location, and site photos can count."],
      ["DPIA", "Data Protection Impact Assessment - a written check of what data goes where and who is responsible."],
      ["MSDK", "Mobile SDK (Software Development Kit) - DJI's toolkit to build a custom flying app on a phone, instead of using Pilot 2."],
      ["HUD", "Heads-up display - the live flight instruments on the pilot's screen (map, battery, camera)."],
      ["ADR", "Architecture Decision Record - a short written choice and why we made it (for example ADR 0005)."],
      ["Bind", "Linking a controller or dock to a Stravyx company account so it can report in."],
      ["Sync", "FlightHub's optional product that copies media or telemetry between FH2 and another cloud."],
      ["Analyzer / Virtual Cockpit", "FH2 extras: inspection/change reports, and a remote flying/supervision screen. Out of Live-ops A."],
      ["Non-DJI", "Autel, Skydio, and other brands. They use the manual path until we add a dedicated connector."],
    ],
    [42, PAGE_W - 42],
    font_size=8,
  )

  pdf.section("3. Recommended: Cloud API + manual")
  pdf.paragraph(
    "In one sentence: drones report to our shop. If they cannot, the operator still finishes the job "
    "in Stravyx by hand."
  )
  pdf.paragraph(
    "Pilot 2 (or a Dock) joins a Stravyx workspace. Live status comes into Stravyx. Photos land in "
    "Stravyx storage. The customer never needs a DJI account. FlightHub 2 is only considered later if "
    "we want DJI to process maps or 3D."
  )

  pdf.subsection("Example")
  pdf.paragraph(
    "Alex's licensed drone company (a ReOC) wins a roof job in Stravyx - he taps Accept first. On the "
    "remote controller he opens Pilot 2 and joins the Stravyx cloud. The customer watches progress in "
    "Stravyx Track Job. After landing, photos upload into Stravyx. Alex confirms Release. The customer "
    "downloads from Stravyx - not from a DJI website."
  )
  pdf.paragraph(
    "A second controller in the same company can join the same way (multi-drone). A non-DJI operator, "
    "or a DJI operator before the APP 8 privacy gate is closed, uses the same book then accept loop, "
    "then taps status and uploads files (manual)."
  )

  pdf.subsection("Why this is Live-ops A")
  pdf.paragraph(
    "Live-ops A only needs: book -> first-to-accept -> fly -> give the customer raw photos. Cloud API "
    "does that into Stravyx. Manual is the spare tyre so brand of aircraft never changes marketplace "
    "fairness, and so a server outage does not strand a job."
  )

  pdf.subsection("Pros")
  pdf.bullets([
    "One system of record: booking, price, and delivery stay in Stravyx.",
    "Several remotes or docks can bind without buying FlightHub 2 device seats.",
    "Non-DJI operators use the same customer journey.",
    "If the live link is down, the job can still complete by hand.",
    "Photos stay in storage we control, then go to the customer through our signed links and visibility rules.",
    "Customers never need a DJI or FlightHub login.",
  ])

  pdf.subsection("Cons (we accept these)")
  pdf.bullets([
    "Stravyx must run and pay for the device cloud: MQTT messaging, upload tokens (STS), file storage, and monitoring (our COGS).",
    "We own security: each controller must only see its own company's traffic.",
    "APP 8 still needs a legal data-flow check (and likely a DPIA), even when we host the cloud, because DJI licence checks may still call DJI overseas.",
    "Live tracking and auto-upload only work on supported DJI Pilot 2 / Dock hardware. Other DJI and all non-DJI stay on manual until we add more connectors.",
    "We do not get FlightHub's built-in map/3D processing, Analyzer, or Virtual Cockpit until we buy or build those later.",
  ])

  pdf.subsection("What we do later (not this path)")
  pdf.bullets([
    "FlightHub 2 Business - only if Layer 2 maps/3D, Analyzer, Sync, or Virtual Cockpit become a product we buy instead of build.",
    "MSDK (custom Stravyx flight app) - optional branded HUD on the phone; not required to connect supported Pilot 2 / Dock fleets (ADR 0003).",
  ])

  pdf.section("4. Other approaches we looked at (context only)")
  pdf.paragraph(
    "These are not how Live-ops A ships. They stay here so a new reader understands why the recommended "
    "path is Cloud API + manual."
  )

  pdf.subsection("FlightHub 2 as the live-ops home")
  pdf.paragraph(
    "Idea: fleet and flights live mainly in DJI FlightHub 2. Stravyx would call DJI's OpenAPI and copy "
    "devices, tasks, and media into the marketplace."
  )
  pdf.paragraph(
    "Example: Alex flies and manages aircraft inside FlightHub 2. After he accepts a Stravyx job, we try "
    "to create a matching FH2 task and pull photos back so the customer can download from Stravyx."
  )
  pdf.paragraph("Pros:")
  pdf.bullets([
    "Less Stravyx infrastructure if DJI already hosts the fleet screen and some livestream minutes.",
    "Familiar for operators who already live in FlightHub every day.",
    "Modelling, Analyzer, and Virtual Cockpit can come in the box later without us building photogrammetry first.",
    "Code-light Sync may copy files with less custom engineering.",
  ])
  pdf.paragraph("Cons:")
  pdf.bullets([
    "Two systems of record: accepted on Stravyx can disagree with task on FlightHub.",
    "Seat and subscription cost can be high if priced per device (Enterprise-style seats).",
    "Customers still book and pay Stravyx, so we still must hold and Release files under our visibility rules - FlightHub does not remove that.",
    "Extra hops through DJI's SaaS widen the APP 8 / overseas privacy surface.",
    "Does not by itself give us first-to-accept, Network Price, or customer downloads.",
  ])
  pdf.paragraph(
    "How this relates to the recommendation: useful later for Layer 2, not as the backbone for connect + raw delivery."
  )

  pdf.subsection("Cloud API and FlightHub 2 both required from day one")
  pdf.paragraph(
    "Idea: every DJI operator binds Pilot 2 to Stravyx and keeps devices in FlightHub 2 (or keeps the two "
    "in sync) before we call live ops done."
  )
  pdf.paragraph(
    "Example: Alex must join Stravyx in Pilot 2 and maintain an FH2 organisation, with jobs wired both ways."
  )
  pdf.paragraph("Pros:")
  pdf.bullets([
    "Ready earlier for FlightHub-native fleets and modelling tools.",
    "Some operators avoid picking one cloud.",
    "Livestream or reconstruction could be borrowed from FlightHub while Stravyx still owns booking.",
  ])
  pdf.paragraph("Cons:")
  pdf.bullets([
    "Double setup and training for every pilot.",
    "Two failure modes: either cloud can break the story.",
    "Larger privacy surface - data may touch Stravyx and DJI from day one.",
    "No extra win for raw photos or Track Job, which Cloud API already covers.",
    "Higher COGS: we still host Cloud API and pay FlightHub.",
  ])
  pdf.paragraph(
    "How this relates to the recommendation: FlightHub can wait until Layer 2 or Sync is a real product need."
  )

  pdf.subsection("Custom Stravyx app only (MSDK)")
  pdf.paragraph(
    "Idea: build a branded flight app with DJI's Mobile SDK instead of using Pilot 2 + Cloud API."
  )
  pdf.paragraph(
    "Example: Alex installs Stravyx Fly on a phone attached to the controller and flies only inside our "
    "app. Telemetry and media never go through Pilot 2's cloud join."
  )
  pdf.paragraph("Pros:")
  pdf.bullets([
    "Deep branded HUD and our own buttons/workflows.",
    "Live instruments can work on the phone even when the internet is poor (local display).",
    "Opens some consumer DJI models that Cloud API may not cover (depending on SDK version).",
  ])
  pdf.paragraph("Cons:")
  pdf.bullets([
    "Large build: Android/iOS native work, app-store, DJI keys, ongoing SDK upgrades.",
    "Every operator must install and learn a new app instead of the Pilot 2 they already use.",
    "Does not by itself replace marketplace booking, first-to-accept, or customer downloads.",
    "Supported Pilot 2 / Dock fleets already reach Stravyx through Cloud API without a custom app.",
  ])
  pdf.paragraph(
    "How this relates to the recommendation: a parallel operator-app track later (ADR 0001, ADR 0003), "
    "not the marketplace live-ops backbone."
  )

  pdf.section("5. Bottom line")
  pdf.paragraph(
    "Drones report to Stravyx (Cloud API). Manual upload is always available. FlightHub 2 and a custom "
    "MSDK app are later capabilities, not how we connect jobs to customers for Live-ops A."
  )
  pdf.paragraph(
    "Related: docs/adr/0005-flight-provider-cloud-api-only.md, docs/dji-integration-architecture.md."
  )

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  build_pdf()
