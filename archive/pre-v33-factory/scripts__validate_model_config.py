#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.lib.errors import DiagnosticError, fail
from scripts.lib.model_profiles import load_config, read_agents, validate_config


def main() -> int:
    try:
        assignments = validate_config(load_config(ROOT), read_agents(ROOT))
    except DiagnosticError as error:
        fail(error)
    print(
        f"Model configuration validated for {len(assignments)} agents. "
        "Runtime availability must still be checked with Cursor `agent models`."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
