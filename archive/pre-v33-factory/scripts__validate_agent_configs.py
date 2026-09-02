#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import cast

ROOT = Path(__file__).resolve().parents[1]
AGENT_DIR = ROOT / ".cursor" / "agents"
POLICY_PATH = ROOT / ".agent" / "policy.json"
NAME_PATTERN = re.compile(r"^name:\s*([A-Za-z0-9_-]+)\s*$", flags=re.MULTILINE)

REQUIRED_FILES = [
    "AGENTS.md",
    "project.yaml",
    "CURSOR_BOOTSTRAP_PROMPT.md",
    ".cursor/hooks.json",
    "scripts/agent_guard.py",
    "scripts/autonomous_task.py",
    "scripts/code_quality_guard.py",
    "scripts/architecture_guard.py",
    "docs/REPOSITORY_OPERATIONS_GUIDE.md",
    "docs/AUTONOMOUS_TASK_COMPLETION.md",
    "docs/CODING_STANDARDS.md",
]


def load_object(path: Path) -> dict[str, object]:
    try:
        raw: object = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"AGENT_CONFIG_MISSING: required file does not exist: {path}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(
            f"AGENT_CONFIG_INVALID_JSON: {path}:{exc.lineno}:{exc.colno}: {exc.msg}"
        ) from exc
    if not isinstance(raw, dict):
        raise SystemExit(f"AGENT_CONFIG_INVALID_SHAPE: {path} must contain a JSON object.")
    return cast(dict[str, object], raw)


def agent_names(errors: list[str]) -> dict[str, Path]:
    agents: dict[str, Path] = {}
    for path in sorted(AGENT_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        match = NAME_PATTERN.search(text)
        if not text.startswith("---\n") or match is None:
            errors.append(f"{path.relative_to(ROOT)}: missing YAML frontmatter or `name:`")
            continue
        name = match.group(1)
        if name in agents:
            errors.append(f"duplicate agent name: {name}")
        agents[name] = path
    return agents


def validate_policy(agents: dict[str, Path], errors: list[str]) -> None:
    policy = load_object(POLICY_PATH)
    max_depth = policy.get("max_nested_depth")
    if not isinstance(max_depth, int) or max_depth > 3:
        errors.append("max_nested_depth must be an integer <= 3")

    allowlist = policy.get("nested_agent_allowlist", {})
    if not isinstance(allowlist, dict):
        errors.append("nested_agent_allowlist must be an object")
        allowlist = {}

    for parent, children in allowlist.items():
        if parent not in agents:
            errors.append(f"policy parent missing agent: {parent}")
        if not isinstance(children, list):
            errors.append(f"nested_agent_allowlist[{parent}] must be an array")
            continue
        for child in children:
            if not isinstance(child, str) or child not in agents:
                errors.append(f"policy child missing agent: {child}")

    pairs = policy.get("required_review_pairs")
    if not isinstance(pairs, dict):
        errors.append("required_review_pairs must be an object of implementer -> reviewer")
        return
    if pairs.get("frontend-engineer") != "senior-frontend-reviewer":
        errors.append(
            "required_review_pairs must map frontend-engineer to senior-frontend-reviewer"
        )
    for implementer, reviewer in pairs.items():
        if not isinstance(implementer, str) or implementer not in agents:
            errors.append(f"required_review_pairs implementer missing agent: {implementer}")
        if not isinstance(reviewer, str) or reviewer not in agents:
            errors.append(f"required_review_pairs reviewer missing agent: {reviewer}")
        if implementer == reviewer:
            errors.append(
                f"required_review_pairs must not assign an agent to review itself: {implementer}"
            )


def main() -> int:
    errors: list[str] = []
    agents = agent_names(errors)
    validate_policy(agents, errors)

    for relative_path in REQUIRED_FILES:
        if not (ROOT / relative_path).exists():
            errors.append(f"missing required file: {relative_path}")

    if errors:
        print("Agent configuration validation failed:")
        for error in errors:
            print(f"ERROR: {error}")
        print(
            "Suggested action: restore the missing/invalid configuration or correct the named "
            "agent/policy reference; do not remove validation to make CI pass."
        )
        return 1

    print(f"Validated {len(agents)} agents, policy and core repository guardrails.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
