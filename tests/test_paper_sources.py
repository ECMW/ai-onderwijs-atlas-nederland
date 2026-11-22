"""Public publisher fixtures for the bounded discovery of recent AI research."""
import json
import sys
import unittest
from datetime import date
from html import escape
from pathlib import Path
from unittest.mock import patch
from xml.etree.ElementTree import ParseError

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import paper_sources as papers


TODAY = date(2026, 11, 22)
SOURCE = papers.PAPER_SOURCES[0]
DOI = "10.1007/s11423-026-10749-1"
TITLE = "A GPT-based exam assistant in higher education"


def item(doi=DOI, title=TITLE, day="2026-11-21"):
    return (f"<item><title>{escape(title)}</title><pubDate>{day}</pubDate><guid>{escape(doi)}</guid>"
            "<link>https://unrelated.invalid/instruction</link></item>")


def feed(*items):
    return ("<rss><channel>" + "".join(items) + "</channel></rss>").encode()


def article(doi=DOI, title=TITLE, online="2026/11/20", kind="OriginalPaper",
            authors=("Frosch, Katharina", "Lindauer, Friederike", "Winkel, Carmen"), journal=SOURCE["name"]):
    fields = [("dc.type", kind), ("citation_title", title), ("citation_online_date", online),
              ("citation_publication_date", "2026/12/10"), ("citation_doi", doi),
              ("citation_journal_title", journal), ("citation_language", "en")]
    fields += [("citation_author", author) for author in authors]
    html = "".join(f'<meta name="{name}" content="{escape(value, quote=True)}">' for name, value in fields)
    return f"<html><head>{html}</head><body>Irrelevant article text</body></html>".encode()


class PaperSourcesTests(unittest.TestCase):
    def test_open_access_requires_free_cc_licensed_main_article_with_matching_doi(self):
        entity = {"@type": "ScholarlyArticle", "sameAs": "https://doi.org/" + DOI,
                  "license": "http://creativecommons.org/licenses/by-nc-nd/4.0/",
                  "isAccessibleForFree": True}
        def schema(main_entity, page_type="WebPage"):
            body = json.dumps({"@type": page_type, "mainEntity": main_entity})
            return f'<script type="application/ld+json">{body}</script>'
        cases = [
            (schema(entity), True),
            (schema(dict(entity, sameAs="https://doi.org/10.1007/other")), False),
            (schema(dict(entity, license="https://example.org/claims-open")), False),
            (schema(dict(entity, isAccessibleForFree=False)), False),
            (schema(dict(entity, isAccessibleForFree="true")), False),
            (schema({k:v for k,v in entity.items() if k != "license"}), False),
            (schema(entity, "Advertisement"), False),
            ('<a data-test="open-access" href="https://creativecommons.org/licenses/by/4.0/">Open access</a>', False),
            ('<script type="application/ld+json">not-json</script>', False),
        ]
        for markup, open_access in cases:
            with self.subTest(markup=markup), patch.object(
                papers, "_fetch", side_effect=[feed(item()), article().replace(b"</head>", markup.encode() + b"</head>")]
            ):
                result, = papers.get_papers(SOURCE, TODAY)
            self.assertEqual(result.get("access"), "open" if open_access else None)

    def test_first_online_date_authors_doi_and_reviewed_summary(self):
        with patch.object(papers, "_fetch", side_effect=[feed(item()), article()]) as fetch:
            result, = papers.get_papers(SOURCE, TODAY)
        self.assertEqual(result["published"], "2026-11-20")
        self.assertEqual(result["id"], DOI)
        self.assertEqual(result["url"], "https://doi.org/" + DOI)
        self.assertEqual(result["authors"], ["Katharina Frosch", "Friederike Lindauer", "Carmen Winkel"])
        self.assertEqual(result["risAuthors"], ["Frosch, Katharina", "Lindauer, Friederike", "Winkel, Carmen"])
        self.assertEqual(result["source"], SOURCE["name"])
        self.assertEqual(result["publicationType"], "peer-reviewed")
        self.assertEqual(result["language"], "en")
        self.assertIn("Moodle", result["summary"])
        self.assertEqual(fetch.call_args_list[-1].args, ("https://link.springer.com/article/" + DOI,))

    def test_empty_healthy_result_on_current_non_ai_title(self):
        with patch.object(papers, "_fetch", return_value=feed(item(title="Paired learning in the classroom"))) as fetch:
            self.assertEqual(papers.get_papers(SOURCE, TODAY), [])
        self.assertEqual(fetch.call_count, 1)

    def test_broken_empty_and_stale_feeds_are_not_successful_empty_results(self):
        for data in (b"<html>bad", feed(), feed(item(day="2026-09-23")), feed(item(day="2026-11")),
                     feed(item(day="2026-11-23"))):
            with self.subTest(data=data), patch.object(papers, "_fetch", return_value=data):
                with self.assertRaises((ValueError, ParseError)):
                    papers.get_papers(SOURCE, TODAY)

    def test_verified_date_window_includes_sixtieth_day_but_no_future_or_old_publications(self):
        for day, expected in (("2026/09/24", 1), ("2026/09/23", 0), ("2026/11/22", 1), ("2026/11/23", 0)):
            with self.subTest(day=day), patch.object(papers, "_fetch", side_effect=[feed(item()), article(online=day)]):
                self.assertEqual(len(papers.get_papers(SOURCE, TODAY)), expected)

    def test_undated_or_unverifiable_candidate_is_an_error_when_none_pass(self):
        for data in (article(online="2026/11"), article(authors=()), article(doi="10.1007/s11423-other"),
                     article(journal="Different Journal"), article(kind=""), b"<html>Check your browser</html>"):
            with self.subTest(data=data), patch.object(papers, "_fetch", side_effect=[feed(item()), data]):
                with self.assertRaises(ValueError):
                    papers.get_papers(SOURCE, TODAY)

    def test_editorials_and_mismatched_title_topics_are_not_research(self):
        for data in (article(kind="Editorial"), article(kind="Correction"),
                     article(title="Student collaboration in the classroom")):
            with self.subTest(data=data), patch.object(papers, "_fetch", side_effect=[feed(item()), data]):
                self.assertEqual(papers.get_papers(SOURCE, TODAY), [])

    def test_bad_source_or_foreign_identifier_cannot_choose_network_destination(self):
        with patch.object(papers, "_fetch") as fetch:
            with self.assertRaises(ValueError):
                papers.get_papers(dict(SOURCE, journal="untrusted.invalid"), TODAY)
            fetch.assert_not_called()
        with patch.object(papers, "_fetch", return_value=feed(item(doi="https://untrusted.invalid/"))) as fetch:
            with self.assertRaises(ValueError):
                papers.get_papers(SOURCE, TODAY)
            self.assertEqual(fetch.call_count, 1)

    def test_duplicate_items_and_one_broken_article_leave_one_verified_result(self):
        other = "10.1007/s11423-026-98765-x"
        with patch.object(papers, "_fetch", side_effect=[feed(item(), item(), item(doi=other)), article(), OSError("unavailable")]) as fetch:
            result = papers.get_papers(SOURCE, TODAY)
        self.assertEqual([x["id"] for x in result], [DOI])
        self.assertEqual(fetch.call_count, 3)

    def test_results_stay_bounded_and_unreviewed_text_is_not_a_summary(self):
        identifiers = [f"10.1007/s11423-026-9000{i}" for i in range(9)]
        def publisher(url, **kwargs):
            if "search.rss" in url:
                return feed(*(item(doi) for doi in identifiers))
            return article(doi=url.split("article/")[1], kind="ReviewPaper")
        with patch.object(papers, "_fetch", side_effect=publisher) as fetch:
            result = papers.get_papers(SOURCE, TODAY)
        self.assertEqual(len(result), papers.MAX_PER_SOURCE)
        self.assertEqual(fetch.call_count, 1 + papers.MAX_PER_SOURCE)
        self.assertTrue(all("summary" not in record for record in result))

    def test_slow_publisher_keeps_only_already_verified_articles(self):
        second = "10.1007/s11423-026-00002"
        with patch.object(papers, "_fetch", side_effect=[feed(item(), item(second)), article()]) as fetch:
            with patch.object(papers, "monotonic", side_effect=[0, 40, 46]):
                result = papers.get_papers(SOURCE, TODAY)
            self.assertEqual([x["id"] for x in result], [DOI])
            self.assertEqual(fetch.call_args.kwargs["timeout"], 5)
        with patch.object(papers, "_fetch", return_value=feed(item())):
            with patch.object(papers, "monotonic", side_effect=[0, 46]):
                with self.assertRaises(TimeoutError):
                    papers.get_papers(SOURCE, TODAY)


