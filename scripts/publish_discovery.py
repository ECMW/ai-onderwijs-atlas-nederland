#!/usr/bin/env python3
"""Send strictly admitted discoveries through the existing protected intake.

Runs only as trusted main workflow code. It does not publish records or merge PRs.
Every issued candidate is independently readmitted by publish_submission.py.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
import os
from pathlib import Path
import re

from contribution_quality import _public_https_url, canonical_url
from discover_official_content import url_key
from maintenance_core import load_json, save_json
from publish_submission import BOT, GitHub, body_hash, marker, read_marker

MARKER = "atlas-discovery-v1"
LABEL = "atlas-discovery"
MAX_PER_RUN = 3


def validated_candidates(document):
    if not isinstance(document, dict) or document.get("version") != 1:
        raise ValueError("Unknown discovery output version")
    candidates = document.get("approved")
    if not isinstance(candidates, list) or len(candidates) > MAX_PER_RUN:
        raise ValueError("Discovery batch exceeds the bounded intake")
    seen = set()
    for item in candidates:
        if not isinstance(item, dict) or item.get("autoPublishEligible") is not True:
            raise ValueError("Discovery lacks strict source admission")
        _public_https_url(item.get("url", ""))
        url = url_key(item["url"])
        if url in seen:
            raise ValueError("Repeated discovery URL")
        seen.add(url)
        if not isinstance(item.get("title"), str) or not 8 <= len(item["title"]) <= 200:
            raise ValueError("Invalid discovery title")
        if not isinstance(item.get("body"), str) or not 100 <= len(item["body"]) <= 20000:
            raise ValueError("Invalid discovery form")
        if not re.fullmatch(r"[0-9a-f]{64}", str(item.get("evidenceHash", ""))):
            raise ValueError("Missing source evidence hash")
    return candidates


def issue_metadata(item):
    return {"urlHash": hashlib.sha256(url_key(item["url"]).encode()).hexdigest(),
            "evidenceHash": item["evidenceHash"], "bodySha": body_hash(item["body"])}


def matching_issue(issues, metadata):
    matches = [issue for issue in issues if "pull_request" not in issue
               and issue.get("user", {}).get("login") == BOT
               and read_marker(issue.get("body"), MARKER).get("urlHash") == metadata["urlHash"]]
    if len(matches) > 1:
        raise ValueError("Multiple discovery issues refer to the same source; review required")
    return matches[0] if matches else None


def publish(api, document):
    candidates = validated_candidates(document)
    if not candidates:
        return []
    # The persistent GitHub issue is the deduplication anchor even after cache loss.
    issues = []
    for page in range(1, 11):
        batch = api.request("GET", f"issues?state=all&labels={LABEL}&per_page=100&page={page}")
        issues.extend(batch)
        if len(batch) < 100:
            break
    else:
        raise RuntimeError("Discovery history exceeds the bounded scan")
    if api.request("GET", "labels/" + LABEL, missing=True) is None:
        api.request("POST", "labels", {"name": LABEL, "color": "0E8A16",
                    "description": "Brongecontroleerde vondst uit de periodieke Atlas-bronverkenning"})
    outcomes = []
    for item in candidates:
        metadata = issue_metadata(item)
        source_context = {"url": item["url"], "discoveryKey": item.get("discoveryKey", url_key(item["url"]))}
        expected_body = item["body"] + "\n\n" + marker(metadata, MARKER)
        issue = matching_issue(issues, metadata)
        if issue:
            number = issue["number"]
            if issue.get("state") != "open":
                outcomes.append({"issue": number, **source_context, "action": "already_handled"})
                continue
            if issue.get("body") != expected_body:
                outcomes.append({"issue": number, **source_context, "action": "changed_issue_requires_review"})
                continue
        else:
            issue = api.request("POST", "issues", {"title": "[Bronverkenning] " + item["title"],
                                "body": expected_body, "labels": ["atlas-aanvulling", LABEL]})
            number = issue["number"]
            issues.append(issue)
        # GITHUB_TOKEN-created issues do not trigger other workflows implicitly.
        api.dispatch("process-atlas-submission.yml", inputs={"issue_number": str(number)})
        outcomes.append({"issue": number, **source_context, "action": "independent_admission_requested"})
    return outcomes


def apply_outcomes(state, outcomes, at=None):
    """Closed or edited issues must not occupy every later discovery batch."""
    for outcome in outcomes:
        entry = state.get("urls", {}).get(outcome.get("discoveryKey", url_key(outcome["url"])))
        if entry is None:
            continue
        entry["issueNumber"] = outcome["issue"]
        entry["brokerAction"] = outcome["action"]
        terminal = {"already_handled": "handled", "changed_issue_requires_review": "broker_review"}
        if outcome["action"] in terminal:
            entry["status"] = terminal[outcome["action"]]
        elif outcome["action"] == "independent_admission_requested":
            entry["status"] = "submitted"
            next_check = (at or datetime.now(timezone.utc)) + timedelta(days=1)
            entry["nextCheck"] = next_check.replace(microsecond=0).isoformat().replace("+00:00", "Z")
    return state


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=Path("discovery-output/approved-submissions.json"))
    parser.add_argument("--output", type=Path, default=Path("discovery-output/intake-result.json"))
    parser.add_argument("--state", type=Path, default=Path("discovery-state/state.json"))
    args = parser.parse_args()
    api = GitHub(os.environ["GITHUB_REPOSITORY"], os.environ["GH_TOKEN"])
    result = publish(api, json.loads(args.input.read_text(encoding="utf-8")))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    save_json(args.state, apply_outcomes(load_json(args.state, {}), result))
    print(json.dumps(result))


if __name__ == "__main__":
    main()
