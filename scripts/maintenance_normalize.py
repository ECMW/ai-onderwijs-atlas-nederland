"""Deterministic HTML normalization for untrusted source pages."""
from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass
from html.parser import HTMLParser
from urllib.parse import parse_qsl, urlencode, urljoin, urlsplit, urlunsplit


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def fold(value: str) -> str:
    value = value or ""
    markers = ("\u00c3", "\u00c2", "\u00e2\u20ac")
    if any(marker in value for marker in markers):
        try:
            repaired = value.encode("cp1252").decode("utf-8")
            if sum(repaired.count(marker) for marker in markers) < sum(value.count(marker) for marker in markers):
                value = repaired
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    value = unicodedata.normalize("NFKD", value)
    value = "".join(c for c in value if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", value.lower()).strip()


def canonical_url(value: str, base: str = "") -> str:
    absolute = urljoin(base, value)
    parts = urlsplit(absolute)
    query = [(k, v) for k, v in parse_qsl(parts.query) if not k.lower().startswith("utm_")]
    path = re.sub(r"/{2,}", "/", parts.path or "/")
    if path != "/":
        path = path.rstrip("/")
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, urlencode(query), ""))


class ContentExtractor(HTMLParser):
    def __init__(self, base_url: str, config: dict):
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.ignored = set(config["normalization"]["ignoredTags"])
        self.ignore_patterns = [re.compile(x, re.I) for x in config["normalization"]["ignoredTextPatterns"]]
        self.skip_depth = 0
        self.link: dict | None = None
        self.parts: list[str] = []
        self.units: list[dict] = []
        self.title_parts: list[str] = []
        self.in_title = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag in self.ignored:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        if tag == "title":
            self.in_title = True
        if tag == "a":
            href = dict(attrs).get("href") or ""
            if href and not href.startswith(("#", "mailto:", "tel:", "javascript:")):
                self.link = {"url": canonical_url(href, self.base_url), "text": [],
                             "context": " ".join(self.parts[-4:])[-300:]}

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in self.ignored and self.skip_depth:
            self.skip_depth -= 1
            return
        if self.skip_depth:
            return
        if tag == "title":
            self.in_title = False
        if tag == "a" and self.link:
            label = fold(" ".join(self.link["text"]))
            if label and self.link["url"].startswith(("http://", "https://")):
                self.units.append({"url": self.link["url"], "label": label[:240],
                                   "context": self.link.get("context", "")})
            self.link = None

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        text = fold(data)
        if not text or any(p.search(text) for p in self.ignore_patterns):
            return
        if self.in_title:
            self.title_parts.append(text)
        self.parts.append(text)
        if self.link is not None:
            self.link["text"].append(text)


DATE_PATTERN = re.compile(
    r"(?:\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b|"
    r"\b\d{1,2}\s+(?:januari|februari|maart|april|mei|juni|juli|augustus|"
    r"september|oktober|november|december)\s+\d{4}\b)", re.I
)


def normalize_html(html: str, base_url: str, config: dict) -> dict:
    parser = ContentExtractor(base_url, config)
    parser.feed(html)
    text = fold(" ".join(parser.parts))
    terms = [fold(x) for x in config["classification"]["deadlineTerms"]]
    deadlines = []
    for match in DATE_PATTERN.finditer(text):
        context = text[max(0, match.start() - 90):match.end() + 30]
        if any(term in context for term in terms):
            deadlines.append({"dateText": match.group(0), "context": context[:180]})
    relevant_terms = [fold(term) for term in config["classification"].get("relevantTerms", [])]
    def contains_term(value: str) -> bool:
        return any((re.search(rf"\b{re.escape(term)}\b", value) if len(term) <= 2 else term in value)
                   for term in relevant_terms)
    def relevant(unit: dict) -> bool:
        label_and_url = fold(" ".join((unit.get("label", ""), unit.get("url", ""))))
        if contains_term(label_and_url):
            return True
        label = fold(unit.get("label", ""))
        generic_actions = ("lees verder", "meer informatie", "meer info", "bekijk", "download", "aanmelden")
        return any(action in label for action in generic_actions) and contains_term(fold(unit.get("context", "")))
    unique_units = {u["url"]: u for u in parser.units if relevant(u)}
    units = sorted(unique_units.values(), key=lambda item: item["url"])
    structure = "\n".join(u["url"] for u in units)
    return {
        "contentHash": digest(text),
        "structureHash": digest(structure),
        "title": " ".join(parser.title_parts)[:240],
        "wordCount": len(text.split()),
        "excerpt": text[:500],
        "units": units,
        "deadlineFacts": deadlines,
    }


@dataclass
class FetchResult:
    ok: bool
    status: int
    final_url: str
    body: str = ""
    etag: str | None = None
    modified: str | None = None
    error: str | None = None
