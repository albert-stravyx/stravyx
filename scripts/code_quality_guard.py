from __future__ import annotations

import ast
import fnmatch
import json
import re
import sys
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
POLICY_PATH = ROOT / ".quality" / "policy.json"

@dataclass(frozen=True, slots=True)
class Finding:
    code: str
    path: str
    line: int
    column: int
    issue: str
    why: str
    suggestion: str
    evidence: str = ""

    def render(self) -> str:
        parts = [
            f"ERROR [{self.code}] {self.path}:{self.line}:{self.column}",
            f"Issue: {self.issue}",
            f"Why this is blocked: {self.why}",
        ]
        if self.evidence:
            parts.append(f"Evidence: {self.evidence}")
        parts.append(f"Suggested action: {self.suggestion}")
        parts.append("If this is genuinely unavoidable, add a narrow, approved entry to .quality/exceptions.json with task, owner, reason and review_by date.")
        return "\n".join(parts)

def load_json(path: Path) -> dict[str, object]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"QUALITY_CONFIG_MISSING: {path} does not exist. Restore the repository quality policy before running the guard.") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(
            f"QUALITY_CONFIG_INVALID_JSON: {path}:{exc.lineno}:{exc.colno}: {exc.msg}. "
            "Correct the JSON syntax; do not bypass the quality guard."
        ) from exc
    if not isinstance(value, dict):
        raise SystemExit(f"QUALITY_CONFIG_INVALID_SHAPE: {path} must contain a JSON object.")
    return value

def matches_any(path: str, patterns: Iterable[str]) -> bool:
    return any(fnmatch.fnmatch(path, pattern) for pattern in patterns)

def iter_sources(policy: dict[str, object]) -> Iterable[Path]:
    exts = set(str(x) for x in policy.get("source_extensions", []))
    excluded = [str(x) for x in policy.get("exclude_globs", [])]
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in exts:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if matches_any(rel, excluded):
            continue
        yield path

def load_exceptions(policy: dict[str, object]) -> list[dict[str, object]]:
    raw = load_json(ROOT / str(policy.get("waiver_file", ".quality/exceptions.json")))
    entries = raw.get("exceptions", [])
    if not isinstance(entries, list):
        raise SystemExit("QUALITY_EXCEPTION_INVALID_SHAPE: `exceptions` must be a JSON array.")
    result: list[dict[str, object]] = []
    today = date.today()
    for index, item in enumerate(entries):
        if not isinstance(item, dict):
            raise SystemExit(f"QUALITY_EXCEPTION_INVALID_ENTRY: exceptions[{index}] must be an object.")
        required = ["id", "rule", "path", "task", "reason", "owner", "review_by"]
        missing = [key for key in required if not item.get(key)]
        if missing:
            raise SystemExit(f"QUALITY_EXCEPTION_INCOMPLETE: exceptions[{index}] missing {', '.join(missing)}.")
        try:
            review_by = date.fromisoformat(str(item["review_by"]))
        except ValueError as exc:
            raise SystemExit(f"QUALITY_EXCEPTION_BAD_DATE: {item['id']} review_by must use YYYY-MM-DD.") from exc
        if review_by < today:
            raise SystemExit(
                f"QUALITY_EXCEPTION_EXPIRED: {item['id']} expired on {review_by.isoformat()}. "
                "Remove the escape hatch or renew it through explicit review; do not silently extend it."
            )
        result.append(item)
    return result

def waived(finding: Finding, exceptions: list[dict[str, object]]) -> bool:
    for item in exceptions:
        if str(item.get("rule")) != finding.code:
            continue
        if not fnmatch.fnmatch(finding.path, str(item.get("path"))):
            continue
        configured_line = item.get("line")
        if configured_line is not None and int(configured_line) != finding.line:
            continue
        return True
    return False

