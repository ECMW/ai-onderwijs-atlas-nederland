"""Smoke checks for the separate educational discovery page."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.ids = set()
        self.cards = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "a":
            self.links.append(attrs)
        if tag == "article" and "tool" in attrs.get("class", "").split():
            self.cards += 1

class DiscoveryPageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.page = (ROOT / "ontdek-en-probeer.html").read_text(encoding="utf-8")
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.parser = PageParser()
        cls.parser.feed(cls.page)

    def test_five_cards_and_search(self):
        self.assertEqual(self.parser.cards, 5)
        self.assertIn("zoek", self.parser.ids)
        self.assertIn("count", self.parser.ids)

    def test_official_external_links_are_safe(self):
        phet = [a for a in self.parser.links if a.get("href", "").startswith("https://phet.colorado.edu/en/simulations/")]
        self.assertEqual(len(phet), 10)  # button and source per card
        for link in phet:
            if link.get("target") == "_blank":
                self.assertIn("noopener", link.get("rel", ""))

    def test_navigation_and_scope(self):
        self.assertIn('href="ontdek-en-probeer.html"', self.index)
        self.assertIn("geen aangetoonde AI-toepassingen", self.page)
        self.assertIn("E.C.M. Willems", self.page)

if __name__ == "__main__":
    unittest.main()
