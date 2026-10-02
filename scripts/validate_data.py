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


def isbn13_is_valid(value: object) -> bool:
    """Validate a 978/979 ISBN-13, including its check digit."""
    if not isinstance(value, str) or not re.fullmatch(r"97[89]\d{10}", value):
        return False
    digits = [int(character) for character in value]
    expected = (10 - sum(
        digit * (1 if index % 2 == 0 else 3)
        for index, digit in enumerate(digits[:12])
    ) % 10) % 10
    return digits[-1] == expected


def validation_errors(root: Path) -> tuple[list[str], int]:
    records = json.loads((root / "data" / "records.json").read_text(encoding="utf-8"))
    errors: list[str] = []
    identifiers = [record.get("id") for record in records]
    if len(identifiers) != len(set(identifiers)):
        errors.append("IDs zijn niet uniek")
    book_isbns: list[str] = []

    for record in records:
        errors.extend(commercial_field_errors(record))
        errors.extend(offer_category_errors(record))
        errors.extend(publication_exclusion_errors(record))
        identifier = record.get("id")
        if not isinstance(identifier, str) or not identifier.strip():
            errors.append("Record mist een geldige ID")
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
        if record.get("recordType") == "book":
            authors = record.get("authors")
            language = record.get("language")
            isbn = record.get("isbn")
            if (
                record.get("legacyType") != "Boek"
                or record.get("bookCategory") not in {"reading", "study", "practice"}
                or not isinstance(authors, list)
                or not authors
                or not all(isinstance(author, str) and author.strip() for author in authors)
                or not isbn13_is_valid(isbn)
                or not isinstance(language, list)
                or "nl" not in language
            ):
                errors.append(f"{identifier}: boek mist legacyType Boek, geldige boeksoort, auteur(s), ISBN-13 of Nederlandse taalcode")
            if isinstance(isbn, str):
                book_isbns.append(isbn)
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

    for isbn in sorted({value for value in book_isbns if book_isbns.count(value) > 1}):
        errors.append(f"Dubbel ISBN-13 bij boeken: {isbn}")

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
