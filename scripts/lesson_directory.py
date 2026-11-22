"""Generate a script-independent overview from the verified public catalogue."""
import json
import re
from html import escape
from pathlib import Path
from string import Template
from urllib.parse import quote

from public_assets import versioned_html
from source_library import _canonical_locator
from validate_data import valid_lesson_start


SECTOR_GROUPS = (
    ("po", "Primair onderwijs", {"PO"}),
    ("vo", "Voortgezet onderwijs", {"VO"}),
    ("mbo", "Middelbaar beroepsonderwijs", {"MBO"}),
    ("ho", "Hoger onderwijs", {"HBO", "WO"}),
    ("overig", "Overige onderwijssectoren", set()),
)
LANGUAGES = {"nl": "Nederlands", "en": "Engels", "de": "Duits", "fr": "Frans", "es": "Spaans"}


def lesson_card(record):
    lesson = record["lessonStart"]
    level = escape(lesson["level"])
    subjects = ", ".join(escape(name) for name in record.get("subjects", []))
    languages = ", ".join(LANGUAGES[code] for code in record.get("language", []) if code in LANGUAGES)
    facts = [f'<div><dt>Niveau</dt><dd>{level}</dd></div>']
    if subjects:
        facts.append(f'<div><dt>Vakgebied</dt><dd>{subjects}</dd></div>')
    if languages:
        facts.append(f'<div><dt>Materiaaltaal</dt><dd>{languages}</dd></div>')
    public_id = record["id"]
    record_id = quote(public_id, safe="")
    title = record["title"]
    material_attributes = ''
    if (re.fullmatch(r"[a-z0-9][a-z0-9-]{1,99}", public_id)
            and 2 <= len(title.strip()) <= 160 and not re.search(r"[\x00-\x1f\x7f]", title)):
        material_attributes = f' data-atlas-item-id="{escape(public_id)}" data-atlas-item-title="{escape(title)}"'
    provider = escape(record.get("providerName") or "")
    attribution = f' van {provider}' if provider else ''
    return f"""<article>
  <h3>{escape(lesson['question'])}</h3>
  <dl>{''.join(facts)}</dl>
  <p>{escape(lesson['task'])}</p>
  <details><summary>Voorbereiding en nabespreking</summary>
    <p><strong>Voorbereiding</strong> {escape(lesson['preparation'])}</p>
    <p><strong>Nabespreking</strong> {escape(lesson['reflection'])}</p>
  </details>
  <p><a href="{escape(lesson['sourceUrl'])}" data-atlas-usage="lesson-open"{material_attributes}>{escape(title)}</a>{attribution}</p>
  <a class="directory-card-link" href="../#item/{record_id}">Bekijk de leskaart<span class="directory-sr"> bij {escape(record['title'])}</span></a>
</article>"""


def generate_lesson_directory(root: Path, destination: Path) -> None:
    raw = (root / "data/data-v2.js").read_text(encoding="utf-8").strip()
    published = json.loads(raw.removeprefix("window.ATLAS_RECORDS=").removesuffix(";"))["records"]
    grouped = {key: [] for key, _, _ in SECTOR_GROUPS}
    for record in published:
        if record.get("status") != "available" or record.get("offerCategory") != "materials":
            continue
        if not record.get("lessonStart") or not valid_lesson_start(record):
            continue
        lesson = record["lessonStart"]
        if not _canonical_locator(lesson["sourceUrl"]):
            continue
        matches = [key for key, _, sectors in SECTOR_GROUPS if sectors.intersection(lesson["sectors"])]
        for key in matches or ["overig"]:
            grouped[key].append(record)
    links, sections = [], []
    for key, title, _ in SECTOR_GROUPS:
        if not grouped[key]:
            continue
        links.append(f'<a href="#{key}">{title}</a>')
        cards = [lesson_card(row) for row in sorted(grouped[key], key=lambda row: row["title"].casefold())]
        sections.append(f'<section aria-labelledby="{key}"><h2 id="{key}">{title}</h2>{"".join(cards)}</section>')
    template = Template((root / "scripts/lesson_directory.html").read_text(encoding="utf-8"))
    page = template.substitute(
        navigation=f'<nav aria-label="Onderwijssector">{"".join(links)}</nav>' if links else "",
        sections="\n".join(sections) or "<p>Er zijn momenteel geen beschikbare lesstarts.</p>",
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(versioned_html(root, page, document_dir=root / "lesmateriaal"), encoding="utf-8")
