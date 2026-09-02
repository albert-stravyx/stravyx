# Agent model assignments — v33

Canonical model assignments are runtime/gateway agnostic. Do not edit runtime-specific agent frontmatter.

- Roles: 27 canonical definitions under `.agent/agents/`.
- Profiles: Auto (recommended), Economy, Balanced, Full Quality.
- Canonical assignments: `config/agent-model-assignments.json`.
- Model aliases/provider mapping: `config/model-registry.json`.
- Router: `scripts/model_router.py`.
- Routing policy: `config/automatic-profile-router.json`.
- Production registry validation: `./factory registry --check` and `./factory registry --live`.
- Runtime switching: `./factory runtime ...` / `./factory switch ...`.
- Gateway switching: `./factory gateway ...`.

Historical Cursor-specific quality/economy mappings were archived during the 2 Sep 2026 v33 migration under `archive/pre-v33-factory/`. They are not authoritative.
