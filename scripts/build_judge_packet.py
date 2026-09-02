#!/usr/bin/env python3
"""Build a compact Other Model judge packet from the current task and git diff."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.lib.errors import DiagnosticError, fail
from scripts.lib.judge_packet import (
    collect_working_tree_diff,
    excerpt_artefact,
    filter_diff,
    packet_destination,
    parse_task_fields,
    render_packet,
    stable_preamble,
)
from scripts.lib.model_profiles import JUDGE_ROLES


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Write .agent/packets/<task>-<role>.md for an Other Model judge.")
    parser.add_argument("--role", required=True, choices=JUDGE_ROLES)
    parser.add_argument("--task", type=Path, default=ROOT / ".agent" / "current-task.yaml")
    parser.add_argument("--notes", type=Path, help="Already-read snippets from a Cursor model.")
    parser.add_argument("--tests-log", type=Path, help="Capped test/gate output.")
    parser.add_argument("--diff-file", type=Path, help="Use this unified diff instead of git.")
    parser.add_argument("--print-preamble", action="store_true", help="Print the stable Task preamble.")
    parser.add_argument("--root", type=Path, default=ROOT)
    return parser.parse_args()


def _read_optional(path: Path | None) -> str:
    if path is None or not path.is_file():
        return ""
    return path.read_text(encoding="utf-8")


def _git_diff(root: Path) -> str:
    return collect_working_tree_diff(root)


def _artefacts(root: Path, mapping: object) -> str:
    if not isinstance(mapping, dict):
        return ""
    parts: list[str] = []
    for label, relpath in mapping.items():
        if not isinstance(relpath, str):
            continue
        excerpt = excerpt_artefact(root, str(label), relpath)
        if excerpt:
            parts.append(excerpt)
    return "\n".join(parts)


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]


def main() -> int:
    args = _parse_args()
    root = args.root.resolve()
    try:
        if args.print_preamble:
            print(stable_preamble(), end="")
        task_path = args.task if args.task.is_absolute() else root / args.task
        if not task_path.is_file():
            raise DiagnosticError(
                "JUDGE_PACKET_TASK_MISSING",
                "Task manifest not found.",
                context={"task": str(task_path)},
                suggested_action="Pass --task or create .agent/current-task.yaml.",
            )
        fields = parse_task_fields(task_path.read_text(encoding="utf-8"))
        allowed = _string_list(fields["allowed_paths"])
        forbidden = _string_list(fields["forbidden_paths"])
        raw_diff = args.diff_file.read_text(encoding="utf-8") if args.diff_file else _git_diff(root)
        packet = render_packet(
            role=args.role,
            task_id=str(fields["id"]),
            objective=str(fields["objective"]),
            acceptance=_string_list(fields["acceptance_criteria"]),
            allowed=allowed,
            forbidden=forbidden,
            artefacts=_artefacts(root, fields["approved_artifacts"]),
            diff_text=filter_diff(raw_diff, allowed, forbidden),
            tests_text=_read_optional(args.tests_log),
            notes_text=_read_optional(args.notes),
        )
        dest = packet_destination(root, str(fields["id"]), args.role)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(packet, encoding="utf-8")
        print(dest.relative_to(root))
        return 0
    except DiagnosticError as error:
        fail(error)


if __name__ == "__main__":
    sys.exit(main())
