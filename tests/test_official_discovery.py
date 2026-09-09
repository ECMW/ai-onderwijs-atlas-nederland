"""Discovery safety and integration with the unchanged issue intake, without network."""
import copy
import io
import json
import os
import sys
import unittest
from contextlib import redirect_stdout
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import contribution_quality as quality
import discover_official_content as discovery
import import_issue_submission as importer


URL = "https://www.kennisnet.nl/handreiking-ai-mbo/"
SOURCE = {"id": "kennisnet-ai", "owner": "Kennisnet", "baseUrl": "https://www.kennisnet.nl/",
          "enabled": True, "sourceType": "official", "sourceRole": "primary", "trustLevel": "official",
          "allowedRecordTypes": ["guidance", "training", "product"]}
NOW = datetime(2026, 9, 9, 10, tzinfo=timezone.utc)
SENTENCE = "Deze handreiking van Kennisnet ondersteunt docenten in het mbo bij AI-geletterdheid en verantwoord lesgeven."


def html(sentence=SENTENCE, title="Handreiking AI-geletterdheid", extra=""):
    return (f"<html><head><title>{title} | Kennisnet</title></head><body><main>"
            f"<h1>{title}</h1><p>{sentence}</p>{extra}</main></body></html>")


def page(sentence=SENTENCE, title="Handreiking AI-geletterdheid", extra="", url=URL):
    return discovery.page_from_html(url, html(sentence, title, extra))


def snapshots(urls=(URL,), content_hash="snapshot-one"):
    return {SOURCE["id"]: {"snapshot": {"contentHash": content_hash,
             "units": [{"url": url, "label": "AI in onderwijs"} for url in urls]}}}


def source_check(document):
    return quality.SourceCheck(document.url, True, 200, document.final_url, "text/html", document.title,
                               quality.normalize(document.title + " " + document.body), body_text=document.body)


def intake_runner(document):
    """Execute production importer.main; only its network response is replaced."""
    def run(command, env, **kwargs):
        assert not any("TOKEN" in key or "SECRET" in key for key in env)
        assert "atlas-discovery-admission-" in command[command.index("--records") + 1]
        with patch.dict(os.environ, env, clear=True), patch.object(sys, "argv", command[1:]), \
             patch.object(importer, "review_external_submission", side_effect=lambda base, candidate, sources:
                          quality.review_external_submission(base, candidate, sources,
                                                             source_loader=lambda url: source_check(document))), \
             redirect_stdout(io.StringIO()):
            result = importer.main()
        return SimpleNamespace(returncode=result)
    return run


