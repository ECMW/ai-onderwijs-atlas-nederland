"""Deterministische kwaliteitscontrole voor openbare Atlas-bijdragen.

De controle bewijst geen inhoudelijke waarheid of aanbeveling. Zij controleert wel
of een toevoeging afgebakend is, geen bestaande data wijzigt, een bereikbare
officiële bron heeft en herkenbaar aansluit op titel en aanbieder. De afzonderlijke
trusted-automationmodus staat uitsluitend geverifieerde dagelijkse Atlas-updates
uit de eigen repository toe en behoudt dezelfde bron- en datakwaliteitscontroles.
"""

from __future__ import annotations

import html
import http.client
import ipaddress
import json
import re
import socket
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, asdict
from datetime import date
from html.parser import HTMLParser
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
TRUSTED_ALLOWED_CHANGED_FILES = {
    "data/records.json",
    "data/metadata.json",
    "data/data-v2.js",
    "data/search-index.json",
}
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
    if not host or host.lower() in PRIVATE_HOSTS:
        return False
    try:
        address = ipaddress.ip_address(host)
        return address.is_global and not address.is_multicast
    except ValueError:
        return "." in host


def _public_https_url(url: str) -> urllib.parse.SplitResult:
    parsed = urllib.parse.urlsplit(url)
    if (parsed.scheme.lower() != "https" or parsed.username is not None
            or parsed.password is not None or parsed.port not in {None, 443}
            or not _host_is_public(parsed.hostname or "")):
        raise ValueError("Alleen een publieke HTTPS-bron zonder inloggegevens is toegestaan.")
    return parsed


def _public_addresses(host: str, port: int) -> list:
    addresses = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    if not addresses or any(not _host_is_public(item[4][0]) for item in addresses):
        raise ValueError("De bron verwijst naar een niet-publiek netwerkadres.")
    return addresses


def _connect_public(address, timeout=socket._GLOBAL_DEFAULT_TIMEOUT, source_address=None):
    """Connect only to validated numeric addresses; do not resolve a second time."""
    last_error = None
    for family, socktype, proto, _, destination in _public_addresses(*address):
        connection = socket.socket(family, socktype, proto)
        try:
            if timeout is not socket._GLOBAL_DEFAULT_TIMEOUT:
                connection.settimeout(timeout)
            if source_address:
                connection.bind(source_address)
            connection.connect(destination)
            return connection
        except OSError as error:
            connection.close()
            last_error = error
    raise last_error or OSError("Geen publiek bronadres beschikbaar.")


class _PublicHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._create_connection = _connect_public


class _PublicHTTPSHandler(urllib.request.HTTPSHandler):
    def https_open(self, request):
        return self.do_open(_PublicHTTPSConnection, request, context=self._context)


class _PublicRedirectHandler(urllib.request.HTTPRedirectHandler):
    max_redirections = 5

    def redirect_request(self, request, response, code, message, headers, newurl):
        _public_https_url(newurl)
        return super().redirect_request(request, response, code, message, headers, newurl)


class _SourceText(HTMLParser):
    """Keep source prose separate from navigation, URLs and executable markup."""
    excluded = {"script", "style", "nav", "header", "footer", "aside", "form", "noscript", "template"}
    void = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
    blocks = {"p", "div", "section", "article", "main", "li", "h1", "h2", "h3", "h4", "h5", "h6", "br"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.title_parts = []
        self.body_parts = []
        self.main_parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        excluded = tag in self.excluded or "hidden" in attrs or attrs.get("aria-hidden") == "true"
        if tag not in self.void:
            self.stack.append((tag, excluded))
        if tag in self.blocks:
            self.handle_data("\n")

    def handle_startendtag(self, tag, attrs):
        if tag in self.blocks:
            self.handle_data("\n")

    def handle_endtag(self, tag):
        if tag in self.blocks:
            self.handle_data("\n")
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, text):
        if any(tag == "title" for tag, _ in self.stack):
            self.title_parts.append(text)
        elif not any(excluded or tag == "head" for tag, excluded in self.stack):
            self.body_parts.append(text)
            if any(tag in {"main", "article"} for tag, _ in self.stack):
                self.main_parts.append(text)

    def result(self):
        title = re.sub(r"\s+", " ", "".join(self.title_parts)).strip() or None
        body = "".join(self.main_parts or self.body_parts)
        body = "\n".join(re.sub(r"[ \t]+", " ", line).strip() for line in body.splitlines() if line.strip())
        return title, body


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
    body_text: str = ""


