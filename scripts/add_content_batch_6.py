"""Voeg een zesde tranche met officieel geverifieerd AI-onderwijsaanbod toe.

De selectie is op 28 augustus 2026 gecontroleerd. Alleen concrete publicaties,
hulpmiddelen, trainingen en praktijkvoorbeelden met een officiële bron zijn
opgenomen. Tijdgebonden aanbod bevat een expliciete datum en beschikbaarheid.
"""

import json
from pathlib import Path


ROOT = Path(__file__).parents[1]
RECORDS_PATH = ROOT / "data" / "records.json"
META_PATH = ROOT / "data" / "metadata.json"
VERIFIED = "2026-08-28"


def record(identifier, title, kind, legacy, provider, description, purpose,
           audiences, sectors, themes, url, keywords, *, geography="Nederland",
           cost="free", availability="Direct beschikbaar", status="available",
           publication=None, start=None, end=None, language=None,
           organization_ids=None, related_ids=None, access="public",
           deadline=None, notes=None):
    return {
        "id": identifier,
        "title": title,
        "recordType": kind,
        "legacyType": legacy,
        "subtype": None,
        "organizationIds": organization_ids or [],
        "providerName": provider,
        "description": description,
        "purpose": purpose,
        "audiences": audiences,
        "sectors": sectors,
        "themes": themes,
        "status": status,
        "availabilityText": availability,
        "startDate": start,
        "endDate": end,
        "publicationDate": publication,
        "lastVerified": VERIFIED,
        "verificationStatus": "verified",
        "sourceUrls": [{"label": "Officiële bron", "url": url, "sourceType": "official"}],
        "relatedIds": related_ids or [],
        "parentIds": [],
        "childIds": [],
        "geographicScope": geography,
        "accessType": access,
        "costType": cost,
        "fundingAmount": None,
        "fundingDeadline": deadline,
        "applicationOpenDate": None,
        "applicationDeadline": deadline,
        "fundingMin": None,
        "fundingMax": None,
        "totalBudget": None,
        "eligibility": None,
        "applicantTypes": [],
        "callStatus": None,
        "recurrence": None,
        "language": language or ["nl"],
        "keywords": keywords,
        "notes": notes,
        "changeHistory": [{
            "date": VERIFIED,
            "type": "added",
            "summary": "Toegevoegd in gecontroleerde inhoudstranche 6."
        }],
    }


