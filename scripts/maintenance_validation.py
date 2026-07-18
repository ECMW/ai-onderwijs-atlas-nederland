"""Proposal enrichment and validation against the canonical Atlas schema."""
from urllib.parse import urlsplit

RECORD_TYPES = {"organization", "programme", "product", "service", "guidance", "training", "subsidy",
                "funding_call", "pilot", "practice_example", "community", "standard", "legislation",
                "policy_document", "research_project", "identified_need", "white_spot"}
STATUSES = {"available", "pilot", "in_development", "planned", "open_call", "closed_call", "archived",
            "needs_verification", "identified_need", "unknown"}
VERIFY = {"verified", "recently_checked", "stale", "changed", "broken_source", "needs_review"}


def enrich(proposal: dict) -> dict:
    matches = proposal.get("possibleDuplicates", [])
    evidence = proposal.get("evidence", {})
    target = str(proposal["target"])
    target_record = None if target.startswith(("http", "source-")) else target
    old_values = proposal.get("oldValues")
    proposed_values = proposal.get("suggestedRecord")
    if proposal["action"] == "update" and "before" in evidence:
        old_values = {"deadlineFacts": evidence.get("before", [])}
        proposed_values = {"deadlineFacts": evidence.get("after", [])}
    elif proposal["action"] == "update" and matches:
        old_values = {"recordId": matches[0]["id"], "title": matches[0].get("title")}
        proposed_values = {"sourceSignal": evidence.get("unit")}
    uncertainties = []
    if proposal["source"].get("sourceRole") != "primary":
        uncertainties.append("No primary source evidence")
    if proposal["action"] == "investigate":
        uncertainties.append("Signal requires human interpretation")
    if proposal["action"] == "add":
        uncertainties.append("Description, audiences, sectors and themes still require source verification")
    proposal.update({
        "proposalId": proposal["id"],
        "targetRecordId": target_record,
        "checkedAt": proposal["detectedAt"],
        "primarySources": ([proposal["source"]["sourceUrl"]]
                           if proposal["source"].get("sourceRole") == "primary" else []),
        "oldValues": old_values,
        "proposedValues": proposed_values,
        "materiality": ("high" if "deadline" in proposal["reason"].lower()
                        or proposal["action"] == "archive" else "medium"),
        "duplicateRisk": "high" if matches else "low",
        "checksPerformed": ["source_fetch", "source_role", "canonical_url", "title_similarity",
                            "schema_enums", "source_url_format"],
        "uncertainties": uncertainties,
        "recommendedDecision": "human_review",
    })
    organization = proposal["source"].get("organizationId")
    proposal["possibleRelations"] = ([{"relationType": "offered_by", "targetId": organization}]
                                     if organization else [])
    return proposal


def validate(proposal: dict) -> None:
    required = {"proposalId", "action", "detectedAt", "reason", "primarySources", "confidence",
                "materiality", "duplicateRisk", "checksPerformed", "uncertainties", "recommendedDecision"}
    missing = required - proposal.keys()
    if missing:
        raise ValueError(f"Proposal misses required fields: {sorted(missing)}")
    if proposal["action"] not in {"add", "update", "archive", "investigate"}:
        raise ValueError(f"Invalid action: {proposal['action']}")
    record = proposal.get("proposedValues")
    if not record:
        return
    if record.get("recordType") not in RECORD_TYPES and record.get("recordType") != "Nog niet ingevuld":
        raise ValueError(f"Invalid recordType: {record.get('recordType')}")
    if record.get("status") not in STATUSES:
        raise ValueError(f"Invalid status: {record.get('status')}")
    if record.get("verificationStatus") not in VERIFY:
        raise ValueError(f"Invalid verificationStatus: {record.get('verificationStatus')}")
    for url in record.get("sourceUrls", []):
        value = url.get("url") if isinstance(url, dict) else url
        if not value or urlsplit(value).scheme not in {"http", "https"}:
            raise ValueError(f"Invalid source URL: {value}")


def enrich_and_validate(proposals: list[dict]) -> list[dict]:
    for proposal in proposals:
        validate(enrich(proposal))
    return proposals
