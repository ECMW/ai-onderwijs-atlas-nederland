"""Render the classroom copies without the teacher tools or model answers."""
import json
import re
from html import escape
from pathlib import Path

from public_assets import versioned_html


def load_worksheets(root: Path) -> dict:
    source = root / "data/worksheets.json"
    worksheets = json.loads(source.read_text(encoding="utf-8")) if source.is_file() else {}
    for key in worksheets:
        if not re.fullmatch(r"werkblad-[a-z0-9]+(?:-[a-z0-9]+)*", key):
            raise ValueError(f"Ongeldig werkbladadres: {key}")
    return worksheets


def render_pupil_pages(worksheets: dict, directory: Path, root: Path) -> None:
    for key, sheet in worksheets.items():
        slug = key.removeprefix("werkblad-")
        tasks = "".join(f"<li>{escape(task)}</li>" for task in sheet["tasks"])
        case_file = ""
        if sheet.get("caseFile"):
            documents = "".join(
                f"<dt>{escape(item['label'])}</dt><dd>{escape(item['text'])}</dd>"
                for item in sheet["caseFile"]
            )
            case_file = f'<section class="work-case"><h2>Fictief dossier</h2><dl>{documents}</dl></section>'
        title = escape(sheet["title"])
        credit = "Werkblad van de AI &amp; Onderwijs Atlas Nederland."
        if sheet.get("credit"):
            credit += " " + escape(sheet["credit"])
        page = f"""<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <meta name="description" content="{escape(sheet["goal"])}">
  <link rel="canonical" href="https://aionderwijsatlas.nl/lesmateriaal/leerling/{slug}/">
  <title>{title} | Leerlingblad</title>
  <link rel="stylesheet" href="../../../platform.css">
  <link rel="stylesheet" href="../../../brand.css">
  <style>@page {{ margin: 15mm }} .class-handout [hidden] {{ display: none }}</style>
</head>
<body>
  <main class="work-sheet class-handout">
    <header><p class="lesson-level">Leerlingblad · {escape(sheet["level"])}</p>
      <h1>{title}</h1><p><strong>Leerdoel</strong> · {escape(sheet["goal"])}</p></header>
    {case_file}
    <section class="work-pupil"><h2>Opdracht voor de klas</h2><ol>{tasks}</ol></section>
    <p class="learner-credit">{credit}</p>
    <button type="button" class="btn secondary work-screen" hidden>Druk leerlingblad af</button>
  </main>
  <script>
    const printButton = document.querySelector('button');
    printButton.hidden = false;
    printButton.addEventListener('click', () => window.print());
  </script>
</body>
</html>
"""
        target = directory / "leerling" / slug / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        document_dir = root / "lesmateriaal/leerling" / slug
        target.write_text(versioned_html(root, page, document_dir=document_dir), encoding="utf-8")
