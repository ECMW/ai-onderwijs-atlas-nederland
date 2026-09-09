"""Bounded, deterministic source discovery; prepares forms, never publishes.

Run after run_daily_maintenance.py, persisting discovery-state/state.json:
  python scripts/discover_official_content.py --root . --max-visits 12 --max-approved 3

Reads maintenance-state/state.json and maintenance-output/events.json. Writes
discovery-output/approved-submissions.json and review.json, and its own URL state.
Only explicit HTML main/article text with a single H1, a concrete offer sentence,
provider, audience and sector can pass. PDFs, dynamic pages, event training and
ambiguous/negative evidence remain review work. No LLM, API key, Git or API writes.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

import contribution_quality as quality
from maintenance_core import load_json, save_json
from maintenance_normalize import canonical_url

ROOT = Path(__file__).resolve().parents[1]
VERSION = 1
MAX_BYTES = 600_000
TYPE_WORDS = {
    "guidance": r"handreiking|stappenplan|handleiding|leidraad|artikel",
    "training": r"cursus|training|e-learning|module",
    "product": r"toolkit|hulpmiddel|checklist|kaartspel|knoppenkaart",
}
TYPE_LABELS = {"guidance": "Handreiking", "training": "Training", "product": "Product"}
SECTOR_WORDS = {
    "PO": r"po|primair onderwijs|basisonderwijs",
    "VO": r"vo|voortgezet onderwijs",
    "MBO": r"mbo|middelbaar beroepsonderwijs",
    "HBO": r"hbo|hoger beroepsonderwijs",
    "WO": r"wo|wetenschappelijk onderwijs",
}
AUDIENCE_WORDS = {
    "Docenten": r"docent(?:en)?", "Leraren": r"leraar|leraren",
    "Studenten": r"student(?:en)?", "Onderwijsinstellingen": r"onderwijsinstellingen",
    "Bestuurders": r"bestuurders", "Beleidsadviseurs": r"beleidsadviseurs",
}
THEME_WORDS = {
    "AI-geletterdheid": r"ai geletterdheid",
    "Lesgeven en leren met AI": r"lesgeven|lesmateriaal|leermateriaal|onderwijsontwerp|lesontwerp|leren met ai",
    "Toetsing en examinering": r"toetsing|examinering|toetsontwerp",
    "Beleid en governance": r"beleid|governance|bestuurlijke",
    "Professionalisering": r"professionalisering",
    "Publieke waarden en ethiek": r"ethiek|ethische|publieke waarden",
}
UNAVAILABLE = re.compile(
    r"\b(?:niet (?:meer )?beschikbaar|niet (?:meer )?bedoeld|niet voor|geen (?:aanbod|handreiking|training|cursus)|"
    r"nog niet|binnenkort|in ontwikkeling|wordt ontwikkeld|pilot|geannuleerd|afgelast|gesloten|afgelopen)\b"
)
NEGATION = re.compile(r"\b(?:niet|geen|zonder|not|no)\b")
FUNCTION = re.compile(r"\b(?:biedt|helpt|ondersteunt|behandelt|beschrijft|bevat|legt uit|is bedoeld voor|richt zich op)\b")
GENERIC_TITLES = {"home", "nieuws", "agenda", "kennisbank", "publicaties", "zoeken", "zoekresultaten", "artificial intelligence", "ai"}


def stamp(at: datetime) -> str:
    return at.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def url_key(url: str) -> str:
    parts = urlsplit(canonical_url(url))
    return urlunsplit((parts.scheme, parts.netloc.lower().removeprefix("www."), parts.path, parts.query, ""))


def evidence_hash(title: str, body: str) -> str:
    return hashlib.sha256((title + "\n" + body).encode("utf-8")).hexdigest()


class SourceDocument(quality._SourceText):
    """Use the same prose exclusion rules as intake, plus H1 and visible links."""
    def __init__(self):
        super().__init__()
        self.headings = []
        self.links = []
        self.heading = None
        self.link = None
        self.has_main = False

    def visible(self):
        return not any(excluded or tag == "head" for tag, excluded in self.stack)

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        if not self.visible():
            return
        if tag in {"main", "article"}:
            self.has_main = True
        if tag == "h1" and any(t in {"main", "article"} for t, _ in self.stack):
            self.heading = []
        if tag == "a":
            self.link = {"url": dict(attrs).get("href", ""), "parts": []}

    def handle_data(self, text):
        super().handle_data(text)
        if self.visible():
            if self.heading is not None:
                self.heading.append(text)
            if self.link is not None:
                self.link["parts"].append(text)

    def handle_endtag(self, tag):
        if tag == "h1" and self.heading is not None:
            self.headings.append(re.sub(r"\s+", " ", "".join(self.heading)).strip())
            self.heading = None
        if tag == "a" and self.link is not None:
            self.links.append({"url": self.link["url"], "label": " ".join(self.link["parts"])})
            self.link = None
        super().handle_endtag(tag)


@dataclass
class Page:
    url: str
    final_url: str
    title: str
    body: str
    headings: list[str]
    links: list[dict]
    has_main: bool


def page_from_html(url: str, html: str, final_url: str | None = None) -> Page:
    parser = SourceDocument()
    parser.feed(html)
    title, body = parser.result()
    return Page(url, final_url or url, title or "", body, parser.headings, parser.links, parser.has_main)


def safe_fetch_public_url(url: str, timeout: int = 12) -> Page:
    """Reuse intake's DNS-pinned, redirect-validated HTTPS transport; reject truncation."""
    quality._public_https_url(url)
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}), quality._PublicHTTPSHandler(), quality._PublicRedirectHandler()
    )
    request = urllib.request.Request(url, headers={"User-Agent": quality.USER_AGENT, "Accept": "text/html,application/xhtml+xml"})
    with opener.open(request, timeout=timeout) as response:
        final_url = response.geturl()
        quality._public_https_url(final_url)
        if response.headers.get_content_type() not in {"text/html", "application/xhtml+xml"}:
            raise ValueError("Niet-HTML bron vraagt beoordeling (PDF of download).")
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("Bron overschrijdt de extractielimiet; onvolledige tekst wordt niet toegelaten.")
        body = raw.decode(response.headers.get_content_charset() or "utf-8", "strict")
    return page_from_html(url, body, final_url)


