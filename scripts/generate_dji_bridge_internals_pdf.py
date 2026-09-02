#!/usr/bin/env python3
"""Generate Stravyx DJI Bridge & Client Internals PDF (aligned to docs/dji-bridge-and-client-internals.md)."""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

OUTPUT = ROOT / "docs" / "stravyx-dji-bridge-and-client-internals.pdf"


def build_pdf() -> None:
  pdf = StravyxPDF(header_label="Stravyx - DJI Bridge & Client Internals - Confidential")
  pdf.add_page()
  pdf.cover_block(
    "DJI Bridge & Client Internals",
    "MQTT ingestion  |  throttle  |  visibility projection  |  useMissionStream reconnect",
    "Stravyx Pty Ltd ACN 696 964 271  |  Jul 2026  |  CONFIDENTIAL",
  )
  pdf.paragraph(
    "Source: docs/dji-bridge-and-client-internals.md. The implementation layer below the technical spec: how the "
    "NestJS Cloud API bridge ingests DJI MQTT, throttles, projects by role and fans out; and a reference "
    "useMissionStream client with snapshot + reconnect. Decision context: ADR 0001 (unified types, Option A). "
    "Illustrative code - harden, test and security-review before production."
  )

  pdf.section("1. Bridge Topology")
  pdf.paragraph(
    "Flow: DJI gateways (Pilot 2 / Dock) -> MQTT broker (EMQX) -> NestJS ingestion (normalize -> throttle -> "
    "project) -> Redis snapshot + Redis pub/sub -> WS gateway pods -> clients."
  )
  pdf.bullets([
    "Broker (EMQX) is the natural MQTT ingress; handles TLS/auth/QoS.",
    "Redis pub/sub decouples ingestion from WS pods - scale each independently, no sticky routing.",
    "Redis snapshot (last-known state per mission/device) hydrates newly-subscribed clients instantly - critical for reconnect.",
  ])

  pdf.section("2. MQTT Subscription")
  pdf.code_block(
    "const TOPICS = [\n"
    "  'thing/product/+/osd',     // high-freq telemetry\n"
    "  'thing/product/+/state',   // sparse state changes\n"
    "  'thing/product/+/events',  // upload progress, HMS\n"
    "  'sys/product/+/status',    // online/offline, update_topo\n"
    "];\n"
    "this.client = mqtt.connect(MQTT_URL, {\n"
    "  protocol: 'mqtts', reconnectPeriod: 2000,\n"
    "  clean: false,              // durable session: don't lose msgs on blip\n"
    "  clientId: `stravyx-bridge-${POD_ID}`,\n"
    "});\n"
    "this.client.on('connect', () => this.client.subscribe(TOPICS, { qos: 1 }));"
  )
  pdf.bullets([
    "clean:false + qos:1 = durable, at-least-once -> pipeline must be idempotent (dedupe on seq/event id).",
    "One broker connection per pod; broker shared-subscription ($share/bridge/...) can load-balance OSD across pods.",
  ])

  pdf.add_page()
  pdf.section("3. Ingestion Pipeline: normalize -> throttle -> project -> publish")
  pdf.subsection("3.1 Normalization (raw thing-model -> packages/types)")
  pdf.code_block(
    "private normalizeTelemetry(sn, missionId, osd): Telemetry {\n"
    "  return {\n"
    "    missionId, deviceSn: sn,\n"
    "    position: { lat: osd.latitude, lng: osd.longitude, altM: osd.height },\n"
    "    headingDeg: osd.attitude_head ?? osd.head,\n"
    "    speedMs: Math.hypot(osd.horizontal_speed ?? 0, osd.vertical_speed ?? 0),\n"
    "    batteryPct: osd.battery?.capacity_percent ?? osd.battery_percent,\n"
    "    capturedAt: new Date().toISOString(),   // bridge clock (device clock skews)\n"
    "    seq: this.nextSeq(missionId),           // monotonic per mission\n"
    "  };\n"
    "}"
  )
  pdf.paragraph("Normalization is the ONLY place DJI field names appear. Everything downstream is packages/types.")

  pdf.subsection("3.2 Throttling / coalescing")
  pdf.paragraph(
    "OSD arrives ~10 Hz; clients need ~1-2 Hz. Coalesce per mission with leading edge + trailing flush: keep the "
    "newest sample, emit at most every INTERVAL_MS (~700ms), always flush the last. state and HMS/upload events "
    "are NOT throttled (low-frequency, each matters); upload always emits terminal done/failed."
  )
  pdf.code_block(
    "if (now - s.last >= INTERVAL_MS) { s.last = now; publish(t); }   // leading edge\n"
    "else {\n"
    "  s.pending = t;                                                 // keep newest\n"
    "  s.timer ??= setTimeout(() => {                                 // trailing flush\n"
    "    if (s.pending) { publish(s.pending); s.pending = undefined; }\n"
    "  }, INTERVAL_MS - (now - s.last));\n"
    "}"
  )

  pdf.subsection("3.3 Visibility projection layer (the margin firewall)")
  pdf.paragraph(
    "Projection runs BEFORE publish, keyed by the SUBSCRIBER's role. Store full normalized object once (admin), "
    "project per role at fan-out. Publish to role-scoped Redis channels (mission:{id}:telemetry:{role}) so a WS "
    "pod subscribes only to its clients' roles - no client-side filtering, no leak path."
  )
  pdf.code_block(
    "export function projectTelemetry(t: Telemetry) {\n"
    "  const consumer: Partial<Telemetry> = {         // safe subset only\n"
    "    missionId: t.missionId, position: t.position,\n"
    "    batteryPct: t.batteryPct, seq: t.seq, capturedAt: t.capturedAt,\n"
    "  };\n"
    "  return { admin: t, mobile_operator: t, consumer };\n"
    "}\n"
    "export function projectDeliverable(d, role) {\n"
    "  if (d.layer === 2 && role === 'mobile_operator') return null;  // operator NEVER sees L2\n"
    "  return d;                                                      // no cost fields on type\n"
    "}"
  )

  pdf.subsection("3.4 Snapshot store + publish")
  pdf.code_block(
    "await redis.set(`snap:mission:${id}:telemetry:${role}`, JSON.stringify(data), 'EX', 120);\n"
    "await redis.publish(`mission:${id}:telemetry:${role}`,\n"
    "  JSON.stringify({ type: 'telemetry', id, seq: t.seq, data }));"
  )
  pdf.paragraph("Snapshot keys hold the last-known projected value (short TTL); WS gateway reads them to build the initial snapshot frame.")

  pdf.add_page()
  pdf.section("4. WS Gateway (fan-out to clients)")
  pdf.code_block(
    "async handleSubscribe(client, { id }) {\n"
    "  await authz.assertCanView(client.userId, client.role, id);   // RBAC on mission\n"
    "  const snap = await buildSnapshot(id, client.role);           // 1) hydrate from Redis\n"
    "  client.emit({ type: 'snapshot', channel: 'mission', id, data: snap });\n"
    "  const channels = [`mission:${id}:telemetry:${client.role}`, ...];\n"
    "  redisSub.subscribe(channels, (c, msg) => client.emit(JSON.parse(msg))); // 2) deltas\n"
    "  client.onClose(() => redisSub.unsubscribe(channels));\n"
    "}"
  )
  pdf.bullets([
    "Auth once on WS upgrade; authorize per subscribe (can this user view this mission?).",
    "Any pod serves any client - state lives in Redis, so no sticky sessions.",
    "Scale: add WS pods behind LB; Redis pub/sub fans out to all.",
  ])

  pdf.section("5. Reference useMissionStream (client)")
  pdf.paragraph("Single multiplexed socket; snapshot-then-deltas; seq ordering; heartbeat; backoff reconnect. Web + RN.")
  pdf.code_block(
    "private scheduleReconnect() {\n"
    "  const jitter = Math.random() * 300;\n"
    "  setTimeout(() => this.connect(), this.backoff + jitter);\n"
    "  this.backoff = Math.min(this.backoff * 2, this.maxBackoff);   // exponential, cap 30s\n"
    "}\n"
    "// on reconnect: resend all subscribe frames; server replies with fresh snapshot\n"
    "\n"
    "// hook: drop out-of-order telemetry\n"
    "case 'snapshot':  lastSeq.current = f.data.telemetry?.seq ?? -1; hydrateAll(f.data); break;\n"
    "case 'telemetry': if (f.seq <= lastSeq.current) return;\n"
    "                  lastSeq.current = f.seq; setTelemetry(f.data); break;\n"
    "case 'upload_progress': setUploads(u => ({ ...u, [f.data.fileId]: f.data })); break;"
  )
  pdf.subsection("Behaviours delivered")
  pdf.bullets([
    "Snapshot-then-deltas: every (re)connect resends subscribe; server re-hydrates state in ~1 round-trip.",
    "Ordering: lastSeq guards out-of-order/duplicate telemetry (at-least-once upstream).",
    "Reconnect: exponential backoff + jitter, capped 30s; heartbeat detects dead sockets.",
    "Multiplexing: one socket app-wide; ref-counted subscriptions avoid duplicate streams per missionId.",
  ])

  pdf.add_page()
  pdf.section("6. Operational Concerns")
  pdf.table_rows(
    ["Concern", "Approach"],
    [
      ["Backpressure", "Throttle at bridge; slow clients coalesce to snapshot cadence per key"],
      ["Idempotency", "Dedupe upstream events by id/seq; QoS 1 = at-least-once"],
      ["Ordering across pods", "seq per-mission monotonic (single writer per mission in bridge)"],
      ["Security", "JWT on upgrade + per-subscribe RBAC; role-scoped Redis channels"],
      ["Scaling", "Stateless WS pods + Redis pub/sub; broker shared-subscriptions for OSD"],
      ["Observability", "msgs/s per topic, throttle drop ratio, WS conns, reconnect rate, hydrate latency"],
      ["Failure isolation", "Ingestion crash != WS outage (separate services); snapshot TTL bounds staleness"],
    ],
    [42, PAGE_W - 42],
    font_size=7,
    line_h=3.3,
  )

  pdf.section("7. Test Hooks")
  pdf.table_rows(
    ["Target", "Test"],
    [
      ["Normalizer", "Replay recorded OSD/state/event fixtures -> assert exact packages/types output"],
      ["Projection", "Operator/consumer channel payloads contain no L2 / customerTotal keys"],
      ["Throttle", "10 Hz input -> assert <= ~2 Hz output and last sample always flushed"],
      ["Reconnect", "Kill socket mid-mission -> snapshot re-hydrates tracker < 2s; no stale pin"],
      ["Ordering", "Inject seq [5,4,6] -> client renders 5 then 6, ignores 4"],
      ["RBAC", "Subscribe to a mission the user can't view -> error frame, no data"],
    ],
    [30, PAGE_W - 30],
    font_size=7,
    line_h=3.3,
  )

  pdf.paragraph(
    "Markdown source: docs/dji-bridge-and-client-internals.md. Related: dji-frontend-technical-spec.md, "
    "adr/0001-dji-telemetry-unified-types.md. Reference code is illustrative - harden and security-review before production."
  )

  OUTPUT.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(OUTPUT))
  print(f"Wrote {OUTPUT} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  build_pdf()
