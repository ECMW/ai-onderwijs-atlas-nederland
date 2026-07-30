"""Voeg een vijfde tranche met officieel geverifieerd AI-onderwijsaanbod toe.

De selectie is op 30 juli 2026 gecontroleerd. Alleen concrete materialen,
trainingen, kaders, projecten en kansen met een officiële bron zijn opgenomen.
Toegangsbeperkingen en nog niet vastgestelde cursusdata worden expliciet vermeld.
"""

import json
from pathlib import Path


ROOT = Path(__file__).parents[1]
RECORDS_PATH = ROOT / "data" / "records.json"
META_PATH = ROOT / "data" / "metadata.json"
VERIFIED = "2026-07-30"


def record(identifier, title, kind, legacy, provider, description, purpose,
           audiences, sectors, themes, url, keywords, *, geography="Nederland",
           cost="free", availability="Direct beschikbaar", status="available",
           publication=None, start=None, end=None, language=None,
           organization_ids=None, related_ids=None, access="public",
           deadline=None, call_status=None, applicant_types=None, notes=None):
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
        "applicantTypes": applicant_types or [],
        "callStatus": call_status,
        "recurrence": None,
        "language": language or ["nl"],
        "keywords": keywords,
        "notes": notes,
        "changeHistory": [{
            "date": VERIFIED,
            "type": "added",
            "summary": "Toegevoegd in gecontroleerde inhoudstranche 5."
        }],
    }


