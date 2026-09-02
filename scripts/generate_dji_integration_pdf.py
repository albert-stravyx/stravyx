#!/usr/bin/env python3
"""Generate Stravyx DJI Integration Catalogue PDF (aligned to docs/dji-integration-catalogue.md)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-dji-integration-catalogue.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - DJI Integration Catalogue - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "DJI Integration Catalogue - APIs, SDKs, Resources & Use Cases",
    "Cloud API  |  Mobile SDK v5  |  Payload SDK v3  |  FlightHub 2 OpenAPI",
    "Stravyx Pty Ltd ACN 696 964 271  |  Jul 2026  |  CONFIDENTIAL",
  )
  pdf.paragraph(
    "Source: docs/dji-integration-catalogue.md. Aligned to Master Business Summary (April 2026), "
    "executive-summary.md and mvp-build-timeline.md. A working catalogue of DJI developer APIs, SDKs, "
    "functions and features Stravyx can integrate, with descriptions and use-case scenarios."
  )
  pdf.paragraph(
    "Founder note: MVP (19 Jun) uses a manual Pilot-to-Cloud path (operator uploads raw data). "
    "DJI SDK integrations below are Phase 1+ (2026-2027) unless flagged otherwise. "
    "Reflects Cloud API v1.14.0 (Apr 2025) / PSDK 3.16.0 - verify endpoints against live DJI docs before build."
  )

  pdf.section("0. TL;DR - The Four DJI Pillars")
  pdf.table_rows(
    ["#", "DJI product", "Stravyx role", "Phase"],
    [
      ["1", "Cloud API (MQTT/HTTPS/WSS via Pilot 2 / Dock)", "Backbone: telemetry, media return, dispatch, dock ops", "Phase 1"],
      ["2", "Mobile SDK v5 (MSDK)", "Branded Stravyx operator flight app", "Phase 1 (post-GA)"],
      ["3", "Payload SDK v3 (PSDK)", "Custom payloads, onboard edge AI for Layer 2", "Phase 2"],
      ["4", "FlightHub 2 OpenAPI / Modeling API / Terra", "Layer 2 accelerator: photogrammetry, LiDAR, 3D", "Phase 1-2"],
    ],
    [8, 62, PAGE_W - 100, 30],
    font_size=7,
    line_h=3.4,
  )
  pdf.paragraph(
    "Key fact: with Cloud API, DJI drones/docks talk to our backend directly through DJI Pilot 2 (on the RC) "
    "or a DJI Dock - no mobile app required to get live telemetry, video, or automatic media upload. This is "
    "the single most important integration for the Stravyx tracker, dispatch, and Layer 1 -> Layer 2 handoff."
  )

  pdf.section("1. DJI Cloud API - The Integration Backbone")
  pdf.paragraph(
    "A cloud interface set that abstracts the drone/dock into an IoT 'thing model'. The gateway (DJI Pilot 2 "
    "on an RC, or a DJI Dock) connects to our cloud over MQTT (telemetry + commands), HTTPS (REST + media) and "
    "WebSocket (server push). Lets cloud-first platforms skip building a full MSDK app."
  )
  pdf.subsection("Two operating scenarios")
  pdf.bullets([
    "Pilot-to-Cloud - a human operator flies with DJI Pilot 2; we receive live data and push routes/media/video.",
    "Dock-to-Cloud - a DJI Dock runs autonomous missions; we schedule flights, monitor health, retrieve media, no human on site.",
  ])
  pdf.subsection("Supported hardware (Cloud API 1.14.0, Apr 2025)")
  pdf.bullets([
    "Pilot-to-Cloud: Matrice 4E/4T, M350 RTK, M300 RTK, M30 series, Mavic 3 Enterprise series.",
    "Dock-to-Cloud: DJI Dock 3 (M4D/4TD), DJI Dock 2 (M3D/3TD), DJI Dock (M30 series).",
  ])
  pdf.paragraph(
    "Access prerequisite: DJI developer account -> generate a Cloud API license -> bind Pilot 2 / Dock to our "
    "workspace. (One of the 'three DJI asks' in the commercial one-pager.)"
  )

  pdf.subsection("MQTT topic model (how data flows)")
  pdf.table_rows(
    ["Topic pattern", "Direction", "Purpose"],
    [
      ["sys/product/{gw}/status", "device -> cloud", "Online/offline + update_topo (topology)"],
      ["thing/product/{dev}/osd", "device -> cloud", "High-freq telemetry: GPS, battery, attitude, speed"],
      ["thing/product/{dev}/state", "device -> cloud", "Sparse state: firmware, payload, live-capacity"],
      ["thing/product/{gw}/services", "cloud -> device", "Commands we invoke (start mission, photo, RTH)"],
      ["thing/product/{gw}/events", "device -> cloud", "Device events: upload progress, HMS alarms"],
      ["thing/product/{gw}/requests", "device -> cloud", "Device asks us for data (STS creds, org binding)"],
      ["thing/product/{gw}/drc/{up,down}", "both", "Direct Remote Control (low-latency)"],
    ],
    [52, 32, PAGE_W - 84],
    font_size=7,
    line_h=3.3,
  )
  pdf.paragraph(
    "REST module prefixes (/{module}/api/v1): manage (login, workspace, binding), wayline (routes + dispatch), "
    "media (fast-upload negotiation + callbacks), storage (temporary object-store STS), map, control."
  )

  pdf.add_page()
  pdf.subsection("Cloud API functional modules - catalogue")
  pdf.table_rows(
    ["Module", "Capability", "Stravyx scenario"],
    [
      ["Device mgmt / topology", "Discover + monitor docks/aircraft/payloads/RCs", "Live fleet map (A-02); verified capability -> BEST MATCH SCORE"],
      ["OSD telemetry", "GPS, battery, attitude, speed stream", "Live moving-pin consumer tracker (C-05); geofence audit"],
      ["Live streaming", "RTMP/RTSP/WebRTC video, start/stop", "'Watch live' for Immediate/Urgent security jobs; remote supervision"],
      ["Wayline / route library", "Upload/execute/report KMZ waylines", "Scheduled tier + patrol blocks; weekly construction sweeps"],
      ["Media library", "STS fast-upload straight to S3 + callbacks", "Auto Layer 1 -> Layer 2 handoff; kills manual upload (O-09)"],
      ["HMS health mgmt", "Real-time alarms/diagnostics", "Dispatch safety gate; dock uptime SLA; CASA story"],
      ["TSA situational awareness", "Positions of nearby aircraft", "Multi-operator metro conflict avoidance"],
      ["Map elements", "Sync pins/polygons/no-fly to Pilot 2", "Push customer site polygon to operator on win (M-05)"],
      ["Dock control", "Open/close, tasks, firmware, forced landing", "Autonomous dock missions (Phase 1-2 vision)"],
      ["DRC direct control", "Low-latency real-time control", "Stravyx-piloted dock takeover (Phase 2)"],
      ["Org / device binding", "Bind Pilot 2 / Dock to workspace", "Operator onboarding as live data-backed link (O-01)"],
    ],
    [34, 58, PAGE_W - 92],
    font_size=6.6,
    line_h=3.1,
  )

  pdf.section("2. DJI Mobile SDK v5 (MSDK) - The Operator App")
  pdf.paragraph(
    "Native Android/iOS SDK to build a fully custom flight app. Use when we want a branded Stravyx operator app "
    "with deeper control than Pilot 2 + Cloud API. Requires an MSDK app key. v5.3+ opened to consumer drones "
    "(Mini 3 / 3 Pro / 4 Pro) - lowering the equipment barrier for operator supply."
  )
  pdf.table_rows(
    ["Manager / API", "Capability", "Stravyx scenario"],
    [
      ["IWaypointMissionManager", "Upload/execute/pause/resume KMZ missions", "'Fly this Stravyx mission' one-tap; auto status"],
      ["IWPMZManager", "Author/edit KMZ waylines on device", "Operator fine-tunes supplied route for site"],
      ["IVirtualStickManager", "Programmatic control (+ obstacle avoidance)", "Guided orbit/facade capture patterns"],
      ["IMediaManager / DataCenter", "List/preview/download/playback media", "In-app raw preview + selective S3 upload"],
      ["ILiveStreamManager", "RTMP/RTSP live stream from app", "Stream to customer/admin without Pilot 2"],
      ["Camera / gimbal control", "Zoom, mode, shutter, gimbal angle", "Enforce capture specs per category"],
      ["Flight controller / telemetry", "Position, battery, RTH, flight time", "In-app tracker + safety gates"],
      ["Simulator", "Flight simulation", "Operator training + QA of templates"],
      ["KeyManager (product/firmware)", "Read model/firmware/serial", "Verified capability + compliance checks"],
    ],
    [46, 56, PAGE_W - 102],
    font_size=6.6,
    line_h=3.1,
  )
  pdf.paragraph(
    "Supported drones (v5.x): M400, M4/M4D Enterprise, M350 RTK, M300 RTK, M30 series, Mavic 3 Enterprise, "
    "Mavic 3TA, plus Mini 3 / 3 Pro / 4 Pro. Roadmap: exec summary lists React Native (Expo) for native apps - "
    "plan a native module / bridge to RN, or a dedicated native operator app."
  )

  pdf.add_page()
  pdf.section("3. DJI Payload SDK v3 (PSDK) - Custom Payloads & Edge Compute")
  pdf.paragraph(
    "Firmware-level SDK (latest 3.16.0, Mar 2026) to build custom payloads via SkyPort V2 / X-Port / E-Port, "
    "talking to the aircraft's flight controller, GPS and transmission. Runs on Linux/RTOS/embedded and DJI "
    "Manifold onboard computers. Stravyx relevance: Phase 2 / strategic, not near-term."
  )
  pdf.bullets([
    "Onboard 'Layer 2 at the edge': run Stravyx AI (defect detection, counting) on Manifold 3 in flight -> partial insights before landing, lower cloud cost.",
    "Specialised deliverables: integrate gas / multispectral / LiDAR sensor for premium categories (agriculture, infrastructure).",
    "Megaphone / searchlight: active-response add-on for the Sentinel patrol product.",
  ])

  pdf.section("4. FlightHub 2 OpenAPI + Modeling API / DJI Terra - Layer 2 Accelerator")
  pdf.paragraph(
    "FlightHub 2 is DJI's cloud fleet-ops platform; its OpenAPI now exposes Modeling APIs so third parties can "
    "trigger cloud reconstruction: photogrammetry, LiDAR, and 3D Gaussian Splatting (shareable by QR, no login). "
    "DJI Terra (desktop) does 2D/3D/LiDAR-RGB/multispectral - but its legacy API is being phased out in favour of "
    "FlightHub 2 Modeling APIs. Build new integrations against FlightHub 2 OpenAPI."
  )
  pdf.table_rows(
    ["Capability", "Stravyx Layer 2 scenario", "Categories"],
    [
      ["Photogrammetry (2D ortho)", "Auto site maps -> processed deliverable ($-06)", "Construction, survey"],
      ["3D / 3DGS reconstruction", "Digital twin / 3D deliverable, QR-shareable", "3D/twin, property"],
      ["LiDAR reconstruction", "High-accuracy point clouds, premium tier", "Infrastructure, survey"],
      ["Multispectral", "Crop-health maps", "Agriculture"],
    ],
    [42, PAGE_W - 82, 40],
    font_size=7,
    line_h=3.3,
  )
  pdf.paragraph(
    "Scenario: replace the manual/placeholder Layer 2 accepted at GA ($-07) with real automated map/3D "
    "deliverables shortly after launch - unlocking the full ~40% blended margin sooner."
  )

  pdf.section("5. Where DJI Changes the Stravyx MVP Loop")
  pdf.table_rows(
    ["Step", "MVP (manual, 19 Jun)", "With Cloud API (Phase 1)"],
    [
      ["Dispatch", "Broadcast brief; operator's own tools", "Push KMZ wayline to Pilot 2 / dock"],
      ["READY -> AIRBORNE", "Operator taps + checklist", "Auto from state/events; HMS safety gate"],
      ["Consumer tracker (C-05)", "Status timeline", "Live position + live video"],
      ["COMPLETE -> IN_REVIEW", "Manual raw upload (O-09)", "Auto media fast-upload; job auto-created"],
      ["Layer 2 ($-05/06)", "Manual/placeholder SLA", "FlightHub 2 Modeling API reconstruction"],
      ["Capability score", "Operator self-declared tags", "Verified from device topology/state"],
    ],
    [38, 58, PAGE_W - 96],
    font_size=7,
    line_h=3.3,
  )
  pdf.paragraph(
    "Visibility rule reminder: DJI data flows into our backend, but the visibility module still enforces "
    "field-level filtering - operators/pilots/dock owners never see customer total or Layer 2 fee."
  )

  pdf.add_page()
  pdf.section("6. Phasing & Prioritisation (Recommended)")
  pdf.subsection("Highest-leverage first (post-MVP)")
  pdf.numbered([
    "Cloud API media auto-return - kills manual-upload friction in the core loop; small backend surface.",
    "Cloud API OSD telemetry - live consumer tracker; big credibility/UX win, modest effort.",
    "FlightHub 2 Modeling API - converts placeholder Layer 2 into real margin.",
    "Cloud API wayline dispatch - unlocks Scheduled tier + patrol blocks (recurring revenue).",
    "MSDK v5 app - branded operator experience once native apps are scoped.",
    "Dock-to-Cloud + PSDK - the autonomous Phase 2 vision.",
  ])

  pdf.section("7. Access, Licensing & the 'Three DJI Asks'")
  pdf.table_rows(
    ["Requirement", "For", "How obtained"],
    [
      ["DJI developer account", "All SDKs", "developer.dji.com signup"],
      ["Cloud API license", "Cloud API (Pilot 2 / Dock)", "Generated per workspace"],
      ["MSDK app key", "Mobile SDK app", "Registered app on dev site"],
      ["PSDK credentials + hardware", "Payload dev", "Dev kit + SkyPort/X-Port/Manifold"],
      ["FlightHub 2 OpenAPI access", "Modeling / fleet", "developer.dji.com/flighthub-api"],
      ["Enterprise relationship", "Volume, support, co-marketing", "Credibility package -> DJI Enterprise intro"],
    ],
    [42, 48, PAGE_W - 90],
    font_size=7,
    line_h=3.3,
  )
  pdf.paragraph(
    "Ecosystem scale (for one-pager): 100,000+ DJI developers; 750+ cloud platforms on Cloud API since Mar 2022; "
    "110+ PSDK payloads mass-produced. Positions Stravyx as a credible cloud-platform partner."
  )
  pdf.subsection("Suggested three DJI asks (one-pager, K-02)")
  pdf.numbered([
    "Cloud API + FlightHub 2 OpenAPI enablement for the Stravyx workspace (Pilot-to-Cloud first).",
    "Enterprise hardware/partner pathway for docks (Dock 2/3), tied to Stravyx Finance (4K Group).",
    "Co-marketing / reference status as an Australian drone-services cloud platform.",
  ])

  pdf.section("8. Open Questions to Validate Before Build")
  pdf.bullets([
    "Confirm current Cloud API version + exact module endpoints (this reflects v1.14.0, Apr 2025).",
    "Confirm FlightHub 2 Modeling API commercial terms, quotas, output formats vs own pipeline (Roboflow/Pix4D).",
    "Decide MSDK-native vs RN bridge for the operator app (affects Phase 1 mobile scoping).",
    "Networking: DJI gateways need outbound MQTT/HTTPS/WSS to our endpoints - confirm no dock-site firewall blockers.",
    "Data residency: Cloud API media into S3 ap-southeast-2; confirm DJI region routing meets AU expectations.",
  ])

  pdf.paragraph(
    "Markdown source: docs/dji-integration-catalogue.md. Related: executive-summary.md, mvp-build-timeline.md. "
    "Source: DJI Developer (developer.dji.com), Cloud-API-Doc, MSDK v5 & PSDK references, FlightHub 2 OpenAPI - "
    "verify before implementation."
  )

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  build_pdf()
