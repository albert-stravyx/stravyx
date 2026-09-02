from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / ".quality" / "toolchain.json"

@dataclass(frozen=True, slots=True)
class Gate:
    name: str
    command: tuple[str, ...]
    suggested_action: str
    required: bool = True

def fail(code: str, *, gate: str, command: tuple[str, ...], detail: str, suggested_action: str) -> int:
    print(f"ERROR [{code}] quality gate `{gate}` failed")
    print(f"Command: {' '.join(command)}")
    print(f"Detail:\n{detail.rstrip() or '(no output)'}")
    print(f"Suggested action: {suggested_action}")
    print("Do not disable or weaken the gate merely to make the task pass.")
    return 1

def load_gates() -> list[Gate]:
    try:
        raw = json.loads(CONFIG.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise SystemExit(f"QUALITY_TOOLCHAIN_MISSING: {CONFIG} is missing. Restore the quality configuration.") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"QUALITY_TOOLCHAIN_INVALID_JSON: {CONFIG}:{exc.lineno}:{exc.colno}: {exc.msg}") from exc
    entries = raw.get("gates") if isinstance(raw, dict) else None
    if not isinstance(entries, list):
        raise SystemExit("QUALITY_TOOLCHAIN_INVALID_SHAPE: `gates` must be an array.")
    gates: list[Gate] = []
    for index, item in enumerate(entries):
        if not isinstance(item, dict):
            raise SystemExit(f"QUALITY_TOOLCHAIN_INVALID_GATE: gates[{index}] must be an object.")
        command = item.get("command")
        if not isinstance(command, list) or not command or not all(isinstance(x, str) for x in command):
            raise SystemExit(f"QUALITY_TOOLCHAIN_INVALID_COMMAND: gates[{index}].command must be a non-empty string array.")
        gates.append(Gate(
            name=str(item.get("name", f"gate-{index}")),
            command=tuple(command),
            suggested_action=str(item.get("suggested_action", "Inspect the captured diagnostic and correct the underlying issue.")),
            required=bool(item.get("required", True)),
        ))
    return gates

def resolve(command: tuple[str, ...]) -> tuple[str, ...]:
    if command[0] == "python":
        return (sys.executable, *command[1:])
    return command

def main() -> int:
    parser = argparse.ArgumentParser(description="Run repository quality gates with actionable diagnostics.")
    parser.add_argument("--continue-on-failure", action="store_true", help="Run remaining gates to collect diagnostics. The final exit code is still non-zero if a required gate fails.")
    args = parser.parse_args()
    failed = False
    for gate in load_gates():
        command = resolve(gate.command)
        executable = command[0]
        if not Path(executable).exists() and shutil.which(executable) is None:
            if gate.required:
                failed = True
                fail(
                    "QUALITY-TOOL-MISSING",
                    gate=gate.name,
                    command=command,
                    detail=f"Required executable `{executable}` is not available in PATH.",
                    suggested_action=gate.suggested_action,
                )
                if not args.continue_on_failure:
                    return 1
            else:
                print(f"SKIP {gate.name}: optional executable `{executable}` is unavailable.")
            continue
        result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        output = (result.stdout + result.stderr).strip()
        if result.returncode != 0:
            if gate.required:
                failed = True
                fail("QUALITY-GATE-FAILED", gate=gate.name, command=command, detail=output, suggested_action=gate.suggested_action)
                if not args.continue_on_failure:
                    return 1
            else:
                print(f"WARN {gate.name} failed (optional):\n{output}")
        else:
            print(f"PASS {gate.name}")
            if output:
                print(output)
    if failed:
        print("Quality check completed with one or more required failures.")
        return 1
    print("All required repository quality gates passed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
