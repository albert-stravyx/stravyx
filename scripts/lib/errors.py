from __future__ import annotations

from dataclasses import dataclass, field
import json
import sys
from typing import Mapping, NoReturn

@dataclass(frozen=True, slots=True)
class DiagnosticError(Exception):
    code: str
    message: str
    cause: str | None = None
    context: Mapping[str, object] = field(default_factory=dict)
    suggested_action: str | None = None
    retryable: bool = False

    def __str__(self) -> str:
        return f"{self.code}: {self.message}"

    def as_dict(self) -> dict[str, object]:
        return {
            "error": {
                "code": self.code,
                "message": self.message,
                "cause": self.cause,
                "context": dict(self.context),
                "suggested_action": self.suggested_action,
                "retryable": self.retryable,
            }
        }

def fail(error: DiagnosticError, *, exit_code: int = 2) -> NoReturn:
    print(json.dumps(error.as_dict(), indent=2, default=str), file=sys.stderr)
    raise SystemExit(exit_code)