def check_source(url: str, timeout: int = 20) -> SourceCheck:
    try:
        _public_https_url(url)
        request = urllib.request.Request(
            url,
            headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/pdf;q=0.9,*/*;q=0.5"},
        )
        opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({}), _PublicHTTPSHandler(), _PublicRedirectHandler()
        )
        with opener.open(request, timeout=timeout) as response:
            status = getattr(response, "status", 200)
            content_type = response.headers.get_content_type()
            raw = response.read(600_000)
            final_url = response.geturl()
            charset = response.headers.get_content_charset() or "utf-8"
        _public_https_url(final_url)
        title = None
        text = ""
        if content_type in {"text/html", "application/xhtml+xml", "text/plain"}:
            decoded = raw.decode(charset, "replace")
            if content_type == "text/plain":
                text = decoded[:300_000]
            else:
                extractor = _SourceText()
                extractor.feed(decoded)
                title, text = extractor.result()
                title = title[:240] if title else None
                text = text[:300_000]
        searchable = normalize(" ".join(part for part in (url, final_url, title, text) if part))
        return SourceCheck(url, 200 <= status < 400, status, final_url, content_type, title, searchable, body_text=text)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, ValueError, LookupError) as exc:
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


def commercial_field_errors(record: dict) -> list[str]:
    """Additive schema: old records remain explicitly unclassified."""
    prefix = f"{record.get('id') or '<zonder id>'}: "
    status = record.get("commercialStatus", "unknown")
    evidence = record.get("commercialEvidence")
    if status not in ("commercial", "non_commercial", "unknown"):
        return [prefix + "commercialStatus moet commercial, non_commercial of unknown zijn."]
    if status == "unknown":
        return [] if evidence is None else [prefix + "unknown mag geen bevestigende commercialEvidence bevatten."]
    if not isinstance(evidence, dict):
        return [prefix + "een vastgestelde commerciële aard vereist commercialEvidence met url, note en checkedOn."]
    errors = []
    try:
        _public_https_url(evidence.get("url", ""))
    except (ValueError, TypeError, AttributeError):
        errors.append(prefix + "commercialEvidence.url moet een publieke HTTPS-bron zonder inloggegevens zijn.")
    note = evidence.get("note")
    if not isinstance(note, str) or not 10 <= len(note.strip()) <= 1200 or re.search(r"<[^>]+>", note):
        errors.append(prefix + "commercialEvidence.note vereist 10-1200 tekens feitelijke brononderbouwing zonder HTML.")
    checked = evidence.get("checkedOn")
    try:
        if not isinstance(checked, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", checked) or date.fromisoformat(checked) > date.today():
            raise ValueError
    except ValueError:
        errors.append(prefix + "commercialEvidence.checkedOn moet een geldige, niet-toekomstige controledatum zijn.")
    return errors


def _record_errors(record: dict, all_ids: set[str], trusted_automation: bool = False) -> list[str]:
    errors: list[str] = commercial_field_errors(record)
    record_id = record.get("id")
    prefix = f"{record_id or '<zonder id>'}: "
    if not record_id or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,99}", str(record_id)):
        errors.append(prefix + "id moet een unieke, kleine slug zijn.")
    trusted_types = RECORD_TYPES - {"identified_need", "white_spot"}
    if not trusted_automation and record.get("recordType") not in AUTO_TYPES:
        errors.append(prefix + "dit recordtype vraagt inhoudelijke beoordeling en wordt niet automatisch gepubliceerd.")
    if record.get("recordType") not in (trusted_types if trusted_automation else RECORD_TYPES):
        errors.append(prefix + "ongeldig recordtype.")
    if record.get("status") not in STATUSES or record.get("status") in {"unknown", "needs_verification", "identified_need"}:
        errors.append(prefix + "kies een concrete status.")
    if trusted_automation:
        if record.get("verificationStatus") not in {"verified", "recently_checked"}:
            errors.append(prefix + "de vertrouwde actualisator vereist een bevestigde verificatiestatus.")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(record.get("lastVerified") or "")):
            errors.append(prefix + "de vertrouwde actualisator vereist een geldige controledatum.")
    elif record.get("verificationStatus") != "needs_review" or record.get("lastVerified"):
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
    trusted_automation: bool = False,
) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    if changed_files is not None:
        changed_set = set(changed_files)
        if trusted_automation:
            if "data/records.json" not in changed_set or not changed_set.issubset(TRUSTED_ALLOWED_CHANGED_FILES):
                errors.append("De vertrouwde actualisator mag uitsluitend de canonieke data en afgeleide databestanden wijzigen.")
        elif changed_set != {ALLOWED_CHANGED_FILE}:
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
    if modified and not trusted_automation:
        errors.append("Correcties op bestaande records vragen een aparte beoordeling: " + ", ".join(modified))
    touched_ids = sorted(set(added_ids) | (set(modified) if trusted_automation else set()))
    if not touched_ids:
        errors.append("Er is geen nieuw record gevonden.")
    if len(touched_ids) > 5:
        errors.append("Verwerk per automatisch verzoek maximaal vijf records.")

    all_ids = set(candidate_by_id)
    base_titles = {(normalize(item.get("title")), normalize(item.get("providerName")), item.get("recordType")) for item in base_records}
    base_url_owners: dict[tuple[str, str], set[str]] = {}
    for item in base_records:
        for source in item.get("sourceUrls", []):
            if source.get("url", "").startswith("http"):
                key = (canonical_url(source["url"]), item.get("recordType"))
                base_url_owners.setdefault(key, set()).add(item.get("id"))
    source_results: dict[str, list[dict]] = {}
    seen_added_titles: set[tuple[str, str, str]] = set()

    for record_id in touched_ids:
        record = candidate_by_id[record_id]
        errors.extend(_record_errors(record, all_ids, trusted_automation))
        title_key = (normalize(record.get("title")), normalize(record.get("providerName")), record.get("recordType"))
        if record_id in added_ids:
            if title_key in base_titles or title_key in seen_added_titles:
                errors.append(f"{record_id}: mogelijk duplicaat op titel, aanbieder en type.")
            seen_added_titles.add(title_key)
        elif trusted_automation:
            base_history = base_by_id[record_id].get("changeHistory", [])
            candidate_history = record.get("changeHistory", [])
            if candidate_history == base_history:
                errors.append(f"{record_id}: een correctie vereist een nieuwe changeHistory-vermelding.")
            elif candidate_history[-1].get("date") != record.get("lastVerified"):
                errors.append(f"{record_id}: de laatste changeHistory-datum moet gelijk zijn aan lastVerified.")

        official_sources = [source for source in record.get("sourceUrls", []) if source.get("sourceType") == "official" and source.get("url")]
        checks: list[SourceCheck] = []
        for source in official_sources[:3]:
            url = source["url"].strip()
            if not url.startswith("https://"):
                errors.append(f"{record_id}: de automatische route vereist een HTTPS-bron.")
                continue
            key = (canonical_url(url), record.get("recordType"))
            if base_url_owners.get(key, set()) - {record_id}:
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
        "modifiedIds": modified if trusted_automation else [],
        "errors": errors,
        "warnings": warnings,
        "sourceChecks": source_results,
        "scope": (
            "Vertrouwde dagelijkse Atlas-controle op bron, structuur, duplicaten en verificatie."
            if trusted_automation
            else "Automatische bron- en structuurcontrole; geen inhoudelijke aanbeveling."
        ),
    }


SHARED_PUBLICATION_HOSTS = {
    "youtube.com", "youtu.be", "linkedin.com", "nl.linkedin.com", "facebook.com",
    "instagram.com", "twitter.com", "x.com", "medium.com", "github.com",
    "raw.githubusercontent.com", "gist.githubusercontent.com", "docs.google.com",
    "drive.google.com", "sites.google.com", "storage.googleapis.com", "forms.office.com",
}


def _authority_host(url: str) -> str:
    """Do not trust sibling subdomains or a hostname merely containing a name."""
    try:
        host = _public_https_url(url).hostname.lower()
        host = host.removeprefix("www.")
        # An existing official video/post does not make every user of its shared
        # publishing host an official source for that provider.
        return "" if host in SHARED_PUBLICATION_HOSTS else host
    except (ValueError, AttributeError):
        return ""


def trusted_authorities(base_records: list[dict], sources: list[dict]) -> set[tuple[str, str]]:
    pairs = set()
    for record in base_records:
        if record.get("verificationStatus") not in {"verified", "recently_checked"}:
            continue
        provider = normalize(record.get("providerName"))
        for source in record.get("sourceUrls", []):
            host = _authority_host(source.get("url", ""))
            if host and provider and source.get("sourceType") == "official":
                pairs.add((host, provider))
    for source in sources:
        if (source.get("sourceType") != "official" or source.get("trustLevel") != "official"
                or source.get("sourceRole") != "primary" or source.get("enabled") is False):
            continue
        host = _authority_host(source.get("baseUrl", ""))
        provider = normalize(source.get("owner"))
        if host and provider:
            pairs.add((host, provider))
    return pairs


AI_EVIDENCE = re.compile(r"\b(?:ai|kunstmatige intelligentie|artificiele intelligentie|artificial intelligence|machine learning)\b")
EDUCATION_EVIDENCE = re.compile(
    r"\b(?:onderwijs|education|educational|school|schools|scholen|docent|docenten|leraar|leraren|"
    r"teacher|teachers|student|studenten|students|leerling|leerlingen|teaching|universiteit|university|mbo|hbo)\b"
)
OFF_TOPIC = re.compile(r"\b(?:appeltaart|recept|recepten|recipe|recipes|casino|gokken|goksite|crypto signalen)\b")
ACTION_INSTRUCTIONS = re.compile(
    r"\b(?:ignore (?:all |the )?(?:previous|prior|system) instructions|negeer (?:alle |de )?(?:eerdere |vorige )?instructies|"
    r"eva approved|github token|gh token|execute (?:this |the )?command|run (?:this |the )?command)\b"
)
MARKETING_CLAIMS = re.compile(
    r"\b(?:de beste|het beste|the best|marktleider|market leader|toonaangevend\w*|revolutionair\w*|"
    r"baanbrekend\w*|uniek\w*|unique|world leading|gegarandeerd|garandeert|garanderen|guaranteed|"
    r"koop nu|bestel nu|schrijf je nu in|buy now|try now|award winning)\b"
)
NON_COMMERCIAL_EVIDENCE = re.compile(r"\b(?:niet commerciee?l\w*|non commercial)\b")
COMMERCIAL_EVIDENCE = re.compile(r"\b(?:commerciee?l\w*|commercial)\b")
COMMERCIAL_OFFER_EVIDENCE = re.compile(
    r"\b(?:niet )?commerciee?l\w* (?:aanbod|dienst|product|training|cursus|voorziening|hulpmiddel)\b|"
    r"\b(?:non )?commercial (?:offer|offering|service|product|training|course|resource)\b"
)


def _sentences(value: str) -> list[str]:
    return [normalize(part) for part in re.split(r"(?<=[.!?])\s+|[\r\n]+", value) if normalize(part)]


def _description_sentences(record: dict) -> list[str]:
    description = re.sub(r"^Volgens de (?:aanbieder|offici[eë]le bron):\s*", "", str(record.get("description") or ""), flags=re.I)
    return _sentences(description)


def review_external_submission(
    base_records: list[dict], candidate_records: list[dict], sources: list[dict] | None = None,
    source_loader: Callable[[str], SourceCheck] = check_source,
) -> dict:
    """Conservative admission for website issues, separate from daily maintenance.

    Unknown authorities, paraphrases and missing evidence remain review work.
    URLs and user-selected labels never count as source evidence. Text is only
    compared as data; nothing from a submission or source is executed.
    """
    pairs = trusted_authorities(base_records, sources or [])
    old_ids = {record.get("id") for record in base_records}
    additions = [record for record in candidate_records if record.get("id") not in old_ids]
    allowed_urls = {
        source["url"] for record in additions for source in record.get("sourceUrls", [])
        if (_authority_host(source.get("url", "")), normalize(record.get("providerName"))) in pairs
    }

    def admitted_source(url):
        if url not in allowed_urls:
            return SourceCheck(url, False, None, None, None, None, "", "Deze combinatie van aanbieder en brondomein vraagt eerst bronbeoordeling.")
        return source_loader(url)

    report = review_records(base_records, candidate_records, ["data/records.json"], admitted_source)
    errors = report["errors"]
    evidence = {}
    if len(additions) != 1:
        errors.append("De website-route verwerkt precies een nieuwe vermelding per verzoek.")
    for record in additions:
        identifier = record.get("id", "<zonder-id>")
        prefix = f"{identifier}: "
        if not any((_authority_host(source.get("url", "")), normalize(record.get("providerName"))) in pairs
                   for source in record.get("sourceUrls", []) if source.get("sourceType") == "official"):
            errors.append(prefix + "Deze combinatie van aanbieder en brondomein is nog niet bekend als officiële bron en vraagt bronbeoordeling.")
        if any(normalize(previous.get("title")) == normalize(record.get("title"))
               and normalize(previous.get("providerName")) == normalize(record.get("providerName"))
               for previous in base_records):
            errors.append(prefix + "Deze titel en aanbieder staan al in de Atlas, ook als een ander recordtype is gekozen.")
        supplied = normalize(" ".join(str(record.get(key) or "") for key in ("title", "providerName", "description")))
        if any(re.search(r"<[^>]+>", str(record.get(key) or "")) for key in ("title", "providerName", "description")):
            errors.append(prefix + "HTML in de inzending vraagt beoordeling en wordt niet automatisch verwerkt.")
        if OFF_TOPIC.search(supplied) or ACTION_INSTRUCTIONS.search(supplied):
            errors.append(prefix + "De inzending bevat inhoud buiten de Atlas-scope of instructies voor verwerking.")
        if MARKETING_CLAIMS.search(supplied):
            errors.append(prefix + "Wervende claims, superlatieven en garanties passen niet in de vaste neutrale aanbodvelden.")
        description_sentences = _description_sentences(record)
        description_text = " ".join(description_sentences)
        if not (AI_EVIDENCE.search(description_text) and EDUCATION_EVIDENCE.search(description_text)):
            errors.append(prefix + "De bronondersteunde beschrijving moet zelf zowel AI als onderwijs betreffen; gekozen labels zijn geen bewijs.")
        accepted = []
        for check in report["sourceChecks"].get(identifier, []):
            if not check["reachable"]:
                continue
            provider = normalize(record.get("providerName"))
            final_host = _authority_host(check.get("final_url") or "")
            if (final_host, provider) not in pairs:
                errors.append(prefix + "De uiteindelijke bron na doorverwijzing is niet bekend als bron van deze aanbieder.")
                continue
            body = check.get("body_text") or ""
            if not body or check.get("content_type") not in {"text/html", "application/xhtml+xml", "text/plain"} or "\ufffd" in body:
                errors.append(prefix + "Er is geen betrouwbaar uitgelezen brontekst; PDF's en onleesbare bronnen vragen beoordeling.")
                continue
            # A displayed raw URL is not evidence either; only the prose counts.
            prose = re.sub(r"https?://\S+", "", body, flags=re.I)
            page_title = re.sub(r"https?://\S+", "", check.get("title") or "", flags=re.I)
            source_text = normalize(" ".join([page_title, prose]))
            article = normalize(prose)
            title = normalize(record.get("title"))
            if not title or not re.search(r"\b" + re.escape(title) + r"\b", source_text):
                errors.append(prefix + "De volledige titel is niet herkenbaar in de uitgelezen paginatitel of brontekst.")
                continue
            if not provider or not re.search(r"\b" + re.escape(provider) + r"\b", source_text):
                errors.append(prefix + "De aanbieder is niet herkenbaar in de uitgelezen paginatitel of brontekst.")
                continue
            if not (AI_EVIDENCE.search(article) and EDUCATION_EVIDENCE.search(article)):
                errors.append(prefix + "De inhoud van de bron onderbouwt niet zowel AI als onderwijs.")
                continue
            if OFF_TOPIC.search(article) or ACTION_INSTRUCTIONS.search(article):
                errors.append(prefix + "De brontekst bevat signalen die inhoudelijke beoordeling vereisen.")
                continue
            available_sentences = set(_sentences(prose))
            if not description_sentences or not all(sentence in available_sentences for sentence in description_sentences):
                errors.append(prefix + "Niet alle beschrijvende zinnen zijn letterlijk ondersteund door volledige zinnen in de bron. Gebruik een feitelijk broncitaat of laat de parafrase beoordelen.")
                continue
            if record.get("costType") not in {None, "unknown"}:
                cost_terms = {"free": r"\b(?:gratis|kosteloos|free of charge)\b", "paid": r"\b(?:betaald|prijs|kosten|paid|price)\b",
                              "freemium": r"\b(?:freemium|gratis en betaald|free and paid)\b"}
                if record.get("costType") not in cost_terms or not re.search(cost_terms[record["costType"]], article):
                    errors.append(prefix + "De opgegeven kosten zijn niet expliciet in de bron onderbouwd.")
                    continue
            accepted.append({
                "sourceUrl": check["url"], "finalUrl": check["final_url"], "sourceTitle": check["title"],
                "authorityHost": final_host, "provider": record.get("providerName"),
                "descriptionSentencesMatched": len(description_sentences), "aiAndEducationInBody": True,
            })
        if not accepted:
            errors.append(prefix + "Geen bron voldoet aan alle voorwaarden voor automatische toelating; de inzending blijft ter beoordeling.")
        commercial_status = record.get("commercialStatus", "unknown")
        commercial = record.get("commercialEvidence")
        if commercial_status in ("commercial", "non_commercial") and not commercial_field_errors(record):
            commercial_url = commercial["url"]
            provider = normalize(record.get("providerName"))
            if (_authority_host(commercial_url), provider) not in pairs:
                errors.append(prefix + "De bron voor de commerciële aard is niet bekend als officiële bron van deze aanbieder.")
            else:
                existing = next((check for check in report["sourceChecks"].get(identifier, []) if check["url"] == commercial_url), None)
                commercial_check = existing or asdict(source_loader(commercial_url))
                report.setdefault("commercialSourceChecks", {})[identifier] = commercial_check
                commercial_body = commercial_check.get("body_text") or ""
                commercial_title = commercial_check.get("title") or ""
                normalized_note = normalize(commercial["note"])
                status_supported = (bool(NON_COMMERCIAL_EVIDENCE.search(normalized_note)) if commercial_status == "non_commercial"
                                    else bool(COMMERCIAL_EVIDENCE.search(normalized_note)) and not NON_COMMERCIAL_EVIDENCE.search(normalized_note))
                status_supported = status_supported and bool(COMMERCIAL_OFFER_EVIDENCE.search(normalized_note))
                if commercial_status == "commercial" and re.search(r"\b(?:niet|not|non|no|geen)\b", normalized_note):
                    status_supported = False
                if (not commercial_check.get("reachable") or not commercial_body or "\ufffd" in commercial_body
                        or (_authority_host(commercial_check.get("final_url") or ""), provider) not in pairs
                        or not re.search(r"\b" + re.escape(provider) + r"\b", normalize(commercial_title + " " + commercial_body))
                        or not all(sentence in set(_sentences(commercial_body)) for sentence in _sentences(commercial["note"]))
                        or not status_supported):
                    errors.append(prefix + "De opgegeven commerciële aard is niet expliciet en letterlijk door de aanbiederbron onderbouwd; prijs, naam of rechtsvorm volstaan niet.")
        evidence[identifier] = accepted
    report["eligible"] = not errors
    report["autoPublishEligible"] = not errors
    report["admissionEvidence"] = evidence
    report["scope"] = "Automatische toelating op bekende bronautoriteit, letterlijke brononderbouwing en AI-onderwijsrelevantie; geen aanbeveling of persoonlijk akkoord van Eva."
    return report


def report_markdown(report: dict) -> str:
    heading = "### Automatische Atlas-controle: geslaagd" if report["eligible"] else "### Automatische Atlas-controle: aanpassing nodig"
    lines = [heading, "", report["scope"], ""]
    if report.get("addedIds"):
        lines.append("**Nieuwe records:** " + ", ".join(f"`{item}`" for item in report["addedIds"]))
        lines.append("")
    if report.get("modifiedIds"):
        lines.append("**Bijgewerkte records:** " + ", ".join(f"`{item}`" for item in report["modifiedIds"]))
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
