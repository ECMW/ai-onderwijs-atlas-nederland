"""Vul pilots, praktijkvoorbeelden, hulpmiddelen, programma's en organisaties aan."""

import json
from pathlib import Path

ROOT = Path(__file__).parents[1]
PATH = ROOT / "data" / "records.json"
META = ROOT / "data" / "metadata.json"
DATE = "2026-07-12"


def make(id, title, record_type, legacy_type, provider, description, purpose,
         audiences, sectors, themes, url, keywords, *, status="available",
         availability="Direct beschikbaar", geography="Nederland", start=None,
         end=None, publication=None, language=None, cost="unknown"):
    return {
        "id": id, "title": title, "recordType": record_type, "legacyType": legacy_type,
        "subtype": None, "organizationIds": [], "providerName": provider,
        "description": description, "purpose": purpose, "audiences": audiences,
        "sectors": sectors, "themes": themes, "status": status,
        "availabilityText": availability, "startDate": start, "endDate": end,
        "publicationDate": publication, "lastVerified": DATE,
        "verificationStatus": "verified",
        "sourceUrls": [{"label": "Officiële bron", "url": url, "sourceType": "official"}],
        "relatedIds": [], "parentIds": [], "childIds": [],
        "geographicScope": geography, "accessType": "public", "costType": cost,
        "fundingAmount": None, "fundingDeadline": None,
        "applicationOpenDate": None, "applicationDeadline": None,
        "fundingMin": None, "fundingMax": None, "totalBudget": None,
        "eligibility": None, "applicantTypes": [], "callStatus": None,
        "recurrence": None, "language": language or ["nl"], "keywords": keywords,
        "notes": None, "changeHistory": [{"date": DATE, "type": "added",
            "summary": "Toegevoegd in gecontroleerde inhoudstranche 2b."}]
    }


