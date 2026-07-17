"""Deterministische kwaliteitscontrole voor openbare Atlas-bijdragen.

De controle bewijst geen inhoudelijke waarheid of aanbeveling. Zij controleert wel
of een toevoeging afgebakend is, geen bestaande data wijzigt, een bereikbare
offici?le bron heeft en herkenbaar aansluit op titel en aanbieder.
"""

from __future__ import annotations

import html
import ipaddress
import json
import re
import socket
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, asdict
from typing import Callable, Iterable


RECORD_TYPES = {
    "organization", "programme", "product", "service", "guidance", "training",
    "subsidy", "funding_call", "pilot", "practice_example", "community",
    "standard", "legislation", "policy_document", "research_project",
    "identified_need", "white_spot",
}
STATUSES = {
    "available", "pilot", "in_development", "planned", "open_call",
    "closed_call", "archived", "needs_verification", "identified_need", "unknown",
}
AUTO_TYPES = {
    "organization", "programme", "product", "service", "guidance", "training",
    "pilot", "practice_example", "community", "standard",
}
SECTORS = {"PO", "VO", "MBO", "HBO", "WO", "Onderzoek", "Overheid"}
THEMES = {
    "AI-geletterdheid", "Lesgeven en leren met AI", "Toetsing en examinering",
    "Privacy en AVG", "AI Act en wetgeving", "Beleid en governance",
    "Veilige AI-omgeving", "Implementatie en adoptie", "Professionalisering",
    "Curriculumontwikkeling", "Onderzoek", "Data en infrastructuur",
    "Standaarden en interoperabiliteit", "Subsidies en financiering",
    "Praktijkvoorbeelden", "Publieke waarden en ethiek",
}
GENERIC_TOKENS = {
    "ai", "bv", "b", "v", "de", "het", "een", "en", "voor", "van", "met",
    "in", "op", "onderwijs", "nederland", "organisatie", "product", "platform",
}
PRIVATE_HOSTS = {"localhost", "localhost.localdomain"}
ALLOWED_CHANGED_FILE = "data/records.json"
USER_AGENT = (
    "AI-Onderwijs-Atlas-contribution-check/1.0 "
    "(+https://ecmw.github.io/ai-onderwijs-atlas-nederland/)"
)


