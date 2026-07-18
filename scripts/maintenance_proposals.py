"""Create idempotent review proposals and compact daily reports."""
from __future__ import annotations

import hashlib
import json
from difflib import SequenceMatcher
from urllib.parse import urlsplit

from maintenance_normalize import canonical_url, fold


def evidence_hash(event: dict) -> str:
    material = json.dumps({k: v for k, v in event.items() if k not in ("detectedAt",)}, sort_keys=True)
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def proposal_id(source_id: str, action: str, target: str, evidence: str) -> str:
    raw = f"{source_id}|{action}|{target}|{evidence}"
    return "proposal-" + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def record_urls(record: dict) -> set[str]:
    values = record.get("sourceUrls") or []
    if isinstance(values, str):
        values = [values]
    urls = []
    for value in values:
        if isinstance(value, dict):
            value = value.get("url")
        if value:
            urls.append(canonical_url(value))
    return set(urls)


def find_matches(unit: dict, records: list[dict]) -> list[dict]:
    url = canonical_url(unit.get("url", ""))
    label = fold(unit.get("label", ""))
    matches = []
    for record in records:
        exact = bool(url and url in record_urls(record))
        title_score = SequenceMatcher(None, label, fold(record.get("title", ""))).ratio() if label else 0
        if exact or title_score >= 0.86:
            matches.append({"id": record["id"], "title": record.get("title"),
                            "reason": "canonical_url" if exact else "similar_title",
                            "score": 1.0 if exact else round(title_score, 2)})
    return sorted(matches, key=lambda x: (-x["score"], x["id"]))[:5]


def source_context(source: dict) -> dict:
    return {"sourceId": source["id"], "sourceName": source["name"], "sourceUrl": source["baseUrl"],
            "organizationId": source.get("organizationId"),
            "sourceType": source.get("sourceType", "secondary"),
            "sourceRole": source.get("sourceRole", "discovery"),
            "trustLevel": source.get("trustLevel", "unknown")}


def make_proposal(source: dict, event: dict, action: str, target: str, reason: str,
                  evidence: dict, matches: list[dict] | None = None, confidence: str = "medium") -> dict:
    ev_hash = evidence_hash({"event": event["type"], "evidence": evidence, "target": target})
    return {
        "id": proposal_id(source["id"], action, target, ev_hash),
        "action": action,
        "target": target,
        "title": reason,
        "reason": reason,
        "confidence": confidence,
        "status": "requires_human_review",
        "publicationAllowed": False,
        "detectedAt": event["detectedAt"],
        "evidenceHash": ev_hash,
        "source": source_context(source),
        "evidence": evidence,
        "possibleDuplicates": matches or [],
        "suggestedRecord": None,
        "reviewGuidance": "Verify the official source and choose accept, reject or request changes."
    }


def proposals_for_event(source: dict, event: dict, records: list[dict], config: dict) -> list[dict]:
    if not event.get("actionable"):
        return []
    if event["type"] == "SOURCE_CHANGED":
        current = event.get("current", {})
        return [make_proposal(source, event, "investigate", source["id"],
                              f"Extraction or location changed for {source['name']}",
                              {"reason": event["reason"], "url": source["baseUrl"],
                               "contentHash": current.get("contentHash"),
                               "structureHash": current.get("structureHash")}, confidence="low")]
    if event["type"] == "UNREACHABLE":
        proposal = make_proposal(source, event, "investigate", source["id"],
                                 f"Source repeatedly unreachable: {source['name']}",
                                 {"reason": event["reason"]}, confidence="low")
        proposal["evidence"]["failureCount"] = event["failureCount"]
        return [proposal]
    if event["type"] == "REMOVED":
        proposal = make_proposal(source, event, "investigate", source["id"],
                                 f"Official source may have been removed: {source['name']}",
                                 {"httpStatus": event.get("reason")}, confidence="medium")
        proposal["evidence"]["failureCount"] = event["failureCount"]
        return [proposal]
    if event["type"] != "CHANGED":
        return []

    proposals = []
    role = source.get("sourceRole", "discovery")
    for unit in event.get("addedUnits", []):
        matches = find_matches(unit, records)
        allowed = source.get("allowedRecordTypes") or []
        action = "update" if matches else ("add" if role == "primary" and len(allowed) == 1 else "investigate")
        reason = ("Existing registration may have changed" if matches else
                  "Potential new official offer" if action == "add" else "Potential new offer needs a primary source")
        proposal = make_proposal(source, event, action, matches[0]["id"] if matches else unit["url"],
                                 reason, {"unit": unit}, matches,
                                 "high" if matches and matches[0]["reason"] == "canonical_url" else "medium")
        if action == "add":
            proposal["suggestedRecord"] = {
                "title": unit.get("label") or "Nog niet ingevuld",
                "recordType": allowed[0],
                "status": "needs_verification", "verificationStatus": "needs_review",
                "organizationIds": [source["organizationId"]] if source.get("organizationId") else [],
                "providerName": source.get("owner") or source["name"],
                "description": "Nog niet ingevuld", "audiences": [], "sectors": [], "themes": [],
                "sourceUrls": [{"label": "Official source", "url": unit["url"], "sourceType": "official"}]
            }
        proposals.append(proposal)
    for unit in event.get("removedUnits", []):
        matches = find_matches(unit, records)
        action = "archive" if matches else "investigate"
        proposals.append(make_proposal(source, event, action, matches[0]["id"] if matches else unit["url"],
                                       "Registered source link disappeared" if matches else "Source link disappeared",
                                       {"unit": unit, "requiresRepeatedSuccessfulAbsence": True}, matches, "low"))
    if event.get("deadlineChanged"):
        proposals.insert(0, make_proposal(source, event, "update", source["id"],
                                          f"Deadline information changed at {source['name']}",
                                          {"before": event.get("previous", {}).get("deadlineFacts", []),
                                           "after": event.get("current", {}).get("deadlineFacts", [])}, confidence="high"))
    return proposals


def active_proposals(proposals: list[dict], decisions: dict, ledger: dict) -> tuple[list[dict], dict]:
    rejected = {(d.get("proposalId"), d.get("evidenceHash")) for d in decisions.get("decisions", [])
                if d.get("decision") == "rejected"}
    result = []
    updated = dict(ledger)
    for proposal in proposals:
        if (proposal["id"], proposal["evidenceHash"]) in rejected:
            continue
        previous = updated.get(proposal["id"], {})
        proposal["occurrences"] = int(previous.get("occurrences", 0)) + 1
        updated[proposal["id"]] = {"evidenceHash": proposal["evidenceHash"],
                                   "occurrences": proposal["occurrences"],
                                   "lastSeen": proposal["detectedAt"]}
        result.append(proposal)
    return result, updated
