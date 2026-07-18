import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from maintenance_core import classify
from maintenance_normalize import FetchResult, fold, normalize_html
from maintenance_proposals import active_proposals, proposals_for_event
from maintenance_validation import enrich, validate
from maintenance_reporting import build_daily_report, proposal_markdown


class DailyMaintenanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads((ROOT / "config/maintenance.json").read_text(encoding="utf-8"))
        cls.pages = json.loads((ROOT / "tests/fixtures/maintenance/pages.json").read_text(encoding="utf-8"))

    def setUp(self):
        self.source = {"id": "source-test", "name": "Test", "owner": "Test",
                       "baseUrl": "https://example.test/aanbod", "sourceRole": "primary",
                       "trustLevel": "official", "organizationId": "org-test",
                       "allowedRecordTypes": ["training"]}

    def result(self, page, status=200, final="https://example.test/aanbod"):
        return FetchResult(True, status, final, self.pages[page])

    def baseline(self):
        event, state = classify(self.source, {}, self.result("base"), self.config)
        self.assertEqual("NEW", event["type"])
        return state

    def test_01_new_listing_creates_add_proposal(self):
        state = self.baseline()
        event, _ = classify(self.source, state, self.result("new_item"), self.config)
        proposals = proposals_for_event(self.source, event, [], self.config)
        self.assertTrue(any(p["action"] == "add" for p in proposals))

    def test_02_material_change_updates_matching_record(self):
        state = self.baseline()
        event, _ = classify(self.source, state, self.result("new_item"), self.config)
        records = [{"id": "training-ai", "title": "Training AI-geletterdheid",
                    "sourceUrls": [{"label": "Official", "url": "https://example.test/training",
                                    "sourceType": "official"}]}]
        proposals = proposals_for_event(self.source, event, records, self.config)
        self.assertTrue(any(p["action"] == "update" and p["target"] == "training-ai" for p in proposals))

    def test_03_formatting_only_is_ignored(self):
        state = self.baseline()
        event, _ = classify(self.source, state, self.result("same_cosmetic"), self.config)
        self.assertEqual("NO_CHANGE", event["type"])

    def test_04_deadline_change_has_high_priority_proposal(self):
        state = self.baseline()
        event, _ = classify(self.source, state, self.result("deadline_changed"), self.config)
        proposals = proposals_for_event(self.source, event, [], self.config)
        self.assertTrue(event["deadlineChanged"])
        self.assertIn("Deadline", proposals[0]["title"])
        enriched = enrich(proposals[0])
        self.assertIsNone(enriched["targetRecordId"])
        self.assertTrue(enriched["oldValues"]["deadlineFacts"])
        self.assertTrue(enriched["proposedValues"]["deadlineFacts"])

    def test_05_temporary_unreachable_preserves_snapshot(self):
        state = self.baseline()
        event, after = classify(self.source, state, FetchResult(False, 0, self.source["baseUrl"], error="timeout"), self.config)
        self.assertEqual("UNREACHABLE", event["type"])
        self.assertFalse(event["actionable"])
        self.assertEqual(state["snapshot"], after["snapshot"])

    def test_06_repeated_404_becomes_removed(self):
        state = self.baseline()
        for expected in ("UNREACHABLE", "UNREACHABLE", "REMOVED"):
            event, state = classify(self.source, state, FetchResult(False, 404, self.source["baseUrl"], error="HTTP 404"), self.config)
            self.assertEqual(expected, event["type"])

    def test_06b_removed_link_requires_two_successful_confirmations(self):
        state = self.baseline()
        first, state = classify(self.source, state, self.result("link_removed"), self.config)
        self.assertEqual("NO_CHANGE", first["type"])
        second, _ = classify(self.source, state, self.result("link_removed"), self.config)
        self.assertEqual("CHANGED", second["type"])
        self.assertEqual("https://example.test/handreiking", second["removedUnits"][0]["url"])

    def test_07_layout_collapse_is_source_changed(self):
        state = self.baseline()
        event, after = classify(self.source, state, self.result("collapsed"), self.config)
        self.assertEqual("SOURCE_CHANGED", event["type"])
        self.assertEqual(state["snapshot"], after["snapshot"])
        self.assertEqual(1, after["consecutiveStructuralFailures"])

    def test_08_possible_duplicate_is_reported(self):
        state = self.baseline()
        event, _ = classify(self.source, state, self.result("new_item"), self.config)
        records = [{"id": "existing", "title": "Training AI-geletterdheid", "sourceUrls": []}]
        proposals = proposals_for_event(self.source, event, records, self.config)
        duplicate = next(p for p in proposals if p["possibleDuplicates"])
        self.assertEqual("existing", duplicate["possibleDuplicates"][0]["id"])

    def test_09_discovery_source_cannot_support_add(self):
        state = self.baseline()
        event, _ = classify(self.source, state, self.result("new_item"), self.config)
        discovery = dict(self.source, sourceRole="discovery")
        proposals = proposals_for_event(discovery, event, [], self.config)
        self.assertTrue(proposals)
        self.assertTrue(all(p["action"] != "add" for p in proposals))
        ambiguous = dict(self.source, sourceRole="primary", allowedRecordTypes=["training", "guidance"])
        ambiguous_proposals = proposals_for_event(ambiguous, event, [], self.config)
        self.assertTrue(all(p["action"] != "add" for p in ambiguous_proposals))

    def test_10_invalid_enum_is_rejected(self):
        proposal = {"id": "p", "action": "add", "target": "x", "detectedAt": "2026-01-01T00:00:00Z",
                    "reason": "test", "confidence": "low", "source": {"sourceId": "source-test",
                    "sourceUrl": "https://example.test", "sourceRole": "primary"}, "evidenceHash": "x",
                    "possibleDuplicates": [], "suggestedRecord": {"recordType": "invented", "status": "available",
                    "verificationStatus": "needs_review", "sourceUrls": ["https://example.test"]}}
        with self.assertRaises(ValueError):
            validate(enrich(proposal))

    def test_11_identical_run_is_no_change(self):
        state = self.baseline()
        event, _ = classify(self.source, state, self.result("base"), self.config)
        self.assertEqual("NO_CHANGE", event["type"])

    def test_12_existing_proposal_is_updated_not_duplicated(self):
        item = {"id": "proposal-1", "evidenceHash": "evidence", "detectedAt": "2026-01-01T00:00:00Z"}
        first, ledger = active_proposals([dict(item)], {"decisions": []}, {})
        second, ledger = active_proposals([dict(item)], {"decisions": []}, ledger)
        self.assertEqual(1, len(second))
        self.assertEqual(2, second[0]["occurrences"])
        self.assertEqual(1, len(ledger))

    def test_12b_repeated_failure_keeps_same_proposal_id(self):
        base = {"type": "UNREACHABLE", "sourceId": self.source["id"],
                "detectedAt": "2026-01-01T00:00:00Z", "reason": "timeout", "actionable": True}
        first = proposals_for_event(self.source, dict(base, failureCount=3), [], self.config)[0]
        second = proposals_for_event(self.source, dict(base, failureCount=4), [], self.config)[0]
        self.assertEqual(first["id"], second["id"])
        self.assertEqual(4, second["evidence"]["failureCount"])

    def test_13_rejected_unchanged_proposal_is_suppressed(self):
        item = {"id": "proposal-1", "evidenceHash": "same", "detectedAt": "2026-01-01T00:00:00Z"}
        decisions = {"decisions": [{"proposalId": "proposal-1", "evidenceHash": "same", "decision": "rejected"}]}
        active, _ = active_proposals([item], decisions, {})
        self.assertEqual([], active)

    def test_normalization_filters_irrelevant_links_and_repairs_text(self):
        html = "<main><p>AI en onderwijs</p><a href='/ai'>AI handreiking</a><a href='/contact'>Contact</a></main>"
        snapshot = normalize_html(html, "https://example.test", self.config)
        self.assertEqual(["https://example.test/ai"], [item["url"] for item in snapshot["units"]])
        self.assertEqual("\u2018onderwijs\u2019", fold("\u00e2\u20ac\u02dconderwijs\u00e2\u20ac\u2122"))

    def test_source_registry_has_operational_fields(self):
        sources = json.loads((ROOT / "data/sources.json").read_text(encoding="utf-8"))
        required = {"id", "name", "owner", "baseUrl", "sourceType", "sourceRole", "trustLevel", "themes", "sectors",
                    "schedule", "extraction", "allowedRecordTypes", "operational"}
        self.assertTrue(sources)
        self.assertTrue(all(required <= source.keys() for source in sources))

    def test_proposal_has_machine_and_human_report_paths(self):
        event = {"type": "UNREACHABLE", "sourceId": self.source["id"],
                 "detectedAt": "2026-01-01T00:00:00Z", "reason": "timeout",
                 "failureCount": 3, "actionable": True}
        proposal = proposals_for_event(self.source, event, [], self.config)[0]
        enrich(proposal)
        report = build_daily_report([event], [proposal])
        self.assertTrue(report["proposalLinks"][0]["jsonPath"].endswith(".json"))
        self.assertTrue(report["proposalLinks"][0]["markdownPath"].endswith(".md"))
        self.assertIn("Menselijke beoordeling", proposal_markdown(proposal))

    def test_report_says_no_action_needed(self):
        report = build_daily_report([{"type": "NO_CHANGE", "detectedAt": "2026-01-01T00:00:00Z"}], [])
        self.assertFalse(report["summary"]["actionRequired"])


if __name__ == "__main__":
    unittest.main()