def normalize(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = text.encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def slug(value: object) -> str:
    return normalize(value).replace(" ", "-").strip("-")


def canonical_url(value: str) -> str:
    parsed = urllib.parse.urlsplit(value.strip())
    host = (parsed.hostname or "").lower()
    path = re.sub(r"/+", "/", parsed.path or "/").rstrip("/") or "/"
    return urllib.parse.urlunsplit((parsed.scheme.lower(), host, path, parsed.query, ""))


def _host_is_public(host: str) -> bool:
    if not host or host.lower() in PRIVATE_HOSTS or "." not in host:
        return False
    try:
        address = ipaddress.ip_address(host)
        return not (address.is_private or address.is_loopback or address.is_link_local)
    except ValueError:
        return True


def _visible_text(body: str) -> str:
    body = re.sub(r"<script\b.*?</script>|<style\b.*?</style>", " ", body, flags=re.I | re.S)
    body = re.sub(r"<[^>]+>", " ", body)
    return re.sub(r"\s+", " ", html.unescape(body)).strip()


@dataclass
class SourceCheck:
    url: str
    reachable: bool
    status: int | None
    final_url: str | None
    content_type: str | None
    title: str | None
    searchable_text: str
    error: str | None = None


def check_source(url: str, timeout: int = 20) -> SourceCheck:
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme.lower() != "https" or not _host_is_public(parsed.hostname or ""):
        return SourceCheck(url, False, None, None, None, None, "", "Alleen een publieke HTTPS-bron is toegestaan.")
    try:
        request = urllib.request.Request(
            url,
            headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/pdf;q=0.9,*/*;q=0.5"},
        )
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status = getattr(response, "status", 200)
            content_type = response.headers.get_content_type()
            raw = response.read(600_000)
            final_url = response.geturl()
        title = None
        text = ""
        if content_type in {"text/html", "application/xhtml+xml", "text/plain"}:
            decoded = raw.decode("utf-8", "ignore")
            match = re.search(r"<title[^>]*>(.*?)</title>", decoded, flags=re.I | re.S)
            title = _visible_text(match.group(1))[:240] if match else None
            text = _visible_text(decoded)[:300_000]
        searchable = normalize(" ".join(part for part in (url, final_url, title, text) if part))
        return SourceCheck(url, 200 <= status < 400, status, final_url, content_type, title, searchable)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, socket.timeout) as exc:
        status = getattr(exc, "code", None)
        return SourceCheck(url, False, status, None, None, None, "", f"{type(exc).__name__}: {exc}")


def source_matches_record(record: dict, source: SourceCheck) -> bool:
    if not source.reachable:
        return False
    haystack = source.searchable_text
    title = normalize(record.get("title"))
    provider = normalize(record.get("providerName"))
    if title and title in haystack:
        return True
    if provider and provider in haystack:
        return True
    tokens = [token for token in title.split() if len(token) >= 3 and token not in GENERIC_TOKENS]
    return bool(tokens) and sum(token in haystack for token in tokens) >= max(1, (len(tokens) + 1) // 2)


def _status_conflicts(record: dict, source_checks: Iterable[SourceCheck]) -> str | None:
    searchable = " ".join(check.searchable_text for check in source_checks if check.reachable)
    status = record.get("status")
    if status == "available" and re.search(r"\bpilot(?:plaatsen|fase)?\b", searchable):
        return "De offici\u00eble bron noemt een pilot; gebruik status 'pilot' of geef een directere bron."
    if status == "pilot" and "pilot" not in searchable:
        return "Status 'pilot' is niet herkenbaar in de offici\u00eble bron."
    if status == "in_development" and not any(term in searchable for term in ("ontwikkeling", "development", "roadmap")):
        return "Status 'in_development' is niet herkenbaar in de offici\u00eble bron."
    return None


def _record_errors(record: dict, all_ids: set[str]) -> list[str]:
    errors: list[str] = []
    record_id = record.get("id")
    prefix = f"{record_id or '<zonder id>'}: "
    if not record_id or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,99}", str(record_id)):
        errors.append(prefix + "id moet een unieke, kleine slug zijn.")
    if record.get("recordType") not in AUTO_TYPES:
        errors.append(prefix + "dit recordtype vraagt inhoudelijke beoordeling en wordt niet automatisch gepubliceerd.")
    if record.get("recordType") not in RECORD_TYPES:
        errors.append(prefix + "ongeldig recordtype.")
    if record.get("status") not in STATUSES or record.get("status") in {"unknown", "needs_verification", "identified_need"}:
        errors.append(prefix + "kies een concrete status.")
    if record.get("verificationStatus") != "needs_review" or record.get("lastVerified"):
        errors.append(prefix + "nieuwe bijdragen starten met verificationStatus 'needs_review' en zonder lastVerified.")
    for field, minimum, maximum in (("title", 2, 160), ("providerName", 2, 160), ("description", 40, 900)):
        value = str(record.get(field) or "").strip()
        if not minimum <= len(value) <= maximum:
            errors.append(prefix + f"{field} moet {minimum}-{maximum} tekens bevatten.")
    if re.search(r"<[^>]+>", str(record.get("description") or "")):
        errors.append(prefix + "HTML is niet toegestaan in de beschrijving.")
    if not record.get("sectors") or not set(record.get("sectors", [])).issubset(SECTORS):
        errors.append(prefix + "vul minimaal \u00e9\u00e9n geldige onderwijssector in.")
    if not record.get("audiences"):
        errors.append(prefix + "vul minimaal \u00e9\u00e9n doelgroep in.")
    if record.get("themes") and not set(record.get("themes", [])).issubset(THEMES):
        errors.append(prefix + "\u00e9\u00e9n of meer thema's zijn onbekend.")
    official = [source for source in record.get("sourceUrls", []) if source.get("sourceType") == "official" and source.get("url")]
    if not official:
        errors.append(prefix + "minimaal \u00e9\u00e9n offici\u00eble bron is verplicht.")
    for relation in record.get("relatedIds", []) + record.get("parentIds", []) + record.get("childIds", []):
        if relation not in all_ids:
            errors.append(prefix + f"relatie verwijst naar onbekend id '{relation}'.")
    return errors


def review_records(
    base_records: list[dict],
    candidate_records: list[dict],
    changed_files: list[str] | None = None,
    source_loader: Callable[[str], SourceCheck] = check_source,
) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    if changed_files is not None and set(changed_files) != {ALLOWED_CHANGED_FILE}:
        errors.append("Automatische verwerking staat alleen een toevoeging in data/records.json toe.")

    base_by_id = {record.get("id"): record for record in base_records}
    candidate_by_id = {record.get("id"): record for record in candidate_records}
    if len(candidate_by_id) != len(candidate_records):
        errors.append("De kandidaatdata bevat dubbele IDs.")
    removed = sorted(set(base_by_id) - set(candidate_by_id))
    modified = sorted(
        record_id for record_id in set(base_by_id) & set(candidate_by_id)
        if base_by_id[record_id] != candidate_by_id[record_id]
    )
    added_ids = sorted(set(candidate_by_id) - set(base_by_id))
    if removed:
        errors.append("Bestaande records mogen niet automatisch worden verwijderd: " + ", ".join(removed))
    if modified:
        errors.append("Correcties op bestaande records vragen een aparte beoordeling: " + ", ".join(modified))
    if not added_ids:
        errors.append("Er is geen nieuw record gevonden.")
    if len(added_ids) > 5:
        errors.append("Voeg per automatisch verzoek maximaal vijf records toe.")

    all_ids = set(candidate_by_id)
    base_titles = {(normalize(item.get("title")), normalize(item.get("providerName")), item.get("recordType")) for item in base_records}
    base_urls = {
        (canonical_url(source["url"]), item.get("recordType"))
        for item in base_records for source in item.get("sourceUrls", []) if source.get("url", "").startswith("http")
    }
    source_results: dict[str, list[dict]] = {}
    seen_added_titles: set[tuple[str, str, str]] = set()

    for record_id in added_ids:
        record = candidate_by_id[record_id]
        errors.extend(_record_errors(record, all_ids))
        title_key = (normalize(record.get("title")), normalize(record.get("providerName")), record.get("recordType"))
        if title_key in base_titles or title_key in seen_added_titles:
            errors.append(f"{record_id}: mogelijk duplicaat op titel, aanbieder en type.")
        seen_added_titles.add(title_key)

        official_sources = [source for source in record.get("sourceUrls", []) if source.get("sourceType") == "official" and source.get("url")]
        checks: list[SourceCheck] = []
        for source in official_sources[:3]:
            url = source["url"].strip()
            if not url.startswith("https://"):
                errors.append(f"{record_id}: de automatische route vereist een HTTPS-bron.")
                continue
            key = (canonical_url(url), record.get("recordType"))
            if key in base_urls:
                errors.append(f"{record_id}: deze bron is al gekoppeld aan een bestaand record van hetzelfde type.")
            checks.append(source_loader(url))
        source_results[record_id] = [asdict(check) for check in checks]
        if checks and not all(check.reachable for check in checks):
            failed = [check.url for check in checks if not check.reachable]
            errors.append(f"{record_id}: offici\u00eble bron niet bereikbaar: {', '.join(failed)}")
        if checks and not any(source_matches_record(record, check) for check in checks):
            errors.append(f"{record_id}: titel of aanbieder is niet herkenbaar in de offici\u00eble bron.")
        conflict = _status_conflicts(record, checks)
        if conflict:
            errors.append(f"{record_id}: {conflict}")
        if not record.get("themes"):
            warnings.append(f"{record_id}: thema's ontbreken; de site leidt ze voorlopig uit de tekst af.")

    return {
        "eligible": not errors,
        "addedIds": added_ids,
        "errors": errors,
        "warnings": warnings,
        "sourceChecks": source_results,
        "scope": "Automatische bron- en structuurcontrole; geen inhoudelijke aanbeveling.",
    }


def report_markdown(report: dict) -> str:
    heading = "### Automatische Atlas-controle: geslaagd" if report["eligible"] else "### Automatische Atlas-controle: aanpassing nodig"
    lines = [heading, "", report["scope"], ""]
    if report.get("addedIds"):
        lines.append("**Nieuwe records:** " + ", ".join(f"`{item}`" for item in report["addedIds"]))
        lines.append("")
    if report.get("errors"):
        lines.extend(["**Nog op te lossen:**", *[f"- {item}" for item in report["errors"]], ""])
    if report.get("warnings"):
        lines.extend(["**Aandachtspunten:**", *[f"- {item}" for item in report["warnings"]], ""])
    lines.append("Bij een volledig geslaagde controle kan de bijdrage zonder dagelijkse beoordeling door Eva worden gepubliceerd. Twijfelgevallen blijven buiten de publieke Atlas.")
    return "\n".join(lines) + "\n"


def dump_report(report: dict, json_path: str | None = None, markdown_path: str | None = None) -> None:
    if json_path:
        with open(json_path, "w", encoding="utf-8") as handle:
            json.dump(report, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
    if markdown_path:
        with open(markdown_path, "w", encoding="utf-8") as handle:
            handle.write(report_markdown(report))