ITEMS = [
    record(
        "hogeschool-van-arnhem-en-nijmegen", "Hogeschool van Arnhem en Nijmegen (HAN)",
        "organization", "Organisatie", "Hogeschool van Arnhem en Nijmegen",
        "Nederlandse hogeschool met opleidingen, docentprofessionalisering, kaders en praktische hulpmiddelen voor verantwoord gebruik van AI in onderwijs en onderzoek.",
        "Onderwijsprofessionals en organisaties ondersteunen bij toegepaste, verantwoorde AI.",
        ["Docenten", "Studenten", "Onderwijsontwikkelaars", "Onderzoekers", "IT-professionals"],
        ["HBO", "Onderzoek"], ["Professionalisering", "Lesgeven en leren met AI", "Beleid en governance"],
        "https://www.han.nl/", ["HAN", "hogeschool", "AI", "docentprofessionalisering"]
    ),
    record(
        "universiteit-leiden", "Universiteit Leiden", "organization", "Organisatie",
        "Universiteit Leiden",
        "Nederlandse universiteit met onderwijs, onderzoek en ondersteuning rond AI-geletterdheid, generatieve AI, toetsing en verantwoord onderwijsontwerp.",
        "Wetenschappelijk onderwijs, onderzoek en docentprofessionalisering rond AI ondersteunen.",
        ["Docenten", "Studenten", "Onderzoekers", "Onderwijsontwikkelaars"],
        ["WO", "Onderzoek"], ["AI-geletterdheid", "Professionalisering", "Onderzoek"],
        "https://www.universiteitleiden.nl/", ["Universiteit Leiden", "LLInC", "AI in Education"]
    ),
    record(
        "open-universiteit", "Open Universiteit", "organization", "Organisatie",
        "Open Universiteit",
        "Nederlandse universiteit voor flexibel en online hoger onderwijs met publieke kennisdeling en onderzoek naar leren, toetsen en verantwoord gebruik van AI.",
        "Toegankelijk academisch onderwijs en onderzoek naar digitaal en AI-ondersteund leren bieden.",
        ["Docenten", "Studenten", "Onderzoekers", "Onderwijsontwikkelaars"],
        ["WO", "Onderzoek"], ["Lesgeven en leren met AI", "Toetsing en examinering", "Onderzoek"],
        "https://www.ou.nl/", ["Open Universiteit", "online leren", "AI", "toetsing"]
    ),
    record(
        "han-ai-voor-docenten-basis", "AI voor Docenten in het Onderwijs (basis)",
        "training", "Training", "Hogeschool van Arnhem en Nijmegen",
        "Cursus van twee bijeenkomsten waarin docenten uit po, vo, mbo en hbo met onder meer ChatGPT, Gemini en NotebookLM onderwijs op maat leren ontwerpen.",
        "Docenten praktisch en verantwoord leren werken met AI bij het ontwerpen van leermateriaal.",
        ["Docenten", "Onderwijsontwikkelaars"], ["PO", "VO", "MBO", "HBO"],
        ["Professionalisering", "Lesgeven en leren met AI", "Curriculumontwikkeling"],
        "https://www.han.nl/opleidingen/cursus/ai-voor-docenten-in-het-onderwijs-basis/",
        ["HAN", "AI voor docenten", "ChatGPT", "Gemini", "NotebookLM"],
        cost="paid", availability="Aanmelden mogelijk; startdatum wordt nog vastgesteld",
        status="planned", organization_ids=["hogeschool-van-arnhem-en-nijmegen"],
        notes="Kosten volgens de officiële pagina: €295. Twee bijeenkomsten; er was op 30 juli 2026 nog geen startdatum vastgesteld."
    ),
    record(
        "han-ai-voor-docenten-verdieping", "AI voor Docenten in het Onderwijs (verdieping)",
        "training", "Training", "Hogeschool van Arnhem en Nijmegen",
        "Verdiepende cursus voor docenten met AI-ervaring die via vibecoding eigen applicaties en websites voor hun onderwijspraktijk leren maken.",
        "Docenten leren met AI onderwijsapplicaties te ontwerpen en daarbij bewuste privacykeuzes te maken.",
        ["Docenten", "Onderwijsontwikkelaars"], ["PO", "VO", "MBO", "HBO"],
        ["Professionalisering", "Lesgeven en leren met AI", "Privacy en AVG"],
        "https://www.han.nl/opleidingen/cursus/ai-voor-docenten-in-het-onderwijs-verdieping/",
        ["HAN", "vibecoding", "Bolt", "Lovable", "Cursor", "docenten"],
        cost="paid", availability="Aanmelden mogelijk; startdatum wordt nog vastgesteld",
        status="planned", organization_ids=["hogeschool-van-arnhem-en-nijmegen"],
        notes="Kosten volgens de officiële pagina: €295. Twee bijeenkomsten; er was op 30 juli 2026 nog geen startdatum vastgesteld."
    ),
    record(
        "han-onderwijs-met-ai", "Onderwijs met AI: kaders, tools en ondersteuning",
        "service", "Voorziening", "Hogeschool van Arnhem en Nijmegen",
        "Centrale HAN-omgeving met het integrale AI-kader, informatie over AI als bron, beschikbare AI-tools, literatuur en ondersteuning voor onderwijsprofessionals.",
        "Kaders en direct bruikbare ondersteuning voor verantwoord AI-gebruik in onderwijs bijeenbrengen.",
        ["Docenten", "Studenten", "Onderwijsontwikkelaars", "Onderzoekers", "Bestuurders"],
        ["HBO", "Onderzoek"], ["Beleid en governance", "Veilige AI-omgeving", "Lesgeven en leren met AI"],
        "https://www.han.nl/onderwijsondersteuning/leren-werken-met-ict/artificial-intelligence/ai-in-je-onderwijs/",
        ["HAN", "integraal AI-kader", "AI-tools", "onderwijsondersteuning"],
        organization_ids=["hogeschool-van-arnhem-en-nijmegen"]
    ),
    record(
        "han-toolkit-ai-bestendig-toetsen", "Toolkit AI-bestendig toetsen",
        "guidance", "Handreiking", "Hogeschool van Arnhem en Nijmegen",
        "Toolkit waarmee opleidingen de AI-bestendigheid van toetsen analyseren en het gesprek voeren over leeruitkomsten, toetsvormen en constructive alignment.",
        "Opleidingsteams helpen hun toetsprogramma bewust aan te passen aan de mogelijkheden en risico's van AI.",
        ["Docenten", "Examencommissies", "Onderwijsontwikkelaars", "Toetsdeskundigen"],
        ["HBO"], ["Toetsing en examinering", "Beleid en governance", "Implementatie en adoptie"],
        "https://www.han.nl/onderwijsondersteuning/leren-werken-met-ict/toetsing/AI-bestendig-toetsen-Versie-1.0-17-oktober-2024.pdf",
        ["HAN", "AI-bestendig toetsen", "constructive alignment", "toetsprogramma"],
        publication="2024-10-17", organization_ids=["hogeschool-van-arnhem-en-nijmegen"]
    ),
    record(
        "vu-workshops-generatieve-ai-onderwijsteams", "Workshops generatieve AI voor onderwijsteams",
        "training", "Training", "Vrije Universiteit Amsterdam",
        "Op maat aangeboden workshops voor onderwijsteams, waaronder AI-chatbots, prompting, AI-tools, cursusontwerp en integratie van generatieve AI in onderwijs.",
        "Onderwijsteams praktisch ondersteunen bij verantwoord en effectief gebruik van generatieve AI.",
        ["Docenten", "Onderwijsontwikkelaars", "Onderwijsteams"], ["WO"],
        ["Professionalisering", "Lesgeven en leren met AI", "Implementatie en adoptie"],
        "https://vu.nl/nl/nieuws/2026/workshops-op-maat-voor-jouw-onderwijsteam",
        ["VU Education Lab", "maatwerk", "prompting", "AI-chatbots", "cursusontwerp"],
        cost="unknown", availability="Op aanvraag voor onderwijsteams",
        organization_ids=["vrije-universiteit-amsterdam"], language=["en"],
        notes="Prijs en planning worden op aanvraag afgestemd."
    ),
    record(
        "leiden-ai-literacy-for-teachers", "AI Literacy for Teachers",
        "training", "Training", "Universiteit Leiden",
        "Interactieve online module met kansen, risico's, praktische toepassingen en richtlijnen voor docenten die AI bewust in hun onderwijs willen integreren.",
        "Docenten een toegankelijke basis geven voor verantwoorde toepassing van AI in hun onderwijspraktijk.",
        ["Docenten", "Onderwijsontwikkelaars"], ["WO"],
        ["AI-geletterdheid", "Professionalisering", "Lesgeven en leren met AI"],
        "https://www.medewerkers.universiteitleiden.nl/mededelingen/2026/04/nieuwe-online-module-met-schat-aan-informatie-over-ai-in-het-onderwijs",
        ["Universiteit Leiden", "LLInC", "AI Literacy for Teachers", "e-learning"],
        access="restricted", availability="Beschikbaar voor medewerkers via de universitaire leeromgeving",
        organization_ids=["universiteit-leiden"], publication="2026-04-09",
        notes="De module zelf staat in ecole en vereist toegang als medewerker van Universiteit Leiden."
    ),
    record(
        "leiden-llm-didactic-guide", "LLM Didactic Guide",
        "training", "Training", "Universiteit Leiden",
        "E-learning over de werking van taalmodellen en het effectief, verantwoord en transparant integreren van LLM's in onderwijsactiviteiten.",
        "Docenten praktische kennis en vaardigheden geven voor didactisch verantwoord gebruik van taalmodellen.",
        ["Docenten", "Onderwijsontwikkelaars"], ["WO"],
        ["Professionalisering", "Lesgeven en leren met AI", "Publieke waarden en ethiek"],
        "https://www.staff.universiteitleiden.nl/announcements/2026/04/understanding-llms-in-your-teaching-follow-the-e-learning-course",
        ["Universiteit Leiden", "LLInC", "LLM Didactic Guide", "e-learning"],
        access="restricted", availability="Beschikbaar voor medewerkers via de universitaire leeromgeving",
        organization_ids=["universiteit-leiden"], publication="2026-04-09", language=["en"],
        notes="De e-learning zelf staat in de interne leeromgeving van Universiteit Leiden."
    ),
    record(
        "ou-webinar-slim-leren-oefenen-toetsen-ai", "Webinar Slim leren, oefenen en toetsen met AI",
        "training", "Training", "Open Universiteit",
        "Publiek terug te kijken webinar over verantwoorde inzet van generatieve AI bij leren, oefenen en betrouwbaar toetsen, met menselijk vakmanschap als uitgangspunt.",
        "Wetenschappelijke inzichten over AI in de volledige onderwijscyclus toegankelijk maken.",
        ["Docenten", "Onderwijsontwikkelaars", "Onderzoekers", "Studenten"],
        ["HBO", "WO", "Onderzoek"], ["Lesgeven en leren met AI", "Toetsing en examinering", "Professionalisering"],
        "https://www.ou.nl/-/studium-generale-lezing-slim-leren-oefenen-en-toetsen-met-ai",
        ["Open Universiteit", "webinar", "leren", "oefenen", "toetsen"],
        organization_ids=["open-universiteit"], publication="2026-03-05"
    ),
    record(
        "ec-ai-literacy-questions-answers", "AI-geletterdheid: vragen en antwoorden",
        "guidance", "Handreiking", "Europese Commissie",
        "Actuele uitleg van de Europese Commissie over AI-geletterdheid, artikel 4 van de AI Act, verantwoordelijkheden van aanbieders en gebruiksorganisaties en beschikbare ondersteuningsinitiatieven.",
        "Organisaties helpen de Europese verplichting rond AI-geletterdheid praktisch en proportioneel te begrijpen.",
        ["Bestuurders", "Beleidsmakers", "Docenten", "IT-professionals", "HR-professionals"],
        ["PO", "VO", "MBO", "HBO", "WO", "Onderzoek", "Overheid"],
        ["AI Act en wetgeving", "AI-geletterdheid", "Beleid en governance"],
        "https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers",
        ["AI Act artikel 4", "AI literacy", "vragen en antwoorden", "Europese Commissie"],
        geography="Europa", language=["en"], organization_ids=["europese-ai-office"],
        publication="2026-07-27"
    ),
    record(
        "ec-richtlijnen-digitale-onderwijsinhoud-2026",
        "EU-richtlijnen voor digitale onderwijsinhoud",
        "guidance", "Handreiking", "Europese Commissie",
        "Praktisch raamwerk voor het selecteren, maken, aanpassen en evalueren van digitale leermaterialen, waaronder AI-gegenereerde inhoud, met criteria voor kwaliteit, inclusie, veiligheid en juridische naleving.",
        "Leraren en onderwijsorganisaties helpen betrouwbare digitale en AI-gegenereerde leermiddelen te kiezen en gebruiken.",
        ["Docenten", "Schoolleiders", "Onderwijsontwikkelaars", "Beleidsmakers"],
        ["PO", "VO", "MBO", "HBO", "WO"],
        ["Curriculumontwikkeling", "Publieke waarden en ethiek", "Veilige AI-omgeving"],
        "https://education.ec.europa.eu/focus-topics/digital-education/actions/plan/digital-education-content-guidelines-and-framework",
        ["digital education content", "AI-generated content", "quality criteria", "EU guidelines"],
        geography="Europa", language=["en"], organization_ids=["europese-commissie-dg-eac"],
        publication="2026-07-27"
    ),
    record(
        "ec-richtlijnen-digitale-geletterdheid-desinformatie-2026",
        "EU-richtlijnen digitale geletterdheid en desinformatie (2026)",
        "guidance", "Handreiking", "Europese Commissie",
        "Geactualiseerde richtlijnen met lesplannen en praktische adviezen over digitale geletterdheid, generatieve AI, desinformatie, sociale media en kritisch denken.",
        "Leraren ondersteunen bij het herkennen en behandelen van AI-versterkte desinformatie in de klas.",
        ["Docenten", "Schoolleiders", "Onderwijsontwikkelaars", "Beleidsmakers"],
        ["PO", "VO", "MBO"], ["AI-geletterdheid", "Curriculumontwikkeling", "Publieke waarden en ethiek"],
        "https://education.ec.europa.eu/focus-topics/digital-education/actions/plan/guidelines-for-teachers-to-foster-digital-literacy-and-tackle-disinformation",
        ["generatieve AI", "desinformatie", "digitale geletterdheid", "lesplannen"],
        geography="Europa", language=["en"], organization_ids=["europese-commissie-dg-eac"],
        publication="2026-06-10"
    ),
    record(
        "slo-definitieve-conceptkerndoelen-digitale-geletterdheid",
        "Definitieve conceptkerndoelen digitale geletterdheid",
        "standard", "Standaard", "SLO",
        "Definitieve conceptkerndoelen voor digitale geletterdheid in primair, voortgezet en speciaal onderwijs, inclusief het herkennen en doordacht gebruiken van AI.",
        "Scholen helpen vooruit te kijken naar het landelijke curriculum voor digitale geletterdheid.",
        ["Docenten", "Schoolleiders", "Onderwijsontwikkelaars", "Beleidsmakers"],
        ["PO", "VO"], ["Curriculumontwikkeling", "AI-geletterdheid"],
        "https://www.slo.nl/thema/meer/actualisatie-kerndoelen-examenprogramma/actualisatie-kerndoelen/definitieve-conceptkerndoelen-digitale/",
        ["SLO", "kerndoelen", "digitale geletterdheid", "AI", "curriculum"],
        organization_ids=["slo"], publication="2025-11-21",
        notes="De kerndoelen zijn definitief als concept, maar op 30 juli 2026 nog niet wettelijk van kracht."
    ),
    record(
        "slo-stappenplan-digitale-geletterdheid-onderwijspraktijk",
        "Stappenplan digitale geletterdheid in de onderwijspraktijk",
        "guidance", "Handreiking", "SLO",
        "Stappenplan met tips en adviezen waarmee schoolteams digitale geletterdheid, waaronder omgaan met data en AI, gestructureerd in hun onderwijs implementeren.",
        "Schoolteams ondersteunen bij visieontwikkeling, curriculumkeuzes en invoering van digitale geletterdheid.",
        ["Docenten", "Schoolleiders", "Onderwijsontwikkelaars"],
        ["PO", "VO"], ["Implementatie en adoptie", "Curriculumontwikkeling", "AI-geletterdheid"],
        "https://www.slo.nl/sectoren/vmbo/digitale-geletterdheid-vmbo/digitale-geletterdheid-vo/digitale-geletterdheid-onderwijspraktijk/stappenplan/",
        ["SLO", "stappenplan", "digitale geletterdheid", "data en AI"],
        organization_ids=["slo"], publication="2026-01-06"
    ),
    record(
        "slo-inhoudslijnen-digitale-geletterdheid",
        "Inhoudslijnen digitale geletterdheid",
        "guidance", "Handreiking", "SLO",
        "Voorbeeldmatige inhoudslijnen met aanbodsdoelen voor kennis, vaardigheden en houding, waaronder het verantwoord omgaan met data en AI in po en onderbouw vo.",
        "Scholen een basis geven voor eigen leerlijnen en een beredeneerd aanbod digitale geletterdheid.",
        ["Docenten", "Schoolleiders", "Onderwijsontwikkelaars"],
        ["PO", "VO"], ["Curriculumontwikkeling", "AI-geletterdheid"],
        "https://www.slo.nl/sectoren/havo-vwo/digitale-geletterdheid-havo-vwo/digitale-geletterdheid-vo/inhoudslijnen/",
        ["SLO", "inhoudslijnen", "aanbodsdoelen", "digitale geletterdheid", "AI"],
        organization_ids=["slo"], publication="2026-01-06"
    ),
    record(
        "raise-academic-advisory-board-2026",
        "Call RAISE High-Level Academic Advisory Board",
        "funding_call", "Call", "Europese Commissie",
        "Open oproep voor vooraanstaande wetenschappers die onderzoek doen naar AI of AI in wetenschappelijk onderzoek toepassen en het Europese RAISE-initiatief strategisch willen adviseren.",
        "Wetenschappelijke expertise betrekken bij de koers van Europese AI-wetenschap en onderzoeksinfrastructuur.",
        ["Onderzoekers", "Hoogleraren", "Wetenschappers"], ["WO", "Onderzoek"],
        ["Onderzoek", "Beleid en governance", "Subsidies en financiering"],
        "https://research-and-innovation.ec.europa.eu/news/all-research-and-innovation-news/launch-call-experts-join-raise-high-level-academic-advisory-board-2026-06-15_en",
        ["RAISE", "AI in Science", "call for experts", "advisory board"],
        geography="Europa", language=["en"], status="open_call",
        availability="Open voor aanmeldingen tot 4 september 2026",
        deadline="2026-09-04", call_status="open_call",
        applicant_types=["Wetenschappers", "Hoogleraren"],
        organization_ids=["europese-commissie-dg-eac"],
        notes="Dit is een oproep voor deelname aan een adviesraad, geen subsidie."
    ),
    record(
        "leiden-transkribus-digitale-geletterdheid",
        "Transkribus in het onderwijs: digitale geletterdheid met historische bronnen",
        "research_project", "Praktijkvoorbeeld", "Universiteit Leiden",
        "Project waarin onderzoekers en vo-docenten open leermateriaal ontwikkelen rond machine learning, AI en het werken met gedigitaliseerde historische bronnen.",
        "Leerlingen kritisch leren omgaan met AI en historische broninterpretatie en docenten voorzien van open opdrachten.",
        ["Docenten", "Leerlingen", "Onderzoekers", "Onderwijsontwikkelaars"],
        ["VO", "WO", "Onderzoek"], ["AI-geletterdheid", "Curriculumontwikkeling", "Praktijkvoorbeelden"],
        "https://www.universiteitleiden.nl/onderzoek/onderzoeksprojecten/iclon/transkribus-in-het-onderwijs-werken-aan-digitale-geletterdheid-met-historische-bronnen",
        ["Transkribus", "historische bronnen", "machine learning", "open leermateriaal"],
        organization_ids=["universiteit-leiden"]
    ),
    record(
        "leiden-fair-assessment-generatieve-ai",
        "Fair Educational Assessment in the Age of Generative AI",
        "guidance", "Handreiking", "Universiteit Leiden",
        "Rapport van een deliberatieve bijeenkomst over eerlijke toetsing in het tijdperk van generatieve AI, met aanbevelingen voor toetsontwerp, beleid en docentontwikkeling.",
        "Onderwijsinstellingen ondersteunen bij eerlijke en uitlegbare keuzes over toetsing en generatieve AI.",
        ["Docenten", "Examencommissies", "Bestuurders", "Onderwijsontwikkelaars", "Studenten"],
        ["WO", "HBO"], ["Toetsing en examinering", "Beleid en governance", "AI-geletterdheid"],
        "https://www.universiteitleiden.nl/binaries/content/assets/customsites/fair-assess/fair-assess-deliberative-assembly-report.pdf",
        ["FAIR Assess", "generatieve AI", "fair assessment", "toetsbeleid"],
        organization_ids=["universiteit-leiden"], publication="2026-04-01", language=["en"]
    ),
    record(
        "vu-ai-tutors-optimaal-benutten", "AI-tutors optimaal benutten in je onderwijs",
        "guidance", "Handreiking", "Vrije Universiteit Amsterdam",
        "Praktische didactische tips voor het verantwoord inbedden van AI-tutors in cursusontwerp, met aandacht voor feedback, privacy, menselijk contact en AI-geletterdheid.",
        "Docenten helpen AI-tutors doelgericht in te zetten zonder het leerproces of de menselijke begeleiding uit het oog te verliezen.",
        ["Docenten", "Onderwijsontwikkelaars"], ["HBO", "WO"],
        ["Lesgeven en leren met AI", "Privacy en AVG", "AI-geletterdheid"],
        "https://vu.nl/nl/medewerker/didactiek/ai-tutors-optimaal-benutten-in-je-onderwijs",
        ["VU", "AI-tutor", "didactiek", "blended learning", "privacy"],
        organization_ids=["vrije-universiteit-amsterdam"], publication="2026-06-02"
    ),
    record(
        "vu-handboek-ai-geletterdheid-studenten", "Handboek AI-geletterdheid – studenteneditie",
        "guidance", "Handreiking", "Vrije Universiteit Amsterdam",
        "Open handboek voor studenten over de werking, mogelijkheden, beperkingen, maatschappelijke impact en het verantwoord gebruik van AI in studie en onderwijs.",
        "Studenten ondersteunen bij kritisch, transparant en verantwoord gebruik van generatieve AI.",
        ["Studenten", "Docenten", "Onderwijsontwikkelaars"], ["HBO", "WO"],
        ["AI-geletterdheid", "Publieke waarden en ethiek", "Lesgeven en leren met AI"],
        "https://www.cs.vu.nl/~eliens/update/image/read/AI-in-onderwijs.pdf",
        ["VU", "handboek AI-geletterdheid", "studenten", "open leermateriaal"],
        organization_ids=["vrije-universiteit-amsterdam"], publication="2025-09-15",
        notes="Uitgegeven onder CC BY-SA 4.0."
    ),]


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
        "version": "Werkversie 0.6",
        "updated": "30 juli 2026",
        "recordCount": len(records),
    })
    META_PATH.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8"
    )
    print(f"Toegevoegd: {added}; bijgewerkt: {updated}; canoniek totaal: {len(records)}")


if __name__ == "__main__":
    main()