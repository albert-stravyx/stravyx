# Quality governance

## Why this exists

AI-assisted implementation can create locally working code by weakening types, adding arbitrary defaults, swallowing failures or inventing new patterns. This repository treats those shortcuts as quality failures rather than successful remediation.

## Quality hierarchy

1. Approved product/architecture/program-design decisions.
2. Compiler and strict type system.
3. Repository architecture boundaries and coding standards.
4. Static analysis/lint and machine anti-slop guard.
5. Unit/integration/E2E/eval evidence.
6. Independent cross-model senior review.
7. Human understanding of critical paths before delivery.

A lower layer may not be weakened to make a higher layer green.

## Nullable values

`null`/`None` are permitted only when absence is a deliberate state in the domain contract. They are not generic substitutes for exceptions, dependency failures, validation failures or incomplete implementation. Prefer an explicit result union for expected alternatives and a typed diagnostic for unexpected failure.

## Defaults

Defaults such as zero, empty string, empty collection or empty object require a documented domain/application default. They must not be invented because upstream data is missing.

## Waivers

`.quality/exceptions.json` is a last-resort, auditable exception mechanism. Every exception requires: stable id, exact rule, narrow path/line when possible, task id, reason, owner and `review_by` date. Expired waivers fail the guard. A reviewer must verify the exception; an implementation agent may not approve its own waiver.

## Pattern changes

A cross-cutting new abstraction or convention returns the task to Program Design. Agents do not silently introduce a new repository pattern during remediation.

## Required commands

```bash
python scripts/code_quality_guard.py
python scripts/architecture_guard.py
python scripts/quality_check.py
```

The aggregate runner stops on a required failure and reports the gate, command, captured output and a suggested troubleshooting action.