TS_RULES: list[tuple[str, re.Pattern[str], str, str, str]] = [
    (
        "QG-TS-ANY",
        re.compile(r"(?:[:=]\s*any\b|\bas\s+any\b|<\s*any\s*>|\bany\s*\[\]|[,<]\s*any\s*[,>])"),
        "TypeScript `any` bypasses the type system.",
        "Type escapes hide contract errors and make later refactors unsafe.",
        "Use a precise type, `unknown` plus runtime validation, or a generic constrained to the actual contract.",
    ),
    (
        "QG-TS-DOUBLE-ASSERT",
        re.compile(r"\bas\s+unknown\s+as\b"),
        "Double type assertion detected.",
        "`as unknown as T` can manufacture an arbitrary trusted type without evidence.",
        "Validate the value at the trust boundary and let the validated schema infer the domain type.",
    ),
    (
        "QG-TS-SUPPRESSION",
        re.compile(r"@ts-ignore|@ts-nocheck|eslint-disable"),
        "Compiler/linter suppression detected.",
        "Suppressions can hide defects and allow generated code to bypass repository standards.",
        "Fix the underlying type/lint error. If an upstream dependency is genuinely broken, use a reviewed quality exception with a removal trigger.",
    ),
]

def scan_text_rules(path: Path, rel: str, policy: dict[str, object]) -> list[Finding]:
    findings: list[Finding] = []
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    max_file_lines = int(dict(policy.get("rules", {})).get("max_source_file_lines", 600))
    if len(lines) > max_file_lines:
        findings.append(Finding(
            "QG-SIZE-FILE", rel, 1, 1,
            f"Source file has {len(lines)} lines; repository limit is {max_file_lines}.",
            "Very large files increase review cost, context load and coupling risk.",
            "Split the file along cohesive domain/application boundaries; do not split mechanically just to satisfy the number.",
        ))
    for number, line in enumerate(lines, start=1):
        if re.search(r"\b(TODO|FIXME|HACK)\b", line, re.IGNORECASE) and not re.search(r"(TASK|ISSUE)-\d+", line, re.IGNORECASE):
            findings.append(Finding(
                "QG-DEBT-UNTICKETED", rel, number, 1,
                "Unticketed TODO/FIXME/HACK detected.",
                "Unowned placeholders accumulate hidden debt and can make incomplete AI-generated work look finished.",
                "Resolve it now or attach a concrete TASK-/ISSUE- identifier with an owner and follow-up path.",
                line.strip(),
            ))
        if path.suffix in {".ts", ".tsx", ".js", ".jsx"}:
            for code, pattern, issue, why, suggestion in TS_RULES:
                match = pattern.search(line)
                if match:
                    findings.append(Finding(code, rel, number, match.start()+1, issue, why, suggestion, line.strip()))
            if matches_any(rel, [str(x) for x in policy.get("fallback_sensitive_globs", [])]):
                match = re.search(r"(?:\?\?|\|\|)\s*(?:0|''|\"\"|\[\]|\{\})(?![\w$])", line)
                if match:
                    findings.append(Finding(
                        "QG-DOMAIN-FALLBACK", rel, number, match.start()+1,
                        "Placeholder fallback detected in a domain-sensitive path.",
                        "Inventing zero/empty values can convert missing or invalid business data into apparently valid state.",
                        "Model optionality explicitly or fail validation with a typed diagnostic. Keep a default only when the domain contract explicitly defines that default.",
                        line.strip(),
                    ))
    return findings

