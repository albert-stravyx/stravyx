#!/usr/bin/env python3
"""Generate the Stravyx Data Model / ERD PDF (aligned to docs/data-model-erd.md, v0.3.1).

The mermaid ER diagrams in the markdown are replaced by the rendered SVG
illustrations under docs/images/ (rasterised to PNG by scripts/render_erd_svgs.py).
Pipeline: scripts/render_erd_mermaid.py (md -> SVG) then
scripts/render_erd_svgs.py (SVG -> PNG) then this script (PNG -> PDF).
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".venv-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from stravyx_pdf import PAGE_W, StravyxPDF  # noqa: E402

IMG = ROOT / "docs" / "images" / "layout-elk" / "rendered"

LAYOUT_LABELS = {
  "dagre": "dagre layout (default mermaid positioning)",
  "elk": "elk layout (compact grid positioning)",
}

DIAGRAMS = {
  "map": "High-level domain map.png",
  "dispatch": "The dispatch mechanic - first-to-accept (confirmed).png",
  "A": "Domain A - Identity, organizations & supply-side.png",
  "B": "Domain B - Catalogue & pricing.png",
  "C": "Domain C - Missions & dispatch (the core).png",
  "D": "Domain D - Payments (the margin firewall).png",
  "E": "Domain E - Media, deliverables & processing (Layer 2).png",
  "F": "Domain F - Devices & docks (DJI).png",
  "Fcont": "Domain F (cont.) - Telemetry & HMS (time-series).png",
  "G": "Domain G - Compliance, audit & disputes.png",
  "Gcont": "Domain G (cont.) - Reviews & notifications.png",
  "H": "Domain H - Academy & growth (CRM boundary).png",
}


def diagram(pdf, key, caption):
  path = IMG / DIAGRAMS[key]
  if not path.exists():
    raise FileNotFoundError(
      f"Missing diagram {path}. Run: python3 scripts/render_erd_mermaid.py --layout <dagre|elk> && "
      f"python3 scripts/render_erd_svgs.py --layout <dagre|elk>"
    )
  pdf.diagram(str(path), caption=caption)


def build_pdf(output: Path, img_dir: Path, layout: str) -> None:
  global IMG
  IMG = img_dir
  layout_label = LAYOUT_LABELS.get(layout, layout)
  pdf = StravyxPDF(
    header_label=f"Stravyx - Data Model / ERD (Draft v0.3.1, {layout}) - Confidential"
  )
  pdf.add_page()
  pdf.cover_block(
    "Draft Data Model / ERD",
    f"First-to-accept dispatch  |  live lead schema  |  ReOC-operated docks  |  {layout_label}",
    f"Stravyx Pty Ltd  |  Draft v0.3.1 ({layout})  |  Jul 2026  |  CONFIDENTIAL",
  )
  pdf.paragraph(
    "Status: Draft (v0.3.1) - v0.3 base per Data Model ERD Feedback v2 (Liz Ip, July 2026), checked against User "
    "Journey v5, Web App Master v6, Website Master v5, Consent & Privacy Policy v4, and Operator Database "
    "Brief Feedback v3. v0.3.1 syncs Domain H + HubSpot boundary to the live Supabase lead schema (Phase 1A)."
  )
  pdf.paragraph(
    "v0.3 additions: approvals registry (operator_approvals + approval_areas), ReOC-operated dock model, "
    "assessed status + mission_feasibility, provider-agnostic payment refs (rail open - not Stripe/Xero-locked), "
    "integer cents for money. v0.3.1: website growth lead tables aligned to live stravyx.com inserts + "
    "INSERT-trigger HubSpot sync. See Section 14 changelog."
  )
  pdf.paragraph(
    "Target stack: PostgreSQL 15+ with PostGIS (geo), Redis (hot state / queues), S3 + CDN (media), AWS "
    "ap-southeast-2. Telemetry is a time-series table (TimescaleDB hypertable or native partitioning) - see Section 9."
  )
  pdf.paragraph(
    "Scope note: MVP (launch) tables are marked [MVP]; Phase 1 / Phase 2 tables are marked [P1] / [P2]. They are "
    "included now so the schema does not need destructive migrations later - build the MVP subset, leave the rest "
    "feature-flagged / unmigrated until needed."
  )

  # --- Section 0 -----------------------------------------------------------
  pdf.section("0. How to read this document")
  pdf.numbered([
    "Section 1 Conventions - the rules every table follows (keys, timestamps, money, soft delete, visibility).",
    "Section 2 High-level map - one diagram showing the eight domains and how they connect.",
    "Section 2b Dispatch mechanic - the confirmed first-to-accept flow the whole marketplace hangs off.",
    "Sections 3-12 Domain sections - each has a focused ER diagram, a table-by-table breakdown with column "
    "comments, and an association rationale (why the relationship exists and its cardinality).",
    "Section 13 Recommendations - things beyond the original brief worth locking (audit immutability, visibility "
    "views, race safety, retention, KYC/insurance expiry, HubSpot boundary, etc.).",
    "Section 14 Changelog and Section 15 Open questions.",
  ])
  pdf.paragraph(
    "The single most important architectural constraint is the two-layer revenue model + five visibility layers "
    "(exec summary, 'Information architecture'). Money and Layer 2 data must be STRUCTURALLY unreachable by "
    "ReOCs / pilots / dock owners - not just hidden in the UI. Sensitive figures live in separate tables and I "
    "recommend DB-level projections (Section 13.2) so a leaky query cannot expose margin."
  )

  # --- Section 1 -----------------------------------------------------------
  pdf.section("1. Conventions")
  pdf.table_rows(
    ["Rule", "Decision", "Why"],
    [
      ["Primary keys", "uuid (v7 preferred) id on every table",
       "Non-guessable, shard-friendly, safe to expose in URLs; v7 is time-sortable for index locality"],
      ["Timestamps", "created_at, updated_at (timestamptz, UTC) on every table",
       "Auditability; store UTC for future multi-region"],
      ["Soft delete", "deleted_at timestamptz NULL on user-facing entities",
       "Marketplace disputes / regulatory audit need recoverable history; hard-delete only via retention job (13.7)"],
      ["Money", "bigint minor units (cents) + currency char(3) (default AUD); never floats",
       "Decided (feedback v2) - avoids 85/15 + L1/L2 rounding drift"],
      ["Payment / payout provider", "Provider-agnostic provider_*_ref columns; no hard-coded rail",
       "Capture and payout rails are open decisions - do not bake in Stripe, Xero, or any vendor until confirmed"],
      ["Enums", "Postgres enum for stable machine states; lookup tables for admin-editable sets",
       "Balance integrity vs runtime flexibility (13.9)"],
      ["Geo", "PostGIS geography(Point,4326) / geography(Polygon,4326)",
       "Distance for eligibility / coverage + coverage polygons"],
      ["JSON", "jsonb for flexible / vendor payloads (DJI raw, requirement specs)",
       "Schema churn insulation (ADR 0001); index with GIN where queried"],
      ["Idempotency", "idempotency_key on externally-triggered writes (payments, uploads, HubSpot push)",
       "At-least-once webhooks / MQTT / CRM (bridge doc 6, feedback 06)"],
      ["Race safety", "DB-level constraints decide contested writes, not the app",
       "First-to-accept is a race by design - the winner is decided by a partial unique index (5, 13.14)"],
      ["Audit", "Append-only audit_log + status-event tables; no UPDATE/DELETE",
       "Immutable audit log is a launch requirement"],
      ["Naming", "snake_case tables (plural) and columns; FK = {singular}_id",
       "Convention consistency"],
    ],
    [26, 60, PAGE_W - 86],
    font_size=7,
    line_h=3.4,
    header_font_size=8,
  )

  # --- Section 2 -----------------------------------------------------------
  pdf.section("2. High-level domain map")
  diagram(pdf, "map", "High-level domain map - the eight domains and how they connect")
  pdf.paragraph("Eight domains (detailed sections below):")
  pdf.table_rows(
    ["#", "Domain", "Sec.", "Core tables", "Verdict (feedback v2)"],
    [
      ["A", "Identity, orgs & supply-side", "3",
       "users, reoc_profiles, pilot_profiles, roster_acceptances, operator_credentials, operator_approvals, "
       "approval_areas, service_areas, operator_equipment", "Reshape - approvals registry"],
      ["B", "Catalogue & pricing", "4",
       "mission_categories, equipment_classes, pricing_configs, urgency_tiers", "Reshape - drop price guides"],
      ["C", "Missions & dispatch", "5",
       "missions, mission_offers, mission_requirements, mission_feasibility, mission_schedules, ...",
       "Reshape - dispatch + restricted-ops path"],
      ["D", "Payments", "6", "payments, payment_splits, payouts, payout_lines, refunds",
       "Reshape - provider-agnostic; payout cardinality open"],
      ["E", "Media, deliverables & processing", "7", "media_files, deliverables, processing_jobs", "Aligned"],
      ["F", "Devices, docks & telemetry (DJI)", "8-9",
       "devices, docks (ReOC-operated), device_bindings, telemetry, hms_alerts, livestreams",
       "Reshape - ReOC-operated docks [MVP]; live-ops gated"],
      ["G", "Compliance, audit, reviews & notifications", "10-11",
       "compliance_checks, audit_log, reviews, disputes, notifications", "Aligned"],
      ["H", "Academy & growth (CRM boundary)", "12",
       "academy_enquiries, operator_leads, contact_leads, enterprise_leads, business_leads, "
       "home_owner_leads, talent_interests, providers (+ HubSpot)", "Synced - live website leads"],
    ],
    [8, 38, 10, 70, PAGE_W - 126],
    font_size=6.5,
    line_h=3.2,
    header_font_size=7.5,
  )

  # --- Section 2b ----------------------------------------------------------
  pdf.section("2b. The dispatch mechanic - first-to-accept (confirmed)")
  pdf.paragraph(
    "This is the mechanic the marketplace hangs off, confirmed by Joel (feedback 03). Read this before Domains A-C."
  )
  diagram(pdf, "dispatch", "First-to-accept dispatch - fan-out at a fixed price, DB decides the winner")
  pdf.subsection("Rules baked into the schema")
  pdf.numbered([
    "Stravyx sets the price. No bids, no floor, no ceiling, no ranking on price. The price lives on the mission; "
    "mission_offers carries NO price - there is nothing to compete on.",
    "Eligibility decides who sees the offer; speed decides who wins. Fan-out targets only ReOCs that pass: "
    "service_areas (self-declared coverage), equipment match, document credentials (operator_credentials), "
    "verified CASA approval geometry covering the mission point (operator_approvals + approval_areas - NOT "
    "service_areas), and urgency-tier capability (reoc_profiles.max_urgency_tier_id).",
    "First to accept wins - decided in the database. A partial unique index UNIQUE (mission_id) WHERE "
    "status = 'accepted' guarantees exactly one winner under a two-tap race; the loser gets a clean 'mission "
    "already taken' (5, 13.14).",
    "Offer expiry is tier-driven. expires_at = offered_at + urgency_tiers.dispatch_window. Immediate = short expiry "
    "+ aggressive fan-out; Scheduled = wide window.",
    "FLIGHT SCORE != dispatch ranking. FLIGHT SCORE ranks pilots in the verified pool for ReOC roster selection - "
    "it is a pilot_profiles attribute, not a bid-scoring table.",
  ])
  pdf.paragraph(
    "Confirmed mission state machine: booked -> dispatched -> accepted -> allocated -> assessed -> flown -> "
    "delivered (assessed = RP feasibility sign-off when required). Solo ReOC: allocated_pilot_id stays null."
  )

  # --- Section 3 -----------------------------------------------------------
  pdf.section("3. Domain A - Identity, organizations & supply-side")
  diagram(pdf, "A", "Domain A - Identity, organizations & supply-side")
  pdf.subsection("Tables")
  pdf.bullets([
    "users - Every human / principal. primary_role is a fast-path denormalization of the RBAC in user_roles. "
    "auth_provider_id maps to Auth0/Cognito sub - no passwords stored. New: hubspot_contact_id is the one-way CRM "
    "sync ref (12 / 13.15) so the outbound push is idempotent and traceable rather than a lookup-by-email guess.",
    "roles / user_roles - RBAC. A user can hold multiple roles, and grants can be org-scoped (scope_org_id). This "
    "enforces the field-level visibility matrix at the API layer.",
    "organizations - Company entity: ReOC operators, enterprises (direct/reseller), dock owners. abn_acn supports "
    "AU compliance / invoicing.",
    "organization_members - Many-to-many users<->organizations with an intra-org member_role.",
    "reoc_profiles (was operator_profiles, split) - The DISPATCHABLE supply entity (1:1 with a reoc organization). "
    "Adds mode (solo | roster, both first-class), max_urgency_tier_id (FK to urgency_tiers; the most demanding tier "
    "this ReOC can service, applied as a hard pre-filter in fan-out), payout_account_ref (provider-agnostic "
    "settlement account for the 85% ReOC share - rail TBD), reputation, and acceptance_rate (derived from "
    "mission_offers).",
    "pilot_profiles (new, split out) - Verified RPL pilots in the pool, 1:1 with a user. Not directly dispatchable "
    "until rostered. pool_status (verified | available | rostered) and flight_score (FLIGHT SCORE - ranks pilots "
    "for roster selection) live here directly, not in a bid-scoring table.",
    "roster_acceptances (new - the missing third supply-chain entity) - The ReOC<->pilot pairing that makes a "
    "mission legally operable under CASA. Holds reoc_profile_id, pilot_profile_id, accepted_at (the compliance "
    "timestamp), split (the privately-agreed share of the 85% - Stravyx records but does not set it), and status.",
    "operator_credentials - RePL / ReOC / insurance docs with expires_at (critical - expiring credentials must "
    "auto-suspend eligibility, 13.5). Attaches to EITHER a reoc_profile OR a pilot_profile (exactly one FK set).",
    "operator_approvals (new) - Verified CASA restricted-ops approvals attached to ReOC only (never pilot). "
    "approval_type, reference_number, verified_at, expires_at.",
    "approval_areas (new) - PostGIS polygons for each approval. Eligibility uses ST_Covers(approval_areas.area, "
    "mission_point) - NOT service_areas.",
    "service_areas (was operator_service_areas) - PostGIS coverage polygons + travel radius on the ReOC. "
    "Self-declared operational coverage; separate from CASA approval geometry.",
    "operator_equipment - Drones the ReOC can bring (BYO). capabilities (jsonb) feeds the equipment/requirements "
    "match eligibility filter. serial_number links to a devices row once the drone streams telemetry (Section 8).",
  ])
  pdf.subsection("Association rationale")
  pdf.bullets([
    "organizations 1:0..1 reoc_profiles and users 1:0..1 pilot_profiles: a ReOC is an org-level dispatchable "
    "supplier; a pilot is an individual pool member. Splitting them mirrors the two distinct real-world entities "
    "and keeps dispatch logic (ReOC-only) clean from pool logic (pilot-only).",
    "roster_acceptances is the many-to-many-over-time bridge between ReOCs and pilots - a ReOC rosters many pilots; "
    "a pilot may fly under more than one ReOC over time. accepted_at + split make each pairing auditable for CASA.",
    "operator_credentials uses two nullable FKs + a check so one table serves both supply entities without a "
    "polymorphic type column.",
  ])

  # --- Section 4 -----------------------------------------------------------
  pdf.section("4. Domain B - Catalogue & pricing")
  pdf.paragraph(
    "Reshaped (feedback B): price_guides is DROPPED - Stravyx sets the price; there is no floor, ceiling, or band. "
    "The formula tables survive and compute a flat price. urgency_tiers.dispatch_window is repurposed as the "
    "offer-expiry driver."
  )
  diagram(pdf, "B", "Domain B - Catalogue & pricing")
  pdf.subsection("Tables")
  pdf.bullets([
    "mission_categories - The ten mission categories. mvp_enabled / feature_flagged drive '5 live at launch, "
    "remainder flagged' without code changes.",
    "equipment_classes - Drives the equipment factor in the price formula (base x equipment_factor x urgency). "
    "Thermal / LiDAR / RTK cost more.",
    "pricing_configs - Versioned, immutable base-rate config ($250/hr base). Never update a row - insert a new "
    "version and flip is_active; missions snapshot pricing_config_id at booking so historical prices are "
    "reproducible. (Feedback: 'Albert's versioned, immutable pricing pattern is exactly right - keep it.')",
    "urgency_tiers (reshaped) - The four tiers. multiplier is now a single flat multiplier (no min/max band, since "
    "there is no bidding). dispatch_window takes on a new job: offer expiry (mission_offers.expires_at = "
    "offered_at + dispatch_window). rank orders tiers so reoc_profiles.max_urgency_tier_id can express 'this tier "
    "and all below'.",
  ])
  pdf.subsection("Association rationale")
  pdf.bullets([
    "Pricing tables are referenced BY missions (not vice-versa) so historical financial records reproduce even "
    "after admins retune. price_guides is gone - there is no floor/ceiling entity because there is nothing to bid "
    "within.",
    "urgency_tiers now has a dual role: a pricing multiplier AND the temporal driver of offer expiry - one column "
    "(dispatch_window) cleanly produces 'Immediate = short window, Scheduled = wide window' dispatch behaviour.",
  ])

  # --- Section 5 -----------------------------------------------------------
  pdf.section("5. Domain C - Missions & dispatch (the core)")
  pdf.paragraph(
    "Reshaped (feedback v2): adds restricted-ops path (mission_requirements, mission_feasibility, assessed status), "
    "dock fulfilment, and mission_schedules. Bids/match_scores remain dropped from v0.2."
  )
  diagram(pdf, "C", "Domain C - Missions & dispatch (the core)")
  pdf.subsection("Tables")
  pdf.bullets([
    "missions - State machine: draft -> booked -> dispatched -> accepted -> allocated -> assessed -> flown -> "
    "delivered (+ disputed/cancelled). assessed = RP feasibility sign-off when mission_requirements apply. "
    "Assignment on the row: assigned_reoc_id, fulfilment (solo | roster | dock), allocated_pilot_id, dock_id. "
    "Money: network_price + flight_fee (Layer 1); Layer 2 fee in payment_splits only.",
    "mission_requirements (new) - Restricted-ops specs (BVLOS, night, etc.) linked to mission; drives approval "
    "eligibility and assessed gate.",
    "mission_feasibility (new) - RP assessment record before assessed -> flown when required.",
    "mission_schedules (new) - Dock mission scheduling windows when fulfilment = dock.",
    "mission_locations - Address visibility is gated: suburb shows on the offer; full_address is revealed ONLY to "
    "the accepting ReOC. PostGIS point powers coverage eligibility and the live map.",
    "mission_offers (new - replaces bids) - The fan-out record: one mission, many offers, NO price (price is on "
    "the mission - nothing to compete on). expires_at is tier-driven. status (sent | viewed | accepted | declined "
    "| expired) is the offer lifecycle. Race safety (13.14): a partial unique index UNIQUE (mission_id) WHERE "
    "status = 'accepted' means the first transaction to flip an offer to accepted also sets "
    "missions.assigned_reoc_id and moves the mission dispatched -> accepted; a second concurrent tap gets a "
    "constraint failure -> clean 'mission already taken'. Also yields per-ReOC acceptance-rate and response-time.",
    "mission_status_events - Append-only state-transition log (event sourcing). Powers audit, the tracker UI, and "
    "dispute reconstruction. actor_id records who/what caused the transition (customer, ReOC, pilot, admin, system).",
  ])
  pdf.subsection("Association rationale")
  pdf.bullets([
    "missions 1:many mission_offers is the new supply-side relationship - the fan-out. There is NO bids table and "
    "NO match_scores table; nothing ranks offers because the winner is decided by speed, not score.",
    "reoc_profiles 1:0..1 missions via assigned_reoc_id: exactly one ReOC wins; the FK is null until first accept.",
    "pilot_profiles missions via allocated_pilot_id: only set in roster fulfilment, and the allocated pilot must "
    "have an active roster_acceptance with the assigned ReOC (enforce in app + FK-level check).",
    "missions 1:1 mission_locations, split purely for the address-visibility gate.",
    "mission_status_events (1:many) is immutable - append only.",
  ])
  pdf.paragraph(
    "FLIGHT SCORE, relocated: the retired match_scores table's purpose (ranking) does NOT apply to dispatch. "
    "FLIGHT SCORE now ranks pilots for ReOC roster selection and lives on pilot_profiles.flight_score."
  )

  # --- Section 6 -----------------------------------------------------------
  pdf.section("6. Domain D - Payments (the margin firewall)")
  pdf.paragraph(
    "Reshaped (feedback v2): provider-agnostic capture/payout refs (rail open - not Stripe/Xero-locked). "
    "85/15 split and Layer 2 firewall unchanged. payout_lines holds open payout cardinality."
  )
  diagram(pdf, "D", "Domain D - Payments (the margin firewall)")
  pdf.subsection("Tables")
  pdf.bullets([
    "payments - One customer charge per mission. amount_total_cents = mission network_price. "
    "provider_capture_ref + capture_provider are provisional until rail confirmed. Status: hold -> capture. "
    "idempotency_key guards duplicate webhooks.",
    "payment_splits - L1_flight (85% ReOC / 15% Stravyx network fee) and L2_processing (100% Stravyx). "
    "Amounts in cents (bigint).",
    "payouts - ReOC-facing 85% release on delivery. reoc_profile_id. provider_payout_ref + payout_provider "
    "provisional.",
    "payout_lines (new) - Line items linking payouts to missions; supports per-mission vs consolidated monthly "
    "payout models.",
    "refunds - Dispute / cancellation refunds, admin-issued, linked to the original payment.",
  ])
  pdf.subsection("Association rationale")
  pdf.bullets([
    "payments 1:many payment_splits: sum of splits reconciles to amount_total.",
    "payments 1:0..1 payouts: payout exists only after capture + release.",
    "Visibility enforcement: ReOCs access payouts and ONLY their own payment_splits where beneficiary='reoc' - "
    "never L2_processing / network_fee. Recommend a DB view (13.2) to make this non-bypassable.",
  ])

  # --- Section 7 -----------------------------------------------------------
  pdf.section("7. Domain E - Media, deliverables & processing (Layer 2)")
  pdf.paragraph(
    "Aligned (feedback E): Layer 1 (raw, customer + operator visible) / Layer 2 (AI-processed, operator-invisible) "
    "split is correct. No changes."
  )
  diagram(pdf, "E", "Domain E - Media, deliverables & processing (Layer 2)")
  pdf.subsection("Tables")
  pdf.bullets([
    "media_files - Raw uploads to S3 (multipart via STS creds). fingerprint (sha256) = chain-of-custody for "
    "dispute audit. kind separates raw evidence from previews.",
    "deliverables - Layer 1 (raw, visible to customer + operator) and Layer 2 (AI-processed, operator-invisible). "
    "type matches the media viewers. share_token supports QR sharing of L2 outputs. Only s3_key stored - the API "
    "issues signed short-TTL URLs.",
    "processing_jobs - The Layer 2 queue. Tracks pipeline, retries, SLA timing. MVP can be a stub/manual step; "
    "ready for the AI engine (Roboflow/Pix4D) later.",
  ])
  pdf.subsection("Association rationale")
  pdf.bullets([
    "media_files 1:many processing_jobs 1:0..1 deliverables: processing consumes raw media and emits a processed "
    "deliverable (0..1 because a job may fail before output).",
    "deliverables.layer is the single switch the visibility projector uses; L2 rows are filtered out for operator "
    "roles.",
  ])

  # --- Section 8 -----------------------------------------------------------
  pdf.section("8. Domain F - Devices & docks (DJI)")
  pdf.paragraph(
    "Reshaped (feedback v2): ReOC-operated docks [MVP]. Live-ops build gated on DJI overseas disclosure (13.16). "
    "DJI Enterprise Ecosystem application can proceed in parallel."
  )
  diagram(pdf, "F", "Domain F - Devices & docks (DJI)")
  pdf.subsection("Tables")
  pdf.bullets([
    "devices - Every DJI aircraft/dock/RC/gateway keyed by serial number (the bridge's MQTT join key). "
    "capabilities verifies operator equipment claims. last_seen_at + status power the admin fleet view.",
    "docks [MVP] - ReOC-operated fixed DJI Dock 2/3. operating_reoc_id + covering_approval_id link dock to "
    "supply-side approvals. per_flight_fee and public_network dropped.",
    "device_bindings - Device<->mission mapping over time (released_at NULL = active). Backs the bridge's "
    "missionForDevice(sn) and audit ('which drone flew which mission').",
    "livestreams [P1] - Live video session metadata (MSDK ILiveStreamManager); media plane is RTMP/RTSP/WebRTC.",
  ])
  pdf.subsection("Association rationale")
  pdf.bullets([
    "docks 1:many devices; devices can also be operator-owned (nullable dock_id).",
    "device_bindings is many-to-many-over-time between devices and missions; released_at avoids overlapping active "
    "bindings.",
  ])

  # --- Section 9 -----------------------------------------------------------
  pdf.section("9. Domain F (cont.) - Telemetry & HMS (time-series)")
  diagram(pdf, "Fcont", "Domain F (cont.) - Telemetry & HMS (time-series)")
  pdf.subsection("Tables")
  pdf.bullets([
    "telemetry - Normalized OSD stream (matches packages/types Telemetry, ADR 0001). High-volume, append-only, "
    "time-series. Recommendation: TimescaleDB hypertable (or native range partition on captured_at) with "
    "retention/downsampling - full-resolution for N days, then continuous aggregates for path replay. Hot "
    "last-known stays in Redis; Postgres is the durable audit/dispute path. seq gives per-mission ordering. "
    "battery_pct only - never raw cell data.",
    "hms_alerts - DJI Health Management System alerts. blocks_flight is the compliance gate: a critical/blocks_"
    "flight alert prevents the allocated -> flown transition (the former READY->AIRBORNE gate) and can trigger an "
    "admin freeze.",
  ])
  pdf.subsection("Association rationale")
  pdf.bullets([
    "Both are 1:many off missions/devices, append-only, never soft-deleted (immutable flight record). They "
    "reference device_sn (natural key) to match the SN-keyed bridge pipeline.",
  ])

  # --- Section 10 ----------------------------------------------------------
  pdf.section("10. Domain G - Compliance, audit & disputes")
  pdf.paragraph(
    "Aligned (feedback G): immutable append-only audit log + compliance gate. No changes except mapping the gate "
    "onto the confirmed state machine."
  )
  diagram(pdf, "G", "Domain G - Compliance, audit & disputes")
  pdf.subsection("Tables")
  pdf.bullets([
    "compliance_checks - The pre-flight compliance gate, now on the allocated -> flown transition (formerly "
    "READY->AIRBORNE). items (jsonb) captures airspace/weather/NOTAM/HMS. A mission cannot go to flown without a "
    "passed check, cross-checked against hms_alerts.blocks_flight.",
    "audit_log - Immutable, append-only audit of every sensitive action, now including offer.accept (the "
    "race-decided assignment), dock commands, pricing changes, verification decisions, payout releases, dispute "
    "freezes. Stores before/after + ip_address. Satisfies immutable-audit + CSV-export requirements. No "
    "UPDATE/DELETE.",
    "disputes - Dispute lifecycle with admin freeze (halts payouts + progression). Links to refunds (Section 6).",
  ])
  pdf.subsection("Association rationale")
  pdf.bullets([
    "missions 1:0..1 compliance_checks (recommend 1:many to keep every attempt for audit).",
    "audit_log is loosely coupled (entity_type + entity_id polymorphic ref, not hard FKs) so it records actions "
    "across any table and survives archival of referenced rows.",
  ])

  # --- Section 11 ----------------------------------------------------------
  pdf.section("11. Domain G (cont.) - Reviews & notifications")
  diagram(pdf, "Gcont", "Domain G (cont.) - Reviews & notifications")
  pdf.subsection("Tables")
  pdf.bullets([
    "reviews - Customer rating (1-5) after delivered. Feeds reoc_profiles.rating_avg. 1:1 with a mission.",
    "notifications - Essential for a dispatch marketplace: offer-received alerts (with tier-driven urgency), "
    "offer-expiring, mission-taken, upload complete, deliverable ready, credential-expiry warnings. Multi-channel "
    "with delivery status.",
  ])

  # --- Section 12 ----------------------------------------------------------
  pdf.section("12. Domain H - Academy & growth (CRM boundary)")
  pdf.paragraph(
    "Synced (v0.3.1 / Phase 1A): Domain H matches the live website lead tables on Supabase - columns reverse-"
    "engineered from Replit stravyx.com form inserts. HubSpot is the engagement layer, not a second database - "
    "one-way sync only. providers stays for future Academy routing; live forms write direct inserts today "
    "(insert-only RLS), then a Postgres trigger fans out to HubSpot."
  )
  pdf.paragraph(
    "Page -> table: /academy -> academy_enquiries; /for-operators -> operator_leads; /contact -> contact_leads; "
    "/enterprise -> enterprise_leads; /free-flight -> business_leads; /home-owners -> home_owner_leads; "
    "/about (talent) -> talent_interests."
  )
  diagram(pdf, "H", "Domain H - Academy & growth (CRM boundary)")
  pdf.subsection("Tables")
  pdf.bullets([
    "academy_enquiries [MVP] - Live /academy columns (first_name, mobile, email, state, current_status, timeline, "
    "existing_qualifications, UTMs). Persist-first; HubSpot secondary. hubspot_contact_id + idempotency_key.",
    "operator_leads [MVP] - /for-operators (holds, service_area, contact, UTMs). Growth funnel, distinct from "
    "marketplace reoc_profiles registration.",
    "contact_leads [MVP] - /contact (name, email, topic, company, message, UTMs).",
    "enterprise_leads [MVP] - /enterprise (company_name, contact_name, phone, email, industry, sites_count, "
    "what_do_you_need, UTMs).",
    "business_leads [MVP] - /free-flight (abn, contact, UTMs).",
    "home_owner_leads [MVP] - /home-owners (need, suburb, contact, UTMs).",
    "talent_interests [MVP] - /about talent (name, email, area_of_interest, linkedin_url, note).",
    "providers [P1] - Training providers for future Academy routing. Not required for Phase 1A live inserts.",
  ])
  pdf.subsection("Association rationale")
  pdf.bullets([
    "RLS: anon/authenticated INSERT only on all lead tables; service role / Edge updates hubspot_contact_id.",
    "providers 1:many academy_enquiries (future): enquiries can exist before assignment.",
    "Lead tables are siblings - each maps 1:1 to a marketing surface; shared UTM + hubspot_contact_id + "
    "idempotency_key pattern.",
    "CRM boundary: HubSpot is never SoT for licence, mode, split, or mission state (13.15).",
  ])

  # --- Section 13 ----------------------------------------------------------
  pdf.section("13. Recommendations & suggestions")
  recs = [
    ("13.1 Event-sourced mission state",
     "Keep mission_status_events (and now mission_offers) as sources of truth; treat "
     "missions.status/assigned_reoc_id as projections. Free audit, time-travel for disputes, clean analytics."),
    ("13.2 Enforce visibility at the database, not just the API",
     "The margin firewall is the business. Add Postgres views / RLS per role so a bug cannot leak margin: a ReOC "
     "view exposes flight_fee + own payment_splits(beneficiary='reoc') and omits network_price, L2_processing, "
     "network_fee; a consumer view omits operator identity pre-accept and all cost internals. Pair with contract "
     "tests."),
    ("13.3 Money as integer minor units",
     "Consider bigint cents to avoid rounding drift on the 85/15 split and L1/L2 decomposition; reconcile "
     "sum(splits) = amount_total with a DB check."),
    ("13.4 Pricing versioning is mandatory",
     "Never mutate pricing_configs. Missions reference the version active at booking (pricing_config_id) so "
     "historical charges are reproducible."),
    ("13.5 Credential & insurance expiry automation",
     "operator_credentials.expires_at drives a scheduled job that auto-suspends dispatch eligibility (ReOC) or "
     "pool availability (pilot) when RePL/ReOC/insurance/restricted-ops lapse, and fires notifications ahead of "
     "expiry."),
    ("13.6 Idempotency everywhere external",
     "Payments (Stripe), uploads (STS/multipart), MQTT ingestion, and the HubSpot push are all at-least-once. "
     "idempotency_key + dedupe on seq/event-id prevent double charges/payouts/telemetry/contacts."),
    ("13.7 Data retention & privacy (AU Privacy Act)",
     "Retention per class: telemetry (downsample after N days), media (customer-controlled deletion, held during "
     "disputes), PII (soft-delete + scheduled hard-delete). Full address and chain-of-custody media are sensitive "
     "- document lawful basis and TTLs."),
    ("13.8 Multi-tenancy / partner readiness",
     "Enterprise (direct/reseller) and white-label Stravyx Finance (4K Group) imply a future tenant_id/partner_id. "
     "Reserve an organization-based tenancy boundary now."),
    ("13.9 Lookup tables vs enums",
     "Lookup tables for admin-editable sets (mission categories, urgency tiers, equipment classes); native enums "
     "for stable machine states (mission.status, mission_offers.status, payment.status)."),
    ("13.10 ReOC-side reputation from offer data",
     "mission_offers yields acceptance-rate and response-time per ReOC - a natural future input to ReOC-side "
     "reputation. reoc_profiles.acceptance_rate is a materialized rollup; keep the raw offer rows for recompute."),
    ("13.11 Geospatial from day one",
     "PostGIS on mission_locations, service_areas, docks. Coverage eligibility in dispatch fan-out and the 'dock "
     "nodes gain structural proximity advantage' thesis depend on GIST indexing."),
    ("13.12 Feature flags in-schema",
     "mission_categories.mvp_enabled/feature_flagged ships '5 live, 5 flagged'; a small generic feature_flags "
     "table can gate pilot/dock/enterprise portals."),
    ("13.13 Soft-delete + archival",
     "User-facing entities soft-delete; append-only tables (audit_log, *_events, mission_offers, telemetry, "
     "hms_alerts) never delete - archive to cold storage on a retention schedule."),
  ]
  for title, body in recs:
    pdf.subsection(title)
    pdf.paragraph(body)

  pdf.subsection("13.14 Race-safe first-to-accept (critical)")
  pdf.paragraph("The winner MUST be decided by the database. Implement:")
  pdf.code_block(
    "CREATE UNIQUE INDEX one_winner_per_mission\n"
    "  ON mission_offers (mission_id)\n"
    "  WHERE status = 'accepted';"
  )
  pdf.paragraph(
    "The accepting transaction: flip the offer to accepted, set missions.assigned_reoc_id, move dispatched -> "
    "accepted, then expire remaining open offers - all atomically. The second concurrent tap hits the constraint "
    "and returns 'mission already taken.' Never resolve the winner in application code."
  )

  pdf.subsection("13.15 HubSpot - one-way sync boundary")
  pdf.paragraph(
    "Website forms INSERT into Domain H lead tables (insert-only RLS). After persist, Postgres trigger "
    "notify_hubspot_lead_sync (pg_net) POSTs to hubspot-sync Edge Function (Vault anon key + "
    "x-hubspot-sync-secret). Worker writes hubspot_contact_id. Covered: academy_enquiries, operator_leads, "
    "contact_leads, enterprise_leads, business_leads, home_owner_leads, talent_interests. Marketplace principals "
    "keep hubspot_contact_id on users (demo: profiles). HubSpot is never SoT for licence, mode, split, or mission."
  )
  pdf.subsection("13.16 DJI Cloud overseas disclosure - hard build gate")
  pdf.paragraph(
    "Do NOT start the live-ops build (Pilot-to-Cloud, Dock-to-Cloud, telemetry ingestion) until Consent & Privacy "
    "Policy v4 DJI overseas disclosure closes. Separate from APP 3/5 operator-database review. DJI Enterprise "
    "Ecosystem application should proceed now (approval lead time)."
  )
  pdf.subsection("13.17 Restricted-ops eligibility - approval geometry (critical)")
  pdf.paragraph(
    "Missions with mission_requirements must match verified operator_approvals whose approval_areas cover the "
    "mission point via ST_Covers. Never substitute service_areas."
  )
  pdf.subsection("13.18 Payment / payout rail - open decision")
  pdf.paragraph(
    "Do not implement against a specific vendor until Liz + Joel confirm. provider_*_ref columns are provisional. "
    "payout_lines holds cardinality open for monthly consolidated ReOC payouts vs per-mission release."
  )

  # --- Section 14 ----------------------------------------------------------
  pdf.section("14. Changelog")
  pdf.subsection("v0.3 -> v0.3.1 (Supabase Phase 1A schema sync, July 2026)")
  pdf.table_rows(
    ["Area", "v0.3", "v0.3.1"],
    [
      ["Growth lead tables", "academy_enquiries + providers only",
       "+ operator/contact/enterprise/business/home_owner leads + talent_interests"],
      ["academy_enquiries columns", "Abstract full_name / interest / provider_id",
       "Aligned to live form (first_name, mobile, state, UTMs, ...)"],
      ["HubSpot push", "Backend secondary step",
       "INSERT-trigger + pg_net -> hubspot-sync; all seven lead tables"],
      ["Marketplace target", "Full ERD v0.3",
       "Unchanged - demo subset in backend-build-plan.md"],
    ],
    [34, 62, PAGE_W - 96],
    font_size=7,
    line_h=3.4,
    header_font_size=8,
  )
  pdf.subsection("v0.2 -> v0.3 (Feedback v2, July 2026)")
  pdf.table_rows(
    ["Area", "v0.2", "v0.3"],
    [
      ["Approvals registry", "Restricted ops via operator_credentials", "operator_approvals + approval_areas"],
      ["Feasibility", "-", "mission_feasibility + assessed status"],
      ["Docks", "Deferred; per_flight_fee", "ReOC-operated [MVP]; operating_reoc_id"],
      ["Payments", "Stripe-shaped fields", "Provider-agnostic; payout_lines"],
      ["Money", "numeric(12,2)", "bigint cents (decided)"],
      ["DJI live-ops", "Privacy-doc action", "Hard build gate"],
    ],
    [34, 62, PAGE_W - 96],
    font_size=7,
    line_h=3.4,
    header_font_size=8,
  )
  pdf.subsection("v0.1 -> v0.2 (Feedback v1)")
  pdf.table_rows(
    ["Area", "v0.1 (bidding)", "v0.2 (first-to-accept dispatch)"],
    [
      ["Marketplace", "bids + match_scores ('BEST MATCH SCORE') + mission_assignments",
       "Dropped. mission_offers (fan-out, no price/rank) + assignment collapsed onto missions"],
      ["Winner", "Highest BEST MATCH SCORE", "First to accept (DB partial unique index)"],
      ["Pricing", "price_guides floor/ceiling; urgency = bid multiplier band",
       "price_guides dropped; Stravyx sets flat price; urgency_tiers.dispatch_window = offer expiry"],
      ["Supply profiles", "Single operator_profiles",
       "Split into reoc_profiles (mode, max_urgency_tier_id) + pilot_profiles (pool_status, flight_score)"],
      ["Supply chain", "-", "roster_acceptances added (ReOC<->pilot, split, CASA accepted_at)"],
      ["FLIGHT / BEST MATCH SCORE", "Bid ranking table",
       "FLIGHT SCORE relocated to pilot_profiles.flight_score (roster ranking)"],
      ["State machine", "DRAFT...QUOTING...READY->AIRBORNE...CLOSED",
       "draft -> booked -> dispatched -> accepted -> allocated -> flown -> delivered"],
      ["Compliance gate", "READY -> AIRBORNE", "allocated -> flown"],
      ["Payments", "payouts.operator_profile_id",
       "Renamed payouts.reoc_profile_id (ReOC<->pilot split is private)"],
      ["Academy", "Absent", "Added academy_enquiries + providers"],
      ["CRM", "Not modelled",
       "hubspot_contact_id on users + academy_enquiries; one-way sync boundary"],
      ["Unchanged (aligned)", "-",
       "Payments firewall, media/Layer 2, devices/telemetry (deferred), compliance/audit"],
    ],
    [34, 62, PAGE_W - 96],
    font_size=7,
    line_h=3.4,
    header_font_size=8,
  )

  # --- Section 15 ----------------------------------------------------------
  pdf.section("15. Open questions to resolve before locking v1")
  pdf.paragraph("Answered (feedback v2): solo ReOC leaves allocated_pilot_id null; Academy owned by this schema; "
                "integer cents; roster split standing per-pairing; enterprise billing deferred.")
  pdf.paragraph("Still open:")
  pdf.numbered([
    "Offer fan-out cap / wave escalation - product decision (Joel). offer_wave field reserved.",
    "No-acceptance path - what happens when every offer expires? (Joel + Liz)",
    "Payment / payout rail - capture provider, payout provider, fund custody, monthly vs per-mission (Liz + Joel).",
    "Telemetry store - TimescaleDB vs native partitioning vs external TSDB (9). Gated behind DJI privacy gate.",
    "Mission categories and urgency tier seed counts - need live source of truth (Liz + Joel).",
    "max_urgency_tier_id - adopted in schema; needs Web App Master update (Liz).",
  ])

  pdf.ln(2)
  pdf.paragraph(
    "Draft v0.3.1 - Domain H synced to live Supabase lead schema (Phase 1A); marketplace target remains Feedback v2. "
    "Reconcile field names against the NestJS visibility module, live DJI payloads, and the open payment/payout "
    "rail at build time. Related: backend-build-plan.md, dji-frontend-technical-spec.md, "
    "dji-bridge-and-client-internals.md, executive-summary.md. Source: docs/data-model-erd.md; diagrams from "
    f"docs/images/layout-{layout}/rendered/."
  )

  output.parent.mkdir(parents=True, exist_ok=True)
  pdf.output(str(output))
  print(f"Wrote {output} ({pdf.page_no()} pages)")


if __name__ == "__main__":
  parser = argparse.ArgumentParser(description="Generate the Stravyx Data Model / ERD PDF (v0.3.1).")
  parser.add_argument(
    "--layout",
    choices=sorted(LAYOUT_LABELS),
    default="elk",
    help="Which diagram layout variant to embed. Default: elk.",
  )
  args = parser.parse_args()
  out = ROOT / "docs" / f"stravyx-data-model-erd-v0.3.1-{args.layout}.pdf"
  img = ROOT / "docs" / "images" / f"layout-{args.layout}" / "rendered"
  build_pdf(out, img, args.layout)