ITEMS = [
    record(
        "npuls-ai-curriculum-arbeidsmarkt-2026", "AI, curriculum & arbeidsmarkt",
        "guidance", "Handreiking", "Npuls",
        "Verkenning van de invloed van AI op werk, vaardigheden en beroepsprofielen, met handvatten voor responsieve curriculumontwikkeling en samenwerking met het werkveld.",
        "Opleidingen helpen curricula toekomstbestendig te houden in een arbeidsmarkt waarin mens en AI steeds meer samenwerken.",
        ["Docenten", "Onderwijsontwikkelaars", "Bestuurders", "Beleidsmakers", "Onderwijsadviseurs"],
        ["MBO", "HBO", "WO"],
        ["Curriculumontwikkeling", "AI-geletterdheid", "Implementatie en adoptie"],
        "https://www.npuls.nl/kennisbank/ai-curriculum-and-arbeidsmarkt",
        ["Npuls", "curriculum", "arbeidsmarkt", "AI-geletterdheid", "vaardigheden"],
        publication="2026-06-23", organization_ids=["npuls"]
    ),
    record(
        "oecd-skills-in-ai-age-2026", "Skills in the AI age",
        "policy_document", "Beleidsdocument", "OECD",
        "Beleidsstudie over de gevolgen van AI voor werk en vaardigheden en over de rol van onderwijs, leven lang ontwikkelen, werkgevers en AI-geletterdheid.",
        "Beleidsmakers en onderwijsorganisaties onderbouwen welke combinatie van basis-, digitale en aanvullende vaardigheden nodig is in het AI-tijdperk.",
        ["Beleidsmakers", "Bestuurders", "Onderzoekers", "Onderwijsontwikkelaars", "HR-professionals"],
        ["MBO", "HBO", "WO", "Onderzoek", "Overheid"],
        ["AI-geletterdheid", "Curriculumontwikkeling", "Onderzoek"],
        "https://www.oecd.org/en/publications/skills-in-the-ai-age_972bd15e-en.html",
        ["OECD", "skills", "future of work", "adult learning", "AI literacy"],
        geography="Internationaal", language=["en"], publication="2026-07-08"
    ),
    record(
        "oecd-ai-and-skills-2026", "AI and skills: What we know so far",
        "guidance", "Handreiking", "OECD",
        "Compacte beleidsbrief die bestaand OECD-onderzoek naar AI en vaardigheden samenbrengt en prioriteiten voor scholing, arbeidsmarktbeleid en vervolgonderzoek benoemt.",
        "Snel een onderbouwd overzicht bieden van wat bekend is over AI, vaardigheden en beleidsopties.",
        ["Beleidsmakers", "Bestuurders", "Onderzoekers", "HR-professionals"],
        ["MBO", "HBO", "WO", "Onderzoek", "Overheid"],
        ["AI-geletterdheid", "Professionalisering", "Onderzoek"],
        "https://www.oecd.org/en/publications/ai-and-skills_f843b352-en.html",
        ["OECD", "AI and skills", "policy brief", "arbeidsmarkt", "professionalisering"],
        geography="Internationaal", language=["en"], publication="2026-06-05"
    ),
    record(
        "ec-repository-ai-literacy-practices-2026",
        "EU-register met praktijkvoorbeelden voor AI-geletterdheid",
        "service", "Voorziening", "Europese Commissie",
        "Doorzoekbaar register van de Europese AI Office met meer dan veertig praktijkvoorbeelden van AI-geletterdheidsinitiatieven, zoals e-learning, trainingen, bootcamps en samenwerkingen.",
        "Organisaties voorbeelden bieden voor de invulling van AI-geletterdheid onder artikel 4 van de AI Act.",
        ["Bestuurders", "Beleidsmakers", "Docenten", "HR-professionals", "IT-professionals"],
        ["PO", "VO", "MBO", "HBO", "WO", "Onderzoek", "Overheid"],
        ["AI-geletterdheid", "AI Act en wetgeving", "Professionalisering"],
        "https://digital-strategy.ec.europa.eu/en/policies/repository-ai-literacy-practices",
        ["AI Office", "AI literacy practices", "AI Act artikel 4", "repository", "training"],
        geography="Europa", language=["en"], publication="2026-07-27",
        organization_ids=["europese-ai-office"],
        notes="De Europese Commissie benadrukt dat overnemen van een voorbeeld niet automatisch betekent dat aan artikel 4 is voldaan."
    ),
    record(
        "surf-tech-trends-ai-2026", "SURF Tech Trends 2026: Artificial Intelligence",
        "guidance", "Handreiking", "SURF",
        "Trendverkenning naar onder meer toegang tot taalmodellen, responsible AI, mens-AI-samenwerking en de gevolgen voor onderwijs, onderzoek en bedrijfsvoering.",
        "Onderwijs- en onderzoeksinstellingen helpen anticiperen op relevante AI-ontwikkelingen en hun impact op publieke waarden.",
        ["Bestuurders", "Beleidsmakers", "Onderzoekers", "IT-professionals", "Onderwijsontwikkelaars"],
        ["MBO", "HBO", "WO", "Onderzoek"],
        ["AI-infrastructuur", "Publieke waarden en ethiek", "Beleid en governance"],
        "https://www.surf.nl/files/cocoon_media_files/surf-tech-trends-2026_ttr26_nl.pdf",
        ["SURF Tech Trends", "language models", "responsible AI", "mens-AI samenwerking"],
        publication="2025-10-01", organization_ids=["surf"]
    ),
    record(
        "kennisnet-ai-tutoren-kansen-beperkingen",
        "Kansen en beperkingen van AI-tutoren voor het onderwijs",
        "guidance", "Handreiking", "Kennisnet",
        "Praktische duiding van AI-tutoren, mogelijke toepassingen en beperkingen rond didactiek, privacy, onderwijskwaliteit, menselijke begeleiding en leveranciersafhankelijkheid.",
        "Scholen helpen beoordelen of en hoe een AI-tutor verantwoord kan worden verkend.",
        ["Docenten", "Schoolleiders", "Bestuurders", "Onderwijsontwikkelaars", "IT-professionals"],
        ["PO", "VO", "MBO"],
        ["Lesgeven en leren met AI", "Privacy en AVG", "Publieke waarden en ethiek"],
        "https://www.kennisnet.nl/trends/kansen-en-beperkingen-van-ai-tutoren-voor-het-onderwijs/",
        ["Kennisnet", "AI-tutor", "adaptief leren", "privacy", "menselijke begeleiding"],
        publication="2025-05-19", organization_ids=["kennisnet"]
    ),
    record(
        "jisc-ai-literacy-module-applied-ai-essentials",
        "AI literacy for teaching and learning – Applied AI essentials",
        "training", "Training", "Jisc",
        "Zelfstudiemodule over praktische inzet van AI voor lesmateriaal, planning, toetsing, feedback, toegankelijkheid, differentiatie en routinematige onderwijstaken.",
        "Onderwijsprofessionals AI praktisch leren toepassen met behoud van professioneel oordeel en menselijke regie.",
        ["Docenten", "Onderwijsontwikkelaars", "Onderwijsadviseurs"],
        ["MBO", "HBO", "WO"],
        ["AI-geletterdheid", "Professionalisering", "Lesgeven en leren met AI"],
        "https://www.jisc.ac.uk/training/ai-literacy-for-teaching-and-learning-module-2-essential-ai-skills-applied-ai-skills",
        ["Jisc", "AI literacy", "applied AI", "teaching resources", "feedback"],
        geography="Internationaal", language=["en"], cost="paid",
        availability="Op aanvraag als downloadbare module voor instellingen",
        notes="Jisc publiceert prijsopties voor instellingen; toegang is niet vrij voor individuele Nederlandse gebruikers."
    ),
    record(
        "jisc-ai-literacy-module-responsible-use",
        "AI literacy for teaching and learning – Ethical and responsible use",
        "training", "Training", "Jisc",
        "Zelfstudiemodule over bias, desinformatie, privacy, beveiliging, auteursrecht, academische integriteit en kritisch beoordelen van AI-uitvoer.",
        "Onderwijsprofessionals leren risico's herkennen en AI verantwoord toepassen in onderwijs en toetsing.",
        ["Docenten", "Onderwijsontwikkelaars", "Examencommissies", "Onderwijsadviseurs"],
        ["MBO", "HBO", "WO"],
        ["AI-geletterdheid", "Publieke waarden en ethiek", "Toetsing en examinering"],
        "https://www.jisc.ac.uk/training/ai-literacy-for-teaching-and-learning-module-3-ethical-and-responsible-use-of-ai-critical-evaluation-and-responsible-use",
        ["Jisc", "ethical AI", "academic integrity", "privacy", "critical evaluation"],
        geography="Internationaal", language=["en"], cost="paid",
        availability="Op aanvraag als downloadbare module voor instellingen",
        notes="Jisc publiceert prijsopties voor instellingen; toegang is niet vrij voor individuele Nederlandse gebruikers."
    ),
    record(
        "jisc-prompting-teaching-learning-october-2026",
        "Prompting for teaching and learning",
        "training", "Training", "Jisc",
        "Online sessie over heldere instructies, context geven, iteratief prompten en kritisch controleren van AI-uitvoer in onderwijscontexten.",
        "Docenten en onderwijsontwikkelaars praktische promptvaardigheden en kritisch beoordelingsvermogen laten oefenen.",
        ["Docenten", "Onderwijsontwikkelaars", "Onderwijsadviseurs"],
        ["MBO", "HBO", "WO"],
        ["Professionalisering", "Lesgeven en leren met AI", "AI-geletterdheid"],
        "https://www.jisc.ac.uk/training/prompting-for-teaching-and-learning",
        ["Jisc", "prompting", "critical evaluation", "teaching and learning"],
        geography="Internationaal", language=["en"], cost="paid",
        availability="Inschrijving geopend voor online sessie op 14 oktober 2026",
        status="planned", start="2026-10-14", end="2026-10-14",
        notes="Voor Jisc-leden inbegrepen; Jisc vermeldt voor niet-leden £52 exclusief btw."
    ),
    record(
        "nolai-meetup-oktober-2026", "NOLAI Meet-up – oktober 2026",
        "training", "Training", "NOLAI",
        "Middag met een keynote, drie interactieve workshops, een projectenplein met prototypes en presentatie van het vernieuwde magazine AI in Onderwijs.",
        "Onderwijsprofessionals, onderzoekers en ontwikkelaars laten leren van actuele co-creatieprojecten rond educatieve AI.",
        ["Docenten", "Schoolleiders", "Onderzoekers", "Onderwijsontwikkelaars", "Aanbieders"],
        ["PO", "VO", "Onderzoek"],
        ["Professionalisering", "Praktijkvoorbeelden", "Lesgeven en leren met AI"],
        "https://www.ru.nl/over-ons/agenda/nolai-meet-up-1",
        ["NOLAI", "meet-up", "workshops", "prototypes", "co-creatie"],
        availability="Inschrijving geopend tot en met 30 september 2026",
        status="planned", start="2026-10-01", end="2026-10-01",
        organization_ids=["nolai"]
    ),
    record(
        "npuls-publieke-waarden-academie-ai-act-september-2026",
        "Publieke Waarden Academie – AI Act workshop",
        "training", "Training", "Npuls",
        "Interactieve workshop over kernbegrippen, tijdlijn en verplichtingen van de AI Act, vertaald naar concrete onderwijscases.",
        "Onderwijsinstellingen praktisch voorbereiden op de gevolgen van de Europese AI-verordening.",
        ["Beleidsmakers", "Bestuurders", "IT-professionals", "Privacyprofessionals", "Informatiemanagers"],
        ["MBO", "HBO", "WO"],
        ["AI Act en wetgeving", "Beleid en governance", "Professionalisering"],
        "https://npuls.nl/agenda/publieke-waarden-academie-ai-act-workshop",
        ["Npuls", "Publieke Waarden Academie", "AI Act", "governance", "onderwijscases"],
        availability="Gratis workshop; inschrijving geopend voor 25 september 2026",
        status="planned", start="2026-09-25", end="2026-09-25",
        organization_ids=["npuls"], notes="Fysieke workshop bij SURF in Utrecht."
    ),
    record(
        "surf-onderwijsdagen-actief-leren-ai-2026",
        "Actief leren met door AI ondersteunde werkvormen",
        "training", "Training", "SURF Onderwijsdagen",
        "Hands-on workshop waarin deelnemers AI-ondersteunde leeractiviteiten analyseren en een eigen activiteit ontwerpen die actief en verdiepend leren stimuleert.",
        "Onderwijsprofessionals leren generatieve AI didactisch in te zetten zonder het beoogde leereffect uit het oog te verliezen.",
        ["Docenten", "Onderwijsontwikkelaars", "Lerarenopleiders"],
        ["VO", "MBO", "HBO"],
        ["Lesgeven en leren met AI", "Professionalisering", "Curriculumontwikkeling"],
        "https://pretalx.surf.nl/surf-onderwijsdagen-2026/talk/SEWRCW/",
        ["SURF Onderwijsdagen", "actief leren", "didactiek", "AI-werkvormen", "Bloom"],
        cost="paid", availability="Onderdeel van SURF Onderwijsdagen op 10 november 2026",
        status="planned", start="2026-11-10", end="2026-11-10",
        organization_ids=["surf"]
    ),
    record(
        "roc-amsterdam-ai-tutoring-mbo-2026",
        "AI-tutoring in het mbo bij ROC van Amsterdam-Flevoland",
        "practice_example", "Praktijkvoorbeeld", "ROC van Amsterdam-Flevoland",
        "Praktijkcasus over AI-begeleiding in Canvas bij drie mbo-opleidingen, met adaptieve taalondersteuning, vakspecifieke assistenten en contextgerichte prompts.",
        "Laten zien hoe een klein mbo-team AI-begeleiding stapsgewijs kan configureren, integreren en beproeven.",
        ["Docenten", "Onderwijsontwikkelaars", "IT-professionals", "Schoolleiders"],
        ["MBO"],
        ["Praktijkvoorbeelden", "Lesgeven en leren met AI", "Implementatie en adoptie"],
        "https://pretalx.surf.nl/surf-onderwijsdagen-2026/talk/8AP7KP/",
        ["ROC van Amsterdam", "AI tutoring", "Canvas", "adaptieve begeleiding", "MBO"],
        availability="Praktijkcasus wordt gepresenteerd op 11 november 2026",
        status="planned", start="2026-11-11", end="2026-11-11",
        notes="De bron beschrijft een bestaande praktijkcasus; de openbare presentatie vindt plaats tijdens SURF Onderwijsdagen 2026."
    ),
    record(
        "nolai-webinar-algemene-educatieve-ai-2026-2027",
        "NOLAI-webinar Algemene en educatieve AI",
        "training", "Training", "NOLAI",
        "Gratis online webinar voor leraren over wat AI voor leren en lesgeven betekent en het verschil tussen algemene en specifiek educatieve AI.",
        "Leraren zonder vereiste voorkennis een toegankelijke introductie tot verantwoorde educatieve AI bieden.",
        ["Docenten", "Schoolleiders", "Onderwijsontwikkelaars"],
        ["PO", "VO"],
        ["AI-geletterdheid", "Professionalisering", "Lesgeven en leren met AI"],
        "https://www.ru.nl/over-ons/agenda/nolai-webinar-algemene-en-educatieve-ai",
        ["NOLAI", "webinar", "educatieve AI", "algemene AI", "leraren"],
        availability="Gratis webinars vanaf 17 september 2026; meerdere vervolgdata gepubliceerd",
        status="planned", start="2026-09-17", end="2027-05-13",
        organization_ids=["nolai"],
        notes="De officiële pagina vermeldt vervolgdata op 12 november 2026 en 14 januari, 11 maart en 13 mei 2027."
    ),
]


