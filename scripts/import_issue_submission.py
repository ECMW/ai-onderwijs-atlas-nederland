"""Zet een volledig GitHub-bijdrageformulier om in ??n brongecontroleerd record."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

from contribution_quality import dump_report, normalize, report_markdown, review_records, slug
from promote_contribution import dutch_date


TYPE_MAP = {
    "Organisatie": ("organization", "Organisatie"),
    "Programma": ("programme", "Programma"),
    "Product": ("product", "Product"),
    "Voorziening": ("service", "Voorziening"),
    "Handreiking": ("guidance", "Handreiking"),
    "Training": ("training", "Training"),
    "Pilot": ("pilot", "Pilot"),
    "Praktijkvoorbeeld": ("practice_example", "Praktijkvoorbeeld"),
    "Community": ("community", "Community"),
    "Standaard": ("standard", "Standaard"),
    "Subsidie": ("subsidy", "Subsidie"),
    "Call": ("funding_call", "Call"),
}
STATUS_MAP = {
    "Direct beschikbaar": ("available", "Direct beschikbaar"),
    "Pilot": ("pilot", "Pilot"),
    "In ontwikkeling": ("in_development", "In ontwikkeling"),
    "Gepland": ("planned", "Gepland"),
    "Open voor aanvragen": ("open_call", "Open voor aanvragen"),
    "Gesloten": ("closed_call", "Gesloten"),
}
COST_MAP = {"Gratis": "free", "Betaald": "paid", "Gratis en betaald": "mixed", "Onbekend": "unknown"}


def parse_form(body: str) -> dict[str, str]:
    fields: dict[str, str] = {}
    headings = {
        "titel": "Titel", "recordtype": "Recordtype", "organisatie": "Organisatie",
        "feitelijke beschrijving": "Feitelijke beschrijving", "sector": "Sector",
        "doelgroep": "Doelgroep", "thema": "Thema", "status": "Status",
        "geografische reikwijdte": "Geografische reikwijdte", "kosten": "Kosten",
        "deadline": "Deadline", "toelichting": "Toelichting",
    }
    pattern = re.compile(r"^###\s+(.+?)\s*$\n(.*?)(?=^###\s+|\Z)", flags=re.M | re.S)
    for heading, value in pattern.findall(body.replace("\r\n", "\n")):
        cleaned = value.strip()
        if cleaned in {"_No response_", "No response"}:
            cleaned = ""
        key = normalize(heading)
        canonical = headings.get(key, heading.strip())
        if key.startswith("offici") and key.endswith("bronlink"):
            canonical = "Offici\u00eble bronlink"
        fields[canonical] = cleaned
    return fields


def multi(value: str) -> list[str]:
    parts: list[str] = []
    for line in value.splitlines():
        line = re.sub(r"^\s*-\s*(?:\[[ xX]\]\s*)?", "", line).strip()
        parts.extend(item.strip() for item in re.split(r"[,;]", line) if item.strip())
    return list(dict.fromkeys(parts))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--records", default="data/records.json")
    parser.add_argument("--metadata", default="data/metadata.json")
    parser.add_argument("--report-json")
    parser.add_argument("--report-markdown")
    args = parser.parse_args()

    body = os.environ.get("ATLAS_ISSUE_BODY", "")
    number = os.environ.get("ATLAS_ISSUE_NUMBER", "onbekend")
    fields = parse_form(body)
    required = ["Titel", "Recordtype", "Organisatie", "Feitelijke beschrijving", "Offici\u00eble bronlink", "Sector", "Doelgroep", "Status", "Thema"]
    missing = [field for field in required if not fields.get(field)]
    if missing:
        report = {
            "eligible": False, "addedIds": [],
            "errors": ["Verplichte velden ontbreken: " + ", ".join(missing)], "warnings": [], "sourceChecks": {},
            "scope": "Automatische bron- en structuurcontrole; geen inhoudelijke aanbeveling.",
        }
        dump_report(report, args.report_json, args.report_markdown)
        print(report_markdown(report))
        return 2

    if fields["Recordtype"] not in TYPE_MAP or fields["Status"] not in STATUS_MAP:
        report = {
            "eligible": False, "addedIds": [], "errors": ["Recordtype of status is niet herkenbaar."],
            "warnings": [], "sourceChecks": {}, "scope": "Automatische bron- en structuurcontrole; geen inhoudelijke aanbeveling.",
        }
        dump_report(report, args.report_json, args.report_markdown)
        print(report_markdown(report))
        return 2

    records_path = Path(args.records)
    records = json.loads(records_path.read_text(encoding="utf-8"))
    record_type, legacy_type = TYPE_MAP[fields["Recordtype"]]
    status, availability = STATUS_MAP[fields["Status"]]
    title = fields["Titel"].strip()
    provider = fields["Organisatie"].strip()
    record_id = slug(title)
    description = fields["Feitelijke beschrijving"].strip()
    if description and not description.lower().startswith(("volgens de aanbieder", "volgens de offici\u00eble bron")):
        description = "Volgens de aanbieder: " + description[0].lower() + description[1:]
    source_url = fields["Offici\u00eble bronlink"].strip()
    today = date.today().isoformat()
    sectors = multi(fields["Sector"])
    audiences = multi(fields["Doelgroep"])
    themes = multi(fields["Thema"])
    geography = fields.get("Geografische reikwijdte", "Nederland").strip() or "Nederland"
    cost = COST_MAP.get(fields.get("Kosten", "Onbekend").strip(), "unknown")

    record = {
        "id": record_id,
        "title": title,
        "recordType": record_type,
        "legacyType": legacy_type,
        "subtype": None,
        "organizationIds": ["org-" + slug(title if record_type == "organization" else provider)],
        "providerName": provider,
        "description": description,
        "purpose": "Nog niet ingevuld",
        "audiences": audiences,
        "sectors": sectors,
        "themes": themes,
        "status": status,
        "availabilityText": availability,
        "startDate": None,
        "endDate": None,
        "publicationDate": None,
        "lastVerified": None,
        "verificationStatus": "needs_review",
        "sourceUrls": [{"label": "Offici\u00eble bron", "url": source_url, "sourceType": "official"}],
        "relatedIds": [], "parentIds": [], "childIds": [],
        "geographicScope": geography,
        "accessType": "unknown",
        "costType": cost,
        "fundingAmount": "Nog niet ingevuld",
        "fundingDeadline": fields.get("Deadline") or None,
        "applicationOpenDate": None,
        "applicationDeadline": fields.get("Deadline") or None,
        "fundingMin": None, "fundingMax": None, "totalBudget": None,
        "eligibility": None, "applicantTypes": [], "callStatus": None, "recurrence": None,
        "language": ["nl"],
        "keywords": list(dict.fromkeys([title, provider, *themes])),
        "notes": None,
        "changeHistory": [{"date": today, "type": "added", "summary": f"Ingediend via communitybijdrage #{number}."}],
    }
    candidate = [*records, record]
    report = review_records(records, candidate, ["data/records.json"])
    dump_report(report, args.report_json, args.report_markdown)
    print(report_markdown(report))
    if not report["eligible"]:
        return 2

    record["lastVerified"] = today
    record["verificationStatus"] = "recently_checked"
    record["verificationMethod"] = "automatic_official_source_check"
    record["verificationNote"] = (
        "Bereikbaarheid en aansluiting van titel en aanbieder op de offici\u00eble bron zijn automatisch gecontroleerd; "
        "dit is geen inhoudelijke aanbeveling."
    )
    record["changeHistory"].append({
        "date": today, "type": "verified",
        "summary": f"Offici\u00eble bron automatisch gecontroleerd bij communitybijdrage #{number}.",
    })
    records_path.write_text(json.dumps(candidate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata_path = Path(args.metadata)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["updated"] = dutch_date(date.today())
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
