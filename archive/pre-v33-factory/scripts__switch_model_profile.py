#!/usr/bin/env python3
"""Switch the live specialist model roster between quality and economy profiles."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.lib.errors import DiagnosticError, fail
from scripts.lib.model_profiles import (
    apply_profile,
    format_assignment_table,
    load_config,
    read_agents,
    validate_config,
)


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy a named model profile into live assignments and agent frontmatter."
    )
    parser.add_argument(
        "profile",
        nargs="?",
        help="Profile to activate: quality (flagship) or economy (Cursor-first).",
    )
    parser.add_argument(
        "--show",
        action="store_true",
        help="Print the active profile and live assignments without writing files.",
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=ROOT,
        help="Repository root (tests may pass a fixture tree).",
    )
    parser.add_argument(
        "--agents-dir",
        type=Path,
        default=None,
        help="Override .cursor/agents (tests use a temp folder).",
    )
    return parser.parse_args()


def _show(root: Path, agent_directory: Path | None) -> int:
    config = load_config(root)
    assignments = validate_config(config, read_agents(root, agent_directory))
    active = str(config.get("active_profile"))
    print(f"active_profile: {active}")
    orchestrator = assignments.get("autonomous-orchestrator", "")
    print(f"autonomous-orchestrator: {orchestrator}")
    print(format_assignment_table(assignments), end="")
    return 0


def main() -> int:
    args = _parse_args()
    root = args.root.resolve()
    agents = args.agents_dir.resolve() if args.agents_dir is not None else None
    try:
        if args.show:
            return _show(root, agents)
        if args.profile is None:
            raise DiagnosticError(
                "MODEL_PROFILE_REQUIRED",
                "A profile name is required unless --show is used.",
                suggested_action="Run with `quality`, `economy`, or `--show`.",
            )
        chosen = apply_profile(root, args.profile, agent_directory=agents)
        print(f"active_profile: {args.profile}")
        print(f"autonomous-orchestrator: {chosen['autonomous-orchestrator']}")
        print(format_assignment_table(chosen), end="")
        return 0
    except DiagnosticError as error:
        fail(error)


if __name__ == "__main__":
    sys.exit(main())
