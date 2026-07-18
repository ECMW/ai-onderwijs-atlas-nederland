#!/usr/bin/env python3
"""Run the daily detect-compare-propose-report cycle. Never mutates Atlas records."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from maintenance_core import load_json, run_checks, save_json
from maintenance_proposals import active_proposals, proposals_for_event
from maintenance_reporting import build_daily_report, daily_report_markdown, proposal_markdown
from maintenance_validation import RECORD_TYPES, enrich_and_validate

ROOT = Path(__file__).resolve().parents[1]


def validate_sources(sources: list[dict]) -> None:
    required = {"id", "name", "owner", "baseUrl", "sourceType", "sourceRole", "trustLevel", "themes", "sectors",
                "schedule", "extraction", "allowedRecordTypes", "operational"}
    ids = set()
    for source in sources:
        missing = required - source.keys()
        if missing:
            raise ValueError(f"Source {source.get('id', '?')} misses: {sorted(missing)}")
        if source["id"] in ids:
            raise ValueError(f"Duplicate source ID: {source['id']}")
        if source["sourceRole"] not in {"primary", "discovery", "verification"}:
            raise ValueError(f"Invalid source role: {source['sourceRole']}")
        if source["sourceType"] not in {"official", "authoritative", "secondary"}:
            raise ValueError(f"Invalid source type: {source['sourceType']}")
        if source["schedule"].get("frequency") not in {"daily", "weekly", "monthly"}:
            raise ValueError(f"Invalid source frequency: {source['schedule']}")
        invalid_types = set(source["allowedRecordTypes"]) - RECORD_TYPES
        if invalid_types:
            raise ValueError(f"Invalid allowed record types: {sorted(invalid_types)}")
        if not str(source["baseUrl"]).startswith(("https://", "http://")):
            raise ValueError(f"Invalid source URL: {source['baseUrl']}")
        ids.add(source["id"])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--state-dir", type=Path)
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    state_dir = (args.state_dir or root / "maintenance-state").resolve()
    output_dir = (args.output_dir or root / "maintenance-output").resolve()

    config = load_json(root / "config" / "maintenance.json", {})
    sources = load_json(root / "data" / "sources.json", [])
    records = load_json(root / "data" / "records.json", [])
    decisions = load_json(root / "data" / "proposal-decisions.json", {"decisions": []})
    relations = load_json(root / "data" / "relations.json", [])
    validate_sources(sources)
    if not isinstance(records, list) or not isinstance(relations, list):
        raise ValueError("Canonical records and relations must be JSON arrays")

    states = load_json(state_dir / "state.json", {})
    ledger = load_json(state_dir / "proposal-ledger.json", {})
    events, new_states = run_checks(sources, states, config)
    generated = []
    source_by_id = {source["id"]: source for source in sources}
    for event in events:
        generated += proposals_for_event(source_by_id[event["sourceId"]], event, records, config)
    proposals, new_ledger = active_proposals(generated, decisions, ledger)
    enrich_and_validate(proposals)
    report = build_daily_report(events, proposals)

    save_json(state_dir / "state.json", new_states)
    save_json(state_dir / "proposal-ledger.json", new_ledger)
    save_json(output_dir / "events.json", events)
    save_json(output_dir / "daily-report.json", report)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "daily-report.md").write_text(daily_report_markdown(report), encoding="utf-8")
    proposal_dir = output_dir / "proposals"
    proposal_dir.mkdir(parents=True, exist_ok=True)
    for pattern in ("*.json", "*.md"):
        for stale in proposal_dir.glob(pattern):
            stale.unlink()
    for proposal in proposals:
        save_json(proposal_dir / f"{proposal['id']}.json", proposal)
        (proposal_dir / f"{proposal['id']}.md").write_text(proposal_markdown(proposal), encoding="utf-8")

    print(json.dumps(report["summary"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
