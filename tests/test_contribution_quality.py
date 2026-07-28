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

    def test_trusted_automation_accepts_verified_addition_and_update(self):
        base = record("bestaand", "Bestaand aanbod")
        base["verificationStatus"] = "verified"
        base["lastVerified"] = "2026-07-27"
        base["changeHistory"] = [{"date": "2026-07-27", "type": "added", "summary": "Toegevoegd."}]
        changed = copy.deepcopy(base)
        changed["description"] += " Feitelijk bijgewerkt."
        changed["lastVerified"] = "2026-07-28"
        changed["changeHistory"].append({"date": "2026-07-28", "type": "updated", "summary": "Bijgewerkt."})
        addition = record("nieuw", "Nieuw aanbod")
        addition["verificationStatus"] = "verified"
        addition["lastVerified"] = "2026-07-28"
        addition["sourceUrls"][0]["url"] = "https://voorbeeld.nl/nieuw"
        addition["changeHistory"] = [{"date": "2026-07-28", "type": "added", "summary": "Toegevoegd."}]
        report = review_records(
            [base],
            [changed, addition],
            ["data/records.json", "data/metadata.json", "data/data-v2.js", "data/search-index.json"],
            source_loader("bestaand aanbod nieuw aanbod voorbeeldorganisatie"),
            trusted_automation=True,
        )
        self.assertTrue(report["eligible"], report["errors"])
        self.assertEqual(report["modifiedIds"], ["bestaand"])

    def test_trusted_automation_still_rejects_removal_and_unscoped_file(self):
        base = record("bestaand")
        report = review_records(
            [base],
            [],
            ["data/records.json", "catalog.js"],
            source_loader(),
            trusted_automation=True,
        )
        self.assertFalse(report["eligible"])
        self.assertTrue(any("uitsluitend" in error for error in report["errors"]))
        self.assertTrue(any("verwijderd" in error for error in report["errors"]))

    def test_external_route_cannot_claim_verified_status(self):
        addition = record()
        addition["verificationStatus"] = "verified"
        addition["lastVerified"] = "2026-07-28"
        report = review_records([], [addition], ["data/records.json"], source_loader())
        self.assertFalse(report["eligible"])
        self.assertTrue(any("needs_review" in error for error in report["errors"]))


if __name__ == "__main__":
    unittest.main()
