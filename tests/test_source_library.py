import json
from datetime import date
from pathlib import Path
import subprocess
import tempfile
import unittest

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from source_library import source_library_issues


class SourceLibraryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "sources").mkdir()
        (self.root / "data").mkdir()
        self.record = {
            "id": "example-record",
            "title": "Voorbeeld",
            "description": "Controleerbare beschrijving",
            "recordType": "guidance",
            "status": "available",
            "verificationStatus": "verified",
            "lastVerified": "2026-09-28",
            "sourceUrls": [{"sourceType": "official", "url": "https://example.org/item"}],
            "relatedIds": [],
            "parentIds": [],
            "childIds": [],
        }
        self.source = {
            "source_id": "official-example",
            "title": "Official example",
            "author_or_organisation": "Example authority",
            "publication_date": "2026-09-01",
            "url_or_doi": "https://example.org/report",
            "source_type": "official_guidance",
            "primary_or_secondary": "primary",
            "topics": ["Beleid en governance"],
            "jurisdiction": "Nederland",
            "claims_supported": ["De publicatie bevat officiële guidance."],
            "reliability_notes": "Uitgegeven door de bevoegde organisatie.",
            "limitations": "Niet-bindende guidance; geen effectstudie.",
            "legal_effect": "non_binding",
            "peer_review_status": "not_applicable",
            "last_verified": "2026-09-28",
            "status": "active",
            "atlas_record_ids": ["example-record"],
        }
        self.claim = {
            "claim_id": "example-claim",
            "location": {
                "path": "data/records.json",
                "record_id": "example-record",
                "field": "description",
            },
            "claim": "De beschrijving is als officiële guidance onderbouwd.",
            "claim_kind": "source_statement",
            "evidence_status": "SUPPORTED_WITH_LIMITS",
            "source_ids": ["official-example"],
            "assessment": "De bron ondersteunt de aard, maar niet de effectiviteit.",
            "last_reviewed": "2026-09-28",
            "time_sensitive": False,
            "review_by": None,
        }
        self.write_fixture([self.source], [self.claim])

    def write_fixture(self, sources, claims):
        (self.root / "data" / "records.json").write_text(
            json.dumps([self.record]), encoding="utf-8"
        )
        (self.root / "sources" / "sources.json").write_text(json.dumps({
            "schema_version": "1.0",
            "last_reviewed": "2026-09-28",
            "verification_window_days": 90,
            "sources": sources,
        }), encoding="utf-8")
        (self.root / "sources" / "claim-links.json").write_text(json.dumps({
            "schema_version": "1.0",
            "last_reviewed": "2026-09-28",
            "claims": claims,
        }), encoding="utf-8")

    def validate(self):
        return source_library_issues(self.root, today=date(2026, 9, 28))

    def test_valid_library_and_claim_links_pass(self):
        errors, warnings = self.validate()
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_duplicate_source_identifiers_and_urls_fail(self):
        duplicate = {**self.source}
        self.write_fixture([self.source, duplicate], [self.claim])
        errors, _ = self.validate()
        self.assertTrue(any("Duplicate source_id" in error for error in errors))
        self.assertTrue(any("Duplicate canonical source URL" in error for error in errors))

    def test_orphan_source_and_record_links_fail(self):
        broken_source = {**self.source, "atlas_record_ids": ["missing-record"]}
        broken_claim = {**self.claim, "source_ids": ["missing-source"]}
        self.write_fixture([broken_source], [broken_claim])
        errors, _ = self.validate()
        self.assertTrue(any("unknown record ID" in error for error in errors))
        self.assertTrue(any("unknown source ID" in error for error in errors))

    def test_evidence_gap_can_remain_without_an_invented_source(self):
        gap = {
            **self.claim,
            "evidence_status": "EVIDENCE_GAP",
            "source_ids": [],
            "assessment": "Geen voldoende specifieke bron gevonden.",
        }
        self.write_fixture([self.source], [gap])
        errors, _ = self.validate()
        self.assertEqual(errors, [])

    def test_preprint_must_be_explicit(self):
        preprint = {
            **self.source,
            "source_type": "preprint",
            "peer_review_status": "peer_reviewed",
        }
        self.write_fixture([preprint], [self.claim])
        errors, _ = self.validate()
        self.assertTrue(any("preprint must be marked" in error for error in errors))

    def test_current_claim_cannot_rely_on_superseded_source(self):
        superseded = {
            **self.source,
            "status": "superseded",
            "superseded_by": "replacement-source",
        }
        replacement = {
            **self.source,
            "source_id": "replacement-source",
            "url_or_doi": "https://example.org/replacement",
        }
        self.write_fixture([superseded, replacement], [self.claim])
        errors, _ = self.validate()
        self.assertTrue(any("only rely on active sources" in error for error in errors))

    def test_superseded_source_chain_must_end_at_active_source_without_cycle(self):
        first = {
            **self.source,
            "status": "superseded",
            "superseded_by": "second-source",
        }
        second = {
            **self.source,
            "source_id": "second-source",
            "url_or_doi": "https://example.org/second",
            "status": "superseded",
            "superseded_by": "official-example",
        }
        self.write_fixture([first, second], [self.claim])
        errors, _ = self.validate()
        self.assertTrue(any("contains a cycle" in error for error in errors))

    def test_record_claim_requires_precise_record_and_field(self):
        imprecise = {
            **self.claim,
            "location": {"path": "data/records.json"},
        }
        self.write_fixture([self.source], [imprecise])
        errors, _ = self.validate()
        self.assertTrue(any("record_id and field are required" in error for error in errors))

    def test_malformed_optional_identifiers_report_errors_without_crashing(self):
        superseded = {
            **self.source,
            "status": "superseded",
            "superseded_by": ["replacement-source"],
        }
        malformed_claim = {
            **self.claim,
            "location": {
                "path": "data/records.json",
                "record_id": ["example-record"],
                "field": {"name": "description"},
            },
        }
        self.write_fixture([superseded], [malformed_claim])
        errors, _ = self.validate()
        self.assertTrue(any("superseded_by as a source ID" in error for error in errors))
        self.assertTrue(any("record_id and field are required" in error for error in errors))

    def test_full_dates_are_strict_and_publication_dates_cannot_be_future(self):
        malformed = {**self.source, "last_verified": "20260928", "publication_date": "2027"}
        self.write_fixture([malformed], [self.claim])
        errors, _ = self.validate()
        self.assertTrue(any("last_verified" in error for error in errors))
        self.assertTrue(any("publication_date: date cannot be in the future" in error for error in errors))

    def test_source_locator_must_be_public_https_and_specific_doi(self):
        invalid_urls = [
            "https://localhost/report",
            "https://127.0.0.1/report",
            "https://exa mple.org/report",
            "https://doi.org/",
            "https://doi.org/10.",
            "https://example.org:8443/report",
            "https://[bad]/report",
        ]
        for url in invalid_urls:
            with self.subTest(url=url):
                invalid = {**self.source, "url_or_doi": url}
                self.write_fixture([invalid], [self.claim])
                errors, _ = self.validate()
                self.assertTrue(any("public HTTPS URL" in error for error in errors))

    def test_overdue_verification_is_visible_as_warning(self):
        old = {**self.source, "last_verified": "2026-01-01"}
        self.write_fixture([old], [self.claim])
        errors, warnings = self.validate()
        self.assertEqual(errors, [])
        self.assertEqual(warnings[0]["kind"], "source_verification_overdue")

    def test_repository_library_passes_current_validator(self):
        errors, warnings = source_library_issues(ROOT, today=date(2026, 9, 28))
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_validate_sources_cli_reports_warnings_and_enforces_overdue_flag(self):
        old = {**self.source, "last_verified": "2026-01-01"}
        self.write_fixture([old], [self.claim])
        report = self.root / "source-report.json"
        command = [
            sys.executable,
            str(ROOT / "scripts" / "validate_sources.py"),
            "--root", str(self.root),
            "--output", str(report),
        ]
        result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8")
        payload = json.loads(report.read_text(encoding="utf-8"))
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(payload["warnings"][0]["kind"], "source_verification_overdue")
        result = subprocess.run(
            command + ["--fail-on-overdue"],
            capture_output=True, text=True, encoding="utf-8",
        )
        self.assertNotEqual(result.returncode, 0)

    def test_validate_data_cli_fails_when_source_library_is_invalid(self):
        broken_claim = {**self.claim, "source_ids": ["missing-source"]}
        self.write_fixture([self.source], [broken_claim])
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "validate_data.py"), "--root", str(self.root)],
            capture_output=True, text=True, encoding="utf-8",
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("unknown source ID", result.stdout)


if __name__ == "__main__":
    unittest.main()
