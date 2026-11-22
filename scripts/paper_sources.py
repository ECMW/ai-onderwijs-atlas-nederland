"""Read public publisher metadata for AI research in education; no article text is stored."""
from __future__ import annotations

import json
import re
import subprocess
import xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import date, timedelta
from html.parser import HTMLParser
from time import monotonic
from urllib.parse import urlencode

PAPER_SOURCES = (
    {"name": "Educational Technology Research and Development", "journal": "11423",
     "url": "https://link.springer.com/journal/11423/articles"},
    {"name": "International Journal of Science and Mathematics Education", "journal": "10763", "limit": 4,
     "url": "https://link.springer.com/journal/10763/articles"},
    {"name": "Journal of Science Education and Technology", "journal": "10956",
     "url": "https://link.springer.com/journal/10956/articles"},
    {"name": "British Journal of Educational Technology", "issn": "1467-8535", "limit": 4,
     "url": "https://bera-journals.onlinelibrary.wiley.com/journal/14678535"},
)
WINDOW_DAYS = 60
MAX_PER_SOURCE = 6
SOURCE_TIMEOUT = 45
REQUEST_TIMEOUT = 12
AI_TOPIC = re.compile(
    r"\b(?:AI|GenAI|ChatGPT|GPT(?:-?\d+[\w.-]*)?|LLMs?|chatbots?|"
    r"artificial intelligence|generative artificial intelligence|large language models?|"
    r"machine learning|intelligent tutoring systems?)\b", re.IGNORECASE
)
# These journals peer-review research and review articles. Other types, such as
# corrections, never acquire this label from their DOI or journal alone.
RESEARCH_TYPES = {"originalpaper", "reviewpaper", "researcharticle", "reviewarticle"}
METADATA_FIELDS = {"citation_title", "citation_author", "citation_online_date", "citation_doi",
                   "citation_language", "citation_journal_title", "dc.type"}
SUMMARIES = {
    "10.1007/s11423-026-10749-1":
        "Dertig bachelorstudenten aan een Duitse universiteit oefenden met een GPT-examenassistent "
        "en later met Moodle. "
        "De onderzoekers vergeleken hun gebruik en ervaren eerlijkheid. Door de vaste volgorde "
        "en de kleine groep blijft onzeker of een van beide vormen beter werkt.",
    "10.1007/s10763-026-10747-y":
        "Elf Zweedse basisschoolleraren probeerden zes maanden generatieve AI uit bij rekenen en "
        "natuuronderwijs. Ze beschreven bruikbare lesideeën en rekenfouten in AI-antwoorden. "
        "De studie onderzocht docentervaringen. Leerprestaties zijn niet gemeten.",
    "10.1007/s10956-026-10374-w":
        "Bij een ecologietaak werden 185 studenten willekeurig verdeeld over drie groepen. "
        "Studenten met alleen ChatGPT scoorden op de aansluitende kennistoets lager dan studenten "
        "die de bronteksten konden lezen, met of zonder ChatGPT. Het onderzoek betrof één taak.",
    "10.1007/s11423-026-10756-2":
        "Zeven wiskundedocenten pasten met ChatGPT opgaven aan de interesses van hun leerlingen aan. "
        "Leerlingen gaven aan welke verwijzingen zij herkenbaar vonden. De studie onderzocht de "
        "werkwijze en reacties op de opgaven. Leerwinst is niet vastgesteld.",
}


def _fetch(url: str, timeout: float = REQUEST_TIMEOUT) -> bytes:
    # curl (included on the Ubuntu runner and Windows) handles Springer's
    # ordinary anonymous HTTPS redirects. No accounts or publisher API keys.
    result = subprocess.run(
        ["curl", "--disable", "--fail", "--silent", "--show-error", "--location",
         "--proto", "=https", "--proto-redir", "=https", "--max-redirs", "5",
         "--compressed", "--connect-timeout", "5", "--max-time", str(timeout),
         "--max-filesize", "6000000", "--user-agent",
         "AI-Onderwijs-Atlas/1.0 (+https://aionderwijsatlas.nl/)", url],
        check=True, capture_output=True, timeout=timeout + 1,
    )
    if not result.stdout or len(result.stdout) > 6_000_000:
        raise ValueError("Leeg of te groot antwoord van de uitgever")
    return result.stdout


