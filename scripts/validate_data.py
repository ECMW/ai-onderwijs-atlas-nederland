#!/usr/bin/env python3
"""Validate canonical Atlas records and the permanent source library."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from contribution_quality import commercial_field_errors
from offer_categories import offer_category_errors
from publication_scope import publication_exclusion_errors
from source_library import source_library_errors


ROOT = Path(__file__).resolve().parents[1]
RECORD_TYPES = {
    "organization", "programme", "product", "service", "guidance", "training",
    "book", "subsidy", "funding_call", "pilot", "practice_example", "community",
    "standard", "legislation", "policy_document", "research_project",
    "identified_need", "white_spot",
}
STATUSES = {
    "available", "pilot", "in_development", "planned", "open_call", "closed_call",
    "archived", "needs_verification", "identified_need", "unknown",
}
VERIFICATION_STATUSES = {
    "verified", "recently_checked", "stale", "changed", "broken_source", "needs_review",
}


def validation_errors(root: Path) -> tuple[list[str], int]:
    records = json.loads((root / "data" / "records.json").read_text(encoding="utf-8"))
    errors: list[str] = []
    identifiers = [record.get("id") for record in records]
    if len(identifiers) != len(set(identifiers)):
        errors.append("IDs zijn niet uniek")

    for record in records:
        errors.extend(commercial_field_errors(record))
        errors.extend(offer_category_errors(record))
        errors.extend(publication_exclusion_errors(record))
        identifier = record.get("id")
        if not record.get("title"):
            errors.append(f"{identifier}: titel ontbreekt")
        if record.get("recordType") not in RECORD_TYPES:
            errors.append(f"{identifier}: ongeldig recordType")
        if (
            record.get("status") not in STATUSES
            or record.get("verificationStatus") not in VERIFICATION_STATUSES
        ):
            errors.append(f"{identifier}: ongeldige status")
        if (
            record.get("verificationStatus") == "verified"
            and (not record.get("lastVerified") or not record.get("sourceUrls"))
        ):
            errors.append(f"{identifier}: verified zonder datum/bron")
        if record.get("recordType") == "white_spot" and record.get("status") == "available":
            errors.append(f"{identifier}: witte vlek beschikbaar")
        if record.get("recordType") == "book" and (
            record.get("bookCategory") not in {"reading", "study", "practice"}
            or not isinstance(record.get("authors"), list)
            or not all(isinstance(author, str) and author.strip() for author in record.get("authors", []))
            or not re.fullmatch(r"\d{13}", str(record.get("isbn", "")))
            or "nl" not in record.get("language", [])
        ):
            errors.append(f"{identifier}: boek mist geldige boeksoort, auteur(s), ISBN-13 of Nederlandse taalcode")
        for source in record.get("sourceUrls", []):
            if not re.match(r"^https?://[^\s]+$", source.get("url", "")):
                errors.append(f"{identifier}: ongeldige URL")
        for related_id in (
            record.get("relatedIds", [])
            + record.get("parentIds", [])
            + record.get("childIds", [])
        ):
            if related_id not in identifiers:
                errors.append(f"{identifier}: relatie naar onbekend ID {related_id}")

    errors.extend(source_library_errors(root))
    return errors, len(records)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    args = parser.parse_args()
    errors, record_count = validation_errors(args.root.resolve())
    print("\n".join(errors) if errors else f"OK: {record_count} records")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
