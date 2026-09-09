"""Exercise the release gate against the failures that made the Atlas empty."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from public_assets import versioned_html


class ReleaseQualityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "data").mkdir()
        self.records = [{
            "id": "example", "title": "AI-geletterdheid", "description": "Gecontroleerde uitleg",
            "recordType": "guidance", "legacyType": "Handreiking",
            "verificationStatus": "verified", "lastVerified": "2026-09-09",
            "sourceUrls": [{"sourceType": "official", "url": "https://example.org/ai"}],
        }]
        self.html = '<script src="data/data-v2.js"></script>'
        self.write_data(self.records)

    def write_data(self, records, public=None):
        public = records if public is None else public
        meta = {"recordCount": len(public), "updated": "2026-09-09"}
        (self.root / "data/records.json").write_text(json.dumps(records), encoding="utf-8")
        (self.root / "data/metadata.json").write_text(json.dumps(meta), encoding="utf-8")
        (self.root / "data/data-v2.js").write_text(
            "window.ATLAS_RECORDS=" + json.dumps({"metadata": meta, "records": public}) + ";\n",
            encoding="utf-8",
        )
        self.version_index()

    def version_index(self):
        (self.root / "index.html").write_text(versioned_html(self.root, self.html), encoding="utf-8")

    def gate(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts/quality_gate.py"), "--root", str(self.root),
             "--strict", "--output", str(self.root / "report.json")],
            capture_output=True, text=True, encoding="utf-8",
        )
        return result, json.loads((self.root / "report.json").read_text())

    def test_healthy_projection_can_be_published(self):
        result, report = self.gate()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(report["passed"])

    def test_empty_catalogue_cannot_be_published_even_with_matching_counts(self):
        self.write_data([])
        result, report = self.gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Public catalogue must not be empty", report["errors"])

    def test_offer_categories_reject_quality_labels_and_malformed_values(self):
        for category in ["safe", "recommended", [], {}, ""]:
            with self.subTest(category=category):
                self.write_data([{**self.records[0], "offerCategory": category}])
                result, report = self.gate()
                self.assertNotEqual(result.returncode, 0)
                self.assertTrue(any("offerCategory" in error for error in report["errors"]))
        for category in ["software", "materials", "knowledge"]:
            with self.subTest(category=category):
                self.write_data([{**self.records[0], "offerCategory": category}])
                result, report = self.gate()
                self.assertEqual(result.returncode, 0, report)

    def test_matching_ids_do_not_hide_changed_public_content(self):
        self.write_data(self.records, [{**self.records[0], "title": "Unverified replacement"}])
        result, report = self.gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Public record contents differ from the canonical projection", report["errors"])

    def test_valid_utf8_with_latin1_corruption_is_rejected(self):
        self.records[0]["description"] = "creëert".encode("utf-8").decode("latin1")
        self.write_data(self.records)
        result, report = self.gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(any("encoding corruption" in error for error in report["errors"]))

    def test_data_change_requires_a_new_browser_cache_version(self):
        old_index = (self.root / "index.html").read_text()
        self.records[0]["title"] = "Nieuwe titel"
        self.write_data(self.records)
        self.assertNotEqual(old_index, (self.root / "index.html").read_text())
        (self.root / "index.html").write_text(old_index)
        result, report = self.gate()
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(any("versions are stale" in error for error in report["errors"]))

    def test_cache_versions_are_identical_on_windows_and_linux(self):
        script = self.root / "data/data-v2.js"
        version = versioned_html(self.root, self.html)
        script.write_bytes(script.read_text(encoding="utf-8").encode("utf-8").replace(b"\n", b"\r\n"))
        self.assertEqual(versioned_html(self.root, self.html), version)

    def test_invalid_utf8_is_blocked(self):
        (self.root / "data/records.json").write_bytes(b"\x94broken")
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts/quality_gate.py"), "--root", str(self.root), "--strict"],
            capture_output=True, text=True,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("UnicodeDecodeError", result.stderr)
