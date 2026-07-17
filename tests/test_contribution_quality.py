import copy
import unittest

from scripts.contribution_quality import SourceCheck, review_records


def record(record_id="voorbeeld", title="Voorbeeldtool", provider="Voorbeeldorganisatie"):
    return {
        "id": record_id,
        "title": title,
        "recordType": "product",
        "legacyType": "Product",
        "providerName": provider,
        "description": "Een feitelijke beschrijving van een bestaand hulpmiddel voor het onderwijs.",
        "audiences": ["Docenten"],
        "sectors": ["HBO"],
        "themes": ["Lesgeven en leren met AI"],
        "status": "available",
        "lastVerified": None,
        "verificationStatus": "needs_review",
        "sourceUrls": [{"label": "Offici?le bron", "url": "https://voorbeeld.nl/tool", "sourceType": "official"}],
        "relatedIds": [], "parentIds": [], "childIds": [],
    }


def source_loader(text="voorbeeldtool voorbeeldorganisatie direct beschikbaar"):
    def load(url):
        return SourceCheck(url, True, 200, url, "text/html", "Voorbeeldtool", text)
    return load


class ContributionQualityTests(unittest.TestCase):
    def test_safe_addition_is_eligible(self):
        report = review_records([], [record()], ["data/records.json"], source_loader())
        self.assertTrue(report["eligible"], report["errors"])

    def test_existing_record_cannot_be_changed_automatically(self):
        base = record()
        changed = copy.deepcopy(base)
        changed["description"] += " Gewijzigd."
        report = review_records([base], [changed], ["data/records.json"], source_loader())
        self.assertFalse(report["eligible"])
        self.assertTrue(any("Correcties" in error for error in report["errors"]))

    def test_duplicate_is_rejected(self):
        base = record("bestaand")
        addition = record("nieuw")
        addition["sourceUrls"][0]["url"] = "https://voorbeeld.nl/andere-pagina"
        report = review_records([base], [base, addition], ["data/records.json"], source_loader())
        self.assertFalse(report["eligible"])
        self.assertTrue(any("duplicaat" in error for error in report["errors"]))

    def test_available_conflicts_with_pilot_source(self):
        report = review_records([], [record()], ["data/records.json"], source_loader("voorbeeldtool voorbeeldorganisatie pilotplaatsen"))
        self.assertFalse(report["eligible"])
        self.assertTrue(any("pilot" in error.lower() for error in report["errors"]))


if __name__ == "__main__":
    unittest.main()
