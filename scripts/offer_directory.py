"""Render permanent HTML addresses from the same public projection as the Atlas."""
import json
import re
import unicodedata
from collections import defaultdict
from html import escape
from pathlib import Path
from string import Template
from xml.etree import ElementTree

from catalogue_feed import CATALOGUE_URL, FUNDING_TYPES, official_sources, record_description, write_catalogue_feed
from public_assets import versioned_html


BASE_URL = CATALOGUE_URL.removesuffix("aanbod/")
GENERATED_MARKER = '<meta name="generator" content="Atlas aanbodcatalogus">'
SLUG = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


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


def offer_content(record, description):
    sources = official_sources(record)
    if not sources:
        raise ValueError(f'Geen openbare officiële bron voor {record["id"]}')
    facts = []
    for key, label in (("providerName", "Aanbieder"), ("legacyType", "Type aanbod"), ("sectors", "Onderwijssector"),
                       ("audiences", "Voor wie"), ("subjects", "Vakgebied"), ("lastVerified", "Bron gecontroleerd op")):
        value = record.get(key)
        if value:
            text = ", ".join(value) if isinstance(value, list) else value
            if key == "lastVerified":
                year, month, day = text.split("-")
                display = f'<time datetime="{escape(text)}">{escape(f"{day}-{month}-{year}")}</time>'
            else:
                display = escape(text)
            facts.append(f"<div><dt>{label}</dt><dd>{display}</dd></div>")
    links = "".join(f'<li><a href="{escape(s["url"])}">{escape(s.get("label") or record["providerName"])}</a></li>' for s in sources)
    funding_note = "<p>Bekijk bij de aanbieder of deze ronde open is en welke voorwaarden gelden.</p>" if record.get("legacyType") in FUNDING_TYPES else ""
    content = f"""<nav aria-label="Broodkruimel"><a href="../">Aanbod van A tot Z</a></nav>
    <header><h1>{escape(record["title"])}</h1><p>{escape(description)}</p></header>
    <dl class="offer-facts">{''.join(facts)}</dl>
    <section><h2>Officiële bronnen</h2>{funding_note}<ul>{links}</ul></section>
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
