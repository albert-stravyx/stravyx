# Stravyx Board Materials

> **Factory baseline (2 Sep 2026):** Stravyx now uses the consolidated v43 runtime/gateway-agnostic factory. Current operating instructions are `AGENTS.md`, `PROJECT_HANDBOOK.md`, project governance/ADRs, and `docs/factory/CURRENT_BASELINE.md`. Older Cursor-only/v33 migration material is historical unless explicitly referenced.


Aligned to **Master Business Summary** (Founder's Mission Statement, April 2026).

## Agent handoff (start here on a new machine)

| File | Purpose |
|------|---------|
| [../AGENTS.md](../AGENTS.md) | Agent entrypoint, operating contract and non-negotiables |
| [AGENT_HANDOFF.md](./AGENT_HANDOFF.md) | Migration / continuation checklist |
| [../CURSOR_BOOTSTRAP_PROMPT.md](../CURSOR_BOOTSTRAP_PROMPT.md) | Paste into a fresh main chat to run as orchestrator |
| [../PROJECT.md](../PROJECT.md) | Short root brief (problem, users, outcomes, non-goals) |
| [../project.yaml](../project.yaml) | Machine-readable stack, enabled agents, autonomy, delivery policy |
| [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) | Product purpose and business rules |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Runtime topology and phases |
| [CURRENT_STATE.md](./CURRENT_STATE.md) | Implemented vs docs-only snapshot |
| [ROADMAP.md](./ROADMAP.md) | Next priorities |
| [DECISIONS.md](./DECISIONS.md) | Locked choices and rejections |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Gotchas and debt |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Setup, env names, commands |
| [MIGRATION_VERIFY_BACKUP.md](./MIGRATION_VERIFY_BACKUP.md) | Verify unverified cloud state + manual backup steps |
| [../archive/agent-history/](../archive/agent-history/) | Conversation insurance — architecture / auth / deploy / DB / debugging narratives |

## Engineering workflow (governed autonomy)

Adopted 2026-08-11 — see [adr/0004-governed-autonomous-engineering.md](./adr/0004-governed-autonomous-engineering.md).

| File | Purpose |
|------|---------|
| [DEVELOPMENT_STRATEGY.md](./DEVELOPMENT_STRATEGY.md) | FAST/STANDARD/FULL paths, design principles, completion vs delivery |
| [FOUR_GATE_WORKFLOW.md](./FOUR_GATE_WORKFLOW.md) | Product brief → architecture → program design → vertical slices |
| [TEMPLATE_USAGE_GUIDE.md](./TEMPLATE_USAGE_GUIDE.md) | Day-to-day operating manual for the control plane |
| [AUTONOMOUS_TASK_COMPLETION.md](./AUTONOMOUS_TASK_COMPLETION.md) | What "COMPLETE" means and what evidence it requires |
| [QUALITY_GOVERNANCE.md](./QUALITY_GOVERNANCE.md) | Quality policy, guards, waiver discipline |
| [CODING_STANDARDS.md](./CODING_STANDARDS.md) + [standards/](./standards/) | Language and layer standards (TypeScript, React/Next, testing, API, boundaries) |
| [ERROR_AND_TYPE_SAFETY.md](./ERROR_AND_TYPE_SAFETY.md) | Actionable error contract and type-escape rules |
| [TEST_DATA_AND_CONTRACTS.md](./TEST_DATA_AND_CONTRACTS.md) | Fixtures, factories, contract testing |
| [MODEL_DIVERSITY.md](./MODEL_DIVERSITY.md) | Cross-model review policy |
| [agent-model-assignments.md](./agent-model-assignments.md) | Per-agent model assignments — rationale, alternatives, cross-family verification |
| [ENGINEERING_METRICS.md](./ENGINEERING_METRICS.md) | Local telemetry and how to optimise from it |
| [CONTEXT_ENGINEERING.md](./CONTEXT_ENGINEERING.md) | Context firewalls and nested delegation |
| [DEPENDENCY_POLICY.md](./DEPENDENCY_POLICY.md) | When a new dependency is justified |
| [PERFORMANCE_BUDGETS.md](./PERFORMANCE_BUDGETS.md) | Budget definition and enforcement |
| [RELEASE_AND_RECOVERY.md](./RELEASE_AND_RECOVERY.md) | Release, rollback and recovery expectations |
| [REPOSITORY_OPERATIONS_GUIDE.md](./REPOSITORY_OPERATIONS_GUIDE.md) | Worktrees, locks, concurrent writers |

## Board & engineering references

| File                                                               | Purpose                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| [board-slide-outline.md](./board-slide-outline.md)                 | 13-slide deck (+ appendix) — includes **MVP build plan** slide (Slide 12)                   |
| [board-slides-copy-paste.md](./board-slides-copy-paste.md)         | **PowerPoint / Google Slides** — slide-by-slide blocks (Slide 12 = build plan)              |
| [executive-summary.md](./executive-summary.md)                     | Executive summary **including MVP build timeline** (Markdown source)                        |
| [mvp-build-timeline.md](./mvp-build-timeline.md)                   | **19 Jun 2026 web MVP** — full epic breakdown, day-by-day plan, lifecycle, QA, risks, Gantt |
| [dji-integration-architecture.md](./dji-integration-architecture.md) | **DJI + non-DJI flight architecture (SoT for Live-ops A)** — Cloud API + manual; FH2 deferred; API profile; open conditions |
| [dji-live-ops-path-comparison.md](./dji-live-ops-path-comparison.md) | **Recommended live-ops path (layperson)** — Cloud API + manual; glossary, examples, pros and cons |
| [dji-vs-nondji-operator-journeys.md](./dji-vs-nondji-operator-journeys.md) | **DJI vs non-DJI operators** — same shop; non-DJI never uses Cloud API; stories 1–8 |
| [dji-live-ops-challenger-findings.md](./dji-live-ops-challenger-findings.md) | **Independent challenge (layperson)** — findings A-01–A-10, recommended fixes, alternatives, who decides |
| [app8-live-ops-gate-closeout.md](./app8-live-ops-gate-closeout.md) | **APP 8 live-ops gate (Liz / Joel)** — in/out of gate, scenarios, hop inventory, decisions, v4 draft clauses, sign-off |
| [stravyx-live-ops-briefings.html](./stravyx-live-ops-briefings.html) | **Live-ops briefing pack (HTML)** — EGroup-style static pages; open in a browser, email as a file |
| [adr/0005-flight-provider-cloud-api-only.md](./adr/0005-flight-provider-cloud-api-only.md) | ADR 0005 — FlightProvider: Cloud API only; FH2 deferred |
| [dji-integration-catalogue.md](./dji-integration-catalogue.md)     | DJI APIs/SDKs catalogue (encyclopedia; **superseded for Live-ops A scope** by architecture doc + ADR 0005) |
| [dji-frontend-integration.md](./dji-frontend-integration.md)       | **DJI frontend feature map** — features → Next.js routes/components/`packages/ui`; web + iOS/Android build plan |
| [dji-frontend-technical-spec.md](./dji-frontend-technical-spec.md) | **DJI frontend technical spec** — `packages/realtime` WS contract, `packages/dji-msdk` native bridge, shared types |
| [dji-bridge-and-client-internals.md](./dji-bridge-and-client-internals.md) | **DJI bridge & client internals** — NestJS MQTT ingestion, throttling, visibility projection, `useMissionStream` reconnect |
| [data-model-erd.md](./data-model-erd.md)                           | **Draft ERD / data model (v0.3.1)** — PostgreSQL + PostGIS; first-to-accept dispatch; **live website lead tables**; approvals registry; ReOC-operated docks; provider-agnostic payments; integer cents |
| [stravyx-data-model-erd-v0.3.1-elk.pdf](./stravyx-data-model-erd-v0.3.1-elk.pdf) | ERD PDF (elk layout) |
| [stravyx-data-model-erd-v0.3.1-dagre.pdf](./stravyx-data-model-erd-v0.3.1-dagre.pdf) | ERD PDF (dagre layout) |
| [backend-build-plan.md](./backend-build-plan.md)                       | **Backend build plan** — Phase 1A/2A Supabase working demo → Phase 1B/2C NestJS + full MVP; TDD/BDD, git, security, demo DoD |
| [demo-runbook.md](./demo-runbook.md)                                   | **Working demo runbook** — step-by-step 5-minute customer/operator/admin + HubSpot script |
| [stravyx-demo-runbook.pdf](./stravyx-demo-runbook.pdf)                 | Demo runbook PDF (follow along) |
| [figma-make-frontend-gap-review.md](./figma-make-frontend-gap-review.md) | **Figma Make frontend gap review** — prototype vs ERD/MVP: critical visibility leaks, status/pricing mismatches, aligned areas, P0–P2 fix backlog |
| [stravyx-figma-make-frontend-gap-review.pdf](./stravyx-figma-make-frontend-gap-review.pdf) | Gap review PDF (from markdown) |
| [adr/0001-dji-telemetry-unified-types.md](./adr/0001-dji-telemetry-unified-types.md) | **ADR 0001** — unified telemetry types across cloud + direct-SDK paths (Option A) |
| [adr/0002-bridge-runtime-nestjs-vs-rust.md](./adr/0002-bridge-runtime-nestjs-vs-rust.md) | **ADR 0002** — bridge runtime: NestJS vs Rust (chose NestJS; Rust as future hotspot shard) |
| [adr/0003-mobile-cross-platform-vs-native.md](./adr/0003-mobile-cross-platform-vs-native.md) | **ADR 0003** — mobile stack: React Native + Expo, DJI native quarantined in one bridge module |
| [adr/0004-governed-autonomous-engineering.md](./adr/0004-governed-autonomous-engineering.md) | **ADR 0004** — governed autonomous engineering control plane |
| [stravyx-mvp-build-timeline.pdf](./stravyx-mvp-build-timeline.pdf) | MVP build timeline PDF (from markdown)                                                      |
| [stravyx-executive-summary.pdf](./stravyx-executive-summary.pdf)   | Board PDF (portrait A4, ~8 pages; Mission Service + tech stack table)                       |
| [stravyx-dji-integration-catalogue.pdf](./stravyx-dji-integration-catalogue.pdf) | DJI integration catalogue PDF (5 pages, from markdown)                            |
| [stravyx-dji-frontend-integration.pdf](./stravyx-dji-frontend-integration.pdf) | DJI frontend integration + build plan PDF (5 pages, from markdown)                 |
| [stravyx-dji-frontend-technical-spec.pdf](./stravyx-dji-frontend-technical-spec.pdf) | DJI frontend technical spec PDF (4 pages, from markdown)                       |
| [stravyx-dji-bridge-and-client-internals.pdf](./stravyx-dji-bridge-and-client-internals.pdf) | DJI bridge & client internals PDF (4 pages, from markdown)             |
| [stravyx-dji-live-ops-path-comparison.pdf](./stravyx-dji-live-ops-path-comparison.pdf) | How Stravyx connects drones — glossary, examples, pros and cons (from markdown) |
| [stravyx-dji-vs-nondji-operator-journeys.pdf](./stravyx-dji-vs-nondji-operator-journeys.pdf) | DJI vs non-DJI operator journeys (from markdown) |
| [stravyx-dji-live-ops-challenger-findings.pdf](./stravyx-dji-live-ops-challenger-findings.pdf) | Independent live-ops review A-01–A-10 (from markdown) |
| [stravyx-app8-live-ops-gate-closeout.pdf](./stravyx-app8-live-ops-gate-closeout.pdf) | APP 8 live-ops gate close-out for Liz / Joel (from markdown) |
| [stravyx-dji-live-ops-path-comparison.html](./stravyx-dji-live-ops-path-comparison.html) | Path comparison — static HTML (same visual language as E Security dock-pilot status) |
| [stravyx-dji-vs-nondji-operator-journeys.html](./stravyx-dji-vs-nondji-operator-journeys.html) | Operator journeys — static HTML |
| [stravyx-dji-live-ops-challenger-findings.html](./stravyx-dji-live-ops-challenger-findings.html) | Challenger findings — static HTML |
| [stravyx-app8-live-ops-gate-closeout.html](./stravyx-app8-live-ops-gate-closeout.html) | APP 8 close-out — static HTML |

## Regenerate PDFs

```bash
python3 scripts/generate_executive_summary_pdf.py
python3 scripts/generate_mvp_build_timeline_pdf.py
python3 scripts/generate_dji_integration_pdf.py
python3 scripts/generate_dji_frontend_integration_pdf.py
python3 scripts/generate_dji_technical_spec_pdf.py
python3 scripts/generate_dji_bridge_internals_pdf.py
python3 scripts/generate_dji_live_ops_path_comparison_pdf.py
python3 scripts/generate_dji_vs_nondji_operator_journeys_pdf.py
python3 scripts/generate_dji_live_ops_challenger_findings_pdf.py
python3 scripts/generate_app8_live_ops_gate_closeout_pdf.py
python3 scripts/generate_figma_make_gap_review_pdf.py
python3 scripts/generate_demo_runbook_pdf.py
```

Requires `fpdf2` in `.venv-pdf/` (installed via `pip install fpdf2 --target .venv-pdf`).
