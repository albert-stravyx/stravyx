"""Assemble compact Other Model judge packets without PyYAML."""
from __future__ import annotations

import fnmatch
import os
import subprocess
from pathlib import Path

from scripts.lib.errors import DiagnosticError
from scripts.lib.model_profiles import JUDGE_ROLES, STABLE_PREAMBLE

MAX_EXCERPT_LINES = 80
MAX_DIFF_LINES = 800
SECRET_FRAGMENTS = (".env", "credentials.json", "id_rsa", ".pem", "service_role")


def normalise(path: str) -> str:
    text = str(Path(path).as_posix())
    while text.startswith("./"):
        text = text[2:]
    return text.lstrip("/")


def is_secret_path(path: str) -> bool:
    lowered = normalise(path).lower()
    return any(fragment in lowered for fragment in SECRET_FRAGMENTS)


def matches_path(path: str, pattern: str) -> bool:
    pattern = normalise(pattern)
    path = normalise(path)
    if pattern.endswith("/**"):
        prefix = pattern[:-3].rstrip("/")
        return path == prefix or path.startswith(prefix + "/")
    return fnmatch.fnmatch(path, pattern)


def in_allowed_paths(path: str, allowed: list[str], forbidden: list[str]) -> bool:
    if any(matches_path(path, rule) for rule in forbidden):
        return False
    if is_secret_path(path):
        return False
    if not allowed:
        return False
    return any(matches_path(path, rule) for rule in allowed)


def cap_lines(text: str, limit: int) -> tuple[str, bool]:
    lines = text.splitlines()
    if len(lines) <= limit:
        return text.rstrip() + ("\n" if text else ""), False
    clipped = "\n".join(lines[:limit]) + f"\n\n… truncated after {limit} lines\n"
    return clipped, True


def parse_task_fields(text: str) -> dict[str, object]:
    result: dict[str, object] = {
        "id": "unknown",
        "objective": "",
        "allowed_paths": [],
        "forbidden_paths": [],
        "acceptance_criteria": [],
        "approved_artifacts": {},
    }
    current_list: str | None = None
    current_map: str | None = None
    folding: str | None = None
    fold_lines: list[str] = []
    for raw in text.splitlines():
        current_list, current_map, folding = _consume_task_line(
            raw, result, current_list, current_map, folding, fold_lines
        )
    if folding is not None:
        result[folding] = " ".join(part.strip() for part in fold_lines if part.strip())
    return result


def _consume_task_line(
    raw: str,
    result: dict[str, object],
    current_list: str | None,
    current_map: str | None,
    folding: str | None,
    fold_lines: list[str],
) -> tuple[str | None, str | None, str | None]:
    stripped = raw.strip()
    if folding is not None:
        if raw.startswith("  ") or raw.startswith("\t") or stripped == "":
            fold_lines.append(stripped)
            return current_list, current_map, folding
        result[folding] = " ".join(part.strip() for part in fold_lines if part.strip())
        fold_lines.clear()
        folding = None
    if stripped in ("allowed_paths:", "forbidden_paths:", "acceptance_criteria:"):
        return stripped[:-1], None, None
    if stripped == "approved_artifacts:":
        return None, "approved_artifacts", None
    if current_list and stripped.startswith("- "):
        values = result[current_list]
        if isinstance(values, list):
            values.append(stripped[2:].strip().strip('"').strip("'"))
        return current_list, None, None
    if current_map and ":" in stripped and not stripped.startswith("- "):
        key, value = stripped.split(":", 1)
        mapping = result[current_map]
        if isinstance(mapping, dict):
            mapping[key.strip()] = value.strip().strip('"').strip("'")
        return None, current_map, None
    if stripped.startswith("id:"):
        result["id"] = stripped.split(":", 1)[1].strip().strip('"').strip("'")
        return None, None, None
    if stripped.startswith("objective:"):
        rest = stripped.split(":", 1)[1].strip()
        if rest in (">", ">-", "|", "|-"):
            return None, None, "objective"
        result["objective"] = rest.strip('"').strip("'")
        return None, None, None
    if stripped and not raw.startswith(" ") and not stripped.startswith("#"):
        return None, None, None
    return current_list, current_map, folding


