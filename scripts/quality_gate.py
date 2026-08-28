#!/usr/bin/env python3
"""Quality gate for the public Atlas projection.

The script is intentionally deterministic and network-free. It validates that
the browser data is an exact, safe projection of the canonical catalogue and
writes a compact machine-readable report. It never edits data.
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_STATUSES = {"verified", "recently_checked"}
EXCLUDED_TYPES = {"identified_need", "white_spot"}
EXCLUDED_LEGACY = {"Behoefte", "Witte vlek"}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def is_public(record: dict) -> bool:
    return (
        record.get("recordType") not in EXCLUDED_TYPES
        and record.get("legacyType") not in EXCLUDED_LEGACY
        and record.get("verificationStatus") in PUBLIC_STATUSES
        and any(
            source.get("sourceType") == "official" and source.get("url")
            for source in record.get("sourceUrls", [])
        )
    )


def date_is_valid(value: object) -> bool:
    if not isinstance(value, str):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, default=ROOT / "maintenance-output" / "quality-report.json")
    parser.add_argument("--strict", action="store_true")
    args = parser.parse_args()

    root = args.root.resolve()
    records = load_json(root / "data" / "records.json")
    metadata = load_json(root / "data" / "metadata.json")
    raw = (root / "data" / "data-v2.js").read_text(encoding="utf-8").strip()
    prefix = "window.ATLAS_RECORDS="
    if not raw.startswith(prefix):
        raise ValueError("data-v2.js has no ATLAS_RECORDS assignment")
    public_data = json.loads(raw[len(prefix):].rstrip(";"))
    public_records = public_data.get("records", [])

    errors, warnings = [], []
    expected = [record for record in records if is_public(record)]
    expected_ids = [record.get("id") for record in expected]
    public_ids = [record.get("id") for record in public_records]

    if len(public_ids) != len(set(public_ids)):
        errors.append("Public projection contains duplicate IDs")
    if set(public_ids) != set(expected_ids):
        errors.append("Public projection does not match publishable canonical records")
    if public_data.get("metadata", {}).get("recordCount") != len(public_records):
        errors.append("Public metadata recordCount does not match the public projection")
    if metadata.get("recordCount") != len(public_records):
        errors.append("Canonical metadata recordCount does not match the public projection")

    for record in public_records:
        identifier = record.get("id", "<zonder-id>")
        if not record.get("title") or not record.get("description"):
            errors.append(f"{identifier}: public record misses title or description")
        if not date_is_valid(record.get("lastVerified")):
            errors.append(f"{identifier}: public record has no valid lastVerified date")
        if record.get("recordType") in EXCLUDED_TYPES or record.get("legacyType") in EXCLUDED_LEGACY:
            errors.append(f"{identifier}: non-public record leaked into public projection")
        if not any(source.get("sourceType") == "official" and source.get("url") for source in record.get("sourceUrls", [])):
            errors.append(f"{identifier}: public record has no official source")
        if record.get("verificationStatus") not in PUBLIC_STATUSES:
            errors.append(f"{identifier}: public record has no publishable verification status")

    seen_urls = {}
    for record in expected:
        for source in record.get("sourceUrls", []):
            if source.get("sourceType") != "official" or not source.get("url"):
                continue
            url = re.sub(r"/+$", "", source["url"].strip().lower())
            seen_urls.setdefault(url, []).append(record["id"])
    for url, identifiers in seen_urls.items():
        if len(identifiers) > 1:
            warnings.append({"kind": "shared_official_source", "url": url, "recordIds": identifiers})

    report = {
        "generatedAt": date.today().isoformat(),
        "canonicalRecords": len(records),
        "publicRecords": len(public_records),
        "errors": errors,
        "warnings": warnings,
        "passed": not errors,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"passed": report["passed"], "errors": len(errors), "warnings": len(warnings)}, ensure_ascii=False))
    return 1 if errors and args.strict else 0


if __name__ == "__main__":
    raise SystemExit(main())
