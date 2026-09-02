#!/usr/bin/env python3
"""Durable autonomous-task state ledger with explicit design gates and actionable diagnostics."""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import cast

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.lib.errors import DiagnosticError, fail
from scripts.metrics_schema import append_event

RUNS = ROOT / ".agent" / "runs"
STATES = [
    "INTAKE",
    "RISK_CLASSIFICATION",
    "PRODUCT_REQUIREMENTS",
    "SYSTEM_ARCHITECTURE",
    "PROGRAM_DESIGN",
    "VERTICAL_SLICE_PLAN",
    "IMPLEMENTATION",
    "VERIFICATION",
    "INDEPENDENT_REVIEW",
    "REMEDIATION",
    "FINAL_VERIFICATION",
    "COMPLETE",
    "BLOCKED",
]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def task_id_from_yaml(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        fail(
            DiagnosticError(
                "TASK_MANIFEST_MISSING",
                f"Task manifest not found: {path}",
                cause=str(exc),
                suggested_action=(
                    "Create .agent/current-task.yaml from .agent/tasks/TEMPLATE.yaml "
                    "or pass --task PATH."
                ),
            )
        )
    match = re.search(r"^id:\s*([A-Za-z0-9._-]+)\s*$", text, flags=re.MULTILINE)
    if not match:
        fail(
            DiagnosticError(
                "TASK_ID_MISSING",
                "Task manifest does not contain a valid top-level `id:`.",
                context={"manifest": str(path)},
                suggested_action="Add a value such as `id: TASK-001` and retry.",
            )
        )
    return match.group(1)


def manifest_scalar(path: Path, field: str) -> str | None:
    """Read a simple top-level YAML scalar without introducing a YAML dependency."""
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8")
    match = re.search(rf"^{re.escape(field)}:\s*([^#\n]+)", text, flags=re.MULTILINE)
    if not match:
        return None
    value = match.group(1).strip().strip('"\'')
    return value or None


def emit_metric(event: dict[str, object]) -> None:
    """Persist non-sensitive workflow telemetry locally; telemetry must never block delivery."""
    try:
        append_event(ROOT, event)
    except OSError as exc:
        print(f"METRICS_WRITE_WARNING: {exc}", file=sys.stderr)


def state_path(task_id: str) -> Path:
    return RUNS / task_id / "state.json"


def load(task_id: str) -> dict[str, object]:
    path = state_path(task_id)
    if not path.exists():
        fail(
            DiagnosticError(
                "TASK_RUN_NOT_INITIALISED",
                f"No autonomous run exists for {task_id}.",
                context={"expected_state_file": str(path.relative_to(ROOT))},
                suggested_action=(
                    "Run `python scripts/autonomous_task.py init --task <manifest>` "
                    f"before updating {task_id}."
                ),
            )
        )
    try:
        raw: object = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        fail(
            DiagnosticError(
                "TASK_STATE_INVALID_JSON",
                f"State file for {task_id} is corrupt.",
                cause=str(exc),
                context={
                    "file": str(path.relative_to(ROOT)),
                    "line": exc.lineno,
                    "column": exc.colno,
                },
                suggested_action=(
                    "Restore the state file from version control/run evidence or repair the JSON "
                    "before resuming."
                ),
            )
        )
    if not isinstance(raw, dict):
        fail(
            DiagnosticError(
                "TASK_STATE_INVALID_SHAPE",
                f"State for {task_id} must be a JSON object.",
                context={"file": str(path.relative_to(ROOT))},
                suggested_action="Repair or re-initialise the task run.",
            )
        )
    return cast(dict[str, object], raw)


def save(data: dict[str, object]) -> None:
    task_id = data.get("task_id")
    if not isinstance(task_id, str) or not task_id:
        fail(
            DiagnosticError(
                "TASK_STATE_ID_INVALID",
                "Cannot persist task state without a non-empty task_id.",
                suggested_action="Re-initialise the run from a valid task manifest.",
            )
        )
    path = state_path(task_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    data["updated_at"] = now()
    path.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _dict_field(data: dict[str, object], name: str) -> dict[str, object]:
    current = data.get(name)
    if current is None:
        value: dict[str, object] = {}
        data[name] = value
        return value
    if not isinstance(current, dict):
        fail(
            DiagnosticError(
                "TASK_STATE_FIELD_INVALID",
                f"Task state field `{name}` must be an object.",
                context={"field": name, "actual_type": type(current).__name__},
                suggested_action="Repair the task state file or re-initialise the run before resuming.",
            )
        )
    return cast(dict[str, object], current)


def _list_field(data: dict[str, object], name: str) -> list[object]:
    current = data.get(name)
    if current is None:
        value: list[object] = []
        data[name] = value
        return value
    if not isinstance(current, list):
        fail(
            DiagnosticError(
                "TASK_STATE_FIELD_INVALID",
                f"Task state field `{name}` must be an array.",
                context={"field": name, "actual_type": type(current).__name__},
                suggested_action="Repair the task state file or re-initialise the run before resuming.",
            )
        )
    return current


def init(args: argparse.Namespace) -> int:
    manifest = ROOT / args.task
    task_id = task_id_from_yaml(manifest)
    path = state_path(task_id)
    if path.exists() and not args.force:
        fail(
            DiagnosticError(
                "TASK_RUN_ALREADY_EXISTS",
                f"Run already exists for {task_id}.",
                context={"state_file": str(path.relative_to(ROOT))},
                suggested_action=(
                    "Use the existing run, choose a new task id, or pass --force only if "
                    "intentionally resetting local run state."
                ),
            )
        )
    data: dict[str, object] = {
        "task_id": task_id,
        "manifest": str(manifest.relative_to(ROOT)),
        "state": "INTAKE",
        "iteration": 0,
        "remediation_cycle": 0,
        "same_failure_repetitions": 0,
        "gate_approvals": {
            "product_requirements": "pending",
            "system_architecture": "pending",
            "program_design": "pending",
            "vertical_slice_plan": "pending",
        },
        "acceptance_criteria": {},
        "quality_gates": {},
        "findings": [],
        "evidence": [],
        "model_provenance": [],
        "created_at": now(),
        "updated_at": now(),
    }
    save(data)
    workflow = manifest_scalar(manifest, "workflow_path") or "auto"
    risk_class = manifest_scalar(manifest, "risk_class") or "unknown"
    emit_metric({"event": "task_started", "task_id": task_id, "workflow": workflow, "risk_class": risk_class})
    print(path.relative_to(ROOT))
    return 0


def transition(args: argparse.Namespace) -> int:
    if args.state not in STATES:
        fail(
            DiagnosticError(
                "TASK_STATE_UNKNOWN",
                f"Unknown task state: {args.state}",
                context={"valid_states": STATES},
                suggested_action="Choose one of the documented state-machine values.",
            )
        )
    data = load(args.task_id)
    previous_state = data.get("state")
    data["state"] = args.state
    if args.state == "IMPLEMENTATION":
        data["iteration"] = int(data.get("iteration", 0)) + 1
    if args.state == "REMEDIATION":
        data["remediation_cycle"] = int(data.get("remediation_cycle", 0)) + 1
    save(data)
    emit_metric({"event": "phase_transition", "task_id": args.task_id, "phase_from": previous_state if isinstance(previous_state, str) else "unknown", "phase_to": args.state})
    if args.state == "COMPLETE":
        emit_metric({"event": "task_completed", "task_id": args.task_id})
    elif args.state == "BLOCKED":
        emit_metric({"event": "task_blocked", "task_id": args.task_id})
    print(f"{args.task_id}: {args.state}")
    return 0


def gate(args: argparse.Namespace) -> int:
    data = load(args.task_id)
    quality_gates = _dict_field(data, "quality_gates")
    quality_gates[args.name] = {"status": args.status, "evidence": args.evidence or ""}
    save(data)
    emit_metric({"event": "quality_gate_updated", "task_id": args.task_id, "gate": args.name, "status": args.status})
    return 0


def approve(args: argparse.Namespace) -> int:
    data = load(args.task_id)
    gates = _dict_field(data, "gate_approvals")
    if args.name not in gates:
        fail(
            DiagnosticError(
                "APPROVAL_GATE_UNKNOWN",
                f"Unknown design approval gate: {args.name}",
                context={"known_gates": sorted(gates)},
                suggested_action="Approve one of the four design gates recorded in task state.",
            )
        )
    gates[args.name] = "approved"
    _list_field(data, "evidence").append(
        {
            "kind": "human_approval",
            "gate": args.name,
            "approver": args.approver,
            "note": args.note or "",
            "at": now(),
        }
    )
    save(data)
    emit_metric({"event": "human_approval", "task_id": args.task_id, "gate": args.name, "source": args.approver})
    return 0


def finding(args: argparse.Namespace) -> int:
    data = load(args.task_id)
    _list_field(data, "findings").append(
        {
            "severity": args.severity,
            "summary": args.summary,
            "status": args.status,
            "evidence": args.evidence or "",
            "suggested_action": args.suggested_action or "",
        }
    )
    save(data)
    emit_metric({"event": "review_finding", "task_id": args.task_id, "severity": args.severity, "status": args.status})
    return 0


def model(args: argparse.Namespace) -> int:
    data = load(args.task_id)
    _list_field(data, "model_provenance").append(
        {"agent": args.agent, "model": args.model, "purpose": args.purpose, "at": now()}
    )
    save(data)
    emit_metric({"event": "model_assigned", "task_id": args.task_id, "agent": args.agent, "model": args.model, "purpose": args.purpose})
    return 0


def status(args: argparse.Namespace) -> int:
    print(json.dumps(load(args.task_id), indent=2, sort_keys=True))
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Persist and troubleshoot autonomous engineering run state."
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    command = sub.add_parser("init")
    command.add_argument("--task", default=".agent/current-task.yaml")
    command.add_argument("--force", action="store_true")
    command.set_defaults(fn=init)

    command = sub.add_parser("transition")
    command.add_argument("task_id")
    command.add_argument("state")
    command.set_defaults(fn=transition)

    command = sub.add_parser("gate")
    command.add_argument("task_id")
    command.add_argument("name")
    command.add_argument(
        "status", choices=["pending", "passed", "failed", "skipped", "blocked"]
    )
    command.add_argument("--evidence")
    command.set_defaults(fn=gate)

    command = sub.add_parser("approve")
    command.add_argument("task_id")
    command.add_argument("name")
    command.add_argument("--approver", required=True)
    command.add_argument("--note")
    command.set_defaults(fn=approve)

    command = sub.add_parser("finding")
    command.add_argument("task_id")
    command.add_argument("severity", choices=["BLOCKER", "HIGH", "MEDIUM", "LOW", "NIT"])
    command.add_argument("summary")
    command.add_argument("--status", default="open", choices=["open", "resolved", "accepted"])
    command.add_argument("--evidence")
    command.add_argument("--suggested-action")
    command.set_defaults(fn=finding)

    command = sub.add_parser("model")
    command.add_argument("task_id")
    command.add_argument("agent")
    command.add_argument("model")
    command.add_argument("--purpose", default="implementation/review")
    command.set_defaults(fn=model)

    command = sub.add_parser("status")
    command.add_argument("task_id")
    command.set_defaults(fn=status)

    args = parser.parse_args()
    raise SystemExit(args.fn(args))


if __name__ == "__main__":
    main()
