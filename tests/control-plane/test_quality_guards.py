import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class QualityGuardSmokeTests(unittest.TestCase):
    def test_repository_quality_guard_runs(self) -> None:
        result = subprocess.run([sys.executable, "scripts/code_quality_guard.py"], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

    def test_architecture_guard_runs(self) -> None:
        result = subprocess.run([sys.executable, "scripts/architecture_guard.py"], cwd=ROOT, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)

if __name__ == "__main__":
    unittest.main()
