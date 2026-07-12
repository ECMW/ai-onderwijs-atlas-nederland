"""Voeg een tweede, internationaal georiënteerde inhoudstranche toe.

Alle records verwijzen naar een primaire, officiële bron. De import stopt bij
een botsend id, een bestaande titel of een al gebruikte bron-URL.
"""

import json
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECORDS_PATH = ROOT / "data" / "records.json"
METADATA_PATH = ROOT / "data" / "metadata.json"
VERIFIED = "2026-07-12"


def record(id, title, kind, legacy, provider, description, purpose, audiences,
           sectors, themes, url, keywords, **extra):
    item = {
        "id": id, "title": title, "recordType": kind, "legacyType": legacy,
        "subtype": extra.pop("subtype", None),
        "organizationIds": extra.pop("organization_ids", []),
        "providerName": provider, "description": description, "purpose": purpose,
        "audiences": audiences, "sectors": sectors, "themes": themes,
        "status": extra.pop("status", "available"),
        "availabilityText": extra.pop("availability", "Direct beschikbaar"),
        "startDate": extra.pop("start", None), "endDate": extra.pop("end", None),
        "publicationDate": extra.pop("publication", None),
        "lastVerified": VERIFIED, "verificationStatus": "verified",
        "sourceUrls": [{"label": "Officiële bron", "url": url, "sourceType": "official"}],
        "relatedIds": extra.pop("related_ids", []), "parentIds": [], "childIds": [],
        "geographicScope": extra.pop("geography", "Nederland"),
        "accessType": extra.pop("access", "public"),
        "costType": extra.pop("cost", "unknown"),
        "fundingAmount": extra.pop("funding_amount", None),
        "fundingDeadline": extra.pop("deadline", None),
        "applicationOpenDate": extra.pop("open_date", None),
        "applicationDeadline": extra.pop("application_deadline", None),
        "fundingMin": extra.pop("funding_min", None),
        "fundingMax": extra.pop("funding_max", None),
        "totalBudget": extra.pop("total_budget", None),
        "eligibility": extra.pop("eligibility", None),
        "applicantTypes": extra.pop("applicants", []),
        "callStatus": extra.pop("call_status", None),
        "recurrence": extra.pop("recurrence", None),
        "language": extra.pop("language", ["nl"]), "keywords": keywords,
        "notes": extra.pop("notes", None),
        "changeHistory": [{"date": VERIFIED, "type": "added", "summary":
            "Toegevoegd in gecontroleerde inhoudstranche 2: Europese en internationale AI-onderwijsbronnen."}]
    }
    if extra:
        raise TypeError(f"Onbekende velden voor {id}: {', '.join(extra)}")
    return item