def normalized(value):
    return " ".join(str(value).casefold().split()).rstrip("/")


def main():
    records = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
    positions = {existing["id"]: index for index, existing in enumerate(records)}
    item_ids = {item["id"] for item in ITEMS}
    titles = {
        normalized(existing["title"])
        for existing in records
        if existing["id"] not in item_ids
    }
    urls = {
        normalized(source["url"])
        for existing in records
        if existing["id"] not in item_ids
        for source in existing.get("sourceUrls", [])
    }
    added = 0
    updated = 0

    for new_record in ITEMS:
        title = normalized(new_record["title"])
        url = normalized(new_record["sourceUrls"][0]["url"])
        if title in titles:
            raise SystemExit(f"Import gestopt: dubbele titel voor {new_record['title']}")
        if url in urls:
            raise SystemExit(f"Import gestopt: dubbele bron-URL voor {new_record['title']}")
        titles.add(title)
        urls.add(url)
        if new_record["id"] in positions:
            records[positions[new_record["id"]]] = new_record
            updated += 1
        else:
            positions[new_record["id"]] = len(records)
            records.append(new_record)
            added += 1

    RECORDS_PATH.write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    metadata = json.loads(META_PATH.read_text(encoding="utf-8"))
    metadata.update({
        "version": "Werkversie 0.7",
        "updated": "28 augustus 2026",
        "recordCount": len(records),
    })
    META_PATH.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"Toegevoegd: {added}; bijgewerkt: {updated}; canoniek totaal: {len(records)}")


if __name__ == "__main__":
    main()
