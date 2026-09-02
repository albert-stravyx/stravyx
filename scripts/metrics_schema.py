#!/usr/bin/env python3
"""Typed persistence helpers for local engineering metrics events."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

EventName = Literal[
    "task_started", "task_classified", "phase_transition", "quality_gate_updated",
    "human_approval", "human_intervention", "model_assigned", "agent_completed",
    "review_finding", "quality_guard_catch", "defect_observed", "release_outcome",
    "task_completed", "task_blocked"
]
MetricEvent = dict[str, object]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def default_events_path(root: Path) -> Path:
    return root / ".agent" / "metrics" / "events.jsonl"


def append_event(root: Path, event: MetricEvent, path: Path | None = None) -> None:
    target = path or default_events_path(root)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload: MetricEvent = {"schema_version": 1, "timestamp": utc_now(), **event}
    with target.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, sort_keys=True) + "\n")
