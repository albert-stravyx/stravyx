import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

class MetricsTests(unittest.TestCase):
    def test_report_from_synthetic_events(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "events.jsonl"
            events = [
                {"schema_version": 1, "timestamp": "2026-08-09T00:00:00+00:00", "event": "task_started", "task_id": "T1", "workflow": "standard"},
                {"schema_version": 1, "timestamp": "2026-08-09T00:01:00+00:00", "event": "agent_completed", "task_id": "T1", "agent": "backend", "model": "model-a", "input_tokens": 100, "output_tokens": 50, "estimated_cost_usd": 0.1},
                {"schema_version": 1, "timestamp": "2026-08-09T00:02:00+00:00", "event": "review_finding", "task_id": "T1", "severity": "HIGH", "accepted": True},
                {"schema_version": 1, "timestamp": "2026-08-09T00:05:00+00:00", "event": "task_completed", "task_id": "T1"},
            ]
            path.write_text("".join(json.dumps(event) + "\n" for event in events), encoding="utf-8")
            result = subprocess.run([sys.executable, "scripts/metrics.py", "report", "--file", str(path), "--json"], cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
            report = json.loads(result.stdout)
            self.assertEqual(report["tasks_completed"], 1)
            self.assertEqual(report["median_recorded_tokens_per_task"], 150)
            self.assertEqual(report["review_finding_precision"], 1.0)
            self.assertEqual(report["median_cycle_minutes"], 5.0)

    def test_record_preserves_unknown_usage_instead_of_estimating(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "events.jsonl"
            result = subprocess.run([sys.executable, "scripts/metrics.py", "record", "agent_completed", "T2", "--agent", "test-engineer", "--model", "model-b", "--file", str(path)], cwd=ROOT, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, msg=result.stdout + result.stderr)
            event = json.loads(path.read_text(encoding="utf-8"))
            self.assertNotIn("input_tokens", event)
            self.assertNotIn("estimated_cost_usd", event)

if __name__ == "__main__":
    unittest.main()
