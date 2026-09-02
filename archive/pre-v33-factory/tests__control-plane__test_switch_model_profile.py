import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.lib.errors import DiagnosticError
from scripts.lib.model_profiles import apply_profile, load_config, read_agents, validate_config


def _write_agent(directory: Path, name: str, slug: str) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / f"{name}.md").write_text(
        f"---\nname: {name}\nmodel: {slug}\n---\n# {name}\n",
        encoding="utf-8",
    )


def _parse_show_output(stdout: str) -> tuple[str, dict[str, str]]:
    lines = stdout.strip().splitlines()
    if not lines or not lines[0].startswith("active_profile: "):
        raise ValueError(f"unexpected --show header: {stdout!r}")
    active = lines[0].removeprefix("active_profile: ")
    assignments: dict[str, str] = {}
    in_table = False
    for line in lines[1:]:
        if line.startswith("autonomous-orchestrator:"):
            continue
        if line == "agent\tslug\tpool":
            in_table = True
            continue
        if in_table:
            parts = line.split("\t")
            if len(parts) < 2:
                raise ValueError(f"malformed assignment row: {line!r}")
            assignments[parts[0]] = parts[1]
    if not in_table:
        raise ValueError(f"missing assignment table in --show output: {stdout!r}")
    return active, assignments


