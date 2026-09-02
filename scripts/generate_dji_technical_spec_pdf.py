#!/usr/bin/env python3
"""Generate Stravyx DJI Frontend Technical Spec PDF (aligned to docs/dji-frontend-technical-spec.md)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-dji-frontend-technical-spec.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - DJI Frontend Technical Spec - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "DJI Frontend Technical Spec - Realtime & Native Bridge",
    "packages/realtime WS contract  |  packages/dji-msdk native bridge  |  shared types",
    "Stravyx Pty Ltd ACN 696 964 271  |  Jul 2026  |  CONFIDENTIAL",
  )
  pdf.paragraph(
    "Source: docs/dji-frontend-technical-spec.md. The level below dji-frontend-integration.md: wire contracts, "
    "TypeScript interfaces and native module signatures for the two hard dependencies - packages/realtime "
    "(WebSocket) and packages/dji-msdk (native MSDK bridge). Proposed contracts (Phase 1+); lock field names "
    "against the NestJS visibility module and live DJI payloads at build."
  )

  pdf.section("0. System Context - Three Hops")
  pdf.paragraph(
    "DJI devices never talk to the browser directly. Flow: device -> DJI gateway (Pilot 2 / Dock) -> NestJS "
    "Cloud API bridge -> WS gateway (packages/realtime) -> client (web / mobile)."
  )
  pdf.subsection("Two golden rules")
  pdf.bullets([
    "The bridge NORMALIZES raw DJI thing-model payloads into stable Stravyx types (client insulated from DJI schema/version churn).",
    "The bridge FILTERS by role before publishing - operators/pilots/dock owners never receive customerTotal or Layer 2 fields, even in telemetry envelopes.",
  ])

  pdf.section("1. Shared Types (packages/types)")
  pdf.paragraph("Single source of truth imported by web, mobile, realtime, dji-msdk, and api-client.")
  pdf.code_block(
    "export type MissionStatus =\n"
    "  | 'DRAFT' | 'SUBMITTED' | 'QUOTING' | 'DISPATCHING' | 'CONFIRMED'\n"
    "  | 'READY' | 'AIRBORNE' | 'COMPLETE' | 'IN_REVIEW' | 'CLOSED' | 'DISPUTED';\n"
    "\n"
    "export interface Telemetry {\n"
    "  missionId: string; deviceSn: string;\n"
    "  position: GeoPoint; headingDeg: number; speedMs: number;\n"
    "  batteryPct: number;            // never exposes raw cell data\n"
    "  gimbalPitchDeg?: number; homeDistanceM?: number;\n"
    "  capturedAt: string;            // ISO-8601, bridge-stamped\n"
    "  seq: number;                   // monotonic per mission for ordering\n"
    "}\n"
    "\n"
    "export interface UploadProgress {\n"
    "  missionId: string; fileId: string; fileName: string;\n"
    "  kind: 'raw' | 'preview'; bytesUploaded: number; bytesTotal: number;\n"
    "  state: 'queued' | 'uploading' | 'done' | 'failed';\n"
    "  fingerprint?: string;          // chain-of-custody / dispute audit\n"
    "}\n"
    "\n"
    "export interface HmsAlert {\n"
    "  deviceSn: string; missionId?: string; code: string;\n"
    "  severity: 'info' | 'warn' | 'critical'; message: string; raisedAt: string;\n"
    "  blocksFlight: boolean;         // drives READY->AIRBORNE gate + admin freeze\n"
    "}\n"
    "\n"
    "export interface Deliverable {\n"
    "  missionId: string; id: string; layer: 1 | 2;\n"
    "  type: 'photo'|'video'|'orthomosaic'|'model3d'|'gaussian'|'pointcloud';\n"
    "  status: 'queued'|'processing'|'ready'|'failed';\n"
    "  url?: string; thumbnailUrl?: string; shareToken?: string;\n"
    "}"
  )
  pdf.paragraph(
    "Visibility note: these are the MAXIMAL shapes. The bridge emits role-projected subsets (sec 2.4). "
    "Layer 2 cost fields do not exist on the type at all - margin data lives only in admin-only server DTOs."
  )

  pdf.add_page()
  pdf.section("2. packages/realtime - WebSocket Contract")
  pdf.subsection("2.1 Connection & auth")
  pdf.table_rows(
    ["Item", "Value"],
    [
      ["Endpoint", "wss://api.stravyx.com/ws (ap-southeast-2)"],
      ["Auth", "Bearer JWT on upgrade (Auth0/Cognito); role claim drives filtering"],
      ["Heartbeat", "client ping 20s; server closes stale after 45s"],
      ["Reconnect", "exponential backoff 1s->30s + jitter; resubscribe on open"],
      ["Ordering", "per-subscription seq; client drops out-of-order telemetry"],
      ["Delivery", "snapshot then deltas - first message on subscribe is a full snapshot"],
    ],
    [30, PAGE_W - 30],
    font_size=7.5,
    line_h=3.5,
  )

  pdf.subsection("2.2 Message envelope (discriminated union on type)")
  pdf.code_block(
    "export type ServerFrame =\n"
    "  | { type: 'snapshot'; channel: Channel; id: string; data: SnapshotPayload }\n"
    "  | { type: 'telemetry'; id: string; seq: number; data: Telemetry }\n"
    "  | { type: 'mission_status'; id: string; data: { status: MissionStatus; at: string } }\n"
    "  | { type: 'mission_event'; id: string; data: MissionEvent }\n"
    "  | { type: 'upload_progress'; id: string; data: UploadProgress }\n"
    "  | { type: 'hms'; id: string; data: HmsAlert }\n"
    "  | { type: 'fleet'; data: FleetSnapshot }        // admin only\n"
    "  | { type: 'error'; code: string; message: string }\n"
    "  | { type: 'pong'; t: number };"
  )

  pdf.subsection("2.3 Bridge mapping - DJI MQTT -> Stravyx WS")
  pdf.table_rows(
    ["DJI MQTT topic", "Bridge action", "Emitted frame"],
    [
      ["thing/product/{sn}/osd", "throttle ~1-2 Hz, project fields", "telemetry"],
      ["thing/product/{sn}/state", "detect status-relevant changes", "mission_status / mission_event"],
      ["thing/product/{sn}/events (upload)", "map progress", "upload_progress"],
      ["thing/product/{sn}/events (HMS)", "severity + blocksFlight mapping", "hms"],
      ["sys/product/{gw}/status (update_topo)", "online/offline + capability", "fleet (admin)"],
    ],
    [56, PAGE_W - 56 - 40, 40],
    font_size=6.8,
    line_h=3.2,
  )
  pdf.paragraph(
    "Command direction (start mission, RTH, dock control) goes via HTTPS/services topics - plain REST in "
    "api-client, not WS (sec 4)."
  )

  pdf.subsection("2.4 Role projection (enforced server-side)")
  pdf.table_rows(
    ["Frame", "consumer", "mobile_operator", "admin"],
    [
      ["telemetry", "position, status, batteryPct", "full (own mission)", "full"],
      ["upload_progress", "high-level % only", "full (own files)", "full"],
      ["hms", "none", "own device", "all"],
      ["fleet", "-", "-", "full"],
      ["L2 Deliverable", "yes (when ready)", "never", "yes"],
    ],
    [34, 52, 48, PAGE_W - 134],
    font_size=6.8,
    line_h=3.2,
  )

  pdf.subsection("2.5 React hooks (web + RN identical surface)")
  pdf.code_block(
    "export function useMissionStream(missionId: string): {\n"
    "  status: MissionStatus; telemetry?: Telemetry;\n"
    "  uploads: UploadProgress[]; hms: HmsAlert[]; connected: boolean;\n"
    "};\n"
    "export function useFleetStream(): { devices: FleetDevice[]; connected: boolean }; // admin\n"
    "// One socket, multiplexed across subscriptions, wrapped by RealtimeProvider."
  )

  pdf.add_page()
  pdf.section("3. packages/dji-msdk - Native Bridge (mobile only)")
  pdf.paragraph(
    "Wraps MSDK v5 (Android Kotlin AAR / iOS Swift framework) behind one TS surface. Consumed by "
    "operator-mobile (full); consumer-mobile uses realtime instead."
  )
  pdf.subsection("3.1 Module surface")
  pdf.code_block(
    "export interface DjiMsdk {\n"
    "  // lifecycle\n"
    "  registerApp(): Promise<void>;\n"
    "  connectProduct(): Promise<ProductInfo>;\n"
    "  getProductInfo(): Promise<ProductInfo | null>;\n"
    "  // missions (IWaypointMissionManager / IWPMZManager)\n"
    "  loadWaypointMission(kmzUri: string): Promise<{ missionId: string }>;\n"
    "  startWaypointMission(): Promise<void>;\n"
    "  pauseWaypointMission(): Promise<void>;\n"
    "  resumeWaypointMission(): Promise<void>;\n"
    "  stopWaypointMission(): Promise<void>;\n"
    "  // livestream (ILiveStreamManager)\n"
    "  startLiveStream(cfg: { url: string; protocol: 'rtmp'|'rtsp'; bitrateKbps?: number }): Promise<void>;\n"
    "  stopLiveStream(): Promise<void>;\n"
    "  // media (IMediaManager)\n"
    "  listMedia(): Promise<MediaFile[]>;\n"
    "  uploadMedia(o: { fileIds: string[]; sts: StsCredentials; missionId: string }): Promise<void>;\n"
    "  // safety\n"
    "  getHmsState(): Promise<HmsAlert[]>;\n"
    "  startReturnToHome(): Promise<void>;\n"
    "}"
  )

  pdf.subsection("3.2 Event emitter (native -> JS, mirrors WS frames)")
  pdf.code_block(
    "export type DjiEvent =\n"
    "  | { type: 'connection'; data: { rcConnected: boolean; aircraftConnected: boolean } }\n"
    "  | { type: 'telemetry'; data: Telemetry }          // same packages/types shape\n"
    "  | { type: 'missionState'; data: { status: MissionStatus; waypointIndex?: number } }\n"
    "  | { type: 'uploadProgress'; data: UploadProgress }\n"
    "  | { type: 'hms'; data: HmsAlert }\n"
    "  | { type: 'error'; data: DjiError };\n"
    "export function addDjiListener(cb: (e: DjiEvent) => void): () => void;"
  )
  pdf.paragraph(
    "Design symmetry: Telemetry/UploadProgress/HmsAlert are the SAME types the bridge emits, so FlightHud binds "
    "to either useMissionStream() (cloud path) or addDjiListener() (direct SDK path) via one adapter - no duplicate UI."
  )

  pdf.subsection("3.4 Native mapping")
  pdf.table_rows(
    ["TS method / event", "Android (MSDK v5)", "iOS (MSDK v5)"],
    [
      ["startWaypointMission", "IWaypointMissionManager.startMission", "WaypointMissionOperator.startMission"],
      ["missionState event", "WaypointMissionExecuteStateListener", "mission operator listener"],
      ["startLiveStream", "ILiveStreamManager.startStream", "DJILiveStreamManager"],
      ["listMedia / uploadMedia", "IMediaManager + S3 multipart", "MediaManager + S3 multipart"],
      ["telemetry event", "FC/battery/gimbal key listeners", "key manager listeners"],
    ],
    [40, PAGE_W - 40 - 56, 56],
    font_size=6.6,
    line_h=3.1,
  )

  pdf.subsection("3.5 Lifecycle & threading")
  pdf.bullets([
    "registerApp() once at app start (needs network for first activation); cache activation.",
    "SDK callbacks arrive on native threads -> bridge marshals to JS thread before emitting.",
    "RC link is source of truth: disable Fly/Stream/Upload UI unless rcConnected && aircraftConnected.",
    "Foreground service (Android) / background modes (iOS) keep telemetry + upload alive when screen locks mid-mission.",
  ])

  pdf.add_page()
  pdf.section("4. Command Path (packages/api-client) - Not WebSocket")
  pdf.paragraph("Outbound actions are REST (idempotent, auditable), not WS.")
  pdf.code_block(
    "export const djiApi = {\n"
    "  dispatchWayline: (missionId, kmzId) => post(`/missions/${missionId}/dispatch`, { kmzId }),\n"
    "  getStsCredentials: (missionId) => post(`/missions/${missionId}/upload-credentials`, {}),\n"
    "  dockCommand: (dockId, cmd /* open|close|start_task|stop_task|force_land */) =>\n"
    "    post(`/docks/${dockId}/command`, { cmd }),   // admin only; server writes audit (M-07)\n"
    "};"
  )
  pdf.paragraph(
    "Every dockCommand requires a client confirm modal AND server-side RBAC + audit. The UI never assumes "
    "success; it awaits the resulting mission_status / fleet WS frame."
  )

  pdf.section("5. Media Viewer Inputs (packages/media)")
  pdf.paragraph("FlightHub 2 Modeling API outputs map to viewer props:")
  pdf.code_block(
    "OrthoViewerProps      { url; boundsGeoJson? }            // 2D orthomosaic (COG/tiles)\n"
    "Model3DViewerProps    { url; format: 'glb'|'obj'|'3dtiles' }   // photogrammetry mesh\n"
    "PointCloudViewerProps { url; format: 'las'|'laz'|'potree' }    // LiDAR\n"
    "GaussianViewerProps   { url }                            // 3DGS splat"
  )
  pdf.paragraph(
    "DeliverableGallery switches viewer by Deliverable.type; all sources are signed short-TTL URLs issued by "
    "api-client (never public buckets)."
  )

  pdf.section("6. Test & Acceptance Hooks")
  pdf.table_rows(
    ["Contract", "Test"],
    [
      ["Role projection", "Contract tests: consumer/operator WS payloads contain no L2 or customerTotal fields"],
      ["Ordering", "Inject out-of-order seq; client renders latest only"],
      ["Reconnect", "Kill socket mid-mission; snapshot re-hydrates tracker within 2s"],
      ["Bridge normalization", "Replay recorded DJI OSD fixtures -> assert stable Telemetry"],
      ["dji-msdk parity", "Same DjiEvent stream shape on Android + iOS simulators (mock SDK)"],
      ["HMS gate", "blocksFlight:true disables startWaypointMission + blocks READY->AIRBORNE"],
    ],
    [40, PAGE_W - 40],
    font_size=7,
    line_h=3.3,
  )

  pdf.paragraph(
    "Markdown source: docs/dji-frontend-technical-spec.md. Related: dji-frontend-integration.md, "
    "dji-integration-catalogue.md, mvp-build-timeline.md. All interfaces are proposed contracts - lock at build."
  )

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  build_pdf()
