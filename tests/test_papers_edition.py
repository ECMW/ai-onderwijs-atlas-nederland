import hashlib
import json
from datetime import date
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import update_papers as edition


DAY = date(2026, 11, 22)
JOURNALS = [{"name": name, "url": f"https://example.org/{name}"} for name in ("A", "B")]


def row(journal="A", slug="example", published="2026-11-19"):
    doi = "10.1007/" + slug
    return {"id": doi, "title": "A paper", "authors": ["First Author"], "source": journal,
            "publicationType": "journal-article", "published": published, "url": "https://doi.org/" + doi}


def snapshot(papers, a="2026-11-20", b="2026-11-20"):
    return {"checkedAt": max(a, b), "sources": [
        {**JOURNALS[0], "checkedAt": a}, {**JOURNALS[1], "checkedAt": b}], "papers": papers}


class CommittedPapersTests(unittest.TestCase):
    def test_seed_rebuilds_without_network_and_identifies_all_followed_sources(self):
        path = Path(__file__).resolve().parents[1] / "data" / "papers.json"
        seed = json.loads(path.read_text(encoding="utf-8"))
        day = date.fromisoformat(seed["checkedAt"])
        normalized, _ = edition.build_edition(seed, None, day, False)
        self.assertEqual(seed, normalized)
        self.assertEqual({s["name"] for s in seed["sources"]}, {s["name"] for s in edition.PAPER_SOURCES})


class PapersEditionTests(unittest.TestCase):
    def setUp(self):
        self.sources = patch.object(edition, "PAPER_SOURCES", JOURNALS)
        self.sources.start()
        self.addCleanup(self.sources.stop)

    def test_partial_failure_preserves_last_good_rows_and_dates_per_journal(self):
        base = snapshot([row(), row("B", "older")])
        def fetch(source, today):
            if source["name"] == "B":
                raise OSError("offline")
            return [row(slug="latest", published="2026-11-22"), row()]
        result, checked = edition.build_edition(base, None, DAY, True, fetch)
        self.assertEqual(checked, 1)
        self.assertEqual([p["id"] for p in result["papers"]], ["10.1007/latest", "10.1007/older", "10.1007/example"])
        self.assertEqual([s["checkedAt"] for s in result["sources"]], ["2026-11-22", "2026-11-20"])

    def test_unavailable_or_malformed_sources_cannot_overwrite_newer_live_edition(self):
        seed = snapshot([row()])
        live = snapshot([row(slug="newer"), row("B", "older")], "2026-11-21", "2026-11-21")
        def invalid(source, today):
            return [row(source["name"], published="2027-01-01")]
        kept, checked = edition.build_edition(seed, live, DAY, True, invalid)
        self.assertEqual(checked, 0)
        self.assertEqual(kept["checkedAt"], "2026-11-21")
        self.assertEqual({p["id"] for p in kept["papers"]}, {p["id"] for p in live["papers"]})
        self.assertEqual(kept, edition.build_edition(seed, live, DAY, False)[0])

    def test_duplicate_identifier_sorted_once_limit_and_valid_no_new_matches(self):
        def fetch(source, today):
            if source["name"] == "B":
                return []
            return [row(slug=f"test{i:02d}", published=f"2026-11-{i:02d}") for i in range(1, 23)] + [row(slug="test20")]
        built, successes = edition.build_edition(None, None, DAY, True, fetch)
        self.assertEqual(successes, 2)
        self.assertEqual(len(built["papers"]), edition.LIMIT)
        self.assertEqual(built["papers"][0]["published"], "2026-11-22")
        self.assertEqual(len({p["id"] for p in built["papers"]}), edition.LIMIT)

    def test_untrusted_links_precision_and_missing_authors_are_rejected(self):
        for change in ({"url": "https://example.com/text"}, {"published": "2026-11"},
                       {"authors": []}, {"publicationType": "guessed"}, {"source": "other"}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                edition.paper_row({**row(), **change}, "A", DAY)

    def test_confirmed_empty_window_removes_expired_or_withdrawn_papers(self):
        base = snapshot([row()])
        built, count = edition.build_edition(base, None, DAY, True, lambda *_: [])
        self.assertEqual(count, 2)
        self.assertEqual(built["papers"], [])
        self.assertEqual(built["checkedAt"], DAY.isoformat())

    def test_reviewed_summary_correction_reaches_an_existing_live_edition(self):
        live = snapshot([{**row(), "summary": "Oud."}])
        with patch.dict(edition.SUMMARIES, {"10.1007/example": "Herziene duiding."}):
            result, checked = edition.build_edition(None, live, DAY, False)
        self.assertEqual(result["papers"][0]["summary"], "Herziene duiding.")
        self.assertEqual(checked, 0)

    def test_published_release_bytes_must_match_the_marker(self):
        payload = json.dumps(snapshot([row()])).encode()
        marker = {"sourceSha": "a" * 40, "papersSha256": hashlib.sha256(payload).hexdigest()}
        def read(url):
            return json.dumps(marker).encode() if "/release.json?" in url else payload
        self.assertEqual(edition.current_edition(read), json.loads(payload))
        marker["papersSha256"] = "b" * 64
        with patch.object(edition, "sleep"), self.assertRaisesRegex(ValueError, "differ"):
            edition.current_edition(read)
        del marker["papersSha256"]
        self.assertIsNone(edition.current_edition(read))
