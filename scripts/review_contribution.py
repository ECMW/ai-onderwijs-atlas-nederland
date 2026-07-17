"""Controleer of een uitsluitend toevoegende pull request automatisch verwerkt kan worden."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from contribution_quality import dump_report, report_markdown, review_records


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True, help="JSON-bestand v\u00f3\u00f3r de bijdrage")
    parser.add_argument("--candidate", required=True, help="JSON-bestand uit de pull request")
    parser.add_argument("--changed-files", help="Tekstbestand met \u00e9\u00e9n gewijzigd pad per regel")
    parser.add_argument("--report-json")
    parser.add_argument("--report-markdown")
    args = parser.parse_args()

    base = json.loads(Path(args.base).read_text(encoding="utf-8"))
    candidate = json.loads(Path(args.candidate).read_text(encoding="utf-8"))
    changed = None
    if args.changed_files:
        changed = [line.strip().replace("\\", "/") for line in Path(args.changed_files).read_text(encoding="utf-8").splitlines() if line.strip()]
    report = review_records(base, candidate, changed)
    dump_report(report, args.report_json, args.report_markdown)
    print(report_markdown(report))
    return 0 if report["eligible"] else 2


if __name__ == "__main__":
    sys.exit(main())
