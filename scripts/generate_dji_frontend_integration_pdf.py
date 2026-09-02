#!/usr/bin/env python3
"""Generate Stravyx DJI Frontend Integration PDF (aligned to docs/dji-frontend-integration.md)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-dji-frontend-integration.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - DJI Frontend Integration - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "DJI Frontend Integration - Feature Map & Build Plan",
    "Web (Next.js) + Mobile (iOS & Android)  |  Routes, Components, Primitives",
    "Stravyx Pty Ltd ACN 696 964 271  |  Jul 2026  |  CONFIDENTIAL",
  )
  pdf.paragraph(
    "Source: docs/dji-frontend-integration.md. Companion to dji-integration-catalogue.md (what DJI offers) - "
    "this doc is how it lands in the frontend. Aligned to executive-summary.md and mvp-build-timeline.md."
  )
  pdf.paragraph(
    "Phasing rule: the 19 Jun MVP ships MANUAL equivalents (status timeline, file-list deliverables, manual "
    "upload, static admin lists). Everything DJI-powered here is Phase 1+ (2026-2027), designed to swap into "
    "the same screens without redesign. Routes/components are proposed conventions against the planned monorepo."
  )

  pdf.section("0. Assumptions & Conventions")
  pdf.bullets([
    "Monorepo: apps/{consumer,operator,admin,marketing}-web (Next.js 14 App Router); apps/{consumer,operator}-mobile (Expo) [P1].",
    "packages/ui, ui-native [P1], api-client, types + NEW: realtime (WS hooks), maps (Mapbox), media (players/viewers), dji-msdk (native bridge).",
    "Routes use App Router (app/.../page.tsx) matching Figma frame naming {app}/{feature}/{screen}.",
    "Visibility is server-enforced (NestJS visibility module); frontend renders only visibility-filtered payloads.",
    "DJI device MQTT is bridged server-side; the browser consumes it via packages/realtime WebSocket - never MQTT directly.",
  ])

  pdf.section("1. Shared Frontend Primitives (build once)")
  pdf.paragraph("Most DJI features reduce to four cross-cutting primitives. Build these first.")
  pdf.table_rows(
    ["Primitive", "Package - Component", "Consumes"],
    [
      ["Real-time channel", "realtime - useMissionStream, RealtimeProvider", "OSD telemetry, state/events, upload progress, HMS"],
      ["Live map", "maps - LiveMap, RouteMap", "Aircraft pins, site polygons, no-fly zones, docks"],
      ["Video player", "media - LiveVideoPlayer (WebRTC/HLS)", "Live camera feed (from RTMP/RTSP)"],
      ["Geo / 3D viewers", "media - OrthoViewer, Model3DViewer, PointCloudViewer", "FlightHub 2 Modeling API outputs"],
    ],
    [34, 66, PAGE_W - 100],
    font_size=6.8,
    line_h=3.2,
  )
  pdf.paragraph(
    "Compose from planned packages/ui primitives: Button, Card, Badge, Modal, Table, Tabs, ProgressBar, Toast, "
    "Skeleton, EmptyState, StatusPill."
  )

  pdf.section("2. Consumer Web (apps/consumer-web)")
  pdf.table_rows(
    ["Feature", "Route", "Components / primitives", "Phase"],
    [
      ["Live tracker (C-05)", "missions/[id]", "MissionTracker -> LiveMap + StatusTimeline; useMissionStream", "MVP->P1 live"],
      ["Watch live feed", "missions/[id]/live", "LiveFeedPanel -> LiveVideoPlayer; Modal/Tabs", "P1"],
      ["Deliverables (C-06)", "missions/[id]/deliverables", "DeliverableGallery, OrthoViewer, Model3DViewer", "MVP->P1 viewers"],
      ["Auto status", "(all mission screens)", "MissionStatusProvider; StatusPill/Toast", "P1"],
      ["Deliverable QR share", "missions/[id]/deliverables", "ShareModel; Modal/Button + QR util", "P1"],
    ],
    [34, 40, PAGE_W - 96, 22],
    font_size=6.6,
    line_h=3.1,
  )

  pdf.section("3. Mobile Operator Web (apps/operator-web)")
  pdf.table_rows(
    ["Feature", "Route", "Components / primitives", "Phase"],
    [
      ["Device binding (O-01)", "onboarding/devices", "DeviceBindingPanel; Card/Button/Modal", "P1"],
      ["Assigned route (O-03)", "missions/[id]", "RouteMap (Mapbox KMZ)", "MVP->P1"],
      ["Auto upload status (O-09)", "missions/[id]/upload", "UploadProgress (event-driven); ProgressBar/Table", "MVP->P1"],
      ["Flight telemetry + HMS", "missions/[id]", "FlightStatusPanel, HmsAlertBanner; useMissionStream", "P1"],
      ["Verified capability (O-02)", "profile/capabilities", "CapabilityForm (prefill from topology)", "MVP->P1"],
    ],
    [40, 38, PAGE_W - 100, 22],
    font_size=6.6,
    line_h=3.1,
  )

  pdf.add_page()
  pdf.section("4. Admin Web (apps/admin-web)")
  pdf.table_rows(
    ["Feature", "Route", "Components / primitives", "Phase"],
    [
      ["Live fleet map (A-02)", "fleet", "FleetMap; LiveMap + useFleetStream", "MVP->P1"],
      ["Health / HMS dashboard", "health", "HealthDashboard, HmsFeed; Table/Badge/Toast", "P1"],
      ["Dock control panel", "docks/[id]", "DockControlPanel (open/close, start/stop, forced land)", "P1-2"],
      ["Situational awareness (TSA)", "fleet (overlay)", "TsaOverlay; LiveMap layer", "P1+"],
      ["Livestream monitoring", "missions/[id]", "MultiStreamViewer; Tabs + LiveVideoPlayer", "P1"],
    ],
    [42, 34, PAGE_W - 98, 22],
    font_size=6.6,
    line_h=3.1,
  )
  pdf.paragraph(
    "Dock control is safety-critical: every action uses a Modal confirm + writes to the audit log (M-07); "
    "controls disabled unless dock/aircraft state reports ready."
  )

  pdf.section("5. Marketing Web (apps/marketing-web)")
  pdf.bullets([
    "technology page: LiveTrackingDemo (canned) + Sample3D (Model3DViewer) as DJI credibility content. [P1]",
    "operators page: OperatorSignupForm (K-04). [MVP]  No live SDK wiring - embeds sample deliverables only.",
  ])

  pdf.section("6. Mobile Apps - iOS & Android (Phase 1, post-GA)")
  pdf.subsection("6.1 Architecture decision")
  pdf.paragraph(
    "MSDK v5 is native (Android AAR / iOS framework) and cannot run in Expo Go. Approach: React Native + Expo "
    "with a custom dev client (config plugin, prebuild/bare), keeping JS velocity + shared packages with web."
  )
  pdf.bullets([
    "packages/dji-msdk - native module wrapping MSDK, exposed to JS: registerApp, connectProduct, startWaypointMission(kmz), startLiveStream(url), onTelemetry(cb), uploadMedia().",
    "Android: Kotlin, Gradle com.dji:dji-sdk-v5-aircraft, -provided (compileOnly), -networkImp (runtime).",
    "iOS: Swift module linking DJI MSDK v5 via CocoaPods/SPM.",
    "Two apps share packages/ui-native: consumer-mobile (booking + tracker + deliverables) and operator-mobile (the flight app - real MSDK consumer).",
  ])

  pdf.subsection("6.2 Mobile feature map")
  pdf.table_rows(
    ["Feature", "App", "dji-msdk / native call", "Notes"],
    [
      ["Register + connect", "operator", "registerApp, connectProduct", "App key; RC link state"],
      ["Fly assigned mission", "operator", "startWaypointMission(kmz)", "One-tap KMZ; auto status"],
      ["Pre-flight gate (O-07)", "operator", "reads FC/HMS state", "Blocks READY->AIRBORNE (D-04)"],
      ["Live telemetry", "operator/consumer", "onTelemetry(cb)", "Same UX as web tracker"],
      ["Live stream", "operator", "startLiveStream(url)", "Feeds consumer watch-live"],
      ["Media + auto upload", "operator", "IMediaManager + uploadMedia()->S3", "Replaces manual; fires Layer 2"],
      ["Camera / gimbal specs", "operator", "camera/gimbal APIs", "Per-category capture"],
      ["Tracker + deliverables", "consumer", "none (realtime + API)", "Shared with web logic"],
    ],
    [36, 34, PAGE_W - 118, 48],
    font_size=6.4,
    line_h=3.0,
  )

  pdf.subsection("6.3 Platform specifics")
  pdf.table_rows(
    ["Concern", "Android", "iOS"],
    [
      ["SDK integration", "Gradle AAR (com.dji:dji-sdk-v5-*)", "CocoaPods/SPM MSDK v5 framework"],
      ["RC connection", "USB accessory intent + permission", "MFi external accessory entitlement"],
      ["Background", "Foreground service (telemetry/upload)", "Background modes (accessory, audio)"],
      ["Min OS", "Android 8+", "iOS 14+"],
      ["Store review", "Play: accessory + location disclosures", "App Store: MFi + background + location"],
      ["Build/CI", "Expo prebuild + EAS (dev client)", "EAS; Apple provisioning + MFi"],
    ],
    [30, PAGE_W - 30 - 66, 66],
    font_size=6.8,
    line_h=3.2,
  )

  pdf.add_page()
  pdf.section("7. Build Plan")
  pdf.subsection("7.1 Web - DJI frontend (Phase 1, post-GA)")
  pdf.table_rows(
    ["Sprint", "Focus", "Deliverables"],
    [
      ["W-P1.1", "Realtime foundation", "packages/realtime (WS + useMissionStream); server WS bridge; maps LiveMap skeleton"],
      ["W-P1.2", "Consumer live tracker", "C-05 timeline -> LiveMap live pin; auto status provider"],
      ["W-P1.3", "Media return + deliverables", "UploadProgress (operator); DeliverableGallery + OrthoViewer (consumer)"],
      ["W-P1.4", "Live video", "media LiveVideoPlayer; consumer watch-live; admin MultiStreamViewer"],
      ["W-P1.5", "3D deliverables", "Model3DViewer / PointCloudViewer wired to FlightHub 2; QR share"],
      ["W-P1.6", "Admin fleet + health", "FleetMap, HealthDashboard, HmsFeed; operator device binding"],
      ["W-P1.7", "Dock control + hardening", "DockControlPanel (audited, confirm modals); TSA overlay; a11y + perf"],
    ],
    [18, 40, PAGE_W - 58],
    font_size=6.6,
    line_h=3.1,
  )

  pdf.subsection("7.2 Mobile - iOS & Android (Phase 1 programme)")
  pdf.table_rows(
    ["Sprint", "Focus", "Deliverables"],
    [
      ["M-P1.0", "Foundation", "Expo monorepo apps; ui-native; custom dev client; auth + api-client reuse"],
      ["M-P1.1", "dji-msdk (Android)", "Kotlin: registerApp/connectProduct/onTelemetry; RC USB; connect screen"],
      ["M-P1.2", "dji-msdk (iOS)", "Swift parity; MFi entitlement; connect screen on iOS"],
      ["M-P1.3", "Fly mission", "startWaypointMission(kmz); PreflightChecklist gate; FlightHud telemetry"],
      ["M-P1.4", "Media + upload", "IMediaManager review + uploadMedia()->S3; auto Layer 2 trigger"],
      ["M-P1.5", "Live stream", "startLiveStream; wire to consumer watch-live"],
      ["M-P1.6", "Consumer app", "Booking reuse, MissionTracker, DeliverableGallery (shared logic)"],
      ["M-P1.7", "Store readiness", "EAS builds; Play + App Store listings; disclosures; TestFlight/internal beta"],
    ],
    [18, 34, PAGE_W - 52],
    font_size=6.6,
    line_h=3.1,
  )

  pdf.subsection("7.3 Sequencing & dependencies")
  pdf.paragraph(
    "Hard dependencies: the NestJS Cloud API bridge (server subscribes to DJI MQTT, re-publishes "
    "visibility-filtered data over WS/REST) gates ALL web realtime features; the dji-msdk native bridge gates "
    "all operator-mobile flight features."
  )
  pdf.paragraph(
    "Cut lines (if Phase 1 slips): ship web live tracker + auto upload first (highest UX/ops value); defer 3D "
    "viewers, dock control, and the full operator-mobile flight app."
  )

  pdf.section("8. Definition of Done (DJI Frontend, Phase 1)")
  pdf.numbered([
    "Consumer sees a live moving aircraft pin + auto-updating status on the tracker.",
    "Operator media auto-uploads with visible progress; Layer 2 job fires without manual steps.",
    "Consumer views processed 2D/3D deliverables in-portal (viewer, not just download).",
    "Admin sees a live fleet map + HMS health; dock controls confirm-gated and audited.",
    "operator-mobile can connect a drone and fly a Stravyx KMZ mission on iOS and Android.",
    "All DJI data remains visibility-filtered - no customer total / Layer 2 fee exposed to operators.",
  ])

  pdf.paragraph(
    "Markdown source: docs/dji-frontend-integration.md. Related: dji-integration-catalogue.md, "
    "executive-summary.md, mvp-build-timeline.md. Routes/components are proposed - reconcile with Figma at build."
  )

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  build_pdf()
