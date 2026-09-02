# Architecture boundary standard

Domain code should depend on stable domain abstractions, not HTTP frameworks, cloud SDKs, databases or AI providers. Presentation/UI modules should not access persistence directly when the approved architecture defines server/application boundaries. External systems are adapters behind explicit contracts.

`scripts/architecture_guard.py` enforces configured import boundaries. A boundary change requires the Program Design/ADR process; do not edit `.quality/policy.json` merely to make a violation disappear.
