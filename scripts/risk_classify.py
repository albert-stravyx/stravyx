#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.lib.errors import DiagnosticError, fail

RISK_KEYS = [
    "data_exposure_corruption",
    "auth_payment_permissions",
    "multiple_services_or_teams",
    "difficult_rollback_recovery",
    "poorly_understood_or_weakly_tested",
    "long_term_platform_constraint",
]


def parse_risk_answers(text: str, *, task_path: str) -> list[str]:
    positive: list[str] = []
    for key in RISK_KEYS:
        match = re.search(
            rf"^\s*{re.escape(key)}:\s*(true|false)\s*$",
            text,
            flags=re.MULTILINE | re.IGNORECASE,
        )
        if match is None:
            fail(
                DiagnosticError(
                    "RISK_QUESTION_MISSING",
                    f"Missing risk question: {key}",
                    context={"task": task_path, "required_questions": RISK_KEYS},
                    suggested_action=(
                        "Answer all six risk questions explicitly as true/false before choosing a "
                        "governance path."
                    ),
                )
            )
        if match.group(1).lower() == "true":
            positive.append(key)
    return positive


def main() -> None:
    parser = argparse.ArgumentParser(description="Classify task governance from six explicit risk questions.")
    parser.add_argument("--task", default=".agent/current-task.yaml")
    args = parser.parse_args()

    path = ROOT / args.task
    if not path.exists():
        fail(
            DiagnosticError(
                "TASK_MANIFEST_MISSING",
                f"Task manifest not found: {args.task}",
                suggested_action=(
                    "Create the task from .agent/tasks/TEMPLATE.yaml or pass a valid --task PATH."
                ),
            )
        )

    positive = parse_risk_answers(path.read_text(encoding="utf-8"), task_path=args.task)
    governance = (
        "FULL" if len(positive) >= 2 else "STANDARD" if len(positive) == 1 else "FAST"
    )

    print(f"Risk score: {len(positive)}/{len(RISK_KEYS)}")
    print(f"Positive risk signals: {positive or ['none']}")
    print(f"Workflow path: {governance}")
    if governance == "FAST":
        print("Reason: no positive risk signals; use minimal justified ceremony.")
    elif governance == "STANDARD":
        print("Reason: one positive risk signal; require concise design and vertical-slice evidence.")
    else:
        print("Reason: two or more positive risk signals; full four-gate governance is required unless a human records an explicit exception.")


if __name__ == "__main__":
    main()