def supported_source(source: dict) -> bool:
    return (source.get("enabled", True) and source.get("sourceType") == "official"
            and source.get("trustLevel") == "official" and source.get("sourceRole") == "primary"
            and bool(source.get("owner")) and bool(quality._authority_host(source.get("baseUrl", ""))))


def form_from_page(page: Page, source: dict) -> tuple[dict | None, list[str]]:
    """High precision extraction; no fields inferred from navigation, URL or source labels."""
    if quality._authority_host(page.final_url) != quality._authority_host(source["baseUrl"]):
        return None, ["Doorverwijzing naar een andere bronautoriteit."]
    if not page.has_main or len(page.headings) != 1:
        return None, ["Geen eenduidige hoofdtekst met precies één hoofdtitel."]
    title = page.headings[0]
    if not 8 <= len(title) <= 140 or quality.normalize(title) in GENERIC_TITLES:
        return None, ["Paginatitel is te algemeen of niet geschikt als aanbodtitel."]
    body = re.sub(r"https?://\S+", "", page.body)
    normalized = quality.normalize(body)
    provider = source["owner"]
    if not re.search(r"\b" + re.escape(quality.normalize(provider)) + r"\b", normalized):
        return None, ["Aanbieder ontbreekt in de daadwerkelijke hoofdtekst."]
    if not quality.AI_EVIDENCE.search(normalized) or not quality.EDUCATION_EVIDENCE.search(normalized):
        return None, ["AI én onderwijs zijn niet bevestigd in de hoofdtekst."]
    if quality.OFF_TOPIC.search(normalized) or quality.ACTION_INSTRUCTIONS.search(normalized) or "\ufffd" in body:
        return None, ["Broninhoud of tekstcodering vraagt beoordeling."]
    # Scope facts must occur in an affirmative offer sentence near the title,
    # not in a later related article or in the organisation's general mission.
    introduction = body[:2500]
    if UNAVAILABLE.search(normalized):
        return None, ["Negatieve, tijdelijke of onzekere beschikbaarheid/doelgroep in de bron."]
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|[\r\n]+", introduction) if s.strip()]
    for sentence in sentences:
        text = quality.normalize(sentence)
        if not sentence.endswith(".") or not 40 <= len(sentence) <= 700 or len(sentence.split()) > 25:
            continue
        if NEGATION.search(text) or quality.MARKETING_CLAIMS.search(text) or not FUNCTION.search(text):
            continue
        if not (quality.AI_EVIDENCE.search(text) and quality.EDUCATION_EVIDENCE.search(text)):
            continue
        types = [kind for kind, words in TYPE_WORDS.items()
                 if re.match(r"^(?:deze|dit|de|het) (?:" + words + r")\b", sentence, flags=re.I)]
        if len(types) != 1 or types[0] not in source.get("allowedRecordTypes", []):
            continue
        kind = types[0]
        provider_relation = (r"^(?:deze|dit|de|het) (?:" + TYPE_WORDS[kind].replace("e-learning", "e learning")
                             + r") (?:van|door) " + re.escape(quality.normalize(provider)) + r"\b")
        if not re.search(provider_relation, text):
            continue
        # A news story about a different offer is not the offer itself.
        if not re.search(r"\b(?:" + TYPE_WORDS[kind] + r")\b", title, flags=re.I):
            continue
        audiences = [name for name, words in AUDIENCE_WORDS.items() if re.search(
            r"\b(?:voor|helpt|ondersteunt|biedt) (?:de |alle |mbo |hbo |po |vo |wo )?(?:" + words + r")\b", text)]
        # Roles discussed as a subject are not automatically the target users.
        # Likewise, only sectors syntactically attached to those roles count.
        role_words = "|".join(AUDIENCE_WORDS[name] for name in audiences)
        sectors = [name for name, words in SECTOR_WORDS.items() if role_words and re.search(
            r"\b(?:(?:" + role_words + r") (?:in|uit|binnen|van|voor) (?:het )?(?:" + words
            + r")|(?:" + words + r") (?:" + role_words + r"))\b", text)]
        if not sectors or not audiences:
            continue
        themes = [name for name, words in THEME_WORDS.items() if re.search(r"\b(?:" + words + r")\b", text)]
        if not themes:
            continue
        if kind == "training" and not (
            re.search(r"\b(?:zelfstudie|e learning|op eigen tempo)\b", quality.normalize(introduction))
            and re.search(r"\b(?:direct beschikbaar|start wanneer|op ieder moment|op elk moment)\b", quality.normalize(introduction))
        ):
            return None, ["Training mist expliciete doorlopende beschikbaarheid als zelfstudie; geen evenementstatus afgeleid."]
        if kind == "product" and not re.search(r"\b(?:download|downloaden|beschikbaar|raadplegen)\b", quality.normalize(introduction)):
            return None, ["Hulpmiddel heeft geen expliciete beschikbaarheids- of downloadinformatie."]
        fields = {
            "Titel": title, "Recordtype": TYPE_LABELS[kind], "Organisatie": provider,
            "Functie van het aanbod": sentence, "Officiële bronlink": page.final_url,
            "Sector": ", ".join(sectors), "Doelgroep": ", ".join(audiences), "Thema": ", ".join(themes),
            "Status": "Direct beschikbaar", "Geografische reikwijdte": "Onbekend",
            "Kosten": "Onbekend", "Commerciële aard": "Niet vastgesteld",
            "Deadline": "_No response_", "Toelichting": "Automatische ontdekking op een geregistreerde officiële bron; geen aanbeveling of keurmerk.",
        }
        form = "\n\n".join(f"### {key}\n\n{value}" for key, value in fields.items()) + "\n"
        return {"url": page.final_url, "title": title, "body": form,
                "evidenceHash": evidence_hash(page.title, page.body), "sourceId": source["id"]}, []
    return None, ["Geen volledige neutrale aanbodzin (maximaal 25 woorden) met expliciete aanbieder, type, AI, onderwijs, doelgroep, sector én thema; beoordeling nodig."]