class PythonVisitor(ast.NodeVisitor):
    def __init__(self, rel: str, max_function_lines: int) -> None:
        self.rel = rel
        self.max_function_lines = max_function_lines
        self.findings: list[Finding] = []

    def add(self, code: str, node: ast.AST, issue: str, why: str, suggestion: str) -> None:
        self.findings.append(Finding(code, self.rel, getattr(node, "lineno", 1), getattr(node, "col_offset", 0)+1, issue, why, suggestion))

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.module in {"typing", "typing_extensions"} and any(alias.name == "Any" for alias in node.names):
            self.add("QG-PY-ANY", node, "`typing.Any` imported in production source.", "`Any` removes static guarantees and often masks an unvalidated trust boundary.", "Use `object`, a Protocol, TypedDict/Pydantic model, TypeVar/generic, or a JSON value union as appropriate.")
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name) -> None:
        if node.id == "Any":
            self.add("QG-PY-ANY", node, "`Any` used in Python source.", "`Any` permits unsound operations to propagate without type-checker evidence.", "Replace it with a precise type or validate untrusted data before constructing a trusted domain object.")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        if isinstance(node.func, ast.Name) and node.func.id == "cast" and node.args and isinstance(node.args[0], ast.Name) and node.args[0].id == "Any":
            self.add("QG-PY-ANY-CAST", node, "`cast(Any, ...)` detected.", "The cast explicitly disables type safety at the value boundary.", "Use a real target type only after validation, or redesign the adapter contract.")
        self.generic_visit(node)

    def visit_ExceptHandler(self, node: ast.ExceptHandler) -> None:
        body = node.body
        swallowed = len(body) == 1 and (
            isinstance(body[0], ast.Pass) or
            (isinstance(body[0], ast.Return) and (body[0].value is None or isinstance(body[0].value, ast.Constant) and body[0].value.value is None))
        )
        if swallowed:
            self.add("QG-PY-SWALLOWED-EXCEPTION", node, "Exception is swallowed by `pass` or `return None`.", "The caller loses failure cause, diagnostics and retry semantics; errors can masquerade as valid absence.", "Handle the expected exception explicitly or raise/map a typed diagnostic error while preserving the causal exception in logs/exception chaining.")
        self.generic_visit(node)

    def _function_size(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        end = getattr(node, "end_lineno", node.lineno)
        size = int(end) - int(node.lineno) + 1
        if size > self.max_function_lines:
            self.add("QG-SIZE-FUNCTION", node, f"Function `{node.name}` has {size} lines; limit is {self.max_function_lines}.", "Large functions combine responsibilities, increase branching/context cost and are harder to test/review.", "Extract cohesive domain/application operations with explicit contracts; do not create meaningless helper fragments solely to satisfy the threshold.")

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._function_size(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._function_size(node)
        self.generic_visit(node)

def scan_python(path: Path, rel: str, policy: dict[str, object]) -> list[Finding]:
    text = path.read_text(encoding="utf-8")
    findings: list[Finding] = []
    for number, line in enumerate(text.splitlines(), start=1):
        if "# type: ignore" in line or "# pyright: ignore" in line:
            findings.append(Finding(
                "QG-PY-SUPPRESSION", rel, number, 1,
                "Python type-checker suppression detected.",
                "Ignoring the checker can convert a real contract mismatch into latent runtime behaviour.",
                "Correct the type boundary. If an upstream typing defect is unavoidable, use a reviewed quality exception and the narrowest error code suppression supported by the checker.",
                line.strip(),
            ))
    try:
        tree = ast.parse(text, filename=rel)
    except SyntaxError as exc:
        return findings + [Finding(
            "QG-PY-SYNTAX", rel, exc.lineno or 1, exc.offset or 1,
            f"Python syntax error: {exc.msg}",
            "Quality analysis cannot continue reliably on syntactically invalid code.",
            "Fix the syntax error first, then rerun the guard and static type checks.",
        )]
    visitor = PythonVisitor(rel, int(dict(policy.get("rules", {})).get("max_python_function_lines", 80)))
    visitor.visit(tree)
    return findings + visitor.findings

def main() -> int:
    policy = load_json(POLICY_PATH)
    exceptions = load_exceptions(policy)
    findings: list[Finding] = []
    for path in iter_sources(policy):
        rel = path.relative_to(ROOT).as_posix()
        findings.extend(scan_text_rules(path, rel, policy))
        if path.suffix == ".py":
            findings.extend(scan_python(path, rel, policy))
    unique: dict[tuple[str, str, int, int], Finding] = {}
    for finding in findings:
        unique[(finding.code, finding.path, finding.line, finding.column)] = finding
    active = [f for f in unique.values() if not waived(f, exceptions)]
    if active:
        print(f"Code-quality guard found {len(active)} blocking issue(s).\n")
        for finding in sorted(active, key=lambda f: (f.path, f.line, f.code)):
            print(finding.render())
            print("-" * 88)
        return 1
    print("Code-quality guard passed: no unwaived type escapes, suppressions, swallowed exceptions, unticketed debt, oversized source units or sensitive placeholder fallbacks were detected.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
