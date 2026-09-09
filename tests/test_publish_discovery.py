import hashlib
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from publish_discovery import BOT, MARKER, apply_outcomes, issue_metadata, marker, publish, url_key, validated_candidates


class FakeAPI:
    def __init__(self, issues=None):
        self.issues = issues or []
        self.created = []
        self.dispatched = []

    def request(self, method, path, data=None, **kwargs):
        if path.startswith("issues?"):
            return self.issues
        if method == "GET" and path.startswith("labels/"):
            return {"name": "atlas-discovery"}
        if method == "POST" and path == "issues":
            issue = {**data, "number": 75, "state": "open", "user": {"login": BOT}}
            self.created.append(issue)
            return issue
        raise AssertionError((method, path))

    def dispatch(self, workflow, inputs):
        self.dispatched.append((workflow, inputs))


class DiscoveryBrokerTests(unittest.TestCase):
    def candidate(self):
        return {"url": "https://www.kennisnet.nl/ai/toolkit", "title": "Toolkit voor AI-onderwijs",
                "body": "### Titel\nToolkit voor AI-onderwijs\n\n### Functie van het aanbod\n" + "Bronzin. " * 20,
                "evidenceHash": hashlib.sha256(b"source").hexdigest(), "autoPublishEligible": True}

    def document(self, item):
        return {"version": 1, "approved": [item]}

    def existing(self, item, **kwargs):
        return {"number": 71, "state": "open", "user": {"login": BOT},
                "body": item["body"] + "\n\n" + marker(issue_metadata(item), MARKER), **kwargs}

    def test_new_candidate_requests_independent_intake_without_merge(self):
        api = FakeAPI()
        publish(api, self.document(self.candidate()))
        self.assertEqual(len(api.created), 1)
        self.assertEqual(api.dispatched, [("process-atlas-submission.yml", {"issue_number": "75"})])

    def test_cache_loss_reuses_existing_bot_issue(self):
        item = self.candidate()
        api = FakeAPI([self.existing(item)])
        publish(api, self.document(item))
        self.assertFalse(api.created)
        self.assertEqual(api.dispatched[0][1], {"issue_number": "71"})

    def test_closed_or_modified_issue_is_never_reopened_or_overwritten(self):
        item = self.candidate()
        for issue in [self.existing(item, state="closed"),
                      self.existing(item, body=self.existing(item)["body"] + "\nEdited")]:
            with self.subTest(issue=issue):
                api = FakeAPI([issue])
                publish(api, self.document(item))
                self.assertFalse(api.created)
                self.assertFalse(api.dispatched)

    def test_failed_admission_private_url_and_oversized_batch_are_rejected(self):
        for changes in [{"autoPublishEligible": False}, {"url": "https://127.0.0.1/toolkit"},
                        {"evidenceHash": "invented"}]:
            item = {**self.candidate(), **changes}
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validated_candidates(self.document(item))
        with self.assertRaises(ValueError):
            validated_candidates({"version": 1, "approved": [self.candidate()] * 4})

    def test_empty_run_makes_no_api_requests(self):
        self.assertEqual(publish(None, {"version": 1, "approved": []}), [])

    def test_closed_issue_is_recorded_as_terminal_discovery_state(self):
        item = self.candidate()
        api = FakeAPI([self.existing(item, state="closed")])
        state = {"urls": {url_key(item["url"]): {"status": "approved"}}}
        updated = apply_outcomes(state, publish(api, self.document(item)))
        self.assertEqual(updated["urls"][url_key(item["url"])]["status"], "handled")

    def test_redirect_feedback_updates_original_discovery_key(self):
        item = {**self.candidate(), "discoveryKey": "https://kennisnet.nl/old-toolkit"}
        api = FakeAPI([self.existing(item, state="closed")])
        state = {"urls": {item["discoveryKey"]: {"status": "approved"}}}
        updated = apply_outcomes(state, publish(api, self.document(item)))
        self.assertEqual(updated["urls"][item["discoveryKey"]]["status"], "handled")


if __name__ == "__main__":
    unittest.main()
