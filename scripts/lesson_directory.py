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
from worksheet_pages import load_worksheets, render_pupil_pages


SECTOR_GROUPS = (
    ("po", "Primair onderwijs", {"PO"}),
    ("vo", "Voortgezet onderwijs", {"VO"}),
    ("mbo", "Middelbaar beroepsonderwijs", {"MBO"}),
    ("ho", "Hoger onderwijs", {"HBO", "WO"}),
    ("overig", "Overige onderwijssectoren", set()),
)
LANGUAGES = {"nl": "Nederlands", "en": "Engels", "de": "Duits", "fr": "Frans", "es": "Spaans"}


def lesson_card(record, sector_group=None):
    lesson = record["lessonStart"]
    level = escape(lesson["level"])
    subjects = ", ".join(escape(name) for name in record.get("subjects", []))
    languages = ", ".join(LANGUAGES[code] for code in record.get("language", []) if code in LANGUAGES)
    sectors = " ".join(value for value in lesson["sectors"] if not sector_group or value in sector_group)
    facts = [f'<div><dt>Niveau</dt><dd data-directory-sectors="{escape(sectors)}">{level}</dd></div>']
    if subjects:
        facts.append(f'<div><dt>Vakgebied</dt><dd data-directory-subject>{subjects}</dd></div>')
    if languages:
        facts.append(f'<div><dt>Materiaaltaal</dt><dd>{languages}</dd></div>')
    if lesson.get("learningGoal"):
        facts.append(f'<div><dt>Leerdoel</dt><dd data-directory-goal>{escape(lesson["learningGoal"])}</dd></div>')
    if lesson.get("activityType"):
        facts.append(f'<div><dt>Activiteit</dt><dd data-directory-activity>{escape(lesson["activityType"])}</dd></div>')
    minutes = lesson.get("sourceMinutes")
    if type(minutes) is int and minutes > 0:
        facts.append(f'<div><dt>Duur bronles</dt><dd><data value="{minutes}" data-directory-minutes>{minutes} minuten</data></dd></div>')
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
  <p data-directory-task>{escape(lesson['task'])}</p>
  <details><summary>Voorbereiding en nabespreking</summary>
    <p><strong>Voorbereiding</strong> {escape(lesson['preparation'])}</p>
    <p><strong>Nabespreking</strong> {escape(lesson['reflection'])}</p>
  </details>
  <p><a href="{escape(lesson['sourceUrl'])}" data-atlas-usage="lesson-open"{material_attributes}>{escape(title)}</a>{attribution}</p>
  <a class="directory-card-link" href="../#item/{record_id}">Bekijk de leskaart<span class="directory-sr"> bij {escape(record['title'])}</span></a>
</article>"""


def worksheet_card(identifier, sheet):
    slug = identifier.removeprefix("werkblad-")
    title = escape(sheet["title"])
    return f"""<article data-worksheet>
  <h3>{title}</h3>
  <dl>
    <div><dt>Niveau</dt><dd data-directory-sectors="{escape(' '.join(sheet['sectors']))}">{escape(sheet['level'])}</dd></div>
    <div><dt>Vakgebied</dt><dd data-directory-subject>{escape(', '.join(sheet['subjects']))}</dd></div>
    <div><dt>Leerdoel</dt><dd data-directory-goal>{escape(sheet['goal'])}</dd></div>
    <div><dt>Activiteit</dt><dd data-directory-activity>{escape(sheet['activity'])}</dd></div>
  </dl>
  <nav aria-label="Werkblad {title}"><a href="./leerling/{slug}/">Open leerlingblad<span class="directory-sr"> bij {title}</span></a>
    <a class="directory-card-link" href="../#{identifier}" hidden>Open docentversie<span class="directory-sr"> bij {title}</span></a></nav>
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
    worksheets = load_worksheets(root)
    if worksheets:
        links.append('<a href="#werkbladen">Werkbladen</a>')
        cards = ''.join(worksheet_card(key, sheet) for key, sheet in worksheets.items())
        sections.append(f'<section aria-labelledby="werkbladen"><h2 id="werkbladen">Werkbladen van de Atlas</h2>{cards}</section>')
    sectors_present = {sector for rows in grouped.values() for row in rows for sector in row["lessonStart"]["sectors"]}
    sector_labels = {"PO": "Primair onderwijs", "VO": "Voortgezet onderwijs", "MBO": "Middelbaar beroepsonderwijs",
                     "HBO": "Hoger beroepsonderwijs", "WO": "Wetenschappelijk onderwijs"}
    sector_labels.update({value: value for value in sorted(sectors_present - sector_labels.keys())})
    for key, title, group in SECTOR_GROUPS:
        if not grouped[key]:
            continue
        links.append(f'<a href="#{key}">{title}</a>')
        cards = [lesson_card(row, group) for row in sorted(grouped[key], key=lambda row: row["title"].casefold())]
        sections.append(f'<section aria-labelledby="{key}"><h2 id="{key}">{title}</h2>{"".join(cards)}</section>')
    template = Template((root / "scripts/lesson_directory.html").read_text(encoding="utf-8"))
    page = template.substitute(
        sector_options="".join(f'<option value="{escape(key)}">{escape(title)}</option>' for key, title in sector_labels.items()),
        navigation=f'<nav aria-label="Onderdelen van de lesgids">{"".join(links)}</nav>' if links else "",
        sections="\n".join(sections) or "<p>Er zijn momenteel geen beschikbare lesstarts.</p>",
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(versioned_html(root, page, document_dir=root / "lesmateriaal"), encoding="utf-8")
    if worksheets:
        render_pupil_pages(worksheets, destination.parent, root)
