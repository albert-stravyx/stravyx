"""Shared model-profile load, validate, and apply helpers."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Mapping, cast

from scripts.lib.errors import DiagnosticError

PROFILE_NAMES = ("quality", "economy")
NAME_PATTERN = re.compile(r"^name:\s*([A-Za-z0-9_-]+)\s*$", flags=re.MULTILINE)
MODEL_PATTERN = re.compile(r"^model:\s*(.+?)\s*$", flags=re.MULTILINE)
CURSOR_SLUG_PREFIXES = ("composer-", "cursor-grok-")
JUDGE_ROLES = (
    "architecture-challenger",
    "senior-frontend-reviewer",
    "senior-backend-reviewer",
    "senior-ai-reviewer",
    "security-reviewer",
    "ai-eval-analyst",
)
STABLE_PREAMBLE = (
    "Follow `.cursor/skills/other-model-judge/SKILL.md`.\n"
    "Read `.cursor/skills/other-model-judge/stable-prefix.md` then the packet path given below.\n"
    "Do not read AGENTS.md, PROJECT.md, or docs/ unless the packet lists a specific file.\n"
)


def models_path(root: Path) -> Path:
    return root / ".agent" / "models.json"


def agents_dir(root: Path) -> Path:
    return root / ".cursor" / "agents"


def load_config(root: Path) -> dict[str, object]:
    path = models_path(root)
    try:
        raw: object = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise DiagnosticError(
            "MODEL_CONFIG_MISSING",
            "Missing .agent/models.json",
            cause=str(exc),
            suggested_action="Restore the repository model configuration or rerun bootstrap.",
        ) from exc
    except json.JSONDecodeError as exc:
        raise DiagnosticError(
            "MODEL_CONFIG_INVALID_JSON",
            "Model configuration is not valid JSON.",
            cause=str(exc),
            context={"line": exc.lineno, "column": exc.colno},
            suggested_action="Fix the JSON syntax and rerun validation.",
        ) from exc
    if not isinstance(raw, dict):
        raise DiagnosticError(
            "MODEL_CONFIG_INVALID_SHAPE",
            "Model configuration must be a JSON object.",
            suggested_action="Restore .agent/models.json from the repository template.",
        )
    return cast(dict[str, object], raw)


def string_map(value: object, *, field: str) -> dict[str, str]:
    if not isinstance(value, dict) or not value:
        raise DiagnosticError(
            "MODEL_ASSIGNMENTS_MISSING",
            f"No agent model entries were defined under `{field}`.",
            suggested_action="Add agent -> model entries in .agent/models.json.",
        )
    return {str(key): str(item) for key, item in value.items()}


def read_agents(root: Path, directory: Path | None = None) -> dict[str, str]:
    configured: dict[str, str] = {}
    folder = directory if directory is not None else agents_dir(root)
    for path in sorted(folder.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        name_match = NAME_PATTERN.search(text)
        model_match = MODEL_PATTERN.search(text)
        if name_match is None or model_match is None:
            raise DiagnosticError(
                "MODEL_AGENT_FRONTMATTER_INCOMPLETE",
                f"Agent {path.name} must declare both name and model in YAML frontmatter.",
                context={"agent_file": str(path.relative_to(root))},
                suggested_action="Add the missing frontmatter and synchronise it with .agent/models.json.",
            )
        configured[name_match.group(1)] = model_match.group(1)
    return configured


def usage_pool(slug: str) -> str:
    if slug == "inherit":
        return "inherit"
    if slug.startswith(CURSOR_SLUG_PREFIXES):
        return "Cursor"
    return "Other"


def _require_profiles(config: Mapping[str, object]) -> dict[str, dict[str, str]]:
    raw = config.get("profiles")
    if not isinstance(raw, dict) or not raw:
        raise DiagnosticError(
            "MODEL_PROFILES_MISSING",
            "Model configuration must define `profiles` for quality and economy.",
            suggested_action="Add profiles.quality and profiles.economy in .agent/models.json.",
        )
    parsed: dict[str, dict[str, str]] = {}
    for name in PROFILE_NAMES:
        if name not in raw:
            raise DiagnosticError(
                "MODEL_PROFILE_MISSING",
                f"Missing required model profile `{name}`.",
                suggested_action=f"Add profiles.{name} with every agent assignment.",
            )
        parsed[name] = string_map(raw[name], field=f"profiles.{name}")
    extra = sorted(set(raw) - set(PROFILE_NAMES))
    if extra:
        raise DiagnosticError(
            "MODEL_PROFILE_UNKNOWN",
            "Unknown model profile keys are not allowed.",
            context={"unknown_profiles": extra},
            suggested_action="Keep only `quality` and `economy` under profiles.",
        )
    return parsed


def _require_active_profile(config: Mapping[str, object]) -> str:
    active = config.get("active_profile")
    if not isinstance(active, str) or active not in PROFILE_NAMES:
        raise DiagnosticError(
            "MODEL_ACTIVE_PROFILE_INVALID",
            "`active_profile` must be `quality` or `economy`.",
            context={"active_profile": active},
            suggested_action="Set active_profile via scripts/switch_model_profile.py.",
        )
    return active


def _assignment_mismatches(
    left: dict[str, str],
    right: dict[str, str],
) -> list[dict[str, str]]:
    names = sorted(set(left) | set(right))
    return [
        {"agent": name, "left": left.get(name, ""), "right": right.get(name, "")}
        for name in names
        if left.get(name) != right.get(name)
    ]


def validate_config(config: Mapping[str, object], configured: dict[str, str]) -> dict[str, str]:
    assignments = string_map(config.get("assignments"), field="assignments")
    profiles = _require_profiles(config)
    active = _require_active_profile(config)
    expected = profiles[active]
    profile_drift = _assignment_mismatches(assignments, expected)
    if profile_drift:
        raise DiagnosticError(
            "MODEL_PROFILE_ASSIGNMENT_DRIFT",
            "Live `assignments` do not match `profiles[active_profile]`.",
            context={"active_profile": active, "mismatches": profile_drift},
            suggested_action="Run scripts/switch_model_profile.py for the intended profile.",
        )
    _assert_profile_keys_match(profiles, configured)
    _assert_frontmatter_matches(assignments, configured)
    return assignments


def _assert_profile_keys_match(
    profiles: dict[str, dict[str, str]],
    configured: dict[str, str],
) -> None:
    agent_names = set(configured)
    for name, mapping in profiles.items():
        missing = sorted(agent_names - set(mapping))
        extra = sorted(set(mapping) - agent_names)
        if missing or extra:
            raise DiagnosticError(
                "MODEL_PROFILE_AGENT_MISMATCH",
                f"Profile `{name}` does not cover exactly the configured agents.",
                context={"missing": missing, "extra": extra},
                suggested_action="Give every agent exactly one slug in each profile.",
            )


def _assert_frontmatter_matches(assignments: dict[str, str], configured: dict[str, str]) -> None:
    missing_assignments = sorted(set(configured) - set(assignments))
    extra_assignments = sorted(set(assignments) - set(configured))
    mismatches = [
        {
            "agent": name,
            "configured": configured[name],
            "expected": assignments[name],
        }
        for name in sorted(set(configured) & set(assignments))
        if configured[name] != assignments[name]
    ]
    if missing_assignments or extra_assignments or mismatches:
        raise DiagnosticError(
            "MODEL_ASSIGNMENT_MISMATCH",
            "Cursor agent model assignments and .agent/models.json are not one-to-one.",
            context={
                "missing_assignments": missing_assignments,
                "extra_assignments": extra_assignments,
                "frontmatter_mismatches": mismatches,
            },
            suggested_action=(
                "Run scripts/switch_model_profile.py rather than editing agent frontmatter by hand."
            ),
        )


def rewrite_agent_model(path: Path, slug: str) -> None:
    text = path.read_text(encoding="utf-8")
    updated, count = MODEL_PATTERN.subn(f"model: {slug}", text, count=1)
    if count != 1:
        raise DiagnosticError(
            "MODEL_AGENT_FRONTMATTER_INCOMPLETE",
            f"Could not rewrite a single model line in {path.name}.",
            context={"agent_file": str(path)},
            suggested_action="Ensure the agent file has exactly one `model:` frontmatter field.",
        )
    path.write_text(updated, encoding="utf-8")


def apply_profile(root: Path, name: str, *, agent_directory: Path | None = None) -> dict[str, str]:
    if name not in PROFILE_NAMES:
        raise DiagnosticError(
            "MODEL_PROFILE_UNKNOWN",
            f"Unknown model profile `{name}`.",
            context={"requested": name, "allowed": list(PROFILE_NAMES)},
            suggested_action="Use `quality` or `economy`.",
        )
    config = load_config(root)
    profiles = _require_profiles(config)
    chosen = profiles[name]
    folder = agent_directory if agent_directory is not None else agents_dir(root)
    agent_files = _agent_files_for_profile(chosen, folder)
    for agent, slug in chosen.items():
        rewrite_agent_model(agent_files[agent], slug)
    config["active_profile"] = name
    config["assignments"] = dict(chosen)
    fallbacks = config.get("profile_fallbacks")
    if isinstance(fallbacks, dict) and name in fallbacks:
        config["fallback"] = dict(string_map(fallbacks[name], field=f"profile_fallbacks.{name}"))
    models_path(root).write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    configured = read_agents(root, folder)
    validate_config(load_config(root), configured)
    return chosen


def _agent_files_for_profile(chosen: dict[str, str], folder: Path) -> dict[str, Path]:
    by_name: dict[str, Path] = {}
    for path in sorted(folder.glob("*.md")):
        match = NAME_PATTERN.search(path.read_text(encoding="utf-8"))
        if match is None:
            raise DiagnosticError(
                "MODEL_AGENT_FRONTMATTER_INCOMPLETE",
                f"Agent {path.name} must declare name in YAML frontmatter.",
                context={"agent_file": path.name},
                suggested_action="Add the missing name frontmatter.",
            )
        by_name[match.group(1)] = path
    missing = sorted(set(chosen) - set(by_name))
    if missing:
        raise DiagnosticError(
            "MODEL_PROFILE_AGENT_MISMATCH",
            "Profile assignments reference agents that have no frontmatter file.",
            context={"missing": missing},
            suggested_action="Give every agent exactly one slug in each profile, matching .cursor/agents.",
        )
    return {agent: by_name[agent] for agent in chosen}


def format_assignment_table(assignments: dict[str, str]) -> str:
    lines = ["agent\tslug\tpool"]
    for agent, slug in sorted(assignments.items()):
        lines.append(f"{agent}\t{slug}\t{usage_pool(slug)}")
    return "\n".join(lines) + "\n"
