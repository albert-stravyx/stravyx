#!/usr/bin/env python3
"""Create a local task manifest from the repository template."""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".agent" / "tasks" / "TEMPLATE.yaml"
DESTINATION = ROOT / ".agent" / "current-task.yaml"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace an existing local current-task manifest intentionally.",
    )
    args = parser.parse_args()

    if not SOURCE.exists():
        raise SystemExit(
            "TASK_TEMPLATE_MISSING: .agent/tasks/TEMPLATE.yaml does not exist. "
            "Restore the repository template before starting a task."
        )
    if DESTINATION.exists() and not args.force:
        raise SystemExit(
            "TASK_ALREADY_EXISTS: .agent/current-task.yaml already exists. Edit it, archive the "
            "completed run, or rerun with --force only if replacement is intentional."
        )

    shutil.copyfile(SOURCE, DESTINATION)
    print(
        f"Created {DESTINATION.relative_to(ROOT)}. Define objective, scope, risk answers, "
        "approval gates and quality expectations before implementation."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
