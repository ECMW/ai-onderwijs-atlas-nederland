"""Editorial exclusions are independent of source verification and availability."""
from datetime import date
import re
import unicodedata


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


def duplicate_redirects(records, public_records):
    """Only a reviewed exclusion can redirect to an existing public item."""
    public_ids = {record.get('id') for record in public_records}
    redirects, errors = {}, []
    for record in records:
        exclusion = record.get('publicationExclusion')
        if not isinstance(exclusion, dict) or 'duplicateOf' not in exclusion:
            continue
        target = exclusion['duplicateOf']
        if not isinstance(target, str) or target not in public_ids or target == record.get('id'):
            errors.append(f"{record.get('id')}: duplicateOf vereist een bestaand publiek record")
        else:
            redirects[record['id']] = target
    return redirects, errors


def duplicate_title_errors(public_records):
    """Exact title/provider duplicates need review even if their types differ."""
    def normalize(value):
        text = unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode().lower()
        return re.sub(r'[^a-z0-9]+', ' ', text).strip()
    seen, errors = {}, []
    for record in public_records:
        key = (normalize(record.get('title')), normalize(record.get('providerName')))
        if not all(key):
            continue
        if key in seen:
            errors.append(f"Dubbele publieke titel en aanbieder: {seen[key]}, {record['id']}")
        else:
            seen[key] = record['id']
    return errors