class _CitationMetadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = defaultdict(list)
        self.in_schema_script = False
        self.open_article_urls = set()

    def handle_starttag(self, tag, attrs):
        fields = dict(attrs)
        if tag == "script":
            self.in_schema_script = (fields.get("type") or "").casefold() == "application/ld+json"
        if tag != "meta":
            return
        name = (fields.get("name") or "").lower()
        value = " ".join((fields.get("content") or "").split())
        if value and name in METADATA_FIELDS:
            self.values[name].append(value)

    def handle_endtag(self, tag):
        if tag == "script":
            self.in_schema_script = False

    def handle_data(self, data):
        if not self.in_schema_script:
            return
        try:
            page = json.loads(data)
        except (ValueError, RecursionError):
            return
        if not isinstance(page, dict) or page.get("@type") != "WebPage":
            return
        entity = page.get("mainEntity")
        if not isinstance(entity, dict) or entity.get("@type") != "ScholarlyArticle":
            return
        license_url = entity.get("license")
        if entity.get("isAccessibleForFree") is not True or not isinstance(license_url, str):
            return
        if not re.fullmatch(r"https?://creativecommons\.org/(?:licenses/by(?:-nc)?(?:-nd|-sa)?|publicdomain/zero)/\d+\.\d+/?", license_url):
            return
        identity = entity.get("sameAs")
        if isinstance(identity, str):
            self.open_article_urls.add(identity.casefold())

    def first(self, name):
        return next(iter(self.values[name]), "")


def _online_date(raw: str) -> date:
    if not re.fullmatch(r"\d{4}[-/]\d{2}[-/]\d{2}", raw):
        raise ValueError("Exacte online publicatiedatum ontbreekt")
    return date.fromisoformat(raw.replace("/", "-"))


class _TitleText(HTMLParser):
    """Crossref titles can contain the publisher's inline typesetting tags."""

    def __init__(self):
        super().__init__()
        self.text = []

    def handle_data(self, data):
        self.text.append(data)


NOTICE = re.compile(
    r"^(?:editorial\b|editors?[’']s?\s+(?:note|introduction|foreword|letter)|"
    r"introduction to (?:the |this )?special issue|issue information|book review|"
    r"announcement|obituary|acknowledg(?:e)?ment|foreword|preface)\b|"
    r"\b(?:erratum|corrigendum|retract(?:ed|ion)|expression of concern)\b|"
    r"^correction\b|[\[(]correction[\])]", re.IGNORECASE,
)


def _wiley_papers(source: dict, start: date, today: date) -> list[dict]:
    query = urlencode({
        "filter": f"from-online-pub-date:{start},until-online-pub-date:{today},type:journal-article",
        "select": "DOI,title,author,published-online,container-title,type,update-to,relation",
        "sort": "published-online", "order": "desc", "rows": 50,
    })
    url = f"https://api.crossref.org/journals/{source['issn']}/works?{query}"
    response = json.loads(_fetch(url))
    if response.get("status") != "ok" or response.get("message-type") != "work-list":
        raise ValueError("De metadata-uitgever leverde geen geldig artikeloverzicht")
    items = response.get("message", {}).get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("De tijdschriftopvraag bevat geen recente publicaties")
    found = {}
    readable = False
    incomplete = False
    for item in items:
        if not isinstance(item, dict) or not item.get("title") or not isinstance(item["title"], list):
            continue
        raw_title = item["title"][0]
        if not isinstance(raw_title, str):
            continue
        parser = _TitleText()
        parser.feed(raw_title)
        title = " ".join("".join(parser.text).split())
        title = re.sub(r"\s+([‐‑–:;,.])", r"\1", title)
        journal = item.get("container-title", [])
        if not title or not isinstance(journal, list) or source["name"] not in journal:
            continue
        relations = item.get("relation") or {}
        is_notice = bool(NOTICE.search(title) or item.get("update-to")
                         or any("correct" in key or "retract" in key for key in relations))
        relevant = bool(AI_TOPIC.search(title)) and not is_notice and item.get("type") == "journal-article"
        published_data = item.get("published-online")
        parts = published_data.get("date-parts", []) if isinstance(published_data, dict) else []
        try:
            published = date(*parts[0])
        except (ValueError, TypeError, IndexError):
            incomplete |= relevant
            continue
        if not start <= published <= today:
            continue
        readable = True
        if not relevant:
            continue
        doi = str(item.get("DOI") or "").lower()
        author_list = item.get("author")
        if not isinstance(author_list, list) or not author_list:
            incomplete = True
            continue
        authors = []
        for author in author_list:
            if not isinstance(author, dict):
                break
            name = author.get("name") or " ".join(filter(None, (author.get("given"), author.get("family"))))
            if not name:
                break
            authors.append(name)
        if not re.fullmatch(r"10\.1111/bjet\.\d+", doi) or len(authors) != len(author_list):
            incomplete = True
            continue
        found[doi] = {"id": doi, "title": title, "authors": authors, "published": published.isoformat(),
                      "source": source["name"], "publicationType": "journal-article",
                      "url": "https://doi.org/" + doi}
    if not readable or (not found and incomplete):
        raise ValueError("Geen verifieerbare actuele tijdschriftmetadata voor de passende publicaties")
    return sorted(found.values(), key=lambda paper: (paper["published"], paper["id"]), reverse=True)[:source["limit"]]


