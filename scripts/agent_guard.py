#!/usr/bin/env python3
"""Small, dependency-free guardrail helper for AI-assisted development."""
from __future__ import annotations

import argparse
import fnmatch
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCK_DIR = ROOT / ".agent" / "locks"


def normalise(path: str) -> str:
    return str(Path(path).as_posix()).lstrip("./")


def lock_name(path: str) -> str:
    return normalise(path).replace("/", "__").replace("*", "STAR") + ".json"


def cmd_lock(args: argparse.Namespace) -> int:
    LOCK_DIR.mkdir(parents=True, exist_ok=True)
    target = normalise(args.path)
    dest = LOCK_DIR / lock_name(target)
    if dest.exists():
        data = json.loads(dest.read_text())
        print(f"LOCKED: {target} is owned by {data.get('agent')}", file=sys.stderr)
        return 2
    dest.write_text(json.dumps({"agent": args.agent, "path": target}, indent=2) + "\n")
    print(f"LOCK ACQUIRED: {target} -> {args.agent}")
    return 0


def cmd_unlock(args: argparse.Namespace) -> int:
    target = normalise(args.path)
    dest = LOCK_DIR / lock_name(target)
    if not dest.exists():
        print(f"No lock exists for {target}")
        return 0
    data = json.loads(dest.read_text())
    if data.get("agent") != args.agent:
        print(f"REFUSED: lock belongs to {data.get('agent')}", file=sys.stderr)
        return 2
    dest.unlink()
    print(f"LOCK RELEASED: {target}")
    return 0


def changed_files() -> list[str]:
    commands = [
        ["git", "diff", "--name-only", "--cached"],
        ["git", "diff", "--name-only"],
    ]
    files: set[str] = set()
    for cmd in commands:
        result = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, check=False)
        if result.returncode == 0:
            files.update(normalise(x) for x in result.stdout.splitlines() if x.strip())
    return sorted(files)


def parse_simple_yaml(path: Path) -> dict[str, list[str]]:
    """Parse only allowed_paths/forbidden_paths lists to avoid adding PyYAML."""
    result: dict[str, list[str]] = {"allowed_paths": [], "forbidden_paths": []}
    current = None
    for raw in path.read_text().splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if stripped in ("allowed_paths:", "forbidden_paths:"):
            current = stripped[:-1]
            continue
        if current and stripped.startswith("- "):
            value = stripped[2:].strip().strip('"').strip("'")
            result[current].append(normalise(value))
        elif line and not line.startswith(" ") and not stripped.startswith("#"):
            current = None
    return result


def matches(path: str, pattern: str) -> bool:
    pattern = normalise(pattern)
    if pattern.endswith("/**"):
        return path == pattern[:-3].rstrip("/") or path.startswith(pattern[:-3])
    return fnmatch.fnmatch(path, pattern)


def cmd_validate_scope(args: argparse.Namespace) -> int:
    task = Path(args.task)
    if not task.is_absolute():
        task = ROOT / task
    if not task.exists():
        print(f"Task manifest not found: {task}", file=sys.stderr)
        return 2
    spec = parse_simple_yaml(task)
    files = changed_files()
    bad: list[str] = []
    for file in files:
        if any(matches(file, pat) for pat in spec["forbidden_paths"]):
            bad.append(f"FORBIDDEN {file}")
            continue
        if spec["allowed_paths"] and not any(matches(file, pat) for pat in spec["allowed_paths"]):
            bad.append(f"OUT-OF-SCOPE {file}")
    if bad:
        print("Scope validation failed:", file=sys.stderr)
        print("\n".join(f" - {item}" for item in bad), file=sys.stderr)
        return 3
    print(f"Scope validation passed for {len(files)} changed file(s).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    lock = sub.add_parser("lock")
    lock.add_argument("--agent", required=True)
    lock.add_argument("--path", required=True)
    lock.set_defaults(func=cmd_lock)
    unlock = sub.add_parser("unlock")
    unlock.add_argument("--agent", required=True)
    unlock.add_argument("--path", required=True)
    unlock.set_defaults(func=cmd_unlock)
    scope = sub.add_parser("validate-scope")
    scope.add_argument("--task", default=".agent/current-task.yaml")
    scope.set_defaults(func=cmd_validate_scope)
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
