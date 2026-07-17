"""Promoveer uitsluitend de records uit een automatisch goedgekeurde bijdrage."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date
from pathlib import Path

from contribution_quality import report_markdown, review_records


MONTHS = (
    "januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december",
)


def dutch_date(day: date) -> str:
    return f"{day.day} {MONTHS[day.month - 1]} {day.year}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True)
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--current", default="data/records.json")
    parser.add_argument("--metadata", default="data/metadata.json")
    parser.add_argument("--pr-number", required=True)
    args = parser.parse_args()

    base = json.loads(Path(args.base).read_text(encoding="utf-8"))
    candidate = json.loads(Path(args.candidate).read_text(encoding="utf-8"))
    report = review_records(base, candidate, ["data/records.json"])
    print(report_markdown(report))
    if not report["eligible"]:
        return 2

    current_path = Path(args.current)
    current = json.loads(current_path.read_text(encoding="utf-8"))
    current_by_id = {record["id"]: record for record in current}
    checked = date.today().isoformat()
    changed = 0
    for record_id in report["addedIds"]:
        record = current_by_id.get(record_id)
        if not record:
            print(f"Record {record_id} staat na merge niet in de hoofddata.")
            return 2
        if record.get("verificationStatus") not in {"needs_review", "recently_checked"}:
            print(f"Record {record_id} heeft een onverwachte verificatiestatus.")
            return 2
        record["verificationStatus"] = "recently_checked"
        record["lastVerified"] = checked
        record["verificationMethod"] = "automatic_official_source_check"
        record["verificationNote"] = (
            "Bereikbaarheid en aansluiting van titel en aanbieder op de offici\u00eble bron zijn automatisch gecontroleerd; "
            "dit is geen inhoudelijke aanbeveling."
        )
        history = record.setdefault("changeHistory", [])
        summary = f"Offici\u00eble bron automatisch gecontroleerd na communitybijdrage #{args.pr_number}."
        if not any(item.get("summary") == summary for item in history):
            history.append({"date": checked, "type": "verified", "summary": summary})
        changed += 1

    current_path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata_path = Path(args.metadata)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    metadata["updated"] = dutch_date(date.today())
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Gepromoveerd: {changed} record(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
