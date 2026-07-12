"""Importeer de vaste atlas-markdownstructuur naar JSON en de lokale JS-gegevenslaag."""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path


def repair(text: str) -> str:
    """Herstel UTF-8 die eenmaal als Windows-1252/Latin-1 is geïnterpreteerd."""
    for encoding in ("cp1252", "latin1"):
        try:
            candidate = text.encode(encoding).decode("utf-8")
            if candidate.count("Ã") + candidate.count("â") < text.count("Ã") + text.count("â"):
                text = candidate
        except (UnicodeEncodeError, UnicodeDecodeError):
            pass
    return text


def slug(value: str) -> str:
    plain = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", plain.lower()))


def parse(path: Path) -> tuple[dict, list[dict]]:
    raw = repair(path.read_text(encoding="utf-8-sig"))
    version = re.search(r"\*\*Versie:\*\*\s*(.+)", raw)
    updated = re.search(r"\*\*Bijgewerkt:\*\*\s*(.+)", raw)
    items: list[dict] = []
    seen: dict[str, int] = {}
    current_section = ""
    chunks = re.split(r"(?=^##+ )", raw, flags=re.M)
    for chunk in chunks:
        heading = re.match(r"^(#{2,3})\s+(.+)$", chunk, flags=re.M)
        if not heading:
            continue
        level, title = len(heading.group(1)), heading.group(2).strip()
        if level == 2:
            current_section = title
            continue
        body = chunk[heading.end():].strip()
        fields = dict(re.findall(r"^- \*\*(.+?):\*\*\s*(.*)$", body, flags=re.M))
        if not fields:
            continue
        description = re.split(r"\n\*\*Links:\*\*", body)[0]
        description = re.sub(r"^- \*\*.+?:\*\*.*$", "", description, flags=re.M).strip()
        links = re.findall(r"^- \[([^]]+)]\((https?://[^)]+)\)", body, flags=re.M)
        item_id = slug(title)
        if item_id in seen:
            seen[item_id] += 1
            item_id += f"-{seen[item_id]}"
        else:
            seen[item_id] = 1
        split = lambda key: [v.strip() for v in fields.get(key, "").split(",") if v.strip()]
        item = {
            "id": item_id,
            "title": title,
            "type": fields.get("Type", current_section.rstrip("s")),
            "organisation": fields.get("Organisatie") or None,
            "status": fields.get("Status") or None,
            "sector": split("Sector"),
            "audience": fields.get("Doelgroep") or None,
            "year": int(fields["Jaar"]) if fields.get("Jaar", "").isdigit() else fields.get("Jaar") or None,
            "goal": fields.get("Doel / rol") or None,
            "availableFrom": fields.get("Beschikbaar vanaf") or None,
            "duration": fields.get("Looptijd") or None,
            "budget": fields.get("Budget") or None,
            "keywords": split("Trefwoorden"),
            "description": description or None,
            "url": links[0][1] if links else None,
            "links": [{"label": label, "url": url} for label, url in links],
            "sourceSection": current_section,
        }
        items.append(item)
    meta = {
        "version": version.group(1).strip() if version else "Nog niet ingevuld",
        "updated": updated.group(1).strip() if updated else None,
        "sourceNote": "Geïmporteerd uit atlas-ai-onderwijs-nederland.md; onzekerheden uit de bron zijn behouden.",
        "recordCount": len(items),
    }
    return meta, items


def main() -> None:
    source, data_dir = Path(sys.argv[1]), Path(sys.argv[2])
    meta, items = parse(source)
    data_dir.mkdir(parents=True, exist_ok=True)
    pretty = lambda obj: json.dumps(obj, ensure_ascii=False, indent=2) + "\n"
    (data_dir / "items.json").write_text(pretty(items), encoding="utf-8")
    (data_dir / "metadata.json").write_text(pretty(meta), encoding="utf-8")
    payload = {"metadata": meta, "items": items,
               "needs": ["Veilige AI-omgeving", "AI-literacy", "Toetsing", "Privacy", "AI Act", "Subsidies", "Voorbeeldbeleid", "Implementatiehulp", "Standaarden", "Pilots", "Communities"],
               "changelog": []}
    (data_dir / "data.js").write_text("window.ATLAS_DATA=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"{len(items)} records geïmporteerd")


if __name__ == "__main__":
    main()
