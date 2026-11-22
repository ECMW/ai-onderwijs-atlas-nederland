"""Build the static papers edition, preserving each journal's last successful check."""
import argparse
from datetime import date, datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import re
from time import sleep
from urllib.request import Request, urlopen

from paper_sources import PAPER_SOURCES, SUMMARIES, get_papers

SITE = "https://aionderwijsatlas.nl"
LIMIT = 20
MAX_BYTES = 512_000
DOI = re.compile(r"10\.\d{4,9}/[-._;()/:a-zA-Z0-9]+", re.I)


def valid_day(value, today):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Incomplete publication or verification date")
    if date.fromisoformat(value) > today:
        raise ValueError("Future publication or verification date")
    return value


def clean_text(value, maximum):
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise ValueError("Invalid bibliographic text")
    return " ".join(value.split())


def paper_row(raw, source_name, today):
    doi = clean_text(raw["id"], 256).lower()
    if not DOI.fullmatch(doi) or raw["url"].lower() != f"https://doi.org/{doi}":
        raise ValueError("Paper link must match its DOI")
    if raw["source"] != source_name or raw["publicationType"] not in {"journal-article", "peer-reviewed", "preprint"}:
        raise ValueError("Invalid source or publication type")
    authors = raw["authors"]
    if not isinstance(authors, list) or not 1 <= len(authors) <= 256:
        raise ValueError("Paper must identify its authors")
    result = dict(id=doi, title=clean_text(raw["title"], 1600), authors=[clean_text(a, 260) for a in authors],
                  published=valid_day(raw["published"], today), source=source_name,
                  publicationType=raw["publicationType"], url=f"https://doi.org/{doi}")
    for key, maximum in [("summary", 1500), ("language", 50)]:
        if raw.get(key):
            result[key] = clean_text(raw[key], maximum)
    if raw.get("access") == "open":
        result["access"] = "open"
    return result


def parse_edition(data, today):
    """Read only the fields and publisher identities used by the public page."""
    known = {s["name"]: s["url"] for s in PAPER_SOURCES}
    dates = {}
    for src in data["sources"]:
        name = src["name"]
        if name in known:
            if name in dates:
                raise ValueError("Duplicate source")
            dates[name] = valid_day(src["checkedAt"], today)
    papers = {}
    for raw in data["papers"]:
        if raw["source"] in dates:
            row = paper_row(raw, raw["source"], today)
            if row["published"] > dates[row["source"]] or row["id"] in papers:
                raise ValueError("Inconsistent paper edition")
            papers[row["id"]] = row
    return dates, papers


def build_edition(seed, live, today, refresh, fetch=get_papers):
    dates, rows = {}, {}
    for edition in (seed, live):
        if edition is None:
            continue
        checked, papers = parse_edition(edition, today)
        for name, stamp in checked.items():
            if stamp >= dates.get(name, ""):
                rows = {doi: row for doi, row in rows.items() if row["source"] != name}
                rows.update({doi: row for doi, row in papers.items() if row["source"] == name})
                dates[name] = stamp
    successes = 0
    if refresh:
        for source in PAPER_SOURCES:
            name = source["name"]
            try:
                entries = [paper_row(raw, name, today) for raw in fetch(source, today)]
            except Exception as exc:
                print(f"Kept the last successful edition for {name}: {type(exc).__name__}: {exc}")
                continue
            rows = {doi: row for doi, row in rows.items() if row["source"] != name}
            for row in entries:
                rows[row["id"]] = row
            dates[name] = today.isoformat()
            successes += 1
    ordered = sorted(rows.values(), key=lambda row: (row["published"], row["id"]), reverse=True)[:LIMIT]
    for row in ordered:
        row.pop("summary", None)
        if row["id"] in SUMMARIES:
            row["summary"] = clean_text(SUMMARIES[row["id"]], 1500)
    if not dates:
        raise ValueError("No verified papers edition is available")
    sources = [dict(name=s["name"], url=s["url"], checkedAt=dates[s["name"]])
               for s in PAPER_SOURCES if s["name"] in dates]
    return dict(checkedAt=max(dates.values()), sources=sources, papers=ordered), successes


def read_url(url):
    request = Request(url, headers={"Accept": "application/json", "Cache-Control": "no-cache",
                                    "User-Agent": "AI-Onderwijs-Atlas/papers"})
    with urlopen(request, timeout=15) as response:
        payload = response.read(MAX_BYTES + 1)
    if len(payload) > MAX_BYTES:
        raise ValueError("Oversized JSON")
    return payload


def current_edition(read=read_url):
    # A rollout can switch between these two reads. A new pair must agree.
    for attempt in range(3):
        try:
            nonce = datetime.now(timezone.utc).timestamp()
            marker = json.loads(read(f"{SITE}/release.json?papers={nonce}"))
            if not re.fullmatch(r"[0-9a-f]{40}", marker["sourceSha"]):
                raise ValueError("Unexpected Pages release")
            if "papersSha256" not in marker:
                return None  # Release predates the papers section.
            digest = marker["papersSha256"]
            if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
                raise ValueError("Invalid edition checksum")
            payload = read(f"{SITE}/data/papers.json?edition={digest}")
            if sha256(payload).hexdigest() != digest:
                raise ValueError("Live edition and release marker differ")
            return json.loads(payload)
        except (OSError, KeyError, ValueError):
            if attempt == 2:
                raise
            sleep(2)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=Path, default=Path("data/papers.json"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--release", type=Path, help="Pages marker for the staged edition")
    parser.add_argument("--use-live", action="store_true")
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()
    today = datetime.now(timezone.utc).date()
    seed = json.loads(args.seed.read_text(encoding="utf-8")) if args.seed.is_file() else None
    live = current_edition() if args.use_live else None
    edition, successes = build_edition(seed, live, today, args.refresh)
    payload = (json.dumps(edition, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    args.output.write_bytes(payload)
    digest = sha256(payload).hexdigest()
    if args.release:
        release = json.loads(args.release.read_text(encoding="utf-8"))
        release["papersSha256"] = digest
        args.release.write_text(json.dumps(release, indent=2) + "\n", encoding="utf-8")
    if output := os.environ.get("GITHUB_OUTPUT"):
        with open(output, "a", encoding="utf-8") as f:
            print(f"changed={str(edition != live).lower()}", file=f)
            print(f"papers_sha={digest}", file=f)
    print(f"{len(edition['papers'])} papers; latest source check {edition['checkedAt']}; {successes} journals refreshed")


if __name__ == "__main__":
    main()
