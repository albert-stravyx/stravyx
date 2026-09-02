from __future__ import annotations

import ast
import fnmatch
import json
import re
import sys
from pathlib import Path
from typing import cast

ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / ".quality" / "policy.json"
TS_IMPORT = re.compile(r"(?:from\s+|import\s*\(\s*)['\"]([^'\"]+)['\"]")


def load_policy() -> dict[str, object]:
    try:
        raw: object = json.loads(POLICY_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(
            f"ARCH_CONFIG_MISSING: {POLICY_PATH} is missing. Restore .quality/policy.json."
        ) from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(
            f"ARCH_CONFIG_INVALID_JSON: {POLICY_PATH}:{exc.lineno}:{exc.colno}: {exc.msg}"
        ) from exc

    if not isinstance(raw, dict):
        raise SystemExit("ARCH_CONFIG_INVALID_SHAPE: .quality/policy.json must be a JSON object.")
    return cast(dict[str, object], raw)


def python_imports(path: Path) -> list[tuple[str, int]]:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    except SyntaxError:
        return []

    imports: list[tuple[str, int]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend((alias.name, node.lineno) for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.append((node.module, node.lineno))
    return imports


def text_imports(path: Path) -> list[tuple[str, int]]:
    imports: list[tuple[str, int]] = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        match = TS_IMPORT.search(line)
        if match:
            imports.append((match.group(1), line_number))
    return imports


def configured_boundaries(policy: dict[str, object]) -> list[dict[str, object]]:
    raw = policy.get("architecture_boundaries", [])
    if not isinstance(raw, list):
        raise SystemExit("ARCH_CONFIG_INVALID_BOUNDARIES: architecture_boundaries must be an array.")

    boundaries: list[dict[str, object]] = []
    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            raise SystemExit(
                f"ARCH_CONFIG_INVALID_BOUNDARY: architecture_boundaries[{index}] must be an object."
            )
        boundaries.append(cast(dict[str, object], item))
    return boundaries


def source_imports(path: Path) -> list[tuple[str, int]]:
    if path.suffix == ".py":
        return python_imports(path)
    return text_imports(path)


def main() -> int:
    policy = load_policy()
    failures: list[str] = []

    for boundary in configured_boundaries(policy):
        name = str(boundary.get("name", "unnamed-boundary"))
        from_glob = str(boundary.get("from_glob", ""))
        forbidden_raw = boundary.get("forbidden_import_prefixes", [])
        if not isinstance(forbidden_raw, list):
            raise SystemExit(
                f"ARCH_CONFIG_INVALID_PREFIXES: boundary `{name}` forbidden_import_prefixes must be an array."
            )
        forbidden = [str(value) for value in forbidden_raw]
        reason = str(
            boundary.get("reason", "Boundary protects architectural responsibility and coupling.")
        )

        for path in ROOT.rglob("*"):
            if not path.is_file() or path.suffix not in {".py", ".ts", ".tsx", ".js", ".jsx"}:
                continue
            relative_path = path.relative_to(ROOT).as_posix()
            if not fnmatch.fnmatch(relative_path, from_glob):
                continue

            for imported, line_number in source_imports(path):
                matched_prefix = next(
                    (
                        prefix
                        for prefix in forbidden
                        if imported == prefix
                        or imported.startswith(prefix + ".")
                        or imported.startswith(prefix + "/")
                    ),
                    None,
                )
                if matched_prefix is None:
                    continue

                failures.append(
                    f"ERROR [ARCH-BOUNDARY] {relative_path}:{line_number}:1\n"
                    f"Boundary: {name}\n"
                    f"Issue: import `{imported}` crosses forbidden boundary `{matched_prefix}`.\n"
                    f"Why this is blocked: {reason}\n"
                    "Suggested action: move the integration behind an approved application/adapter "
                    "interface, or return to Program Design/ADR and obtain approval before changing "
                    "the boundary."
                )

    if failures:
        print(f"Architecture guard found {len(failures)} blocking violation(s).\n")
        print(("\n" + "-" * 88 + "\n").join(failures))
        return 1

    print("Architecture guard passed: configured dependency boundaries are intact.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
