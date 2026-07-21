"""Voeg gecontroleerd online gevonden aanbod toe (inhoudstranche 3)."""

import json
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECORDS_PATH = ROOT / "data" / "records.json"
META_PATH = ROOT / "data" / "metadata.json"
VERIFIED = "2026-07-21"


def item(identifier, title, kind, legacy, provider, description, purpose, audiences,
         sectors, themes, url, keywords, *, geography="Nederland", cost="unknown",
         availability="Direct beschikbaar", publication=None, start=None, end=None,
         language=None, status="available", organization_ids=None):
    return {
        "id": identifier, "title": title, "recordType": kind, "legacyType": legacy,
        "subtype": None, "organizationIds": organization_ids or [],
        "providerName": provider, "description": description, "purpose": purpose,
        "audiences": audiences, "sectors": sectors, "themes": themes,
        "status": status, "availabilityText": availability, "startDate": start,
        "endDate": end, "publicationDate": publication, "lastVerified": VERIFIED,
        "verificationStatus": "verified",
        "sourceUrls": [{"label": "Officiële bron", "url": url, "sourceType": "official"}],
        "relatedIds": [], "parentIds": [], "childIds": [],
        "geographicScope": geography, "accessType": "public", "costType": cost,
        "fundingAmount": None, "fundingDeadline": None, "applicationOpenDate": None,
        "applicationDeadline": None, "fundingMin": None, "fundingMax": None,
        "totalBudget": None, "eligibility": None, "applicantTypes": [],
        "callStatus": None, "recurrence": None, "language": language or ["nl"],
        "keywords": keywords, "notes": None,
        "changeHistory": [{"date": VERIFIED, "type": "added",
                           "summary": "Toegevoegd in gecontroleerde inhoudstranche 3."}],
    }


