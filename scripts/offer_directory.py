"""Render permanent HTML addresses from the same public projection as the Atlas."""
import json
import re
import unicodedata
from collections import defaultdict
from datetime import date, datetime
from html import escape
from pathlib import Path
from string import Template
from xml.etree import ElementTree

from catalogue_feed import CATALOGUE_URL, FUNDING_TYPES, official_sources, record_description, write_catalogue_feed
from lesson_directory import LANGUAGES
from public_assets import versioned_html
from validate_data import valid_lesson_start


BASE_URL = CATALOGUE_URL.removesuffix("aanbod/")
GENERATED_MARKER = '<meta name="generator" content="Atlas aanbodcatalogus">'
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
ACCESS_LABELS = {"public": "Publiek toegankelijk", "registration_required": "Registratie nodig",
                 "paid": "Betaalde toegang", "restricted": "Beperkte toegang"}
COST_LABELS = {"free": "Gratis", "paid": "Betaald", "freemium": "Gratis en betaald"}
MONTHS = "januari februari maart april mei juni juli augustus september oktober november december".split()


def read_public_projection(root):
    raw = (root / "data/data-v2.js").read_text(encoding="utf-8").strip()
    projection = json.loads(raw.removeprefix("window.ATLAS_RECORDS=").removesuffix(";"))
    seen = set()
    for record in projection["records"]:
        identifier = record["id"]
        if not SLUG.fullmatch(identifier) or identifier in seen:
            raise ValueError(f"Ongeldig of dubbel publiek aanbod-ID: {identifier}")
        seen.add(identifier)
    return projection


def title_key(title):
    normalized = unicodedata.normalize("NFKD", title.casefold())
    return "".join(char for char in normalized if not unicodedata.combining(char))


def directory_content(records):
    groups = defaultdict(list)
    for record in sorted(records, key=lambda row: (title_key(row["title"]), row["id"])):
        letter = title_key(record["title"])[0].upper()
        groups[letter if "A" <= letter <= "Z" else "0–9"].append(record)
    jumps = []
    sections = []
    for letter in sorted(groups):
        anchor = f"letter-{letter.lower()}" if letter != "0–9" else "overige"
        jumps.append(f'<a href="#{anchor}">{letter}</a>')
        items = []
        for record in groups[letter]:
            title = escape(record["title"])
            provider = record.get("providerName")
            name = f' <span class="offer-provider">· {escape(provider)}</span>' if provider and provider != record["title"] else ""
            items.append(f'<li><a href="{record["id"]}/">{title}</a>{name}</li>')
        sections.append(f'<section><h2 id="{anchor}">{letter}</h2><ul>{"".join(items)}</ul></section>')
    return f"""<header><h1>Aanbod van A tot Z</h1>
      <p>Blader door {len(records)} vermeldingen over AI in het onderwijs. Open een titel voor de beschrijving, doelgroep en officiële bron.</p>
      <nav aria-label="Meer zoekmogelijkheden"><a href="../#zoeken">Zoek op taak, sector of vak</a><a href="index.json">Catalogus als JSON</a></nav>
    </header>
    <nav class="offer-letters" aria-label="Ga naar een beginletter">{"".join(jumps)}</nav>
    {"".join(sections)}"""


def date_markup(value):
    if not isinstance(value, str) or not value:
        return ""
    try:
        instant = datetime.fromisoformat(value) if "T" in value else None
        day = instant.date() if instant else date.fromisoformat(value)
    except ValueError:
        return ""
    label = f"{day.day} {MONTHS[day.month - 1]} {day.year}"
    if instant and instant.utcoffset() is not None:
        offset = instant.strftime("%z")
        label += f" om {instant:%H:%M} uur (UTC{offset[:3]}:{offset[3:]})"
    return f'<time datetime="{escape(value)}">{escape(label)}</time>'


def funding_section(record):
    applicants = ", ".join(record.get("applicantTypes") or [])
    conditions = record.get("eligibility") or ""
    opening = date_markup(record.get("applicationOpenDate"))
    deadline = date_markup(record.get("applicationDeadlineAt") or record.get("applicationDeadline") or record.get("fundingDeadline"))
    amount = record.get("fundingAmount")
    rows = [("Wie kan aanvragen?", escape(applicants or conditions or "Zie de officiële voorwaarden")),
            ("Deelnamevoorwaarden", escape(conditions) if applicants and conditions != applicants else ""),
            ("Indienen vanaf", opening), ("Uiterste indiening", deadline or "Geen uiterste datum bevestigd"),
            ("Bedrag", escape(amount) if amount and amount != "Nog niet ingevuld" else "")]
    facts = "".join(f"<div><dt>{label}</dt><dd>{value}</dd></div>" for label, value in rows if value)
    return f'<section><h2>Aanvraag en voorwaarden</h2><dl class="offer-application">{facts}</dl></section>'