def render_packet(
    *,
    role: str,
    task_id: str,
    objective: str,
    acceptance: list[str],
    allowed: list[str],
    forbidden: list[str],
    artefacts: str,
    diff_text: str,
    tests_text: str,
    notes_text: str,
) -> str:
    if role not in JUDGE_ROLES:
        raise DiagnosticError(
            "JUDGE_ROLE_UNKNOWN",
            f"Unknown judge role `{role}`.",
            context={"allowed_roles": list(JUDGE_ROLES)},
            suggested_action="Pass one of the Other Model judge roles.",
        )
    diff_body, _ = cap_lines(diff_text, MAX_DIFF_LINES)
    tests_body, _ = cap_lines(tests_text, MAX_EXCERPT_LINES)
    notes_body, _ = cap_lines(notes_text, MAX_EXCERPT_LINES)
    criteria = "\n".join(f"- {item}" for item in acceptance) or "- (none listed)"
    allowed_lines = "\n".join(f"- `{item}`" for item in allowed) or "- (none listed)"
    forbidden_lines = "\n".join(f"- `{item}`" for item in forbidden) or "- (none listed)"
    return (
        f"# Judge packet\n\n"
        f"- Role: `{role}`\n"
        f"- Task id: `{task_id}`\n"
        f"- Objective: {objective or '(not provided)'}\n\n"
        f"## Acceptance criteria\n\n{criteria}\n\n"
        f"## Allowed paths\n\n{allowed_lines}\n\n"
        f"## Forbidden paths\n\n{forbidden_lines}\n\n"
        f"## Approved artefacts (capped excerpts)\n\n{artefacts or '(none)'}\n\n"
        f"## Diff (allowed_paths only)\n\n{diff_body or '(empty diff)'}\n\n"
        f"## Tests / gates\n\n{tests_body or '(none provided)'}\n\n"
        f"## Already-read snippets\n\n{notes_body or '(none provided)'}\n\n"
        f"## Uncertainties / files not in this packet\n\n"
        f"Anything not listed above was deliberately omitted. Do not explore the repo.\n"
    )


def excerpt_artefact(root: Path, label: str, relpath: str) -> str:
    if not relpath or relpath in ("null", "None"):
        return ""
    if is_secret_path(relpath):
        raise DiagnosticError(
            "JUDGE_PACKET_SECRET_PATH",
            "Refusing to embed a secret-looking path in a judge packet.",
            context={"path": relpath},
            suggested_action="Remove secrets from approved_artifacts before building a packet.",
        )
    path = (root / relpath).resolve()
    try:
        path.relative_to(root.resolve())
    except ValueError as exc:
        raise DiagnosticError(
            "JUDGE_PACKET_PATH_ESCAPE",
            "Approved artefact path escapes the repository root.",
            cause=str(exc),
            context={"path": relpath},
            suggested_action="Use a path inside the repository.",
        ) from exc
    if not path.is_file():
        return f"### {label}\n\nMissing file `{relpath}`.\n"
    clipped, _ = cap_lines(path.read_text(encoding="utf-8"), MAX_EXCERPT_LINES)
    return f"### {label} (`{relpath}`)\n\n```\n{clipped.rstrip()}\n```\n"


def filter_diff(diff_text: str, allowed: list[str], forbidden: list[str]) -> str:
    blocks: list[str] = []
    current: list[str] = []
    current_path = ""
    for line in diff_text.splitlines():
        if line.startswith("diff --git "):
            if current and current_path and in_allowed_paths(current_path, allowed, forbidden):
                blocks.append("\n".join(current))
            current = [line]
            parts = line.split(" b/")
            current_path = parts[1] if len(parts) > 1 else ""
            continue
        if current:
            current.append(line)
    if current and current_path and in_allowed_paths(current_path, allowed, forbidden):
        blocks.append("\n".join(current))
    return "\n\n".join(blocks)


def packet_destination(root: Path, task_id: str, role: str) -> Path:
    safe_id = "".join(ch if ch.isalnum() or ch in "-_" else "-" for ch in task_id)
    return root / ".agent" / "packets" / f"{safe_id}-{role}.md"


def collect_working_tree_diff(root: Path) -> str:
    """Tracked changes plus untracked (non-ignored) files, so new slice files appear."""
    tracked = _run_git(["diff", "HEAD"], root, allowed_codes=(0,))
    untracked = _untracked_file_diffs(root)
    return f"{tracked}{untracked}"


def _run_git(args: list[str], root: Path, *, allowed_codes: tuple[int, ...]) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=root,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode not in allowed_codes:
        raise DiagnosticError(
            "JUDGE_PACKET_GIT_DIFF_FAILED",
            "Could not collect git diff for the judge packet.",
            cause=result.stderr.strip() or f"exit {result.returncode}",
            suggested_action="Run from a git worktree or pass --diff-file.",
        )
    return result.stdout


def _untracked_file_diffs(root: Path) -> str:
    listing = _run_git(["ls-files", "--others", "--exclude-standard"], root, allowed_codes=(0,))
    chunks: list[str] = []
    for rel in listing.splitlines():
        if rel:
            chunks.append(
                _run_git(
                    ["diff", "--no-index", "--", os.devnull, rel],
                    root,
                    allowed_codes=(0, 1),
                )
            )
    return "".join(chunks)


def stable_preamble() -> str:
    return STABLE_PREAMBLE