def _article(source: dict, doi: str, start: date, today: date, timeout: float) -> dict | None:
    metadata = _CitationMetadata()
    metadata.feed(_fetch("https://link.springer.com/article/" + doi, timeout=timeout).decode("utf-8"))
    if metadata.first("citation_doi").lower() != doi:
        raise ValueError("DOI ontbreekt of wijkt af op de artikelpagina")
    if metadata.first("citation_journal_title").casefold() != source["name"].casefold():
        raise ValueError("Tijdschrift ontbreekt of wijkt af op de artikelpagina")
    kind = metadata.first("dc.type").casefold()
    if not kind:
        raise ValueError("Het publicatietype ontbreekt")
    if kind not in RESEARCH_TYPES:
        return None
    published = _online_date(metadata.first("citation_online_date"))
    title = metadata.first("citation_title")
    author_fields = metadata.values["citation_author"]
    if not title or not author_fields:
        raise ValueError("Auteurs of titel ontbreken")
    if not start <= published <= today or not AI_TOPIC.search(title):
        return None
    authors = []
    for author in author_fields:
        family, comma, given = author.partition(", ")
        authors.append(f"{given} {family}" if comma else author)
    paper = {"id": doi, "title": title, "authors": authors, "published": published.isoformat(),
             "source": source["name"], "publicationType": "peer-reviewed", "url": "https://doi.org/" + doi}
    if paper["url"] in metadata.open_article_urls:
        paper["access"] = "open"
    if language := metadata.first("citation_language").lower():
        paper["language"] = language
    if doi in SUMMARIES:
        paper["summary"] = SUMMARIES[doi]
    return paper


def get_papers(source: dict, today: date) -> list[dict]:
    """Fetch up to six recent original/review articles from one curated journal."""
    if source not in PAPER_SOURCES:
        raise ValueError("Onbekende tijdschriftbron")
    start = today - timedelta(days=WINDOW_DAYS - 1)
    if "issn" in source:
        return _wiley_papers(source, start, today)
    deadline = monotonic() + SOURCE_TIMEOUT
    journal = source["journal"]
    raw = _fetch(f"https://link.springer.com/search.rss?facet-journal-id={journal}&query=")
    items = ET.fromstring(raw).findall("./channel/item")
    if not items:
        raise ValueError("De uitgeversfeed bevat geen items")
    candidates = {}
    current_titles = 0
    failed = 0
    for item in items[:20]:
        title = (item.findtext("title") or "").strip()
        try:
            feed_date = _online_date((item.findtext("pubDate") or "").strip())
        except ValueError:
            if title and AI_TOPIC.search(title):
                failed += 1
            continue
        if not title or not start <= feed_date <= today:
            continue
        current_titles += 1
        if AI_TOPIC.search(title):
            doi = (item.findtext("guid") or "").strip().lower()
            if re.fullmatch(rf"10\.1007/s{journal}-[a-z0-9-]+", doi):
                candidates[doi] = feed_date
            else:
                failed += 1
    if not current_titles:
        raise ValueError("De uitgeversfeed bevat geen actuele titels met volledige datum")
    papers = []
    for doi in sorted(candidates, key=candidates.get, reverse=True):
        remaining = deadline - monotonic()
        if remaining < 1:
            if not papers:
                raise TimeoutError("Binnen de tijdgrens kon geen passende publicatie worden bevestigd")
            break
        try:
            paper = _article(source, doi, start, today, min(remaining, REQUEST_TIMEOUT))
        except (ValueError, OSError, subprocess.SubprocessError):
            failed += 1
            continue
        if paper:
            papers.append(paper)
        if len(papers) == source.get("limit", MAX_PER_SOURCE):
            break
    if not papers and failed:
        raise ValueError("Voor de passende titels konden de uitgeversgegevens niet worden bevestigd")
    return sorted(papers, key=lambda paper: (paper["published"], paper["id"]), reverse=True)