def offer_content(record, description):
    sources = official_sources(record)
    if not sources:
        raise ValueError(f'Geen openbare officiële bron voor {record["id"]}')
    funding = record.get("legacyType") in FUNDING_TYPES
    rows = [("Aanbieder", record.get("providerName")), ("Type aanbod", record.get("legacyType")),
            ("Onderwijssector", ", ".join(record.get("sectors") or [])), ("Voor wie", ", ".join(record.get("audiences") or [])),
            ("Vakgebied", ", ".join(record.get("subjects") or []))]
    if not funding:
        rows.extend([("Toegang", ACCESS_LABELS.get(record.get("accessType"), "Toegang niet vastgesteld")),
                     ("Kosten", COST_LABELS.get(record.get("costType"), "Kosten onbekend"))])
    languages = [LANGUAGES.get(code, code) for code in record.get("language") or []]
    rows.append(("Taal", ", ".join(languages)))
    facts = [f"<div><dt>{label}</dt><dd>{escape(value)}</dd></div>" for label, value in rows if value]
    verified = date_markup(record.get("lastVerified"))
    if verified:
        facts.append(f'<div><dt>Bron gecontroleerd op</dt><dd>{verified}</dd></div>')
    links = "".join(f'<li><a href="{escape(s["url"])}">{escape(s.get("label") or record["providerName"])}</a></li>' for s in sources)
    funding_note = "<p>Controleer de openstelling en de voorwaarden bij de aanbieder.</p>" if funding else ""
    practical = funding_section(record) if funding else ""
    lesson = record.get("lessonStart")
    if (lesson and record.get("status") == "available" and valid_lesson_start(record)
            and any(source["url"] == lesson["sourceUrl"] for source in sources)):
        practical = f"""<section><h2>Opdracht voor de klas</h2><p>{escape(lesson['question'])}</p>
          <nav aria-label="Klasopdracht"><a href="../../#leerlingblad?item={record['id']}">Open leerlingblad</a></nav>
          <details><summary>Lees de opdracht</summary><p>{escape(lesson['task'])}</p></details></section>"""
    conditions = record.get("eligibility")
    access_details = (f"<details><summary>Bekijk de deelnamevoorwaarden</summary><p>{escape(conditions)}</p></details>"
                      if not funding and conditions and conditions != "Nog niet ingevuld" else "")
    content = f"""<nav aria-label="Broodkruimel"><a href="../">Aanbod van A tot Z</a></nav>
    <header><h1>{escape(record["title"])}</h1><p>{escape(description)}</p></header>
    {practical}
    <section><h2>Officiële bronnen</h2>{funding_note}<ul>{links}</ul></section>
    <dl class="offer-facts">{''.join(facts)}</dl>{access_details}
    <nav aria-label="Naar de interactieve Atlas"><a href="../../#item/{record["id"]}">Open deze kaart in de interactieve Atlas</a></nav>"""
    return content, [source["url"] for source in sources]


def render_page(template, title, description, canonical, content, schema_type, sources=()):
    schema = {"@context": "https://schema.org", "@type": schema_type, "url": canonical,
              "name": title, "description": description, "inLanguage": "nl"}
    if sources:
        schema["citation"] = list(sources)
    return template.substitute(
        title=escape(title), description=escape(description), canonical=escape(canonical), content=content,
        schema=json.dumps(schema, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c"),
    )


def write_sitemap(site, projection):
    urls = ["", "lesmateriaal/", "aanbod/"]
    for key in projection.get("worksheets", {}):
        slug = key.removeprefix("werkblad-")
        if not key.startswith("werkblad-") or not SLUG.fullmatch(slug):
            raise ValueError(f"Ongeldig werkblad-ID: {key}")
        urls.append(f"lesmateriaal/leerling/{slug}/")
    urls.extend(f'aanbod/{r["id"]}/' for r in projection["records"])
    document = ElementTree.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for path in sorted(urls):
        ElementTree.SubElement(ElementTree.SubElement(document, "url"), "loc").text = BASE_URL + path
    ElementTree.indent(document)
    ElementTree.ElementTree(document).write(site / "atlas-sitemap.xml", encoding="utf-8", xml_declaration=True)


def generate_offer_directory(root: Path, site: Path) -> None:
    projection = read_public_projection(root)
    records = projection["records"]
    directory = site / "aanbod"
    directory.mkdir(exist_ok=True, parents=True)
    source = Template((root / "scripts/offer_page.html").read_text(encoding="utf-8"))

    def page_template(base, document_dir):
        return Template(versioned_html(root, source.safe_substitute(base=base), document_dir=document_dir))

    index_template = page_template("..", root / "aanbod")
    detail_template = page_template("../..", root / "aanbod/item")
    index = render_page(index_template, "Aanbod van A tot Z",
                        "Vind materialen, hulpmiddelen, onderzoeken en financieringsmogelijkheden over AI in het Nederlandse onderwijs.",
                        CATALOGUE_URL, directory_content(records), "CollectionPage")
    (directory / "index.html").write_text(index, encoding="utf-8")
    for record in records:
        description = record_description(record)
        content, sources = offer_content(record, description)
        path = directory / record["id"]
        path.mkdir(exist_ok=True)
        page = render_page(detail_template, record["title"], description, f'{CATALOGUE_URL}{record["id"]}/',
                           content, "WebPage", sources)
        (path / "index.html").write_text(page, encoding="utf-8")
    write_catalogue_feed(directory / "index.json", records)
    write_sitemap(site, projection)
    # Rebuilding in place must also withdraw a page once its public record disappears.
    current = {record["id"] for record in records}
    for page in directory.glob("*/index.html"):
        if (page.parent.name not in current and SLUG.fullmatch(page.parent.name)
                and not page.parent.is_symlink() and not page.is_symlink()
                and page.resolve().is_relative_to(directory.resolve())
                and GENERATED_MARKER in page.read_text(encoding="utf-8")):
            page.unlink()