class WileyPaperTests(unittest.TestCase):
    source = papers.PAPER_SOURCES[-1]

    def work(self, **overrides):
        record = {"DOI": "10.1111/BJET.70100", "type": "journal-article",
                  "title": ["A study of <scp>AI</scp> in the classroom"],
                  "author": [{"given": "First", "family": "Author"}, {"name": "Research Group"}],
                  "container-title": [self.source["name"]], "published-online": {"date-parts": [[2026, 11, 13]]}}
        return dict(record, **overrides)

    def result(self, *works):
        raw = json.dumps({"status": "ok", "message-type": "work-list", "message": {"items": works}}).encode()
        with patch.object(papers, "_fetch", return_value=raw):
            return papers.get_papers(self.source, TODAY)

    def test_dedupes_doi_preserves_authors_and_uses_conservative_type(self):
        paper, = self.result(self.work(), self.work())
        self.assertEqual(paper["url"], "https://doi.org/10.1111/bjet.70100")
        self.assertEqual(paper["title"], "A study of AI in the classroom")
        self.assertEqual(paper["published"], "2026-11-13")
        self.assertEqual(paper["authors"], ["First Author", "Research Group"])
        self.assertEqual(paper["risAuthors"], ["Author, First", "Research Group"])
        self.assertEqual(paper["publicationType"], "journal-article")
        self.assertNotIn("summary", paper)

    def test_excludes_corrections_editorials_updates_retractions_and_other_topics(self):
        unrelated = self.work(title=["Chemistry teaching strategies"])
        removed = [self.work(title=[name]) for name in ("Editorial: AI in schools", "Retraction: AI",
                   "Correction to: AI tutors", "AI tutors [Correction]", "Editor's note: AI")]
        removed.extend([self.work(**{"update-to": [{"type": "correction"}]}),
                        self.work(relation={"is-retracted-by": [{"id": "notice"}]})])
        self.assertEqual(self.result(unrelated, *removed), [])
        self.assertEqual(self.result(*removed), [])

    def test_rejects_missing_online_day_bad_doi_or_incomplete_authorship(self):
        for change in ({"published-online": {"date-parts": [[2026, 11]]}},
                       {"DOI": "10.9999/other"}, {"author": []},
                       {"author": [{"given": "First", "family": "Author"}, {}]}):
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.result(self.work(**change))
        with self.assertRaises(ValueError):
            self.result()


if __name__ == "__main__":
    unittest.main()
