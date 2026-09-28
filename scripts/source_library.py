#!/usr/bin/env python3
"""Deterministic validation for the Atlas knowledge source library.

The operational discovery register in ``data/sources.json`` has a different
purpose and schema. This module validates the bibliographic, claim-oriented
library in ``sources/`` without making network requests or editing files.
"""
from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from contribution_quality import _host_is_public


SOURCE_TYPES = {
    "regulation",
    "consolidated_legislation",
    "treaty",
    "official_guidance",
    "official_framework",
    "policy_document",
    "standard",
    "technical_report",
    "research_report",
    "systematic_review",
    "meta_analysis",
    "peer_reviewed_article",
    "randomized_controlled_trial",
    "preprint",
}
PRIMARY_OR_SECONDARY = {"primary", "secondary"}
LEGAL_EFFECT = {"binding", "non_binding", "voluntary", "not_applicable"}
PEER_REVIEW_STATUS = {"peer_reviewed", "preprint", "not_applicable"}
SOURCE_STATUS = {"active", "superseded", "archived"}
CLAIM_KINDS = {"source_statement", "reasonable_inference", "atlas_synthesis"}
EVIDENCE_STATUSES = {
    "SUPPORTED",
    "SUPPORTED_WITH_LIMITS",
    "CONTESTED",
    "EVIDENCE_GAP",
}
ATLAS_TOPICS = {
    "AI-geletterdheid",
    "Lesgeven en leren met AI",
    "Toetsing en examinering",
    "Privacy en AVG",
    "AI Act en wetgeving",
    "Beleid en governance",
    "Veilige AI-omgeving",
    "Implementatie en adoptie",
    "Professionalisering",
    "Curriculumontwikkeling",
    "Onderzoek",
    "Data en infrastructuur",
    "Standaarden en interoperabiliteit",
    "Subsidies en financiering",
    "Praktijkvoorbeelden",
    "Publieke waarden en ethiek",
}
SCIENTIFIC_TYPES = {
    "systematic_review",
    "meta_analysis",
    "peer_reviewed_article",
    "randomized_controlled_trial",
    "preprint",
}
SOURCE_REQUIRED_FIELDS = {
    "source_id",
    "title",
    "author_or_organisation",
    "publication_date",
    "url_or_doi",
    "source_type",
    "primary_or_secondary",
    "topics",
    "jurisdiction",
    "claims_supported",
    "reliability_notes",
    "limitations",
    "legal_effect",
    "peer_review_status",
    "last_verified",
    "status",
}
MOJIBAKE = re.compile(r"[\u0080-\u009f]|[\u00c2\u00c3][\u0080-\u00bf]")
SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PARTIAL_DATE = re.compile(r"^\d{4}(?:-\d{2}(?:-\d{2})?)?$")
FULL_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _nonempty_string(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _full_date(value) -> date | None:
    if not isinstance(value, str) or not FULL_DATE.fullmatch(value):
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None


def _valid_publication_date(value) -> bool:
    if not isinstance(value, str) or not PARTIAL_DATE.fullmatch(value):
        return False
    try:
        if len(value) == 4:
            date(int(value), 1, 1)
        elif len(value) == 7:
            date.fromisoformat(value + "-01")
        else:
            date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _publication_date_is_future(value: str, today: date) -> bool:
    if len(value) == 4:
        return int(value) > today.year
    if len(value) == 7:
        return (int(value[:4]), int(value[5:7])) > (today.year, today.month)
    return date.fromisoformat(value) > today


def _canonical_locator(value: str) -> str | None:
    if not _nonempty_string(value) or any(character.isspace() for character in value):
        return None
    try:
        parsed = urlsplit(value.strip())
        host = parsed.hostname or ""
        port = parsed.port
    except ValueError:
        return None
    if (
        parsed.scheme.lower() != "https"
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or port not in {None, 443}
        or not _host_is_public(host)
        or (
            host.lower() == "doi.org"
            and not re.fullmatch(r"/10\.\d{4,9}/[^\s/]+(?:/[^\s]+)*", parsed.path)
        )
    ):
        return None
    path = parsed.path.rstrip("/") or "/"
    return urlunsplit(("https", host.lower(), path, parsed.query, ""))


def _list_of_strings(value, *, allow_empty: bool = False) -> bool:
    return (
        isinstance(value, list)
        and (allow_empty or bool(value))
        and all(_nonempty_string(item) for item in value)
    )


def _encoding_errors(value, path="sources"):
    if isinstance(value, str) and MOJIBAKE.search(value):
        yield f"{path}: text contains likely encoding corruption"
    elif isinstance(value, dict):
        for key, item in value.items():
            yield from _encoding_errors(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from _encoding_errors(item, f"{path}[{index}]")


def source_library_issues(root: Path, *, today: date | None = None):
    """Return ``(errors, warnings)`` for the library below ``root``."""
    root = Path(root).resolve()
    today = today or date.today()
    errors: list[str] = []
    warnings: list[dict] = []
    library_path = root / "sources" / "sources.json"
    claims_path = root / "sources" / "claim-links.json"
    records_path = root / "data" / "records.json"

    for path in (library_path, claims_path, records_path):
        if not path.is_file():
            errors.append(f"Required source-library file is missing: {path.relative_to(root)}")
    if errors:
        return errors, warnings

    try:
        library = _read_json(library_path)
        claim_index = _read_json(claims_path)
        records = _read_json(records_path)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        return [f"Source library is not valid UTF-8 JSON: {exc}"], warnings

    errors.extend(_encoding_errors(library, "sources/sources.json"))
    errors.extend(_encoding_errors(claim_index, "sources/claim-links.json"))
    if not isinstance(library, dict) or library.get("schema_version") != "1.0":
        errors.append("sources/sources.json: schema_version must be '1.0'")
    if not isinstance(claim_index, dict) or claim_index.get("schema_version") != "1.0":
        errors.append("sources/claim-links.json: schema_version must be '1.0'")
    for path, payload in (("sources/sources.json", library), ("sources/claim-links.json", claim_index)):
        reviewed = _full_date(payload.get("last_reviewed")) if isinstance(payload, dict) else None
        if reviewed is None or reviewed > today:
            errors.append(f"{path}: last_reviewed must be a non-future full ISO date")
    sources = library.get("sources") if isinstance(library, dict) else None
    claims = claim_index.get("claims") if isinstance(claim_index, dict) else None
    if not isinstance(sources, list) or not sources:
        errors.append("sources/sources.json: sources must be a non-empty list")
        sources = []
    if not isinstance(claims, list) or not claims:
        errors.append("sources/claim-links.json: claims must be a non-empty list")
        claims = []

    record_by_id = {
        item.get("id"): item for item in records
        if isinstance(item, dict) and _nonempty_string(item.get("id"))
    }
    source_ids: list[str] = []
    locators: list[str] = []
    source_by_id: dict[str, dict] = {}
    freshness_days = library.get("verification_window_days", 90) if isinstance(library, dict) else 90
    if not isinstance(freshness_days, int) or not 1 <= freshness_days <= 3650:
        errors.append("sources/sources.json: verification_window_days must be an integer from 1 to 3650")
        freshness_days = 90

    for index, source in enumerate(sources):
        prefix = f"sources/sources.json.sources[{index}]"
        if not isinstance(source, dict):
            errors.append(f"{prefix}: source must be an object")
            continue
        missing = sorted(SOURCE_REQUIRED_FIELDS - source.keys())
        if missing:
            errors.append(f"{prefix}: missing required fields: {', '.join(missing)}")
        source_id = source.get("source_id")
        if not _nonempty_string(source_id) or not SLUG.fullmatch(source_id):
            errors.append(f"{prefix}.source_id: use a lowercase hyphenated stable identifier")
        else:
            source_ids.append(source_id)
            source_by_id[source_id] = source
        for field in ("title", "author_or_organisation", "jurisdiction", "reliability_notes", "limitations"):
            if not _nonempty_string(source.get(field)):
                errors.append(f"{prefix}.{field}: non-empty text is required")
        if not _valid_publication_date(source.get("publication_date")):
            errors.append(f"{prefix}.publication_date: use YYYY, YYYY-MM or YYYY-MM-DD")
        elif _publication_date_is_future(source["publication_date"], today):
            errors.append(f"{prefix}.publication_date: date cannot be in the future")
        locator = _canonical_locator(source.get("url_or_doi"))
        if locator is None:
            errors.append(f"{prefix}.url_or_doi: a public HTTPS URL or https://doi.org/ URL is required")
        else:
            locators.append(locator)
        if source.get("source_type") not in SOURCE_TYPES:
            errors.append(f"{prefix}.source_type: invalid source type")
        if source.get("primary_or_secondary") not in PRIMARY_OR_SECONDARY:
            errors.append(f"{prefix}.primary_or_secondary: must be primary or secondary")
        if source.get("legal_effect") not in LEGAL_EFFECT:
            errors.append(f"{prefix}.legal_effect: invalid legal effect")
        peer_status = source.get("peer_review_status")
        if peer_status not in PEER_REVIEW_STATUS:
            errors.append(f"{prefix}.peer_review_status: invalid peer-review status")
        if source.get("source_type") in SCIENTIFIC_TYPES and peer_status == "not_applicable":
            errors.append(f"{prefix}: scientific sources must state peer_reviewed or preprint")
        if source.get("source_type") in SCIENTIFIC_TYPES and source.get("legal_effect") != "not_applicable":
            errors.append(f"{prefix}: scientific evidence must use legal_effect=not_applicable")
        if source.get("source_type") == "regulation" and source.get("legal_effect") != "binding":
            errors.append(f"{prefix}: regulations must be distinguished as binding law")
        if source.get("source_type") == "consolidated_legislation" and source.get("legal_effect") != "not_applicable":
            errors.append(f"{prefix}: consolidated legislation has no independent legal effect")
        if source.get("source_type") == "standard" and source.get("legal_effect") != "voluntary":
            errors.append(f"{prefix}: standards must use legal_effect=voluntary")
        if source.get("source_type") in {"official_guidance", "official_framework", "policy_document"} and source.get("legal_effect") == "binding":
            errors.append(f"{prefix}: guidance, frameworks and policy documents cannot be marked binding")
        if source.get("source_type") in {"systematic_review", "meta_analysis"} and source.get("primary_or_secondary") != "secondary":
            errors.append(f"{prefix}: reviews and meta-analyses must be marked secondary")
        if source.get("source_type") == "preprint" and peer_status != "preprint":
            errors.append(f"{prefix}: a preprint must be marked peer_review_status=preprint")
        topics = source.get("topics")
        if not _list_of_strings(topics):
            errors.append(f"{prefix}.topics: at least one Atlas topic is required")
        elif unknown := sorted(set(topics) - ATLAS_TOPICS):
            errors.append(f"{prefix}.topics: unknown Atlas topics: {', '.join(unknown)}")
        if not _list_of_strings(source.get("claims_supported")):
            errors.append(f"{prefix}.claims_supported: at least one bounded claim is required")
        verified = _full_date(source.get("last_verified"))
        if verified is None:
            errors.append(f"{prefix}.last_verified: use a full ISO date")
        elif verified > today:
            errors.append(f"{prefix}.last_verified: date cannot be in the future")
        elif source.get("status") == "active" and (today - verified).days > freshness_days:
            warnings.append({
                "kind": "source_verification_overdue",
                "sourceId": source_id,
                "lastVerified": verified.isoformat(),
                "ageDays": (today - verified).days,
            })
        if source.get("status") not in SOURCE_STATUS:
            errors.append(f"{prefix}.status: invalid source status")
        if source.get("status") == "superseded" and not _nonempty_string(source.get("superseded_by")):
            errors.append(f"{prefix}: superseded sources require superseded_by as a source ID")
        if source.get("status") == "archived" and not _nonempty_string(source.get("archive_reason")):
            errors.append(f"{prefix}: archived sources require archive_reason")
        linked_records = source.get("atlas_record_ids", [])
        if not _list_of_strings(linked_records, allow_empty=True):
            errors.append(f"{prefix}.atlas_record_ids: must be a list of record IDs")
        else:
            for record_id in linked_records:
                if record_id not in record_by_id:
                    errors.append(f"{prefix}.atlas_record_ids: unknown record ID {record_id}")

    for source_id in sorted({item for item in source_ids if source_ids.count(item) > 1}):
        errors.append(f"Duplicate source_id: {source_id}")
    for locator in sorted({item for item in locators if locators.count(item) > 1}):
        errors.append(f"Duplicate canonical source URL/DOI: {locator}")
    for source in sources:
        if (
            isinstance(source, dict)
            and source.get("status") == "superseded"
            and _nonempty_string(source.get("superseded_by"))
        ):
            replacement = source.get("superseded_by")
            if replacement not in source_by_id:
                errors.append(f"{source.get('source_id')}: superseded_by references unknown source {replacement}")

    checked_chains: set[str] = set()
    for start_id in sorted(source_by_id):
        if source_by_id[start_id].get("status") != "superseded" or start_id in checked_chains:
            continue
        chain: list[str] = []
        current_id = start_id
        while current_id in source_by_id and source_by_id[current_id].get("status") == "superseded":
            if current_id in chain:
                cycle = chain[chain.index(current_id):] + [current_id]
                errors.append(f"Superseded source chain contains a cycle: {' -> '.join(cycle)}")
                break
            chain.append(current_id)
            replacement = source_by_id[current_id].get("superseded_by")
            if not _nonempty_string(replacement) or replacement not in source_by_id:
                break
            current_id = replacement
        else:
            if current_id in source_by_id and source_by_id[current_id].get("status") != "active":
                errors.append(f"Superseded source chain must terminate at an active source: {start_id} -> {current_id}")
        checked_chains.update(chain)

    claim_ids: list[str] = []
    for index, claim in enumerate(claims):
        prefix = f"sources/claim-links.json.claims[{index}]"
        if not isinstance(claim, dict):
            errors.append(f"{prefix}: claim must be an object")
            continue
        claim_id = claim.get("claim_id")
        if not _nonempty_string(claim_id) or not SLUG.fullmatch(claim_id):
            errors.append(f"{prefix}.claim_id: use a lowercase hyphenated stable identifier")
        else:
            claim_ids.append(claim_id)
        for field in ("claim", "assessment"):
            if not _nonempty_string(claim.get(field)):
                errors.append(f"{prefix}.{field}: non-empty text is required")
        if claim.get("claim_kind") not in CLAIM_KINDS:
            errors.append(f"{prefix}.claim_kind: invalid claim kind")
        evidence_status = claim.get("evidence_status")
        if evidence_status not in EVIDENCE_STATUSES:
            errors.append(f"{prefix}.evidence_status: invalid evidence status")
        linked_sources = claim.get("source_ids")
        if not _list_of_strings(linked_sources, allow_empty=True):
            errors.append(f"{prefix}.source_ids: must be a list of source IDs")
            linked_sources = []
        if evidence_status != "EVIDENCE_GAP" and not linked_sources:
            errors.append(f"{prefix}: supported or contested claims require at least one source")
        for source_id in linked_sources:
            if source_id not in source_by_id:
                errors.append(f"{prefix}.source_ids: unknown source ID {source_id}")
            elif evidence_status != "EVIDENCE_GAP" and source_by_id[source_id].get("status") != "active":
                errors.append(f"{prefix}.source_ids: non-gap claims may only rely on active sources ({source_id})")
        location = claim.get("location")
        if not isinstance(location, dict) or not _nonempty_string(location.get("path")):
            errors.append(f"{prefix}.location: path is required")
        else:
            relative = Path(location["path"])
            if relative.is_absolute() or ".." in relative.parts or not (root / relative).is_file():
                errors.append(f"{prefix}.location.path: must reference an existing repository file")
            record_id = location.get("record_id")
            field = location.get("field")
            if relative.as_posix() == "data/records.json":
                if not _nonempty_string(record_id) or not _nonempty_string(field):
                    errors.append(f"{prefix}.location: record_id and field are required for data/records.json")
            elif record_id is not None or field is not None:
                errors.append(f"{prefix}.location: record_id and field are only valid for data/records.json")
            if _nonempty_string(record_id):
                record = record_by_id.get(record_id)
                if record is None:
                    errors.append(f"{prefix}.location.record_id: unknown record ID {record_id}")
                elif _nonempty_string(field) and field not in record:
                    errors.append(f"{prefix}.location.field: unknown field {field} on {record_id}")
        reviewed = _full_date(claim.get("last_reviewed"))
        if reviewed is None or reviewed > today:
            errors.append(f"{prefix}.last_reviewed: use a non-future full ISO date")
        if not isinstance(claim.get("time_sensitive"), bool):
            errors.append(f"{prefix}.time_sensitive: boolean is required")
        review_by = claim.get("review_by")
        if claim.get("time_sensitive"):
            due = _full_date(review_by)
            if due is None:
                errors.append(f"{prefix}.review_by: time-sensitive claims require a full ISO date")
            elif due < today:
                warnings.append({
                    "kind": "claim_review_overdue",
                    "claimId": claim_id,
                    "reviewBy": due.isoformat(),
                })
        elif review_by is not None and _full_date(review_by) is None:
            errors.append(f"{prefix}.review_by: use a full ISO date or null")

    for claim_id in sorted({item for item in claim_ids if claim_ids.count(item) > 1}):
        errors.append(f"Duplicate claim_id: {claim_id}")

    return errors, warnings


def source_library_errors(root: Path):
    """Compatibility helper for release checks that only consume errors."""
    return source_library_issues(root)[0]