NEW_RECORDS = [
    # Trainingen en professionele ontwikkeling
    record("uva-introductie-ai-voor-docenten", "Introductie AI voor docenten", "training", "Training", "Universiteit van Amsterdam",
        "Workshop waarin docenten de basis van generatieve AI, prompting en de gevolgen voor onderwijs en toetsing verkennen.",
        "Docenten een praktische en kritische basis geven voor het gebruik van generatieve AI in hun onderwijs.",
        ["Docenten"], ["WO"], ["AI-geletterdheid", "Professionalisering", "Lesgeven en leren met AI"],
        "https://tlc.uva.nl/article/ai-basics/", ["workshop", "generatieve AI", "prompting", "docenten"], geography="Nederland", language=["en"]),
    record("uva-ai-literacy-docenten-elearning", "AI literacy voor docenten – e-learning", "training", "Training", "Universiteit van Amsterdam",
        "Zelfstandige e-learning over generatieve AI, kritisch gebruik en de betekenis ervan voor onderwijsprofessionals.",
        "Docenten laagdrempelig laten werken aan AI-geletterdheid in hun eigen tempo.",
        ["Docenten", "Onderwijsadviseurs"], ["HBO", "WO"], ["AI-geletterdheid", "Professionalisering"],
        "https://share.articulate.com/svX7iZbENb4ocjD2biC6-", ["e-learning", "AI literacy", "docenten"], language=["en"]),
    record("uva-generatieve-ai-in-toetsing", "Generatieve AI in toetsing", "training", "Training", "Universiteit van Amsterdam",
        "Workshop over de impact van generatieve AI op niet-gesurveilleerde toetsing en mogelijke aanpassingen in toetsontwerp.",
        "Docenten helpen toetsing opnieuw te doordenken vanuit leerdoelen en verantwoord AI-gebruik.",
        ["Docenten", "Examencommissies", "Toetsmakers"], ["WO"], ["Toetsing en examinering", "Professionalisering"],
        "https://tlc.uva.nl/article/ai-in-toetsing/", ["toetsing", "workshop", "GenAI", "toetsontwerp"], language=["en"]),
    record("uva-bko-plus-responsible-ai", "BKO+ track Responsible AI in Education", "training", "Training", "Universiteit van Amsterdam",
        "Professionaliseringstraject waarin docenten verantwoorde AI-toepassingen ontwerpen, uitproberen en evalueren in hun onderwijspraktijk.",
        "Verantwoord experimenteren met AI verbinden aan didactiek, ethiek en professionele reflectie.",
        ["Docenten", "Onderwijsadviseurs"], ["WO"], ["Professionalisering", "Publieke waarden en ethiek", "Lesgeven en leren met AI"],
        "https://tlc.uva.nl/article/bko-track-responsible-ai-in-education/", ["BKO", "responsible AI", "docentprofessionalisering"], language=["en"]),
    record("uva-dagelijkse-taken-met-ai-chat", "Dagelijkse werktaken met UvA AI Chat", "training", "Training", "Universiteit van Amsterdam",
        "Workshop over privacybewust gebruik van UvA AI Chat voor dagelijkse werkprocessen, met aandacht voor betrouwbaarheid en energiegebruik.",
        "Onderwijsmedewerkers praktisch en kritisch leren werken met een instellingsgebonden AI-chatomgeving.",
        ["Docenten", "Ondersteunend personeel", "IT-professionals"], ["WO"], ["Professionalisering", "Veilige AI-omgeving", "Implementatie en adoptie"],
        "https://tlc.uva.nl/en/article/daily-office-tasks-with-uva-ai-chat/", ["AI Chat", "workshop", "privacy", "werkprocessen"], availability="Sessies op 26 oktober 2026 en 16 maart 2027", language=["nl", "en"]),
    record("uva-smarter-or-dependent", "Smarter or dependent? Learning and thinking with AI", "training", "Training", "Universiteit van Amsterdam",
        "Workshop over de invloed van AI-gebruik op leren, denken en schrijven en over ontwerpkeuzes die zelfstandig denken beschermen.",
        "Docenten helpen AI-gebruik zo te ontwerpen dat menselijke leer- en correctiecapaciteit behouden blijft.",
        ["Docenten", "Onderwijsadviseurs"], ["WO"], ["Lesgeven en leren met AI", "Publieke waarden en ethiek", "Professionalisering"],
        "https://tlc.uva.nl/en/article/smarter-or-dependent/", ["kritisch denken", "schrijven", "AI-afhankelijkheid", "workshop"], availability="Sessies op 6 oktober 2026 en 11 mei 2027", language=["en"]),
    record("eu-ai-competent-teacher", "Becoming an artificial intelligent competent teacher", "training", "Training", "Europese Commissie",
        "Gratis, zelfgestuurde online cursus van 15–20 uur over mensgerichte, ethische en pedagogisch verantwoorde AI in het onderwijs.",
        "Leraren concrete competenties geven om AI te begrijpen, beoordelen en verantwoord in te zetten.",
        ["Docenten", "Schoolleiders", "Lerarenopleiders"], ["PO", "VO"], ["AI-geletterdheid", "Professionalisering", "Publieke waarden en ethiek"],
        "https://school-education.ec.europa.eu/en/learn/courses/becoming-artificial-intelligent-competent-teacher", ["self-paced", "teacher", "UNESCO framework", "certificate"], geography="Europa", cost="free", language=["en"]),
    record("erasmus-ai-education-empowering-teachers", "Artificial Intelligence in Education: Empowering European Teachers", "training", "Training", "Externe cursusaanbieder via European School Education Platform",
        "Praktijkgerichte Erasmus+-cursus over AI-tools, gepersonaliseerd leren, toetsing, ethiek en gegevensbescherming.",
        "Leraren praktische vaardigheden geven voor verantwoorde toepassing van AI in de klas.",
        ["Docenten", "Schoolleiders", "IT-professionals"], ["PO", "VO"], ["Professionalisering", "Lesgeven en leren met AI", "Privacy en AVG"],
        "https://school-education.ec.europa.eu/en/learn/courses/artificial-intelligence-education-empowering-european-teachers", ["Erasmus+", "teacher training", "AI tools", "data protection"], geography="Europa", cost="paid", language=["en"], notes="Dit is aanbod van een externe cursusaanbieder in het Europese platform; opname is geen inhoudelijke goedkeuring door de Europese Commissie."),

    # Internationale subsidies en calls
    record("cost-open-call-2026", "COST Open Call 2026", "funding_call", "Call", "COST Association",
        "Bottom-up Europese call voor onderzoeksnetwerken in alle wetenschaps- en technologiedomeinen, waaronder AI en onderwijs.",
        "Internationale netwerken financieren die kennis, onderzoekers en praktijkpartners rond een gezamenlijk vraagstuk verbinden.",
        ["Onderzoekers", "Onderwijsinstellingen", "Beleidsmakers"], ["HBO", "WO", "Onderzoek"], ["Subsidies en financiering", "Onderzoek"],
        "https://www.cost.eu/how-to-apply/", ["COST Action", "European network", "AI education", "open call"], geography="Europa", status="planned", availability="Open van 31 juli tot en met 28 oktober 2026", open_date="2026-07-31", application_deadline="2026-10-28", deadline="2026-10-28", call_status="forthcoming", recurrence="Jaarlijks", language=["en"], applicants=["Onderzoekers", "Universiteiten", "Onderzoeksinstellingen", "Publieke organisaties"], eligibility="Voorstel voor een netwerk met deelnemers uit ten minste zeven COST-landen; zie de officiële call voor alle samenstellingsvoorwaarden.", funding_amount="Indicatief circa €140.000 in jaar 1 en €180.000 per vervoljaar"),
    record("digital-europe-advanced-skills-2026", "Digital Europe: Advanced Digital Skills 2026", "funding_call", "Call", "European Health and Digital Executive Agency (HaDEA)",
        "Open Europese call DIGITAL-2026-SKILLS-10 voor geavanceerde digitale vaardigheden, waaronder opleiding en training rond AI.",
        "Europese consortia ondersteunen bij ontwikkeling en opschaling van geavanceerde digitale opleidingen en vaardigheden.",
        ["Onderwijsinstellingen", "Onderzoekers", "Bestuurders"], ["MBO", "HBO", "WO", "Onderzoek"], ["Subsidies en financiering", "AI-geletterdheid", "Professionalisering"],
        "https://hadea.ec.europa.eu/calls-proposals/dep-call-10-advanced-digital-skills_en", ["DIGITAL-2026-SKILLS-10", "advanced digital skills", "AI training"], geography="Europa", status="open_call", availability="Open tot 1 oktober 2026 om 17.00 CEST", publication="2026-04-10", open_date="2026-04-21", application_deadline="2026-10-01", deadline="2026-10-01", call_status="open", language=["en"], applicants=["Internationale consortia", "Onderwijsinstellingen", "Publieke en private organisaties"]),
    record("digital-europe-information-integrity-2026", "Digital Europe: Common Research Framework for Information Integrity", "funding_call", "Call", "Europese Commissie",
        "Europese call voor een gemeenschappelijk onderzoeksraamwerk rond informatie-integriteit, desinformatie en technologische risico's, inclusief AI.",
        "Onderzoek, maatschappelijke organisaties en technologiepartners verbinden rond informatie-integriteit en mediawijsheid.",
        ["Onderzoekers", "Onderwijsinstellingen", "Maatschappelijke organisaties"], ["HBO", "WO", "Onderzoek"], ["Subsidies en financiering", "Onderzoek", "AI-geletterdheid"],
        "https://digital-strategy.ec.europa.eu/en/news/new-open-call-proposals-under-digital-europe-programme", ["information integrity", "disinformation", "AI", "media literacy"], geography="Europa", status="open_call", availability="Open tot 1 oktober 2026", open_date="2026-04-21", application_deadline="2026-10-01", deadline="2026-10-01", call_status="open", total_budget="€6 miljoen", language=["en"], applicants=["Onderzoeksorganisaties", "Maatschappelijke organisaties", "Technologiepartners"]),
    record("msca-doctoral-networks-2026", "MSCA Doctoral Networks 2026", "funding_call", "Call", "Europese Commissie – Marie Skłodowska-Curie Actions",
        "Internationale Horizon Europe-call voor consortia die doctorale programma's in alle wetenschapsgebieden ontwikkelen; AI-onderwijsonderzoek kan binnen de open thematiek passen.",
        "Internationale, interdisciplinaire en intersectorale doctorale netwerken en opleiding financieren.",
        ["Onderzoekers", "Onderwijsinstellingen", "Bestuurders"], ["HBO", "WO", "Onderzoek"], ["Subsidies en financiering", "Onderzoek", "Professionalisering"],
        "https://marie-sklodowska-curie-actions.ec.europa.eu/funding/msca-doctoral-networks-2026", ["HORIZON-MSCA-2026-DN-01", "doctoral networks", "Horizon Europe"], geography="Internationaal", status="open_call", availability="Open tot 24 november 2026", open_date="2026-05-28", application_deadline="2026-11-24", deadline="2026-11-24", call_status="open", total_budget="€593,034 miljoen indicatief", language=["en"], applicants=["Internationale consortia", "Universiteiten", "Onderzoeksinstellingen", "Publieke en private organisaties"], eligibility="Consortia van organisaties uit verschillende sectoren en landen; voorstellen kunnen elk wetenschapsgebied betreffen."),
    record("msca-postdoctoral-fellowships-2026", "MSCA Postdoctoral Fellowships 2026", "funding_call", "Call", "Europese Commissie – Marie Skłodowska-Curie Actions",
        "Internationale Horizon Europe-call voor gepromoveerde onderzoekers die via mobiliteit nieuwe vaardigheden en onderzoekservaring willen opbouwen; AI-onderwijsonderzoek is mogelijk binnen de open thematiek.",
        "Individuele postdoctorale onderzoekers en gastorganisaties ondersteunen bij internationale en intersectorale ontwikkeling.",
        ["Onderzoekers", "Onderwijsinstellingen"], ["HBO", "WO", "Onderzoek"], ["Subsidies en financiering", "Onderzoek", "Professionalisering"],
        "https://marie-sklodowska-curie-actions.ec.europa.eu/funding/msca-postdoctoral-fellowships-2026", ["HORIZON-MSCA-2026-PF-01", "postdoctoral fellowship", "mobility"], geography="Internationaal", status="open_call", availability="Open tot 9 september 2026", open_date="2026-04-09", application_deadline="2026-09-09", deadline="2026-09-09", call_status="open", total_budget="€399,05 miljoen indicatief", language=["en"], applicants=["Gepromoveerde onderzoekers", "Academische en niet-academische gastorganisaties"]),

    # Internationale kaders en handreikingen
    record("ec-ethical-ai-data-guidelines-2026", "Europese richtlijnen voor ethisch gebruik van AI en data in onderwijs (2026)", "guidance", "Handreiking", "Europese Commissie",
        "Geactualiseerde praktische richtlijnen met scenario's, kernprincipes en uitleg over de AI Act, AVG en verantwoord AI- en datagebruik.",
        "Leraren en onderwijsmedewerkers ondersteunen bij contextgebonden, ethische en juridisch bewuste keuzes.",
        ["Docenten", "Schoolleiders", "Beleidsmakers"], ["PO", "VO"], ["Publieke waarden en ethiek", "AI Act en wetgeving", "Privacy en AVG"],
        "https://education.ec.europa.eu/focus-topics/digital-education/actions/plan/ethical-guidelines-for-educators-on-using-artificial-intelligence", ["ethical guidelines", "AI Act", "GDPR", "teachers"], geography="Europa", publication="2026-06-09", language=["en"]),
    record("oecd-ec-ai-literacy-framework-2026", "AI Literacy Framework for Primary and Secondary Education", "standard", "Standaard", "OECD en Europese Commissie",
        "Internationaal referentiekader voor AI-geletterdheid met kennis, vaardigheden en houdingen voor leerlingen in primair en voortgezet onderwijs.",
        "Curriculumontwikkelaars en beleidsmakers een gemeenschappelijke structuur bieden voor verantwoord AI-onderwijs.",
        ["Curriculumontwikkelaars", "Docenten", "Beleidsmakers", "Onderzoekers"], ["PO", "VO"], ["AI-geletterdheid", "Curriculumontwikkeling", "Publieke waarden en ethiek"],
        "https://www.oecd.org/en/publications/empowering-learners-for-the-age-of-ai_65cd27d4-en.html", ["AI literacy", "competency framework", "primary", "secondary"], geography="Internationaal", publication="2026-06-18", language=["en"]),
    record("unesco-ai-competency-framework-teachers", "UNESCO AI Competency Framework for Teachers", "standard", "Standaard", "UNESCO",
        "Wereldwijd competentiekader met vijftien competenties in vijf dimensies en drie ontwikkelniveaus voor leraren.",
        "Landen en onderwijsorganisaties ondersteunen bij mensgerichte AI-professionalisering, curricula en beoordeling.",
        ["Docenten", "Lerarenopleiders", "Beleidsmakers", "Curriculumontwikkelaars"], ["PO", "VO", "MBO", "HBO", "WO"], ["AI-geletterdheid", "Professionalisering", "Publieke waarden en ethiek"],
        "https://www.unesco.org/en/articles/ai-competency-framework-teachers?hub=84636", ["UNESCO", "teacher competencies", "human agency", "AI pedagogy"], geography="Internationaal", publication="2024-08-08", language=["en"]),
    record("unesco-ai-competency-framework-students", "UNESCO AI Competency Framework for Students", "standard", "Standaard", "UNESCO",
        "Wereldwijd kader voor kennis, vaardigheden en waarden waarmee leerlingen AI veilig, ethisch en verantwoordelijk leren gebruiken en mede vormgeven.",
        "Beleidsmakers, docenten en curriculumontwikkelaars ondersteunen bij een samenhangend AI-curriculum voor leerlingen.",
        ["Docenten", "Curriculumontwikkelaars", "Beleidsmakers"], ["PO", "VO", "MBO"], ["AI-geletterdheid", "Curriculumontwikkeling", "Publieke waarden en ethiek"],
        "https://www.unesco.org/en/articles/what-you-need-know-about-unescos-new-ai-competency-frameworks-students-and-teachers?hub=343", ["UNESCO", "student competencies", "AI literacy", "responsible use"], geography="Internationaal", publication="2024-09-03", language=["en"]),

    # Publieke voorzieningen en programma's
    record("selfie-for-teachers", "SELFIE for Teachers", "service", "Voorziening", "Europese Commissie",
        "Gratis online zelfreflectietool waarmee leraren in circa 25 minuten hun digitale competenties beoordelen en automatisch feedback ontvangen.",
        "Leraren en teams helpen sterke punten en professionaliseringsbehoeften rond digitale competenties te bepalen.",
        ["Docenten", "Schoolleiders", "Lerarenopleiders"], ["PO", "VO"], ["Professionalisering", "AI-geletterdheid"],
        "https://education.ec.europa.eu/selfie-for-teachers", ["SELFIE", "self-reflection", "digital competence", "anonymous"], geography="Europa", cost="free", language=["Meertalig"]),
    record("ai-act-service-desk", "AI Act Service Desk en Single Information Platform", "service", "Voorziening", "Europese Commissie – AI Office",
        "Publieke informatievoorziening met AI Act Explorer, Compliance Checker, veelgestelde vragen en een loket voor vragen over toepassing van de AI Act.",
        "Organisaties helpen de AI Act te begrijpen en hun mogelijke verplichtingen systematisch te verkennen.",
        ["Beleidsmakers", "Bestuurders", "IT-professionals", "Juristen"], ["PO", "VO", "MBO", "HBO", "WO", "Onderzoek", "Overheid"], ["AI Act en wetgeving", "Beleid en governance"],
        "https://digital-strategy.ec.europa.eu/en/news/commission-launches-ai-act-service-desk-and-single-information-platform-support-ai-act", ["AI Act Explorer", "Compliance Checker", "AI Office"], geography="Europa", cost="free", publication="2025-10-08", language=["Meertalig"]),
    record("european-school-education-course-catalogue", "European School Education Platform – cursuscatalogus", "service", "Voorziening", "Europese Commissie",
        "Europese catalogus met online en locatiegebonden nascholing voor schoolonderwijs, waaronder veel actuele cursussen over AI.",
        "Onderwijsprofessionals internationaal cursusaanbod laten vergelijken en passende nascholing laten vinden.",
        ["Docenten", "Schoolleiders", "Lerarenopleiders"], ["PO", "VO"], ["Professionalisering", "AI-geletterdheid"],
        "https://school-education.ec.europa.eu/en/learn/courses", ["course catalogue", "Erasmus+", "teacher training", "AI"], geography="Europa", language=["Meertalig"], notes="Cursussen in deze catalogus kunnen door externe aanbieders worden geleverd. Controleer aanbieder, kosten en voorwaarden op de cursuspagina."),
    record("digital-education-hub-funding-finder", "European Digital Education Hub – funding opportunities", "service", "Voorziening", "Europese Commissie",
        "Gecureerde wegwijzer naar Europese en internationale financieringsprogramma's voor innovatie, onderzoek en verandering in digitaal onderwijs.",
        "Docenten, onderzoekers, innovators en onderwijsorganisaties sneller naar passende internationale financiering leiden.",
        ["Onderzoekers", "Onderwijsinstellingen", "Beleidsmakers", "Bestuurders"], ["PO", "VO", "MBO", "HBO", "WO", "Onderzoek"], ["Subsidies en financiering", "Implementatie en adoptie"],
        "https://education.ec.europa.eu/focus-topics/digital-education/digital-education-hub/funding-opportunities", ["funding finder", "digital education", "EU funding", "Nordplus"], geography="Europa", cost="free", language=["en"]),
    record("european-digital-education-hub", "European Digital Education Hub", "programme", "Programma", "Europese Commissie",
        "Europese community en kennisinfrastructuur voor samenwerking rond beleid, onderzoek en implementatie van digitaal onderwijs.",
        "Versnippering verminderen door Europese onderwijsprofessionals, experts en beleidsmakers te verbinden.",
        ["Docenten", "Onderzoekers", "Beleidsmakers", "Onderwijsinstellingen"], ["PO", "VO", "MBO", "HBO", "WO", "Onderzoek"], ["Professionalisering", "Onderzoek", "Implementatie en adoptie"],
        "https://education.ec.europa.eu/focus-topics/digital-education/action-plan/european-digital-education-hub", ["European Digital Education Hub", "community", "digital education"], geography="Europa", cost="free", language=["en"]),
]


