import json
import shutil
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from offer_directory import BASE_URL, generate_offer_directory, offer_content, read_public_projection


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.links = []
        self.canonical = None
        self.schemas = []
        self.headings = []
        self.active = None
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        fields = dict(attrs)
        if tag == "a":
            self.links.append(fields["href"])
        elif tag == "link" and fields.get("rel") == "canonical":
            self.canonical = fields["href"]
        elif tag == "script":
            if fields.get("type") != "application/ld+json":
                raise AssertionError("Onverwacht uitvoerbaar script")
            self.active = self.schemas
        elif tag == "h1":
            self.active = self.headings

    def handle_endtag(self, tag):
        if tag in ("h1", "script"):
            self.active = None

    def handle_data(self, data):
        if self.active is not None:
            self.active.append(data)


class OfferDirectoryTests(unittest.TestCase):
    def test_funding_conditions_and_deadlines_on_a_shared_page(self):
        record = {"id": "ronde", "title": "Een ronde", "legacyType": "Call", "providerName": "Fonds",
                  "audiences": ["Studenten"], "applicantTypes": ["Hogescholen"],
                  "eligibility": "Samen met een school & een bedrijf.",
                  "sourceUrls": [{"sourceType": "official", "url": "https://example.org/ronde"}],
                  "applicationOpenDate": "2026-11-13", "applicationDeadline": "2027-03-19",
                  "applicationDeadlineAt": "2027-03-19T14:00:00+01:00"}
        content, _ = offer_content(record, "Doel")
        self.assertIn("<dt>Wie kan aanvragen?</dt><dd>Hogescholen</dd>", content)
        self.assertIn("<dt>Voor wie</dt><dd>Studenten</dd>", content)
        self.assertIn("Samen met een school &amp; een bedrijf.", content)
        self.assertIn("13 november 2026", content)
        self.assertIn('datetime="2027-03-19T14:00:00+01:00">19 maart 2027 om 14:00 uur (UTC+01:00)', content)
        del record["applicationDeadlineAt"]
        date_only, _ = offer_content(record, "Doel")
        self.assertIn('datetime="2027-03-19">19 maart 2027</time>', date_only)
        del record["applicationDeadline"], record["applicantTypes"], record["eligibility"]
        unknown, _ = offer_content(record, "Doel")
        self.assertIn("Geen uiterste datum bevestigd", unknown)
        self.assertIn("Zie de officiële voorwaarden", unknown)
        self.assertNotIn("<dt>Wie kan aanvragen?</dt><dd>Studenten", unknown)

    def test_shared_pages_show_practical_access_and_only_available_official_lessons(self):
        workshop = {"id": "scholing", "title": "Workshop", "providerName": "Instelling", "accessType": "restricted",
                    "eligibility": "Voor medewerkers van de instelling.",
                    "sourceUrls": [{"sourceType": "official", "url": "https://example.org/workshop"}]}
        content, _ = offer_content(workshop, "Scholing")
        self.assertIn("Beperkte toegang", content)
        self.assertIn(workshop["eligibility"], content)
        lesson = dict(workshop, status="available", sectors=["MBO"], lessonStart={
            "question": "Hoe?", "level": "Mbo", "preparation": "Lees de bron.", "task": "Vergelijk.",
            "reflection": "Wat zie je?", "sectors": ["MBO"], "sourceUrl": "https://example.org/workshop"})
        link = f'../../#leerlingblad?item={lesson["id"]}'
        self.assertIn(link, offer_content(lesson, "")[0])
        self.assertNotIn(link, offer_content(dict(lesson, status="archived"), "")[0])
        missing = dict(lesson, lessonStart=dict(lesson["lessonStart"], sourceUrl="https://example.org/anders"))
        self.assertNotIn(link, offer_content(missing, "")[0])

    def test_public_directory_details_and_sitemap_share_one_projection(self):
        projection = read_public_projection(ROOT)
        with tempfile.TemporaryDirectory() as tmp:
            site = Path(tmp)
            generate_offer_directory(ROOT, site)
            directory = site / "aanbod"
            index = Page(directory / "index.html")
            self.assertEqual(index.canonical, BASE_URL + "aanbod/")
            self.assertEqual(json.loads(index.schemas[0])["@type"], "CollectionPage")
            self.assertIn("index.json", index.links)
            ids = {r["id"] for r in projection["records"]}
            self.assertEqual({link[:-1] for link in index.links if link.endswith("/") and link != "../"}, ids)
            self.assertEqual({p.parent.name for p in directory.glob("*/index.html")}, ids)
            expected = {BASE_URL, index.canonical, BASE_URL + "lesmateriaal/"}
            expected.update(BASE_URL + "lesmateriaal/leerling/" + key.removeprefix("werkblad-") + "/"
                            for key in projection.get("worksheets", {}))
            for record in projection["records"]:
                with self.subTest(id=record["id"]):
                    page = Page(directory / record["id"] / "index.html")
                    canonical = index.canonical + record["id"] + "/"
                    expected.add(canonical)
                    self.assertEqual(page.canonical, canonical)
                    self.assertEqual(page.headings, [record["title"]])
                    self.assertIn("../../#item/" + record["id"], page.links)
                    sources = {s["url"] for s in record["sourceUrls"] if s.get("sourceType") == "official"}
                    schema = json.loads(page.schemas[0])
                    self.assertEqual(schema["url"], canonical)
                    self.assertEqual(set(schema["citation"]), sources)
                    self.assertTrue(sources.issubset(page.links))
                    if record.get("legacyType") in {"Call", "Subsidie"} and record.get("purpose"):
                        self.assertEqual(schema["description"], record["purpose"])
            sitemap_index = ElementTree.parse(ROOT / "sitemap.xml").findall(".//{*}loc")
            self.assertEqual([url.text for url in sitemap_index], [BASE_URL + "atlas-sitemap.xml"])
            urls = [url.text for url in ElementTree.parse(site / "atlas-sitemap.xml").findall(".//{*}loc")]
            self.assertCountEqual(urls, expected)

    def test_escaping_withdrawal_and_input_validation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            site = root / "site"
            (root / "scripts").mkdir()
            (root / "data").mkdir()
            for name in ("scripts/offer_page.html", "platform.css", "brand.css", "offer-directory.css"):
                shutil.copyfile(ROOT / name, root / name)
            record = {"id": "proef", "title": "A & B <test>", "description": '</script><b>"test"</b>',
                      "sourceUrls": [{"sourceType": "official", "url": "https://www.example.org/?a=1&b=2", "label": "A & B"},
                                     {"sourceType": "official", "url": "javascript:alert(1)", "label": "Onveilig"}]}

            def project(records):
                (root / "data/data-v2.js").write_text(
                    "window.ATLAS_RECORDS=" + json.dumps({"records": records}) + ";", encoding="utf-8")
                generate_offer_directory(root, site)

            project([record])
            page_path = site / "aanbod/proef/index.html"
            page = Page(page_path)
            self.assertEqual(page.headings, [record["title"]])
            self.assertEqual(json.loads(page.schemas[0])["description"], record["description"])
            self.assertNotIn("javascript:alert(1)", page.links)
            self.assertNotIn(record["description"], page_path.read_text(encoding="utf-8"))
            neighbor = site / "aanbod/eigen/index.html"
            neighbor.parent.mkdir()
            neighbor.write_text("Handmatig bestand", encoding="utf-8")
            project([])
            self.assertFalse(page_path.exists())
            self.assertTrue(neighbor.exists())
            self.assertNotIn("proef", (site / "atlas-sitemap.xml").read_text(encoding="utf-8"))
            for invalid in ([record, record], [dict(record, id="../concept")]):
                with self.assertRaises(ValueError):
                    project(invalid)