def _fixture(tmp: Path, *, active: str = "quality") -> Path:
    quality = {"alpha": "claude-fable-5-thinking-high", "beta": "composer-2.5-fast"}
    economy = {"alpha": "cursor-grok-4.6-high", "beta": "composer-2.5-fast"}
    config = {
        "active_profile": active,
        "profiles": {"quality": quality, "economy": economy},
        "profile_fallbacks": {
            "quality": {"high_uncertainty": "inherit"},
            "economy": {"high_uncertainty": "cursor-grok-4.6-high"},
        },
        "fallback": {"high_uncertainty": "inherit"},
        "assignments": dict(quality if active == "quality" else economy),
    }
    (tmp / ".agent").mkdir(parents=True)
    (tmp / ".agent" / "models.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    agents = tmp / "agents"
    live = quality if active == "quality" else economy
    for name, slug in live.items():
        _write_agent(agents, name, slug)
    return tmp


class SwitchModelProfileTests(unittest.TestCase):
    def test_quality_economy_quality_round_trip(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _fixture(Path(tmp))
            original = json.loads((root / ".agent" / "models.json").read_text(encoding="utf-8"))
            apply_profile(root, "economy", agent_directory=root / "agents")
            after_economy = load_config(root)
            self.assertEqual(after_economy["active_profile"], "economy")
            self.assertEqual(read_agents(root, root / "agents")["alpha"], "cursor-grok-4.6-high")
            self.assertEqual(
                after_economy["fallback"],
                {"high_uncertainty": "cursor-grok-4.6-high"},
            )
            apply_profile(root, "quality", agent_directory=root / "agents")
            restored = load_config(root)
            self.assertEqual(restored["active_profile"], "quality")
            self.assertEqual(read_agents(root, root / "agents"), original["assignments"])
            self.assertEqual(restored["assignments"], original["assignments"])
            self.assertEqual(restored["fallback"], original["fallback"])

    def test_unknown_profile_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _fixture(Path(tmp))
            with self.assertRaises(DiagnosticError) as caught:
                apply_profile(root, "turbo", agent_directory=root / "agents")
            self.assertEqual(caught.exception.code, "MODEL_PROFILE_UNKNOWN")

    def test_cli_unknown_profile_exits_nonzero(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _fixture(Path(tmp))
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/switch_model_profile.py",
                    "turbo",
                    "--root",
                    str(root),
                    "--agents-dir",
                    str(root / "agents"),
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("MODEL_PROFILE_UNKNOWN", result.stderr)

    def test_cli_show_prints_active_profile(self) -> None:
        config = load_config(ROOT)
        profiles = config["profiles"]
        if not isinstance(profiles, dict):
            self.fail("models.json profiles must be an object")
        active_expected = str(config["active_profile"])
        self.assertIn(active_expected, profiles)
        profile_raw = profiles[active_expected]
        if not isinstance(profile_raw, dict):
            self.fail(f"profiles[{active_expected}] must be an object")
        profile_assignments = {str(k): str(v) for k, v in profile_raw.items()}

        result = subprocess.run(
            [sys.executable, "scripts/switch_model_profile.py", "--show"],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
        active_reported, assignments_reported = _parse_show_output(result.stdout)
        self.assertEqual(active_reported, active_expected)
        self.assertEqual(assignments_reported, profile_assignments)

    def test_cli_show_with_profile_name_does_not_rewrite(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _fixture(Path(tmp))
            before = (root / ".agent" / "models.json").read_text(encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/switch_model_profile.py",
                    "--show",
                    "economy",
                    "--root",
                    str(root),
                    "--agents-dir",
                    str(root / "agents"),
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
            self.assertIn("active_profile: quality", result.stdout)
            self.assertEqual((root / ".agent" / "models.json").read_text(encoding="utf-8"), before)
            self.assertEqual(read_agents(root, root / "agents")["alpha"], "claude-fable-5-thinking-high")

    def test_apply_profile_missing_agent_leaves_json_untouched(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _fixture(Path(tmp))
            config = load_config(root)
            profiles = config["profiles"]
            if not isinstance(profiles, dict):
                self.fail("fixture profiles must be an object")
            economy = profiles["economy"]
            if not isinstance(economy, dict):
                self.fail("fixture economy profile must be an object")
            economy["ghost"] = "composer-2.5-fast"
            (root / ".agent" / "models.json").write_text(
                json.dumps(config, indent=2) + "\n", encoding="utf-8"
            )
            with self.assertRaises(DiagnosticError) as caught:
                apply_profile(root, "economy", agent_directory=root / "agents")
            self.assertEqual(caught.exception.code, "MODEL_PROFILE_AGENT_MISMATCH")
            self.assertEqual(read_agents(root, root / "agents")["alpha"], "claude-fable-5-thinking-high")
            after = load_config(root)
            self.assertEqual(after["active_profile"], "quality")
            self.assertNotIn("ghost", after["assignments"] if isinstance(after["assignments"], dict) else {})

    def test_validator_rejects_assignment_drift(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = _fixture(Path(tmp))
            config = load_config(root)
            raw_assignments = config["assignments"]
            if not isinstance(raw_assignments, dict):
                self.fail("fixture assignments must be an object")
            assignments = {str(key): str(value) for key, value in raw_assignments.items()}
            assignments["alpha"] = "gpt-5.3-codex"
            config["assignments"] = assignments
            (root / ".agent" / "models.json").write_text(
                json.dumps(config, indent=2) + "\n", encoding="utf-8"
            )
            with self.assertRaises(DiagnosticError) as caught:
                validate_config(load_config(root), read_agents(root, root / "agents"))
            self.assertEqual(caught.exception.code, "MODEL_PROFILE_ASSIGNMENT_DRIFT")


class SwitchModelProfileRepoCopyTests(unittest.TestCase):
    def test_real_roster_round_trip_on_copy(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            shutil.copytree(ROOT / ".agent", dest / ".agent")
            shutil.copytree(ROOT / ".cursor" / "agents", dest / "agents")
            apply_profile(dest, "economy", agent_directory=dest / "agents")
            self.assertEqual(load_config(dest)["active_profile"], "economy")
            self.assertEqual(
                read_agents(dest, dest / "agents")["autonomous-orchestrator"],
                "cursor-grok-4.6-high",
            )
            apply_profile(dest, "quality", agent_directory=dest / "agents")
            self.assertEqual(load_config(dest)["active_profile"], "quality")
            self.assertEqual(
                read_agents(dest, dest / "agents")["autonomous-orchestrator"],
                "claude-fable-5-thinking-high",
            )


if __name__ == "__main__":
    unittest.main()
