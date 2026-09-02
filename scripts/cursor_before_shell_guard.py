#!/usr/bin/env python3
"""Cursor beforeShellExecution guard.

Conservative by design: blocks commands that autonomous agents must never execute.
The human can run protected commands manually outside the agent loop after review.
"""
from __future__ import annotations

import json
import re
import sys


def reply(permission: str, message: str) -> None:
    print(json.dumps({
        "continue": True,
        "permission": permission,
        "user_message": message,
        "agent_message": message,
    }))


def extract_command(payload: dict) -> str:
    # Cursor hook payloads have evolved; accept common command locations.
    candidates = [
        payload.get("command"),
        payload.get("shell_command"),
        payload.get("args", {}).get("command") if isinstance(payload.get("args"), dict) else None,
        payload.get("tool_input", {}).get("command") if isinstance(payload.get("tool_input"), dict) else None,
    ]
    return next((str(v) for v in candidates if v), "")


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        reply("deny", "Guard could not parse the shell request; failing closed.")
        return 0

    command = extract_command(payload).strip()
    if not command:
        reply("deny", "Guard could not identify the shell command; failing closed.")
        return 0

    denied: list[tuple[str, str]] = [
        (r"(^|[;&|]\s*)git\s+push\b", "Agent-driven git push is prohibited."),
        (r"(^|[;&|]\s*)git\s+commit\b", "Agent-driven git commit is prohibited; prepare the commit for human review."),
        (r"(^|[;&|]\s*)git\s+merge\b", "Agent-driven git merge is prohibited."),
        (r"(^|[;&|]\s*)git\s+rebase\b", "Agent-driven git rebase is prohibited by default."),
        (r"(^|[;&|]\s*)git\s+reset\s+--hard\b", "Destructive git reset is prohibited."),
        (r"(^|[;&|]\s*)git\s+clean\s+-[^\n]*f", "Destructive git clean is prohibited."),
        (r"(^|[;&|]\s*)rm\s+-[^\n]*r[^\n]*f|(^|[;&|]\s*)rm\s+-[^\n]*f[^\n]*r", "Recursive force deletion is prohibited."),
        (r"(^|[;&|]\s*)sam\s+deploy\b", "Agent-driven AWS deployment is prohibited."),
        (r"(^|[;&|]\s*)terraform\s+(apply|destroy)\b", "Agent-driven infrastructure apply/destroy is prohibited."),
        (r"(^|[;&|]\s*)cdk\s+(deploy|destroy)\b", "Agent-driven infrastructure deployment is prohibited."),
        (r"(^|[;&|]\s*)aws\s+cloudformation\s+(deploy|delete-stack|create-stack|update-stack)\b", "Direct CloudFormation mutation is prohibited."),
        (r"(^|[;&|]\s*)supabase\s+db\s+(push|reset)\b", "Agent-driven database mutation is prohibited. Local reset should be human-invoked when intended."),
        (r"(^|[;&|]\s*)supabase\s+functions\s+deploy\b", "Agent-driven Supabase deployment is prohibited."),
        (r"(^|[;&|]\s*)kubectl\s+(apply|delete|replace|patch|scale)\b", "Agent-driven cluster mutation is prohibited."),
        (r"(^|[;&|]\s*)docker\s+system\s+prune\b", "Destructive Docker prune is prohibited."),
    ]

    for pattern, reason in denied:
        if re.search(pattern, command, flags=re.IGNORECASE):
            reply("deny", reason)
            return 0

    reply("allow", "Shell command passed the repository safety guard.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