def admit_form(proposal: dict, records: list, sources: list, root: Path, runner=subprocess.run) -> dict:
    """Run the unchanged production intake CLI on temporary data, never canonical paths."""
    with tempfile.TemporaryDirectory(prefix="atlas-discovery-admission-") as directory:
        tmp = Path(directory)
        for name, value in (("records", records), ("metadata", {"updated": ""}), ("sources", sources)):
            (tmp / f"{name}.json").write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
        report_path = tmp / "report.json"
        env = {key: value for key, value in os.environ.items()
               if key in {"PATH", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "LANG", "LC_ALL"}}
        env.update({"PYTHONUTF8": "1", "ATLAS_ISSUE_BODY": proposal["body"], "ATLAS_ISSUE_NUMBER": "discovery"})
        result = runner([
            sys.executable, str(root / "scripts/import_issue_submission.py"),
            "--records", str(tmp / "records.json"), "--metadata", str(tmp / "metadata.json"),
            "--sources", str(tmp / "sources.json"), "--report-json", str(report_path),
        ], env=env, capture_output=True, text=True, timeout=35)
        report = load_json(report_path, {"errors": ["Intake leverde geen controleverslag op."]})
        report["exitCode"] = result.returncode
        # Two fetches must describe the same exact source revision. A changed
        # page is reconsidered next time rather than approving stale evidence.
        checks = [check for group in report.get("sourceChecks", {}).values() for check in group]
        report["unchangedEvidence"] = bool(checks) and all(
            evidence_hash(check.get("title") or "", check.get("body_text") or "") == proposal["evidenceHash"]
            for check in checks
        )
        return report