class OfficialDiscoveryTests(unittest.TestCase):
    def run_discovery(self, document=None, previous=None, source_snapshots=None, events=None,
                      records=None, max_visits=12, max_approved=3, at=NOW):
        document = document or page()
        return discovery.discover(
            records or [], [SOURCE], snapshots() if source_snapshots is None else source_snapshots,
            events or [], previous or {}, root=ROOT, at=at, max_visits=max_visits, max_approved=max_approved,
            fetcher=lambda url: document,
            admitter=lambda proposal, base, sources, root: discovery.admit_form(
                proposal, base, sources, root, runner=intake_runner(document)),
        )

    def test_real_intake_accepts_literal_evidence_and_keeps_unknowns(self):
        records = []
        approved, review, state = self.run_discovery(records=records)
        self.assertEqual(len(approved["approved"]), 1)
        result = approved["approved"][0]
        fields = importer.parse_form(result["body"])
        self.assertEqual(fields["Feitelijke beschrijving"], SENTENCE)
        self.assertEqual(fields["Sector"], "MBO")
        self.assertEqual(fields["Doelgroep"], "Docenten")
        self.assertEqual(fields["Kosten"], "Onbekend")
        self.assertEqual(fields["Commerciële aard"], "Niet vastgesteld")
        self.assertEqual(fields["Geografische reikwijdte"], "Onbekend")
        self.assertNotIn("Publicatiedatum", result["body"])
        self.assertRegex(result["evidenceHash"], r"^[a-f0-9]{64}$")
        self.assertTrue(result["autoPublishEligible"])
        self.assertEqual(review["summary"]["visits"], 2)
        self.assertEqual(records, [])
        self.assertNotIn("body", state["urls"][discovery.url_key(URL)])

    def test_navigation_and_url_are_not_evidence(self):
        document = discovery.page_from_html(URL + "?mbo=ai", "<title>Handreiking AI Kennisnet</title>"
                    "<nav><h1>Handreiking AI-geletterdheid</h1><p>" + SENTENCE + "</p></nav>"
                    "<main><h1>Welkom op de website</h1><p>Dit is een algemene pagina.</p></main>")
        proposal, reasons = discovery.form_from_page(document, SOURCE)
        self.assertIsNone(proposal)
        self.assertTrue(reasons)

    def test_ambiguous_or_missing_main_title_is_review(self):
        for markup in ("<h1>Handreiking AI</h1><p>" + SENTENCE + "</p>",
                       html(extra="<h1>Nog een titel</h1>")):
            with self.subTest(markup=markup):
                self.assertIsNone(discovery.form_from_page(discovery.page_from_html(URL, markup), SOURCE)[0])

    def test_missing_or_foreign_provider_is_not_inferred_from_domain(self):
        for sentence in (SENTENCE.replace(" van Kennisnet", ""), SENTENCE.replace("van Kennisnet", "van Microsoft"),
                         "Deze handreiking van Microsoft ondersteunt docenten in het mbo bij AI-geletterdheid, besproken door Kennisnet."):
            document = page(sentence, extra="<p>Kennisnet publiceert ook nieuws.</p>")
            self.assertIsNone(discovery.form_from_page(document, SOURCE)[0])

    def test_missing_sector_audience_or_theme_is_review(self):
        for sentence in (SENTENCE.replace(" in het mbo", ""), SENTENCE.replace("docenten", "lezers"),
                         "Deze handreiking van Kennisnet beschrijft AI voor docenten in het mbo."):
            with self.subTest(sentence=sentence):
                self.assertIsNone(discovery.form_from_page(page(sentence), SOURCE)[0])

    def test_audience_and_sector_as_subject_are_not_target_users(self):
        for sentence in (
            "Deze handreiking van Kennisnet beschrijft AI-geletterdheid van docenten in het mbo.",
            "Deze handreiking van Kennisnet ondersteunt docenten bij AI-geletterdheid en bespreekt onderwijs in het mbo.",
        ):
            self.assertIsNone(discovery.form_from_page(page(sentence), SOURCE)[0])

    def test_negation_unavailability_and_marketing_are_never_trimmed(self):
        for sentence in (SENTENCE.replace("ondersteunt", "ondersteunt niet"),
                         SENTENCE.replace("ondersteunt", "garandeert"),
                         SENTENCE.replace("handreiking", "beste handreiking")):
            self.assertIsNone(discovery.form_from_page(page(sentence), SOURCE)[0])
        for extra in ("Deze handreiking is niet voor het mbo.", "De handreiking is niet meer beschikbaar.",
                      "De handreiking is in ontwikkeling."):
            self.assertIsNone(discovery.form_from_page(page(extra=f"<p>{extra}</p>"), SOURCE)[0])

    def test_unavailability_late_in_main_body_blocks_stale_intro(self):
        extra = "<p>" + "Achtergrondinformatie. " * 150 + "</p><p>Dit materiaal is niet meer beschikbaar.</p>"
        self.assertIsNone(discovery.form_from_page(page(extra=extra), SOURCE)[0])

    def test_long_sentence_is_review_not_a_partial_quote(self):
        sentence = SENTENCE[:-1] + " en bij het zorgvuldig evalueren van verschillende toepassingen in lessen met collega's uit andere teams."
        self.assertGreater(len(sentence.split()), 25)
        self.assertIsNone(discovery.form_from_page(page(sentence), SOURCE)[0])

    def test_same_origin_required_for_candidates_and_redirects(self):
        for target in ("https://kennisnet.nl.evil.example/test", "https://sub.kennisnet.nl/test", "http://www.kennisnet.nl/test"):
            output, review, state = self.run_discovery(source_snapshots=snapshots((target,)))
            self.assertEqual(output["approved"], [])
            self.assertEqual(review["summary"]["visits"], 0)
        redirected = page()
        redirected.final_url = "https://other.example/handreiking"
        self.assertIsNone(discovery.form_from_page(redirected, SOURCE)[0])

    def test_training_requires_available_self_study_not_event(self):
        sentence = "Deze cursus van Kennisnet ondersteunt docenten in het mbo bij AI-geletterdheid en lesontwerp."
        self.assertIsNone(discovery.form_from_page(page(sentence, "Cursus AI-geletterdheid"), SOURCE)[0])
        proposal, reasons = discovery.form_from_page(page(sentence, "Cursus AI-geletterdheid",
                                             "<p>Deze zelfstudie is direct beschikbaar.</p>"), SOURCE)
        self.assertIsNotNone(proposal)
        self.assertIn("### Recordtype\n\nTraining", proposal["body"])

    def test_snapshot_baseline_discovers_and_canonical_dedupes(self):
        output, _, _ = self.run_discovery()
        self.assertEqual(len(output["approved"]), 1)
        canonical = [{"id": "old", "sourceUrls": [{"url": URL.replace("www.", "") + "?utm_source=old"}]}]
        output, review, _ = self.run_discovery(records=canonical)
        self.assertEqual(output["approved"], [])
        self.assertEqual(review["summary"]["visits"], 0)

    def test_added_units_are_scanned_without_new_snapshot_unit(self):
        output, _, _ = self.run_discovery(source_snapshots=snapshots(()), events=[
            {"sourceId": SOURCE["id"], "addedUnits": [{"url": URL}]}])
        self.assertEqual(len(output["approved"]), 1)

    def test_visit_and_approval_budgets_keep_deferred_work(self):
        urls = [URL + str(n) for n in range(10)]
        def run(max_visits=12, max_approved=3):
            return discovery.discover([], [SOURCE], snapshots(urls), [], {}, at=NOW, root=ROOT,
                max_visits=max_visits, max_approved=max_approved,
                fetcher=lambda url: page(title="Handreiking AI-geletterdheid " + url[-1], url=url),
                admitter=lambda proposal, base, sources, root: discovery.admit_form(proposal, base, sources, root,
                    runner=intake_runner(page(title=proposal["title"], url=proposal["url"]))))
        output, review, state = run(max_visits=4)
        self.assertEqual(review["summary"]["visits"], 4)
        self.assertLessEqual(len(output["approved"]), 2)
        self.assertEqual(len(review["deferredCandidates"]), 8)
        self.assertTrue(any(s["status"] == "pending" for s in state["urls"].values()))
        output, review, state = run(max_approved=1)
        self.assertEqual(len(output["approved"]), 1)
        self.assertEqual(review["summary"]["visits"], 2)

    def test_pending_approved_is_rechecked_for_broker_retry(self):
        _, _, previous = self.run_discovery()
        output, review, _ = self.run_discovery(previous=previous, at=NOW + timedelta(hours=4))
        self.assertEqual(len(output["approved"]), 1)
        self.assertEqual(review["summary"]["visits"], 2)

    def test_handled_or_edited_issue_never_reapproves_unchanged_evidence(self):
        for status in ("handled", "broker_review"):
            _, _, previous = self.run_discovery()
            prior = previous["urls"][discovery.url_key(URL)]
            prior.update(status=status, issueNumber=100, nextCheck=discovery.stamp(NOW + timedelta(days=7)))
            output, review, new_state = self.run_discovery(previous=previous, at=NOW + timedelta(days=8))
            self.assertEqual(output["approved"], [])
            self.assertEqual(review["summary"]["visits"], 1)
            self.assertEqual(new_state["urls"][discovery.url_key(URL)]["status"], status)
            self.assertEqual(new_state["urls"][discovery.url_key(URL)]["issueNumber"], 100)

    def test_batch_dedupes_different_urls_for_same_offer(self):
        output, review, state = self.run_discovery(source_snapshots=snapshots((URL, URL+"?duplicate=1")))
        self.assertEqual(len(output["approved"]), 1)
        self.assertEqual(review["summary"]["visits"], 3)
        self.assertIn("Dezelfde titel", review["blockedCandidates"][0]["reasons"][0])

    def test_broker_closed_slots_and_redirect_feedback_do_not_starve_new_offer(self):
        from publish_discovery import apply_outcomes
        redirected = page()
        redirected.final_url = URL.replace("handreiking-ai-mbo", "nieuwe-handreiking-ai-mbo")
        approved, _, previous = self.run_discovery(redirected)
        proposal = approved["approved"][0]
        self.assertEqual(proposal["discoveryKey"], discovery.url_key(URL))
        previous = apply_outcomes(previous, [{"url": proposal["url"], "discoveryKey": proposal["discoveryKey"],
                                   "issue": 100, "action": "already_handled"}])
        self.assertEqual(previous["urls"][discovery.url_key(URL)]["status"], "handled")
        new_url = URL + "new"
        new_page = page(title="Handreiking AI-geletterdheid vervolg", url=new_url)
        output, review, _ = self.run_discovery(new_page, previous=previous,
            source_snapshots=snapshots((URL, new_url)), max_visits=2, at=NOW+timedelta(hours=4))
        self.assertEqual(len(output["approved"]), 1)
        self.assertEqual(output["approved"][0]["url"], new_url)

    def test_handled_changed_source_is_reconsidered_only_when_due(self):
        _, _, previous = self.run_discovery()
        previous["urls"][discovery.url_key(URL)].update(status="handled", nextCheck=discovery.stamp(NOW + timedelta(days=7)))
        changed = page(SENTENCE.replace("verantwoord", "bewust"))
        output, review, _ = self.run_discovery(changed, previous=previous, source_snapshots=snapshots(content_hash="new"), at=NOW+timedelta(hours=4))
        self.assertEqual(review["summary"]["visits"], 0)
        output, review, _ = self.run_discovery(changed, previous=previous, at=NOW+timedelta(days=8))
        self.assertEqual(len(output["approved"]), 1)

    def test_changed_snapshot_retries_blocked_without_losing_reason(self):
        _, _, previous = self.run_discovery(page(SENTENCE.replace(" in het mbo", "")))
        output, review, _ = self.run_discovery(previous=previous, at=NOW+timedelta(hours=4))
        self.assertEqual(review["summary"]["visits"], 0)
        self.assertTrue(review["skipped"][0]["reasons"])
        output, review, _ = self.run_discovery(previous=previous, source_snapshots=snapshots(content_hash="new"), at=NOW+timedelta(hours=4))
        self.assertEqual(len(output["approved"]), 1)

    def test_source_changes_between_discovery_and_intake_block_approval(self):
        proposal, _ = discovery.form_from_page(page(), SOURCE)
        report = discovery.admit_form(proposal, [], [SOURCE], ROOT,
                                     runner=intake_runner(page(extra="<p>Nieuwe informatie.</p>")))
        self.assertTrue(report["eligible"])
        self.assertFalse(report["unchangedEvidence"])

    def test_source_failure_is_reported_and_retried_later(self):
        def failed(url):raise TimeoutError("timeout")
        output, review, state = discovery.discover([], [SOURCE], snapshots(), [], {}, at=NOW, fetcher=failed)
        self.assertEqual(output["approved"], [])
        self.assertEqual(review["blockedCandidates"][0]["status"], "unavailable")
        self.assertEqual(state["urls"][discovery.url_key(URL)]["nextCheck"], discovery.stamp(NOW+timedelta(hours=1)))

    def test_initial_listing_budget_is_two_and_navigation_links_ignored(self):
        listing = discovery.page_from_html(SOURCE["baseUrl"], '<nav><a href="/bad">AI handreiking</a></nav>'
                    '<main><a href="/new">AI handreiking</a></main>')
        output, review, state = discovery.discover([], [SOURCE], {}, [], {}, at=NOW, max_visits=2, fetcher=lambda url: listing)
        self.assertEqual(review["summary"]["visits"], 1)
        self.assertEqual(len(review["deferredCandidates"]), 1)
        self.assertTrue(review["deferredCandidates"][0]["url"].endswith("/new"))

    def test_safe_fetch_rejects_private_and_truncated_content(self):
        with self.assertRaises(ValueError):discovery.safe_fetch_public_url("https://127.0.0.1/test")
        response = SimpleNamespace(geturl=lambda: URL, headers=SimpleNamespace(
            get_content_type=lambda: "text/html", get_content_charset=lambda: "utf-8"),
            read=lambda count: b"x" * (discovery.MAX_BYTES+1))
        from unittest.mock import MagicMock
        context = MagicMock();context.__enter__.return_value = response
        opener = SimpleNamespace(open=lambda *args, **kwargs: context)
        with patch.object(discovery.urllib.request, "build_opener", return_value=opener):
            with self.assertRaisesRegex(ValueError, "extractielimiet"):discovery.safe_fetch_public_url(URL)


if __name__ == "__main__":
    unittest.main()
