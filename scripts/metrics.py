#!/usr/bin/env python3
"""Record and report lightweight engineering-system telemetry.

The repository intentionally uses local append-only JSONL. Token/cost values are
recorded only when supplied by a real runtime/provider; missing usage stays unknown.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import cast

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.metrics_schema import MetricEvent, append_event, default_events_path
from scripts.lib.errors import DiagnosticError, fail


def _event_path(value: str | None) -> Path:
    return Path(value) if value else default_events_path(ROOT)


def _read(path: Path) -> list[MetricEvent]:
    if not path.exists():
        return []
    events: list[MetricEvent] = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            raw: object = json.loads(line)
        except json.JSONDecodeError as exc:
            fail(DiagnosticError(
                "METRICS_INVALID_JSONL",
                f"Metrics event is invalid JSON at {path}:{line_no}.",
                cause=str(exc),
                context={"file": str(path), "line": line_no},
                suggested_action="Repair/remove the malformed line; preserve unrelated events.",
            ))
        if not isinstance(raw, dict) or not isinstance(raw.get("event"), str):
            fail(DiagnosticError(
                "METRICS_INVALID_EVENT",
                f"Metrics line {line_no} is not a valid event object.",
                context={"file": str(path), "line": line_no},
                suggested_action="Ensure each JSONL line contains an `event` string.",
            ))
        events.append(cast(MetricEvent, raw))
    return events


def _record(args: argparse.Namespace) -> int:
    event: MetricEvent = {"event": args.event, "task_id": args.task_id}
    text_fields = {
        "workflow": args.workflow, "risk_class": args.risk_class, "agent": args.agent,
        "model": args.model, "purpose": args.purpose, "status": args.status,
        "gate": args.gate, "severity": args.severity, "category": args.category,
        "reason": args.reason, "source": args.source,
        "experiment_group": args.experiment_group, "experiment_variant": args.experiment_variant,
    }
    for key, value in text_fields.items():
        if value is not None:
            event[key] = value
    number_fields = {
        "input_tokens": args.input_tokens, "output_tokens": args.output_tokens,
        "cached_tokens": args.cached_tokens, "duration_ms": args.duration_ms,
        "remediation_cycle": args.remediation_cycle,
    }
    for key, value in number_fields.items():
        if value is not None:
            event[key] = value
    if args.estimated_cost_usd is not None:
        event["estimated_cost_usd"] = args.estimated_cost_usd
    if args.accepted is not None:
        event["accepted"] = args.accepted
    append_event(ROOT, event, _event_path(args.file))
    return 0


def _parse_ts(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _as_int(value: object) -> int:
    return value if isinstance(value, int) and not isinstance(value, bool) else 0


def _as_float(value: object) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return None


def _summary(events: list[MetricEvent]) -> dict[str, object]:
    tasks: dict[str, list[MetricEvent]] = defaultdict(list)
    for event in events:
        task_id = event.get("task_id")
        if isinstance(task_id, str) and task_id:
            tasks[task_id].append(event)
    completed = sum(any(e.get("event") == "task_completed" for e in evs) for evs in tasks.values())
    blocked = sum(any(e.get("event") == "task_blocked" for e in evs) for evs in tasks.values())
    workflows: Counter[str] = Counter()
    cycle_minutes: list[float] = []
    per_task_tokens: list[int] = []
    total_tokens, total_cost, cost_observations = 0, 0.0, 0
    interventions = approvals = remediations = 0
    findings: Counter[str] = Counter()
    quality_catches: Counter[str] = Counter()
    models: Counter[str] = Counter()
    accepted_findings = decided_findings = 0

    for task_id, task_events in tasks.items():
        starts = [e for e in task_events if e.get("event") == "task_started" and isinstance(e.get("timestamp"), str)]
        ends = [e for e in task_events if e.get("event") == "task_completed" and isinstance(e.get("timestamp"), str)]
        if starts and ends:
            start_ts = cast(str, starts[0]["timestamp"])
            end_ts = cast(str, ends[-1]["timestamp"])
            seconds = (_parse_ts(end_ts) - _parse_ts(start_ts)).total_seconds()
            if seconds >= 0:
                cycle_minutes.append(seconds / 60)
        task_tokens = 0
        for event in task_events:
            workflow = event.get("workflow")
            if event.get("event") == "task_started" and isinstance(workflow, str):
                workflows[workflow] += 1
            if event.get("event") == "agent_completed":
                task_tokens += _as_int(event.get("input_tokens")) + _as_int(event.get("output_tokens"))
                model = event.get("model")
                if isinstance(model, str):
                    models[model] += 1
                cost = _as_float(event.get("estimated_cost_usd"))
                if cost is not None:
                    total_cost += cost
                    cost_observations += 1
            elif event.get("event") == "human_intervention":
                interventions += 1
            elif event.get("event") == "human_approval":
                approvals += 1
            elif event.get("event") == "phase_transition" and event.get("phase_to") == "REMEDIATION":
                remediations += 1
            elif event.get("event") == "review_finding":
                severity = event.get("severity")
                findings[severity if isinstance(severity, str) else "UNKNOWN"] += 1
                accepted = event.get("accepted")
                if isinstance(accepted, bool):
                    decided_findings += 1
                    accepted_findings += int(accepted)
            elif event.get("event") == "quality_guard_catch":
                category = event.get("category")
                quality_catches[category if isinstance(category, str) else "unknown"] += 1
        if task_tokens:
            per_task_tokens.append(task_tokens)
            total_tokens += task_tokens

    task_count = len(tasks)
    return {
        "tasks_observed": task_count,
        "tasks_completed": completed,
        "tasks_blocked": blocked,
        "autonomous_completion_rate": round(completed / task_count, 4) if task_count else None,
        "workflow_distribution": dict(workflows),
        "median_cycle_minutes": round(statistics.median(cycle_minutes), 2) if cycle_minutes else None,
        "human_interventions": interventions,
        "planned_human_approvals": approvals,
        "remediation_entries": remediations,
        "review_findings_by_severity": dict(findings),
        "review_finding_precision": round(accepted_findings / decided_findings, 4) if decided_findings else None,
        "quality_guard_catches": dict(quality_catches),
        "total_recorded_tokens": total_tokens if per_task_tokens else None,
        "median_recorded_tokens_per_task": int(statistics.median(per_task_tokens)) if per_task_tokens else None,
        "total_recorded_cost_usd": round(total_cost, 4) if cost_observations else None,
        "model_agent_runs": dict(models),
    }


def _report(args: argparse.Namespace) -> int:
    events = _read(_event_path(args.file))
    if args.last is not None and args.last > 0:
        order: list[str] = []
        for event in events:
            task_id = event.get("task_id")
            if isinstance(task_id, str) and task_id not in order:
                order.append(task_id)
        keep = set(order[-args.last:])
        events = [event for event in events if event.get("task_id") in keep]
    summary = _summary(events)
    if args.json:
        print(json.dumps(summary, indent=2, sort_keys=True))
        return 0
    print("AGENTIC ENGINEERING METRICS")
    print(f"Tasks observed: {summary['tasks_observed']}")
    print(f"Completed: {summary['tasks_completed']} | Blocked: {summary['tasks_blocked']}")
    rate = summary["autonomous_completion_rate"]
    print(f"Completion rate: {float(rate) * 100:.1f}%" if isinstance(rate, float) else "Completion rate: n/a")
    print(f"Median cycle: {summary['median_cycle_minutes'] if summary['median_cycle_minutes'] is not None else 'n/a'} min")
    print(f"Human interventions: {summary['human_interventions']} (planned approvals: {summary['planned_human_approvals']})")
    print(f"Median recorded tokens/task: {summary['median_recorded_tokens_per_task'] if summary['median_recorded_tokens_per_task'] is not None else 'n/a'}")
    print(f"Recorded cost USD: {summary['total_recorded_cost_usd'] if summary['total_recorded_cost_usd'] is not None else 'n/a'}")
    print(f"Workflow distribution: {summary['workflow_distribution']}")
    print(f"Review findings: {summary['review_findings_by_severity']}")
    print(f"Review precision: {summary['review_finding_precision'] if summary['review_finding_precision'] is not None else 'n/a'}")
    print(f"Quality guard catches: {summary['quality_guard_catches']}")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Record/report agentic engineering metrics without external telemetry.")
    sub = parser.add_subparsers(dest="cmd", required=True)
    rec = sub.add_parser("record", help="Append one structured metric event.")
    rec.add_argument("event", choices=["task_started","task_classified","phase_transition","quality_gate_updated","human_approval","human_intervention","model_assigned","agent_completed","review_finding","quality_guard_catch","defect_observed","release_outcome","task_completed","task_blocked"])
    rec.add_argument("task_id")
    for name in ("workflow","risk-class","agent","model","purpose","status","gate","severity","category","reason","source","experiment-group","experiment-variant"):
        rec.add_argument("--" + name)
    rec.add_argument("--input-tokens", type=int)
    rec.add_argument("--output-tokens", type=int)
    rec.add_argument("--cached-tokens", type=int)
    rec.add_argument("--duration-ms", type=int)
    rec.add_argument("--remediation-cycle", type=int)
    rec.add_argument("--estimated-cost-usd", type=float)
    rec.add_argument("--accepted", action=argparse.BooleanOptionalAction, default=None)
    rec.add_argument("--file")
    rec.set_defaults(fn=_record)
    rep = sub.add_parser("report", help="Summarise recorded events.")
    rep.add_argument("--file")
    rep.add_argument("--last", type=int)
    rep.add_argument("--json", action="store_true")
    rep.set_defaults(fn=_report)
    args = parser.parse_args()
    raise SystemExit(args.fn(args))

if __name__ == "__main__":
    main()
