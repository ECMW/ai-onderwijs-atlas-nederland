"""Kwaliteitscontrole voor de officiële inhoudstranche, batch 1."""

import json
import re
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECORDS = json.loads((ROOT / "data" / "records.json").read_text(encoding="utf-8"))
MARKER = "officiële inhoudstranche Nederlandse AI-onderwijsbronnen, batch 1"
REQUIRED = ("title", "recordType", "providerName", "description", "audiences", "sectors", "status", "lastVerified", "sourceUrls")


def normalize(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value).casefold()).strip()


def check_url(record):
    url = record["sourceUrls"][0]["url"]
    request = urllib.request.Request(url, headers={
        "User-Agent": "AI-Onderwijs-Atlas/1.0 (+https://ecmw.github.io/ai-onderwijs-atlas-nederland/)"
    })
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            response.read(1024)
            return record["id"], response.status, response.url, None
    except urllib.error.HTTPError as error:
        return record["id"], error.code, url, type(error).__name__
    except Exception as error:
        return record["id"], None, url, type(error).__name__


def main():
    batch = [
        record for record in RECORDS
        if any(MARKER in change.get("summary", "") for change in record.get("changeHistory", []))
    ]
    errors = []
    for record in batch:
        missing = [field for field in REQUIRED if not record.get(field)]
        if missing:
            errors.append(f"{record['id']}: ontbreekt {', '.join(missing)}")
        if len(record.get("sourceUrls", [])) != 1 or record["sourceUrls"][0].get("sourceType") != "official":
            errors.append(f"{record['id']}: bron is niet eenduidig officieel")

    batch_ids = {record["id"] for record in batch}
    possible_duplicates = []
    for candidate in batch:
        for existing in RECORDS:
            if existing["id"] == candidate["id"] or existing["id"] in batch_ids:
                continue
            ratio = SequenceMatcher(None, normalize(candidate["title"]), normalize(existing["title"])).ratio()
            if ratio >= 0.88:
                possible_duplicates.append((candidate["id"], existing["id"], round(ratio, 2)))

    with ThreadPoolExecutor(max_workers=8) as executor:
        source_checks = list(executor.map(check_url, batch))

    reachable = [row for row in source_checks if row[1] and 200 <= row[1] < 400]
    warnings = [row for row in source_checks if row not in reachable]
    print(f"Batchrecords: {len(batch)}")
    print(f"Datakwaliteitsfouten: {len(errors)}")
    print(f"Mogelijke titelduplicaten (drempel 0,88): {len(possible_duplicates)}")
    print(f"Bronnen bereikbaar via geautomatiseerde GET: {len(reachable)}/{len(source_checks)}")
    for error in errors:
        print(f"FOUT | {error}")
    for duplicate in possible_duplicates:
        print(f"DUBBELCONTROLEREN | {duplicate[0]} | {duplicate[1]} | {duplicate[2]}")
    for record_id, status, url, error in warnings:
        print(f"BRONWAARSCHUWING | {record_id} | {status or '-'} | {error or '-'} | {url}")
    raise SystemExit(1 if errors or len(batch) != 30 else 0)


if __name__ == "__main__":
    main()

