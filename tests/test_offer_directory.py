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
from offer_directory import BASE_URL, generate_offer_directory, read_public_projection


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