def normalize(value):
    return " ".join(str(value).casefold().split()).rstrip("/")


def main():
    records = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
    ids = {item["id"] for item in records}
    titles = {normalize(item["title"]) for item in records}
    urls = {normalize(source["url"]) for item in records for source in item.get("sourceUrls", [])}
    for item in NEW_RECORDS:
        collision = []
        if item["id"] in ids: collision.append("id")
        if normalize(item["title"]) in titles: collision.append("titel")
        if normalize(item["sourceUrls"][0]["url"]) in urls: collision.append("bron-URL")
        if collision:
            raise SystemExit(f"Import gestopt: {item['title']} botst op {', '.join(collision)}")
        ids.add(item["id"]); titles.add(normalize(item["title"])); urls.add(normalize(item["sourceUrls"][0]["url"]))

    records.extend(NEW_RECORDS)
    RECORDS_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    metadata.update({
        "version": "Werkversie 0.3", "updated": "12 juli 2026", "recordCount": len(records),
        "sourceNote": "Canonieke atlasdata met gecontroleerde officiële Nederlandse, Europese en internationale AI-onderwijsbronnen. Publieke resultaten tonen alleen records met een vastgelegde bron en recente verificatie."
    })
    METADATA_PATH.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Toegevoegd: {len(NEW_RECORDS)}; totaal: {len(records)}")


if __name__ == "__main__":
    main()
