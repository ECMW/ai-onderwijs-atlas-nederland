"""Editorial exclusions are independent of source verification and availability."""
from datetime import date


def publication_exclusion_errors(record):
    if "publicationExclusion" not in record:
        return []
    value = record["publicationExclusion"]
    identifier = record.get("id", "<zonder-id>")
    if not isinstance(value, dict) or not isinstance(value.get("reason"), str) or not value["reason"].strip():
        return [f"{identifier}: publicationExclusion vereist een reden"]
    try:
        decided_on = value.get("decidedOn")
        if not isinstance(decided_on, str) or date.fromisoformat(decided_on).isoformat() != decided_on:
            raise ValueError
    except ValueError:
        return [f"{identifier}: publicationExclusion vereist een geldige decidedOn"]
    return []
