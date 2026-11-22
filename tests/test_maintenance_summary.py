import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class MaintenanceSummaryTests(unittest.TestCase):
    def test_workflow_entry_preserves_only_pending_urls_and_statuses(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            reports = {
                "maintenance-output/daily-report.json": {
                    "reportType": "source_research", "proposals": [{"id": "example"}],
                    "summary": {"sourcesChecked": 2, "successfulChecks": 1, "failedChecks": 1,
                                "researchQueueSize": 1}},
                "discovery-output/review.json": {
                    "version": 1, "summary": {"visits": 3, "approved": 1, "deferred": 2}},
                "discovery-output/intake-result.json": [{"action": "independent_admission_requested"}],
                "discovery-state/state.json": {"urls": {
                    status: {"url": f"https://example.org/{status}", "status": status, "reasons": ["extra detail"]}
                    for status in ("blocked", "unavailable", "broker_review", "submitted", "canonical")}},
            }
            for name, data in reports.items():
                file = root / name
                file.parent.mkdir(exist_ok=True)
                file.write_text(json.dumps(data), encoding="utf-8")
            run = [sys.executable, str(ROOT / "scripts/maintenance_summary.py")]
            env = dict(os.environ, GITHUB_STEP_SUMMARY=str(root / "summary.md"))
            subprocess.run(run, cwd=root, env=env, check=True)
            self.assertIn("| Onderzoekssignalen in het rapport | 1 |", (root / "summary.md").read_text(encoding="utf-8"))
            queue = json.loads((root / "discovery-output/research-queue.json").read_text(encoding="utf-8"))
            self.assertEqual(queue, [{"url": f"https://example.org/{status}", "status": status}
                                     for status in ("blocked", "unavailable", "broker_review")])
            (root / "discovery-output/intake-result.json").write_text("[]", encoding="utf-8")
            result = subprocess.run(run, cwd=root, env=env, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Incomplete discovery intake", result.stderr)
