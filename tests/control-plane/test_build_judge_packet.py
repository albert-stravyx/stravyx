import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.lib.errors import DiagnosticError
from scripts.lib.judge_packet import (
    collect_working_tree_diff,
    filter_diff,
    in_allowed_paths,
    is_secret_path,
    parse_task_fields,
    render_packet,
    stable_preamble,
)
from scripts.lib.model_profiles import STABLE_PREAMBLE, JUDGE_ROLES


TASK_YAML = """
id: TASK-001
objective: >-
  Keep Network Price private from operators.
allowed_paths:
  - "packages/types/**"
  - "tests/contracts/**"
forbidden_paths:
  - ".github/workflows/**"
acceptance_criteria:
  - "Operators never see L2 cents"
approved_artifacts:
  product_brief: docs/DECISIONS.md
"""

DIFF = """diff --git a/packages/types/src/visibility.ts b/packages/types/src/visibility.ts
index 111..222 100644
--- a/packages/types/src/visibility.ts
+++ b/packages/types/src/visibility.ts
@@ -1,2 +1,3 @@
 export const ok = true
+export const extra = 1
diff --git a/.env.local b/.env.local
index 111..222 100644
--- a/.env.local
+++ b/.env.local
@@ -1 +1,2 @@
 SECRET=1
+SECRET=2
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 111..222 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -1 +1,2 @@
 name: ci
+on: push
"""


class JudgePacketTests(unittest.TestCase):
    def test_preamble_is_stable(self) -> None:
        self.assertEqual(stable_preamble(), STABLE_PREAMBLE)
        self.assertTrue(stable_preamble().startswith("Follow `.cursor/skills/other-model-judge/SKILL.md`."))

    def test_parse_task_fields(self) -> None:
        fields = parse_task_fields(TASK_YAML)
        self.assertEqual(fields["id"], "TASK-001")
        self.assertIn("Network Price", str(fields["objective"]))
        allowed = fields["allowed_paths"]
        self.assertIsInstance(allowed, list)
        self.assertIn("packages/types/**", allowed)

    def test_filter_keeps_allowed_and_drops_secrets(self) -> None:
        filtered = filter_diff(
            DIFF,
            ["packages/types/**", "tests/contracts/**"],
            [".github/workflows/**"],
        )
        self.assertIn("visibility.ts", filtered)
        self.assertNotIn(".env.local", filtered)
        self.assertNotIn("ci.yml", filtered)

    def test_secret_path_detection(self) -> None:
        self.assertTrue(is_secret_path("apps/app-web/.env.local"))
        self.assertFalse(in_allowed_paths(".env", ["**"], []))

    def test_unknown_role_fails(self) -> None:
        with self.assertRaises(DiagnosticError) as caught:
            render_packet(
                role="frontend-engineer",
                task_id="TASK-001",
                objective="x",
                acceptance=[],
                allowed=[],
                forbidden=[],
                artefacts="",
                diff_text="",
                tests_text="",
                notes_text="",
            )
        self.assertEqual(caught.exception.code, "JUDGE_ROLE_UNKNOWN")

    def test_cli_writes_packet_inside_allowed_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            task = root / "task.yaml"
            task.write_text(TASK_YAML, encoding="utf-8")
            diff_path = root / "sample.diff"
            diff_path.write_text(DIFF, encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    "scripts/build_judge_packet.py",
                    "--role",
                    "security-reviewer",
                    "--task",
                    str(task),
                    "--diff-file",
                    str(diff_path),
                    "--root",
                    str(root),
                    "--print-preamble",
                ],
                cwd=ROOT,
                text=True,
                capture_output=True,
            )
            self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
            self.assertTrue(result.stdout.startswith(STABLE_PREAMBLE))
            packet = root / ".agent" / "packets" / "TASK-001-security-reviewer.md"
            self.assertTrue(packet.is_file())
            body = packet.read_text(encoding="utf-8")
            self.assertIn("visibility.ts", body)
            self.assertNotIn("SECRET=2", body)
            self.assertIn("security-reviewer", JUDGE_ROLES)

    def test_collect_working_tree_diff_includes_untracked_files(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            env = {
                **os.environ,
                "GIT_AUTHOR_NAME": "packet-test",
                "GIT_AUTHOR_EMAIL": "packet-test@example.com",
                "GIT_COMMITTER_NAME": "packet-test",
                "GIT_COMMITTER_EMAIL": "packet-test@example.com",
            }
            subprocess.run(["git", "init"], cwd=root, check=True, capture_output=True)
            (root / "tracked.txt").write_text("one\n", encoding="utf-8")
            subprocess.run(["git", "add", "tracked.txt"], cwd=root, check=True, capture_output=True)
            subprocess.run(
                ["git", "-c", "commit.gpgsign=false", "commit", "-m", "init"],
                cwd=root,
                check=True,
                env=env,
                capture_output=True,
            )
            (root / "tracked.txt").write_text("two\n", encoding="utf-8")
            (root / "brand-new.ts").write_text("export const added = 1\n", encoding="utf-8")
            diff = collect_working_tree_diff(root)
            self.assertIn("tracked.txt", diff)
            self.assertIn("brand-new.ts", diff)
            self.assertIn("export const added = 1", diff)


if __name__ == "__main__":
    unittest.main()