def discover(records, sources, snapshots, events, previous, root=ROOT, max_visits=12, max_approved=3,
             at=None, fetcher=safe_fetch_public_url, admitter=admit_form):
    at = at or datetime.now(timezone.utc)
    checked = stamp(at)
    state = copy.deepcopy(previous or {"version": VERSION, "urls": {}})
    state.setdefault("urls", {})
    trusted = {s["id"]: s for s in sources if supported_source(s)}
    known = {url_key(link["url"]) for record in records for link in record.get("sourceUrls", []) if link.get("url")}
    pending, review, skipped = {}, [], []
    visits = 0

    def enqueue(source_id, unit):
        source = trusted.get(source_id)
        if not source or not isinstance(unit, dict) or not isinstance(unit.get("url"), str):
            return
        url = canonical_url(unit["url"], source["baseUrl"])
        if quality._authority_host(url) != quality._authority_host(source["baseUrl"]):
            if url not in pending:
                review.append({"url": url, "sourceId": source_id, "reasons": ["Link verwijst buiten de geregistreerde bronautoriteit."], "status": "blocked"})
            return
        if urlsplit(url).path in {"", "/"}:
            return
        key = url_key(url)
        if key in known:
            if key in state["urls"]:
                state["urls"][key]["status"] = "canonical"
            return
        pending.setdefault(key, {"url": url, "sourceId": source_id})

    # Approved but not yet present in canonical data gets freshly rechecked, so
    # a failed broker run cannot permanently lose an approved submission.
    persisted = list(state["urls"].values())
    persisted.sort(key=lambda item: item.get("status") != "approved")
    for item in persisted:
        if item.get("status") != "canonical":
            enqueue(item.get("sourceId"), item)
    for event in events:
        for unit in event.get("addedUnits", []):
            enqueue(event.get("sourceId"), unit)
    for source_id in trusted:
        for unit in snapshots.get(source_id, {}).get("snapshot", {}).get("units", []):
            enqueue(source_id, unit)

    # Initial run without maintenance snapshots: at most two rotating listing
    # visits. Visible links are hints only; no label becomes record evidence.
    missing = [s for s in trusted.values() if not snapshots.get(s["id"], {}).get("snapshot")]
    offset = int(state.get("sourceOffset", 0)) % max(1, len(missing))
    for source in (missing[offset:] + missing[:offset])[:min(2, max_visits)]:
        visits += 1
        try:
            page = fetcher(source["baseUrl"])
            if quality._authority_host(page.final_url) != quality._authority_host(source["baseUrl"]):
                raise ValueError("Bronlijst verwijst door naar een andere autoriteit.")
            for unit in page.links:
                if quality.AI_EVIDENCE.search(quality.normalize(unit.get("label", ""))):
                    unit = dict(unit, url=urljoin(page.final_url, unit["url"]))
                    enqueue(source["id"], unit)
        except Exception as error:
            review.append({"url": source["baseUrl"], "sourceId": source["id"], "status": "unavailable",
                           "reasons": [str(error)[:300]]})
    state["sourceOffset"] = offset + 2
    approved = []
    admitted_titles = set()
    deferred = []
    for key, item in pending.items():
        prior = state["urls"].get(key, {})
        snapshot_hash = snapshots.get(item["sourceId"], {}).get("snapshot", {}).get("contentHash")
        snapshot_changed = bool(snapshot_hash) and snapshot_hash != prior.get("sourceSnapshotHash")
        changed_retry = snapshot_changed and prior.get("status") in {"blocked", "unavailable"}
        if prior.get("status") not in {"approved", "pending"} and not changed_retry and prior.get("nextCheck", "") > checked:
            skipped.append({"url": item["url"], "status": prior.get("status"), "nextCheck": prior["nextCheck"],
                            "reasons": prior.get("reasons", []), "lastChecked": prior.get("lastChecked")})
            continue
        if visits + 2 > max_visits or len(approved) >= max_approved:
            deferred.append(item)
            if not prior:
                state["urls"][key] = dict(item, status="pending", firstSeen=checked)
            continue
        visits += 1
        status, reasons, proposal = "blocked", [], None
        try:
            page = fetcher(item["url"])
            if url_key(page.final_url) in known:
                status, reasons = "canonical", ["Uiteindelijke URL staat al in de Atlas."]
            elif (prior.get("status") in {"handled", "broker_review"}
                  and evidence_hash(page.title, page.body) == prior.get("evidenceHash")):
                status = prior["status"]
                reasons = prior.get("reasons") or ["Ongewijzigde bron is eerder afgehandeld of vraagt handmatige beoordeling."]
            else:
                proposal, reasons = form_from_page(page, trusted[item["sourceId"]])
                if proposal:
                    proposal["discoveryKey"] = key
                    title_key = (quality.normalize(proposal["title"]), quality.normalize(trusted[item["sourceId"]]["owner"]))
                    if title_key in admitted_titles:
                        reasons = ["Dezelfde titel en aanbieder zijn al in deze ronde aangeboden via een andere URL."]
                    else:
                        visits += 1
                        report = admitter(proposal, records, sources, root)
                        if (report.get("exitCode") == 0 and report.get("eligible") is True
                                and report.get("autoPublishEligible") is True and report.get("unchangedEvidence") is True):
                            proposal["autoPublishEligible"] = True
                            approved.append(proposal)
                            admitted_titles.add(title_key)
                            status = "approved"
                        else:
                            reasons = report.get("errors") or ["Intake niet geslaagd of bron gewijzigd tussen de controles."]
        except Exception as error:
            status, reasons = "unavailable", [f"{type(error).__name__}: {str(error)[:250]}"]
        state["urls"][key] = dict(prior, **item, status=status, lastChecked=checked, attempts=prior.get("attempts", 0) + 1,
                                  nextCheck=stamp(at + (timedelta(hours=1) if status == "unavailable" else timedelta(days=7))),
                                  sourceSnapshotHash=snapshot_hash,
                                  reasons=reasons, evidenceHash=proposal["evidenceHash"] if proposal else prior.get("evidenceHash"))
        if status != "approved":
            review.append(dict(item, status=status, reasons=reasons))
    state.update({"version": VERSION, "lastChecked": checked})
    review_output = {"version": VERSION, "checkedAt": checked, "blockedCandidates": review,
                     "deferredCandidates": deferred, "skipped": skipped,
                     "summary": {"approved": len(approved), "review": len(review), "deferred": len(deferred), "visits": visits},
                     "limits": {"maxVisits": max_visits, "maxApproved": max_approved,
                                "extraction": "HTML main/article, één H1, expliciete neutrale aanbodzin van maximaal 25 woorden; PDF/dynamiek/evenementen naar review."}}
    return {"version": VERSION, "checkedAt": checked, "approved": approved}, review_output, state


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--maintenance-state", type=Path)
    parser.add_argument("--events", type=Path)
    parser.add_argument("--state", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--max-visits", type=int, default=12)
    parser.add_argument("--max-approved", type=int, default=3)
    args = parser.parse_args()
    if not 1 <= args.max_visits <= 12 or not 1 <= args.max_approved <= 3:
        parser.error("max-visits moet 1-12 en max-approved moet 1-3 zijn")
    root = args.root.resolve()
    state_path = args.state or root / "discovery-state/state.json"
    output = args.output_dir or root / "discovery-output"
    approved, review, state = discover(
        load_json(root / "data/records.json", []), load_json(root / "data/sources.json", []),
        load_json(args.maintenance_state or root / "maintenance-state/state.json", {}),
        load_json(args.events or root / "maintenance-output/events.json", []), load_json(state_path, {}),
        root=root, max_visits=args.max_visits, max_approved=args.max_approved,
    )
    save_json(output / "approved-submissions.json", approved)
    save_json(output / "review.json", review)
    save_json(state_path, state)
    print(json.dumps(review["summary"], ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