ITEMS = [
    make("nolai-leren-argumenteren-met-ai", "Leren argumenteren met AI", "research_project", "Pilot", "NOLAI",
        "Co-creatieproject voor een veilige multi-agenttoepassing die leerlingen ondersteunt bij argumenteren zonder het denkproces over te nemen.",
        "Onderzoeken hoe educatieve AI de argumentatievaardigheid van leerlingen mensgericht kan ondersteunen.",
        ["Docenten", "Onderzoekers", "Leerlingen"], ["PO"], ["Onderzoek", "Lesgeven en leren met AI", "Publieke waarden en ethiek"],
        "https://www.ru.nl/onderzoek/onderzoeksprojecten/leren-argumenteren-met-ai", ["argumenteren", "multi-agent", "co-creatie", "menselijke regie"], status="pilot", availability="Lopend project 2026–2029", start="2026-01-01", end="2029-12-31"),
    make("nolai-studiekeuzeproces-met-ai", "Studiekeuzeproces met AI", "research_project", "Pilot", "NOLAI",
        "Co-creatieproject dat onderzoekt hoe AI leerlingen kan ondersteunen bij studiekeuze zonder hun autonomie en professionele begeleiding te verdringen.",
        "Een verantwoord AI-concept ontwikkelen dat reflectie en passende studiekeuzes ondersteunt.",
        ["Docenten", "Onderzoekers", "Leerlingen", "Schoolleiders"], ["VO"], ["Onderzoek", "Publieke waarden en ethiek", "Implementatie en adoptie"],
        "https://www.ru.nl/onderzoek/onderzoeksprojecten/studiekeuzeproces-met-ai", ["studiekeuze", "autonomie", "AI-begeleiding", "co-creatie"], status="pilot", availability="Lopend project 2026–2029", start="2026-01-01", end="2029-12-31"),
    make("nolai-slimme-wiskundefeedback", "Slimme wiskundefeedback met AI", "research_project", "Pilot", "NOLAI",
        "Co-creatieproject rond AI-ondersteunde feedback op tussenstappen en oplossingsstrategieën bij wiskunde.",
        "Onderzoeken hoe AI tijdige feedback kan geven terwijl de docent regie houdt over leren en beoordelen.",
        ["Docenten", "Onderzoekers", "Leerlingen"], ["VO"], ["Onderzoek", "Lesgeven en leren met AI", "Toetsing en examinering"],
        "https://www.ru.nl/onderzoek/onderzoeksprojecten/slimme-wiskundefeedback-met-ai", ["wiskunde", "feedback", "AI", "co-creatie"], status="pilot", availability="Lopend project 2025–2028", start="2025-01-01", end="2028-12-31"),
    make("nolai-zelfstandiger-communiceren-met-ai", "Zelfstandiger communiceren met AI", "research_project", "Pilot", "NOLAI",
        "Co-creatieproject naar educatieve AI die leerlingen in het gespecialiseerd onderwijs ondersteunt bij zelfstandiger communiceren.",
        "Toegankelijke ondersteuning ontwikkelen met expliciete aandacht voor autonomie, inclusie en de rol van begeleiders.",
        ["Docenten", "Onderzoekers", "Leerlingen", "Onderwijsadviseurs"], ["PO", "VO"], ["Onderzoek", "Lesgeven en leren met AI", "Publieke waarden en ethiek"],
        "https://www.ru.nl/onderzoek/onderzoeksprojecten/zelfstandiger-communiceren-met-ai", ["gespecialiseerd onderwijs", "communicatie", "inclusie", "autonomie"], status="pilot", availability="Lopend project 2026–2029", start="2026-01-01", end="2029-12-31"),
    make("hva-dark-tech-studio-smart-glasses", "Dark Tech Studio: ethische verkenning van AI-smartglasses", "practice_example", "Praktijkvoorbeeld", "Hogeschool van Amsterdam",
        "Praktijkverhaal over studenten die een technologisch prototype bouwen en tijdens het ontwerpproces expliciet de maatschappelijke en ethische risico's onderzoeken.",
        "Laten zien hoe kritische reflectie, ontwerppraktijk en publieke waarden in technisch onderwijs gecombineerd kunnen worden.",
        ["Docenten", "Studenten", "Onderzoekers"], ["HBO"], ["Praktijkvoorbeelden", "Publieke waarden en ethiek", "Lesgeven en leren met AI"],
        "https://communities.surf.nl/en/publieke-waarden/article/were-building-something-irresponsible-part-2", ["Dark Tech Studio", "smart glasses", "ethiek", "design education"], publication="2026-06-24", language=["en"]),
    make("vu-ai-toolbox-onderwijs", "AI Toolbox van de Vrije Universiteit", "practice_example", "Praktijkvoorbeeld", "Vrije Universiteit Amsterdam",
        "Praktijkvoorbeeld van een instellingsbrede toolbox met workshops en toepassingen waarmee docenten AI verantwoord in onderwijsactiviteiten verkennen.",
        "Laten zien hoe een universiteit ondersteuning, experimenten en docentprofessionalisering rond AI organiseert.",
        ["Docenten", "Onderwijsadviseurs", "IT-professionals"], ["WO"], ["Praktijkvoorbeelden", "Professionalisering", "Implementatie en adoptie"],
        "https://communities.surf.nl/vraagbaak-online-onderwijs/artikel/ai-toolbox-vrije-universiteit-deze-ai-tools-helpen-je-je", ["Vrije Universiteit", "AI Toolbox", "workshops", "onderwijsinnovatie"], publication="2025-03-05"),
    make("selfie-for-schools", "SELFIE voor scholen", "product", "Product", "Europese Commissie",
        "Gratis en anonieme zelfevaluatietool waarmee schoolleiders, leraren en leerlingen gezamenlijk het gebruik van digitale technologie in hun school in kaart brengen.",
        "Scholen een feitelijke basis geven voor een gezamenlijk plan voor digitale ontwikkeling en professionalisering.",
        ["Schoolleiders", "Docenten", "Leerlingen", "Beleidsmakers"], ["PO", "VO", "MBO"], ["Implementatie en adoptie", "Professionalisering", "Beleid en governance"],
        "https://education.ec.europa.eu/selfie", ["SELFIE", "school planning", "digital technology", "anonymous"], geography="Europa", cost="free", language=["Meertalig"]),
    make("eit-higher-education-initiative", "EIT Higher Education Initiative", "programme", "Programma", "European Institute of Innovation and Technology",
        "Europees programma dat consortia van hogeronderwijsinstellingen ondersteunt bij innovatiecapaciteit, ondernemerschap en institutionele verandering.",
        "Hoger onderwijs en innovatie-ecosystemen verbinden en institutionele innovatiecapaciteit versterken.",
        ["Bestuurders", "Onderwijsinstellingen", "Onderzoekers"], ["HBO", "WO", "Onderzoek"], ["Subsidies en financiering", "Implementatie en adoptie"],
        "https://eit-hei.eu/", ["EIT HEI", "higher education", "innovation capacity", "funding"], geography="Europa", language=["en"]),
    make("unesco", "UNESCO", "organization", "Organisatie", "UNESCO",
        "Organisatie van de Verenigde Naties voor onderwijs, wetenschap en cultuur, met mondiale kaders en beleidsadviezen voor AI in het onderwijs.",
        "Internationale normontwikkeling, kennisdeling en capaciteitsopbouw rond mensgerichte digitale transformatie.",
        ["Beleidsmakers", "Onderzoekers", "Docenten", "Bestuurders"], ["PO", "VO", "MBO", "HBO", "WO", "Onderzoek", "Overheid"], ["AI-geletterdheid", "Publieke waarden en ethiek", "Beleid en governance"],
        "https://www.unesco.org/en/digital-education/artificial-intelligence", ["UNESCO", "AI education", "global guidance"], geography="Internationaal", language=["Meertalig"]),
    make("oecd-education", "OECD – Education and Skills", "organization", "Organisatie", "OECD",
        "Internationale kennisorganisatie die vergelijkend onderzoek, indicatoren en beleidskaders voor onderwijs en vaardigheden ontwikkelt.",
        "Landen ondersteunen met onderbouwde internationale vergelijking en beleidsanalyse, waaronder AI-geletterdheid.",
        ["Beleidsmakers", "Onderzoekers", "Bestuurders"], ["PO", "VO", "MBO", "HBO", "WO", "Onderzoek", "Overheid"], ["Onderzoek", "AI-geletterdheid", "Beleid en governance"],
        "https://www.oecd.org/en/topics/education-and-skills.html", ["OECD", "education", "skills", "policy"], geography="Internationaal", language=["en", "fr"]),
]


def norm(value):
    return " ".join(str(value).casefold().split()).rstrip("/")


def main():
    records = json.loads(PATH.read_text(encoding="utf-8"))
    ids = {item["id"] for item in records}
    titles = {norm(item["title"]) for item in records}
    urls = {norm(source["url"]) for item in records for source in item.get("sourceUrls", [])}
    for item in ITEMS:
        clashes = []
        if item["id"] in ids: clashes.append("id")
        if norm(item["title"]) in titles: clashes.append("titel")
        if norm(item["sourceUrls"][0]["url"]) in urls: clashes.append("bron-URL")
        if clashes: raise SystemExit(f"Import gestopt: {item['title']} botst op {', '.join(clashes)}")
        ids.add(item["id"]); titles.add(norm(item["title"])); urls.add(norm(item["sourceUrls"][0]["url"]))
    records.extend(ITEMS)
    PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata = json.loads(META.read_text(encoding="utf-8"))
    metadata["recordCount"] = len(records)
    META.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Toegevoegd: {len(ITEMS)}; totaal: {len(records)}")


if __name__ == "__main__":
    main()