ALL = ["PO", "VO", "MBO", "HBO", "WO", "Onderzoek", "Overheid"]
ITEMS = [
    item("autoriteit-persoonsgegevens", "Autoriteit Persoonsgegevens", "organization", "Organisatie", "Autoriteit Persoonsgegevens",
         "Onafhankelijke Nederlandse toezichthouder op de bescherming van persoonsgegevens en coördinerend toezichthouder voor algoritmes en AI.",
         "Uitleg, toezicht en normering rond privacy, algoritmes en AI bieden.",
         ["Bestuurders", "Beleidsmakers", "Privacyprofessionals", "FG's", "IT-professionals"], ALL,
         ["Privacy en AVG", "AI Act en wetgeving", "Beleid en governance"],
         "https://www.autoriteitpersoonsgegevens.nl/", ["AP", "privacy", "AVG", "AI-toezicht"]),
    item("rijksinspectie-digitale-infrastructuur", "Rijksinspectie Digitale Infrastructuur", "organization", "Organisatie", "Rijksinspectie Digitale Infrastructuur",
         "Nederlandse toezichthouder voor betrouwbare digitale infrastructuur, met een coördinerende rol bij het toezicht op de AI-verordening.",
         "Informatie en toezicht rond digitale infrastructuur, AI-veiligheid en de AI-verordening bieden.",
         ["Bestuurders", "Beleidsmakers", "IT-professionals", "Juristen"], ALL,
         ["AI Act en wetgeving", "Beleid en governance", "Data en infrastructuur"],
         "https://www.rdi.nl/", ["RDI", "AI-verordening", "toezicht", "infrastructuur"]),
    item("universiteit-utrecht", "Universiteit Utrecht", "organization", "Organisatie", "Universiteit Utrecht",
         "Nederlandse universiteit met onderwijsadvies, e-modules, workshops en praktijkvoorbeelden rond generatieve AI in het onderwijs.",
         "Onderwijs, onderzoek en docentprofessionalisering rond AI ondersteunen.",
         ["Docenten", "Studenten", "Onderwijsadviseurs", "Onderzoekers"], ["WO", "Onderzoek"],
         ["Professionalisering", "Lesgeven en leren met AI", "Onderzoek"],
         "https://www.uu.nl/", ["Universiteit Utrecht", "GenAI", "docentondersteuning"]),
    item("radboud-universiteit", "Radboud Universiteit", "organization", "Organisatie", "Radboud Universiteit",
         "Nederlandse universiteit met onderzoek, open leermodules en workshops over verantwoord gebruik van AI in onderwijs en onderzoek.",
         "Onderzoek en professionalisering rond mensgerichte en verantwoorde AI bevorderen.",
         ["Docenten", "Studenten", "Onderzoekers", "Onderwijsadviseurs"], ["HBO", "WO", "Onderzoek"],
         ["Professionalisering", "Publieke waarden en ethiek", "Onderzoek"],
         "https://www.ru.nl/", ["Radboud Universiteit", "onderwijs en AI", "workshops"]),
    item("vrije-universiteit-amsterdam", "Vrije Universiteit Amsterdam", "organization", "Organisatie", "Vrije Universiteit Amsterdam",
         "Nederlandse universiteit met professionaliseringsaanbod en praktische ondersteuning voor verantwoord AI-gebruik in onderwijs.",
         "Docenten en onderwijsprofessionals ondersteunen bij verantwoorde toepassing van AI.",
         ["Docenten", "Studenten", "Onderwijsadviseurs", "Onderzoekers"], ["WO", "Onderzoek"],
         ["Professionalisering", "Lesgeven en leren met AI", "Publieke waarden en ethiek"],
         "https://vu.nl/", ["VU", "AI in onderwijs", "professionalisering"]),
    item("fontys-hogeschool", "Fontys Hogeschool", "organization", "Organisatie", "Fontys Hogeschool",
         "Nederlandse hogeschool met onderwijs, praktijkgericht onderzoek en professionaliseringsaanbod rond generatieve AI.",
         "Praktijkgerichte kennisontwikkeling en professionalisering rond AI ondersteunen.",
         ["Docenten", "Onderwijsadviseurs", "Onderzoekers", "Studenten"], ["HBO", "Onderzoek"],
         ["Professionalisering", "Implementatie en adoptie", "Onderzoek"],
         "https://www.fontys.nl/", ["Fontys", "AI voor onderwijs", "praktijkgericht"]),
    item("universiteit-van-amsterdam", "Universiteit van Amsterdam", "organization", "Organisatie", "Universiteit van Amsterdam",
         "Nederlandse universiteit met een AI-portaal, onderwijsworkshops, e-learning en een beheerde AI-chatomgeving.",
         "Onderwijs, onderzoek en AI-geletterdheid binnen de universiteit ondersteunen.",
         ["Docenten", "Studenten", "Onderwijsadviseurs", "Onderzoekers"], ["WO", "Onderzoek"],
         ["Professionalisering", "Veilige AI-omgeving", "Lesgeven en leren met AI"],
         "https://www.uva.nl/", ["UvA", "AI-portaal", "AI-geletterdheid"]),

    item("chatgpt-edu", "ChatGPT Edu", "product", "Product", "OpenAI",
         "Instellingsvariant van ChatGPT voor universiteiten met beheerdersfuncties, hogere gebruikslimieten en zakelijke privacy- en beveiligingsmaatregelen.",
         "Universiteiten een centraal beheerde generatieve AI-omgeving bieden.",
         ["Studenten", "Docenten", "Onderzoekers", "IT-professionals"], ["WO", "Onderzoek"],
         ["Lesgeven en leren met AI", "Veilige AI-omgeving", "Implementatie en adoptie"],
         "https://openai.com/index/introducing-chatgpt-edu/", ["ChatGPT Edu", "universiteiten", "beheer", "generatieve AI"], geography="Internationaal", cost="paid", language=["Meertalig"]),
    item("microsoft-365-copilot-onderwijs", "Microsoft 365 Copilot en Copilot Chat voor onderwijs", "product", "Product", "Microsoft",
         "AI-assistenten voor onderwijsinstellingen binnen Microsoft 365, met een inbegrepen chatvariant voor in aanmerking komende onderwijslicenties en een betaalde variant die ook organisatiedata kan gebruiken.",
         "Onderwijs, studie en ondersteunende werkzaamheden binnen een beheerde Microsoft-omgeving ondersteunen.",
         ["Docenten", "Studenten", "IT-professionals", "Ondersteunend personeel"], ["VO", "MBO", "HBO", "WO"],
         ["Lesgeven en leren met AI", "Veilige AI-omgeving", "Implementatie en adoptie"],
         "https://www.microsoft.com/en-us/education/products/copilot-in-education", ["Microsoft 365 Copilot", "Copilot Chat", "education", "Entra"], geography="Internationaal", cost="freemium", language=["Meertalig"]),
    item("gemini-for-education", "Gemini for Education", "product", "Product", "Google for Education",
         "Beheerde onderwijsvariant van Gemini met administratieve bediening en gegevensbescherming binnen Google Workspace for Education.",
         "Onderwijsinstellingen generatieve AI voor leren, lesgeven en werken bieden.",
         ["Docenten", "Studenten", "IT-professionals", "Ondersteunend personeel"], ["PO", "VO", "MBO", "HBO", "WO"],
         ["Lesgeven en leren met AI", "Veilige AI-omgeving", "Implementatie en adoptie"],
         "https://edu.google.com/intl/ALL_nl/ai/gemini-for-education/", ["Gemini for Education", "Google Workspace", "onderwijs"], geography="Internationaal", cost="freemium", language=["Meertalig"]),
    item("notebooklm-voor-onderwijs", "NotebookLM voor onderwijs", "product", "Product", "Google for Education",
         "AI-hulpmiddel dat antwoorden, samenvattingen, studiegidsen en ander materiaal baseert op door de gebruiker aangeleverde bronnen en daarbij bronverwijzingen toont.",
         "Brongebonden leren, onderzoek en kennisdeling ondersteunen.",
         ["Docenten", "Studenten", "Onderzoekers"], ["VO", "MBO", "HBO", "WO", "Onderzoek"],
         ["Lesgeven en leren met AI", "Onderzoek", "AI-geletterdheid"],
         "https://edu.google.com/ai-notebooklm/", ["NotebookLM", "brongegrond", "studiegids", "onderzoek"], geography="Internationaal", cost="freemium", language=["Meertalig"]),
    item("microsoft-study-and-learn-agent", "Study and Learn Agent", "product", "Product", "Microsoft",
         "Onderwijsagent binnen Microsoft 365 Copilot die lerenden met eigen materiaal laat oefenen via begeleide gesprekken, flashcards en quizzen.",
         "Lerenden ondersteunen bij begrijpen, oefenen en studeren zonder het denkwerk volledig over te nemen.",
         ["Leerlingen", "Studenten", "Docenten"], ["VO", "MBO", "HBO", "WO"],
         ["Lesgeven en leren met AI", "AI-geletterdheid", "Toetsing en examinering"],
         "https://support.microsoft.com/en-us/education/copilot/study-learn-agent", ["Study and Learn Agent", "Microsoft 365", "flashcards", "quiz"], geography="Internationaal", cost="free", language=["Meertalig"]),

    item("uu-ai-ondersteuningsaanbod-docenten", "AI-ondersteuningsaanbod voor docenten", "service", "Voorziening", "Universiteit Utrecht",
         "Centrale toegang tot AI-beleid, aandachtspunten, workshops, e-modules, EduGenAI en onderwijsvoorbeelden voor docenten van de Universiteit Utrecht.",
         "Docenten snel naar passende ondersteuning voor generatieve AI leiden.",
         ["Docenten", "Onderwijsadviseurs"], ["WO"], ["Professionalisering", "Implementatie en adoptie", "Praktijkvoorbeelden"],
         "https://www.uu.nl/onderwijs/centre-for-academic-teaching-and-learning/onderwijsinnovatie/ai-ondersteuningsaanbod", ["UU", "docentondersteuning", "workshops", "e-modules"]),
    item("uva-tlc-ai-portaal", "TLC AI-portaal", "service", "Voorziening", "Universiteit van Amsterdam",
         "Portaal met UvA-bronnen voor docenten, professionaliseringsaanbod, e-learning, communities, beleid en praktische AI-hulpmiddelen.",
         "AI-ondersteuning binnen de UvA op één plek vindbaar maken.",
         ["Docenten", "Onderwijsadviseurs", "Studenten"], ["WO"], ["Professionalisering", "Implementatie en adoptie", "Beleid en governance"],
         "https://tlc.uva.nl/article/ai-portaal/", ["UvA", "TLC", "AI-portaal", "onderwijsondersteuning"]),

    item("radboud-onderwijs-ai-module-docenten", "Onderwijs en AI – online module voor docenten", "training", "Training", "Radboud Universiteit",
         "Zelfstudiemodule over AI-basiskennis, academische integriteit, privacy, wetgeving, ethiek, duurzaamheid en AI-bewust onderwijsontwerp.",
         "Docenten toerusten voor verantwoord gebruik van AI in hun onderwijs.",
         ["Docenten"], ["HBO", "WO"], ["AI-geletterdheid", "Professionalisering", "Lesgeven en leren met AI"],
         "https://www.ru.nl/medewerkers/nieuws/verantwoord-aan-de-slag-met-ai-meld-je-aan-voor-een-module-of-workshop", ["Radboud", "online module", "AI-geletterdheid", "docenten"], cost="free"),
    item("radboud-onderwijs-ai-workshops", "Onderwijs en AI Workshops", "training", "Training", "Radboud Universiteit",
         "Reeks van drie workshops waarin docenten AI-bewustzijn, onderwijsontwerp en verantwoord gebruik van generatieve AI vertalen naar een concreet verbeterplan.",
         "Docenten praktisch ondersteunen bij aanpassing van hun onderwijs aan generatieve AI.",
         ["Docenten"], ["WO"], ["Professionalisering", "Lesgeven en leren met AI", "Implementatie en adoptie"],
         "https://www.ru.nl/over-ons/agenda/onderwijs-en-ai-workshops", ["Radboud", "workshops", "onderwijsontwerp", "GenAI"], availability="Op aanvraag en via geplande reeksen"),
    item("vu-workshop-ai-in-onderwijs", "Workshop AI in het onderwijs", "training", "Training", "Vrije Universiteit Amsterdam",
         "Workshop voor onderwijsprofessionals over de werking van generatieve AI, bewuste keuzes, docentrollen en toepassing in een eigen lesontwerp.",
         "Onderwijsprofessionals basiskennis en direct toepasbare handvatten voor AI geven.",
         ["Docenten", "Onderwijsadviseurs"], ["VO", "MBO", "HBO", "WO"], ["AI-geletterdheid", "Professionalisering", "Lesgeven en leren met AI"],
         "https://vu.nl/nl/onderwijs/professionals/cursussen-opleidingen/workshop-ai-in-het-onderwijs/inhoud", ["VU", "workshop", "lesontwerp", "docentrol"], cost="paid"),
    item("vu-genai-ai-geletterdheid-docenten", "GenAI en AI-geletterdheid voor docenten: een introductie", "training", "Training", "Vrije Universiteit Amsterdam",
         "Introductieworkshop waarin docenten AI-geletterdheid, relevante raamwerken en dilemma's rond leren, doceren en toetsing verbinden aan hun eigen rol.",
         "Docenten laten bepalen welke AI-kennis, houding en vaardigheden zij verder willen ontwikkelen.",
         ["Docenten"], ["WO"], ["AI-geletterdheid", "Professionalisering", "Toetsing en examinering"],
         "https://vu.nl/nl/agenda/2026/genai-ai-geletterdheid-voor-docenten-een-introductie", ["VU", "AI-geletterdheid", "AI-GO", "docenten"], availability="Gepland op 17 september 2026", start="2026-09-17", end="2026-09-17"),
    item("fontys-ai-voor-onderwijs-verdieping", "AI voor het Onderwijs – Verdieping", "training", "Training", "Fontys Hogeschool",
         "Meerdaags leertraject waarin onderwijsprofessionals hands-on ervaring opdoen met generatieve AI en werken aan een eigen praktijkcase, inclusief data- en ethische aspecten.",
         "AI-vaardigheden ontwikkelen en AI strategisch toepassen in de eigen onderwijscontext.",
         ["Docenten", "Onderwijsadviseurs", "Onderwijsontwikkelaars"], ["MBO", "HBO", "WO"], ["Professionalisering", "Implementatie en adoptie", "Publieke waarden en ethiek"],
         "https://www.fontys.nl/Opleidingen/AI-voor-het-Onderwijs-Verdieping-cursus.htm", ["Fontys", "verdieping", "praktijkcase", "generatieve AI"], cost="paid", availability="Edities vanaf 4 september 2026", start="2026-09-04"),
    item("uu-ai-e-modules", "AI e-modules: Wegwijs in Generatieve AI en Lesgeven in tijd van AI", "training", "Training", "Universiteit Utrecht",
         "Zelfstudiereeksen over de werking, risico's en verantwoorde inzet van generatieve AI en over de gevolgen ervan voor lesgeven en leren.",
         "Docenten en studenten zelfstandig AI-geletterdheid laten ontwikkelen.",
         ["Docenten", "Studenten"], ["WO"], ["AI-geletterdheid", "Professionalisering", "Lesgeven en leren met AI"],
         "https://www.uu.nl/onderwijs/centre-for-academic-teaching-and-learning/onderwijsinnovatie/generatieve-ai/ai-e-modules", ["UU", "e-modules", "AI-literacy", "lesgeven"], cost="free"),
    item("european-ai-for-teachers-course", "Artificial Intelligence for Teachers", "training", "Training", "European School Education Platform",
         "Vijfdaagse Erasmus-cursus over AI-basiskennis, toepassingen in lesplanning en toetsing, ethiek, privacy en een eigen implementatiestrategie.",
         "Leraren praktische en kritische vaardigheden geven voor AI-gebruik in de klas.",
         ["Docenten", "Schoolleiders", "Lerarenopleiders"], ["VO", "MBO"], ["AI-geletterdheid", "Professionalisering", "Lesgeven en leren met AI"],
         "https://school-education.ec.europa.eu/en/learn/courses/artificial-intelligence-teachers-0", ["Erasmus", "teachers", "AI", "classroom"], geography="Europa", cost="paid", language=["en"], availability="Bevestigde edities vanaf 27 juli 2026", start="2026-07-27"),
    item("uva-genai-in-the-classroom", "GenAI in the classroom", "training", "Training", "Universiteit van Amsterdam",
         "Workshop voor docenten die leeractiviteiten willen ontwerpen waarin generatieve AI het leren doelgericht ondersteunt.",
         "Van incidenteel toolgebruik naar onderwijskundig ontworpen leeractiviteiten met AI gaan.",
         ["Docenten", "Onderwijsontwikkelaars"], ["WO"], ["Lesgeven en leren met AI", "Professionalisering", "Curriculumontwikkeling"],
         "https://tlc.uva.nl/article/genai-in-the-classroom/", ["UvA", "classroom", "leeractiviteiten", "GenAI"], language=["en"], availability="Aanmelding via UvA TLC"),
    item("uva-toetsing-herzien-met-genai", "Workshop Toetsing herzien met GenAI", "training", "Training", "Universiteit van Amsterdam",
         "Workshop waarin docenten de invloed van generatieve AI op niet-gesurveilleerde toetsing onderzoeken en een eigen summatieve toets herontwerpen.",
         "Toetsing valide en doelgericht aanpassen aan generatieve AI.",
         ["Docenten", "Toetsmakers", "Examencommissies"], ["WO"], ["Toetsing en examinering", "Professionalisering", "Lesgeven en leren met AI"],
         "https://tlc.uva.nl/article/workshop-toetsingen-herzien-met-genai/?faculty=8", ["UvA", "toetsing", "herontwerp", "GenAI"], language=["en"], availability="Gepland op 21 oktober 2026", start="2026-10-21", end="2026-10-21"),
    item("unesco-mooc-ethiek-ai", "Global MOOC on the Ethics of AI", "training", "Training", "UNESCO en LG AI Research",
         "Gratis wereldwijd toegankelijke online cursus die professionals helpt de UNESCO-aanbeveling over AI-ethiek naar de praktijk te vertalen.",
         "Professionals leren ethische principes voor AI praktisch toe te passen.",
         ["Docenten", "Onderzoekers", "Beleidsmakers", "Bestuurders"], ALL, ["Publieke waarden en ethiek", "AI-geletterdheid", "Professionalisering"],
         "https://www.unesco.org/en/articles/empowering-minds-transforming-lives-global-mooc-ethics-ai?hub=67817", ["UNESCO", "MOOC", "AI ethics", "Coursera"], geography="Internationaal", cost="free", language=["en"]),

    item("uu-geschreven-eindproducten-genai", "Geschreven eindproducten als toets in tijden van GenAI", "guidance", "Handreiking", "Universiteit Utrecht",
         "Handreiking met een vijfstappenplan en voorbeelden voor het valide herontwerpen van geschreven eindproducten zoals take-home-tentamens en scripties.",
         "Docenten zicht laten houden op het denk- en leerproces bij schriftelijke toetsing.",
         ["Docenten", "Toetsmakers", "Examencommissies", "Onderwijsontwikkelaars"], ["HBO", "WO"], ["Toetsing en examinering", "Lesgeven en leren met AI"],
         "https://www.uu.nl/onderwijs/onderwijsadvies-training/kennisdossiers/themadossier-generatieve-ai-in-het-onderwijs/geschreven-eindproducten-toetsen-in-tijden-van-genai", ["geschreven eindproduct", "toetsontwerp", "GenAI", "validiteit"], publication="2026-03-20"),
    item("ap-aan-de-slag-ai-geletterdheid", "Aan de slag met AI-geletterdheid", "guidance", "Handreiking", "Autoriteit Persoonsgegevens",
         "Publieke handreiking die organisaties op weg helpt met de AI-geletterdheidsverplichting uit de AI-verordening.",
         "Organisaties helpen bepalen welke kennis, vaardigheden en context medewerkers nodig hebben voor verantwoord AI-gebruik.",
         ["Bestuurders", "Beleidsmakers", "Docenten", "IT-professionals", "Privacyprofessionals"], ALL, ["AI-geletterdheid", "AI Act en wetgeving", "Beleid en governance"],
         "https://autoriteitpersoonsgegevens.nl/documenten/aan-de-slag-met-ai-geletterdheid", ["AP", "AI-geletterdheid", "AI Act", "medewerkers"], publication="2025-01-30"),
    item("rdi-ai-verordening", "AI-verordening: toezicht en verantwoordelijkheden", "guidance", "Handreiking", "Rijksinspectie Digitale Infrastructuur",
         "Uitleg over de AI-verordening en de Nederlandse toezichtsinrichting, inclusief AI-systemen die worden gebruikt voor beoordelingen in het onderwijs.",
         "Onderwijsorganisaties inzicht geven in toezicht en verantwoordelijkheden onder de AI-verordening.",
         ["Bestuurders", "Beleidsmakers", "Juristen", "IT-professionals"], ALL, ["AI Act en wetgeving", "Beleid en governance"],
         "https://www.rdi.nl/onderwerpen/technologische-ontwikkelingen/kunstmatige-intelligentie/ai-verordening", ["RDI", "AI-verordening", "onderwijsbeoordeling", "toezicht"]),
    item("unesco-guidance-generatieve-ai", "Guidance for Generative AI in Education and Research", "guidance", "Handreiking", "UNESCO",
         "Mondiale UNESCO-richtlijn voor mensgerichte regulering, beleidsvorming, validatie en pedagogisch ontwerp van generatieve AI in onderwijs en onderzoek.",
         "Landen en onderwijsinstellingen helpen generatieve AI veilig, eerlijk en betekenisvol toe te passen.",
         ["Beleidsmakers", "Bestuurders", "Docenten", "Onderzoekers"], ALL, ["Beleid en governance", "Publieke waarden en ethiek", "Lesgeven en leren met AI"],
         "https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research?hub=195885", ["UNESCO", "generative AI", "policy", "human-centred"], geography="Internationaal", cost="free", language=["Meertalig"], publication="2023-09-07"),
    item("unesco-ai-education-policy-makers", "AI and Education: Guidance for Policy-makers", "guidance", "Handreiking", "UNESCO",
         "Beleidsrichtlijn over kansen, risico's, inclusie en beleidsopties voor kunstmatige intelligentie in onderwijsstelsels.",
         "Beleidsmakers ondersteunen bij samenhangend en inclusief AI-onderwijsbeleid.",
         ["Beleidsmakers", "Bestuurders", "Onderzoekers"], ALL, ["Beleid en governance", "Publieke waarden en ethiek", "Onderzoek"],
         "https://www.unesco.org/en/articles/ai-and-education-guidance-policy-makers?hub=32618", ["UNESCO", "policy-makers", "inclusion", "AI policy"], geography="Internationaal", cost="free", language=["Meertalig"], publication="2021-01-11"),
    item("unesco-aanbeveling-ethiek-ai", "UNESCO Recommendation on the Ethics of Artificial Intelligence", "standard", "Standaard", "UNESCO",
         "Wereldwijde normatieve aanbeveling over AI-ethiek met beleidsgebieden voor onder meer onderwijs, onderzoek, data, mensenrechten en milieu.",
         "Publieke waarden en menselijke waardigheid richtinggevend maken bij ontwikkeling en toepassing van AI.",
         ["Beleidsmakers", "Bestuurders", "Onderzoekers", "Docenten"], ALL, ["Publieke waarden en ethiek", "Beleid en governance", "AI-geletterdheid"],
         "https://www.unesco.org/en/legal-affairs/recommendation-ethics-artificial-intelligence?hub=1063", ["UNESCO", "ethics", "human rights", "standard"], geography="Internationaal", cost="free", language=["Meertalig"], publication="2021-11-23"),
    item("rijksoverheid-onderzoek-gebruik-ai-onderwijs", "Onderzoek Gebruik AI in het onderwijs", "research_project", "Pilot", "Ministerie van Onderwijs, Cultuur en Wetenschap",
         "Publiek onderzoeksrapport met resultaten van een inventarisatie van AI-gebruik in het onderwijs via de OCW Onderwijscommunity.",
         "Feitelijk inzicht bieden in gebruik en ervaringen rond AI in het Nederlandse onderwijs.",
         ["Beleidsmakers", "Bestuurders", "Onderzoekers", "Docenten"], ["PO", "VO", "MBO", "HBO", "WO", "Onderzoek"], ["Onderzoek", "Implementatie en adoptie"],
         "https://www.rijksoverheid.nl/documenten/2025/09/19/gebruik-ai-in-het-onderwijs", ["OCW", "onderzoek", "AI-gebruik", "Onderwijscommunity"], publication="2025-09-19"),
    item("rijksoverheid-handreiking-verantwoorde-generatieve-ai", "Overheidsbrede handreiking voor verantwoorde inzet van generatieve AI", "guidance", "Handreiking", "Rijksoverheid",
         "Handreiking over technologische, organisatorische, ethische en juridische randvoorwaarden voor verantwoorde inzet van generatieve AI in publieke organisaties.",
         "Publieke instellingen ondersteunen bij beheerste invoering en gebruik van generatieve AI.",
         ["Bestuurders", "Beleidsmakers", "IT-professionals", "Juristen", "Privacyprofessionals"], ["Overheid", "HBO", "WO", "Onderzoek"], ["Beleid en governance", "Publieke waarden en ethiek", "Implementatie en adoptie"],
         "https://www.rijksoverheid.nl/documenten/2025/04/16/overheidsbrede-handreiking-generatieve-ai", ["Rijksoverheid", "generatieve AI", "implementatie", "randvoorwaarden"], publication="2025-01-30"),
    item("kennisnet-ai-in-leermiddelen", "AI in leermiddelen en andere toepassingen", "guidance", "Handreiking", "Kennisnet",
         "Overzicht van AI-integratie in adaptieve leermiddelen, dashboards, chatbots, AI-tutoren en hulpmiddelen voor lesmateriaal, met aandacht voor menselijke controle.",
         "Scholen helpen herkennen waar AI in onderwijstoepassingen zit en welke afwegingen daarbij horen.",
         ["Docenten", "Schoolleiders", "IT-professionals"], ["PO", "VO", "MBO"], ["Lesgeven en leren met AI", "Implementatie en adoptie", "Publieke waarden en ethiek"],
         "https://www.kennisnet.nl/artificial-intelligence/ai-in-leermiddelen-en-andere-toepassingen/", ["leermiddelen", "AI-tutor", "dashboard", "menselijke controle"], publication="2024-06-12"),
    item("kennisnet-ethische-dilemmas-ai", "Ethische dilemma's en de inzet van AI in het onderwijs", "guidance", "Handreiking", "Kennisnet",
         "Praktische duiding van spanningen tussen AI-toepassingen en onderwijswaarden zoals autonomie, privacy, kansengelijkheid, betekenisvol contact en soevereiniteit.",
         "Schoolteams helpen ethische dilemma's rond AI expliciet te bespreken en af te wegen.",
         ["Docenten", "Schoolleiders", "Bestuurders", "Beleidsmakers"], ["PO", "VO", "MBO"], ["Publieke waarden en ethiek", "Privacy en AVG", "Beleid en governance"],
         "https://www.kennisnet.nl/artificial-intelligence/ethische-dilemmas-en-de-inzet-van-ai-in-het-onderwijs/", ["autonomie", "privacy", "kansengelijkheid", "soevereiniteit"], publication="2026-05-28"),
    item("kennisnet-ai-cyberveiligheid", "De impact van AI op cyberveiligheid in het onderwijs", "guidance", "Handreiking", "Kennisnet",
         "Uitleg over hoe AI cyberdreigingen toegankelijker en schaalbaarder maakt en waarom onderwijsinstellingen techniek, bewustwording en beleid geïntegreerd moeten benaderen.",
         "Onderwijsinstellingen helpen AI-risico's mee te nemen in hun digitale weerbaarheid.",
         ["IT-professionals", "Bestuurders", "Schoolleiders", "Beleidsmakers"], ["PO", "VO", "MBO"], ["Veilige AI-omgeving", "Beleid en governance", "AI-geletterdheid"],
         "https://www.kennisnet.nl/informatiebeveiliging-en-privacy/de-impact-van-ai-op-cyberveiligheid-in-het-onderwijs/", ["cyberveiligheid", "phishing", "malware", "weerbaarheid"], publication="2026-05-11"),

    item("saxion-ai-in-curriculumontwerp", "AI in het curriculumontwerp bij Saxion", "practice_example", "Praktijkvoorbeeld", "Saxion",
         "Praktijkpresentatie over een systematische aanpak voor curriculumherontwerp, docentprofessionalisering en toetsing onder invloed van AI.",
         "Laten zien hoe een hogeschool AI-geletterdheid, curriculum en toetsing in samenhang benadert.",
         ["Docenten", "Onderwijsontwikkelaars", "Onderwijsadviseurs"], ["HBO"], ["Praktijkvoorbeelden", "Curriculumontwikkeling", "Toetsing en examinering"],
         "https://pretalx.surf.nl/surf-onderwijsdagen-2024/talk/MQF8YK/", ["Saxion", "curriculumontwerp", "toetsing", "AI-geletterdheid"], publication="2024-11-12"),
    item("han-raamwerk-gebruik-ai", "HAN-raamwerk voor gebruik van AI", "practice_example", "Praktijkvoorbeeld", "HAN University of Applied Sciences",
         "Instellingsbreed raamwerk met uitgangspunten voor gebruik en implementatie van AI in onderwijs, onderzoek en toetsing.",
         "Laten zien hoe een hogeschool AI-beleid vertaalt naar kaders voor verschillende doelgroepen.",
         ["Docenten", "Studenten", "Bestuurders", "Examencommissies"], ["HBO", "Onderzoek"], ["Praktijkvoorbeelden", "Beleid en governance", "Toetsing en examinering"],
         "https://community-data-ai.npuls.nl/attachment/entity/4bd8f3af-cf09-4e9e-8f8a-35715f026f63", ["HAN", "raamwerk", "AI-beleid", "toetsing"]),
    item("kennisnet-klimaat-rekenkracht-ai", "Klimaat en rekenkracht: milieu-impact van AI in het onderwijs", "research_project", "Pilot", "Kennisnet en Berenschot",
         "Onderzoek naar de verwachte milieu-effecten van AI-gebruik in het primair en voortgezet onderwijs.",
         "Scholen en beleidsmakers inzicht geven in energie-, grondstoffen- en klimaateffecten van AI-gebruik.",
         ["Bestuurders", "Beleidsmakers", "Onderzoekers", "Docenten"], ["PO", "VO", "Onderzoek"], ["Onderzoek", "Publieke waarden en ethiek", "Beleid en governance"],
         "https://www.kennisnet.nl/onderzoek/klimaat-en-rekenkracht-onderzoek-naar-de-milieu-impact-van-ai-in-het-onderwijs/", ["klimaat", "rekenkracht", "milieu-impact", "duurzaamheid"]),
]


def normalized(value):
    return " ".join(str(value).casefold().split()).rstrip("/")


def main():
    records = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
    ids = {record["id"] for record in records}
    titles = {normalized(record["title"]) for record in records}
    urls = {normalized(source["url"]) for record in records for source in record.get("sourceUrls", [])}
    for record in ITEMS:
        clashes = []
        if record["id"] in ids:
            clashes.append("id")
        if normalized(record["title"]) in titles:
            clashes.append("titel")
        if normalized(record["sourceUrls"][0]["url"]) in urls:
            clashes.append("bron-URL")
        if clashes:
            raise SystemExit(f"Import gestopt: {record['title']} botst op {', '.join(clashes)}")
        ids.add(record["id"])
        titles.add(normalized(record["title"]))
        urls.add(normalized(record["sourceUrls"][0]["url"]))
    records.extend(ITEMS)
    RECORDS_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata = json.loads(META_PATH.read_text(encoding="utf-8"))
    metadata.update({"version": "Werkversie 0.4", "updated": "21 juli 2026", "recordCount": len(records)})
    META_PATH.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Toegevoegd: {len(ITEMS)}; totaal: {len(records)}")


if __name__ == "__main__":
    main()
