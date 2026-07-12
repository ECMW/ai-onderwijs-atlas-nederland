"""Voeg de eerste gecontroleerde tranche officiële AI-onderwijsbronnen toe.

De compacte definities hieronder worden aangevuld met het volledige v2-recordschema.
Het script stopt vóór schrijven bij een botsend id, een bestaande titel of bron-URL.
"""

import json
from pathlib import Path

ROOT = Path(__file__).parents[1]
RECORDS_PATH = ROOT / "data" / "records.json"
METADATA_PATH = ROOT / "data" / "metadata.json"
VERIFIED = "2026-07-12"


def item(id, title, record_type, legacy_type, provider, description, purpose,
         audiences, sectors, themes, url, keywords, *, organization_ids=(),
         related_ids=(), status="available", availability="Direct beschikbaar",
         publication=None, start=None, end=None):
    return {
        "id": id,
        "title": title,
        "recordType": record_type,
        "legacyType": legacy_type,
        "subtype": None,
        "organizationIds": list(organization_ids),
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
        "verificationStatus": "recently_checked",
        "sourceUrls": [{"label": "Officiële bron", "url": url, "sourceType": "official"}],
        "relatedIds": list(related_ids),
        "parentIds": [],
        "childIds": [],
        "geographicScope": "Nederland",
        "accessType": "public",
        "costType": "unknown",
        "fundingAmount": None,
        "fundingDeadline": None,
        "applicationOpenDate": None,
        "applicationDeadline": None,
        "fundingMin": None,
        "fundingMax": None,
        "totalBudget": None,
        "eligibility": None,
        "applicantTypes": [],
        "callStatus": None,
        "recurrence": None,
        "language": ["nl"],
        "keywords": keywords,
        "notes": None,
        "changeHistory": [{
            "date": VERIFIED,
            "type": "added",
            "summary": "Toegevoegd in officiële inhoudstranche Nederlandse AI-onderwijsbronnen, batch 1."
        }]
    }


NEW_RECORDS = [
    item(
        "in-gesprek-over-digitale-geletterdheid", "In gesprek over digitale geletterdheid",
        "guidance", "Handreiking", "Npuls",
        "Gespreksplaat die digitale geletterdheid verbindt met AI-geletterdheid, datageletterdheid, informatievaardigheden en mediawijsheid.",
        "Een gemeenschappelijke taal en startpunt bieden voor keuzes over digitale geletterdheid in het vervolgonderwijs.",
        ["Bestuurders", "Beleidsmakers", "Curriculumontwikkelaars", "Docenten", "Informatiemanagers"],
        ["MBO", "HBO", "WO"], ["AI-geletterdheid", "Curriculumontwikkeling", "Beleid en governance"],
        "https://www.npuls.nl/kennisbank/in-gesprek-over-digitale-geletterdheid",
        ["digitale geletterdheid", "AI-geletterdheid", "datageletterdheid", "gespreksplaat", "competentieraamwerken"],
        organization_ids=["org-npuls"], related_ids=["npuls"], publication="2026-06-23"
    ),
    item(
        "kit-workshop-ai-assistenten-in-het-onderwijs", "Kit: workshop AI-assistenten in het onderwijs",
        "training", "Training", "Npuls",
        "Vrij beschikbare workshopkit met draaiboek, presentatie, gespreksstarters en werkmaterialen over toekomstige AI-assistenten in het onderwijs.",
        "Onderwijsprofessionals gezamenlijk eisen, wensen en beleid voor AI-assistenten laten verkennen.",
        ["Docenten", "Onderwijsadviseurs", "Beleidsmakers", "IT-professionals"],
        ["MBO", "HBO", "WO"], ["Professionalisering", "Lesgeven en leren met AI", "Beleid en governance"],
        "https://npuls.nl/kennisbank/kit-workshop-ai-assistenten-in-het-onderwijs",
        ["workshop", "AI-assistenten", "draaiboek", "gespreksstarters", "professionalisering"],
        organization_ids=["org-npuls"], related_ids=["npuls"], publication="2024-08-29"
    ),
    item(
        "aan-de-slag-met-de-ai-act", "Aan de slag met de AI Act",
        "guidance", "Handreiking", "Npuls",
        "Thematische toegang tot documenten en tools over de AI Act, AI-geletterdheid, algoritmeregistratie en verantwoord AI-gebruik in het vervolgonderwijs.",
        "Onderwijsprofessionals helpen passende AI-Act-instrumenten te vinden en toe te passen.",
        ["Docenten", "Beleidsmakers", "Bestuurders", "Informatiemanagers", "IT-professionals", "Juristen"],
        ["MBO", "HBO", "WO"], ["AI Act en wetgeving", "Beleid en governance", "AI-geletterdheid"],
        "https://npuls.nl/kennisbank/aan-de-slag-met-de-ai-act",
        ["AI Act", "AI-verordening", "algoritmeregister", "compliance", "verantwoord gebruik"],
        organization_ids=["org-npuls"], related_ids=["npuls"], publication="2026-03-12"
    ),
    item(
        "ai-act-inleiding-en-uitleg", "AI Act – Inleiding en uitleg over de AI-verordening",
        "guidance", "Handreiking", "Npuls",
        "Beknopte introductie tot de AI-verordening met begrippen, risicocategorieën, fasering en gevolgen voor onderwijsinstellingen.",
        "Medewerkers in het vervolgonderwijs een eerste onderbouwd overzicht van de AI Act geven.",
        ["Beleidsmakers", "Bestuurders", "Docenten", "IT-professionals", "Juristen"],
        ["MBO", "HBO", "WO"], ["AI Act en wetgeving", "Beleid en governance"],
        "https://npuls.nl/kennisbank/ai-act-inleiding-en-uitleg",
        ["AI Act", "AI-verordening", "risicoclassificatie", "juridisch", "compliance"],
        organization_ids=["org-npuls"], related_ids=["npuls"], publication="2025-03-12"
    ),
    item(
        "edugenai-uitbreiding-pilot", "eduGenAI: uitbreiding van de pilot",
        "pilot", "Pilot", "Npuls en SURF",
        "Gecontroleerde pilotomgeving waarin instellingen veilige en verantwoorde generatieve AI testen en de toekomstige dienst gezamenlijk verbeteren.",
        "Praktijkervaring opdoen met generatieve AI die aansluit op onderwijsdoelen, privacy en digitale autonomie.",
        ["Studenten", "Docenten", "Ondersteunend personeel", "IT-professionals", "Bestuurders"],
        ["MBO", "HBO", "WO"], ["Veilige AI-omgeving", "Implementatie en adoptie", "Publieke waarden en ethiek"],
        "https://npuls.nl/nieuws/edu-gen-ai-breidt-pilot-uit",
        ["eduGenAI", "pilot", "generatieve AI", "digitale autonomie", "veilige AI"],
        organization_ids=["org-npuls", "org-surf"], related_ids=["npuls", "surf"], status="pilot",
        availability="Pilot wordt in 2026 gefaseerd uitgebreid", publication="2026-04-20", start="2026-05-01"
    ),
    item(
        "ai-impact-game", "AI Impact Game", "product", "Product", "Kennisnet",
        "Kant-en-klare workshop met instructies, script, presentatie, spelbord en werkmaterialen om de impact van generatieve AI vanuit meerdere schoolrollen te verkennen.",
        "Het gesprek over onderwijsvisie, rollen en schoolbeleid voor generatieve AI verdiepen.",
        ["Docenten", "Schoolleiders", "Bestuurders", "Beleidsmakers"], ["PO", "VO"],
        ["Beleid en governance", "Professionalisering", "Publieke waarden en ethiek"],
        "https://www.kennisnet.nl/tools/ai-impact-game/",
        ["AI Impact Game", "workshop", "generatieve AI", "schoolbeleid", "scenario's"],
        organization_ids=["org-kennisnet"], related_ids=["kennisnet"]
    ),
    item(
        "ai-gebruik-op-school-in-kaart-brengen", "Het gebruik van AI op school in kaart brengen",
        "guidance", "Handreiking", "Kennisnet",
        "Stappenplan voor een kwalitatieve of kwantitatieve inventarisatie van AI-gebruik, met een voorbeeldvragenlijst voor leraren en leerlingen.",
        "Feitelijk inzicht verzamelen als basis voor schoolafspraken, AI-beleid en professionalisering.",
        ["Schoolleiders", "Beleidsmakers", "Docenten", "IT-professionals"], ["PO", "VO", "MBO"],
        ["Beleid en governance", "Implementatie en adoptie", "AI-geletterdheid"],
        "https://www.kennisnet.nl/artificial-intelligence/het-gebruik-van-ai-op-school-in-kaart-brengen/",
        ["inventarisatie", "vragenlijst", "AI-gebruik", "schoolbeleid", "professionalisering"],
        organization_ids=["org-kennisnet"], related_ids=["kennisnet"], publication="2025-09-25"
    ),
    item(
        "voldoen-aan-de-ai-verordening", "Voldoen aan de AI-verordening",
        "guidance", "Handreiking", "Kennisnet",
        "Stappenplan dat uitlegt wanneer de AI-verordening op scholen van toepassing is, welke risicocategorieën bestaan en welke acties nodig zijn.",
        "Scholen ondersteunen bij het herkennen en uitvoeren van hun verplichtingen onder de AI-verordening.",
        ["Schoolleiders", "Bestuurders", "Beleidsmakers", "IT-professionals", "Juristen"], ["PO", "VO", "MBO"],
        ["AI Act en wetgeving", "Beleid en governance", "Veilige AI-omgeving"],
        "https://www.kennisnet.nl/artificial-intelligence/voldoen-aan-de-ai-verordening/",
        ["AI-verordening", "AI Act", "risicocategorieën", "gebruiksverantwoordelijke", "compliance"],
        organization_ids=["org-kennisnet"], related_ids=["kennisnet"], availability="Bijgewerkt 2 april 2026"
    ),
    item(
        "curriculumontwikkeling-en-de-invloed-van-ai", "Aandachtspunten bij curriculumontwikkeling en de invloed van AI",
        "guidance", "Handreiking", "Kennisnet",
        "Praktische aandachtspunten voor curriculumkeuzes rond AI, waaronder leerdoelen, toetsing, de rol van de leraar, collectief leren en professionalisering.",
        "Schoolteams helpen AI doordacht in samenhang met het volledige curriculum te beoordelen.",
        ["Docenten", "Schoolleiders", "Curriculumontwikkelaars", "Onderwijsadviseurs"], ["PO", "VO"],
        ["Curriculumontwikkeling", "Lesgeven en leren met AI", "Professionalisering"],
        "https://www.kennisnet.nl/artificial-intelligence/aandachtspunten-bij-de-ontwikkeling-van-je-curriculum-en-de-invloed-van-ai/",
        ["curriculum", "leerdoelen", "toetsing", "professionalisering", "leraarschap"],
        organization_ids=["org-kennisnet"], related_ids=["kennisnet"], availability="Bijgewerkt 24 februari 2026"
    ),
    item(
        "leermiddelen-differentieren-met-ai", "Leermiddelen differentiëren met AI",
        "guidance", "Handreiking", "Kennisnet",
        "Uitleg over generieke en onderwijsspecifieke AI-tools voor differentiatie, met randvoorwaarden voor kwaliteit, privacy, didactiek en professionele beoordeling.",
        "Leraren en scholen ondersteunen bij een verantwoorde pilot met AI-ondersteunde differentiatie.",
        ["Docenten", "Schoolleiders", "Onderwijsadviseurs", "Curriculumontwikkelaars"], ["PO", "VO"],
        ["Lesgeven en leren met AI", "Curriculumontwikkeling", "Veilige AI-omgeving"],
        "https://www.kennisnet.nl/artificial-intelligence/leermiddelen-differentieren-met-ai/",
        ["differentiatie", "leermiddelen", "AI-tutor", "didactiek", "kwaliteit"],
        organization_ids=["org-kennisnet"], related_ids=["kennisnet"], publication="2026-06-15"
    ),
    item(
        "impact-van-ai-op-de-schoolorganisatie", "De impact van AI op de schoolorganisatie",
        "guidance", "Handreiking", "Kennisnet",
        "Overzicht van de invloed van AI op bestuur, schoolleiding, ondersteuning, leerlingbegeleiding en bedrijfsvoering binnen schoolorganisaties.",
        "Bestuur en schoolleiding helpen de organisatorische reikwijdte van AI in beeld te brengen.",
        ["Bestuurders", "Schoolleiders", "Beleidsmakers", "Ondersteunend personeel"], ["PO", "VO"],
        ["Beleid en governance", "Implementatie en adoptie"],
        "https://www.kennisnet.nl/artificial-intelligence/de-impact-van-ai-op-de-schoolorganisatie/",
        ["schoolorganisatie", "bedrijfsvoering", "bestuur", "kwaliteitszorg", "governance"],
        organization_ids=["org-kennisnet"], related_ids=["kennisnet"], publication="2024-06-12"
    ),
    item(
        "ai-als-ongewenste-collega-emmauscollege", "Nadenken over AI op school: AI als (on)gewenste collega",
        "practice_example", "Praktijkvoorbeeld", "Emmauscollege",
        "Praktijkvoorbeeld waarin een interne website met stappenplan, playground, richtlijnen en tools het schoolteam helpt de positie van AI te onderzoeken.",
        "Laten zien hoe een VO-school AI-geletterdheid en beleidsvorming toegankelijk en onderzoekend organiseert.",
        ["Docenten", "Schoolleiders", "Beleidsmakers"], ["VO"],
        ["Praktijkvoorbeelden", "AI-geletterdheid", "Beleid en governance"],
        "https://www.kennisnet.nl/artificial-intelligence/nadenken-over-ai-op-je-school-ai-als-ongewenste-collega/",
        ["Emmauscollege", "praktijkvoorbeeld", "AI-beleid", "playground", "richtlijnen"],
        related_ids=["kennisnet"], publication="2025-02-13"
    ),
    item(
        "regionale-ai-werkgroep-friesland", "Regionale AI-werkgroep in Noordwest- en Zuid-Friesland",
        "practice_example", "Praktijkvoorbeeld", "STO Noordwest-Friesland en Zuid-Friesland",
        "Praktijkvoorbeeld van een regionale werkgroep waarin onderwijsprofessionals van VO-scholen kennis, voorbeelden en ervaringen met AI delen.",
        "Laten zien hoe scholen regionaal kunnen samenwerken aan AI-adoptie en een gezamenlijke inventarisatie.",
        ["Docenten", "Schoolleiders", "Beleidsmakers", "Onderwijsadviseurs"], ["VO"],
        ["Praktijkvoorbeelden", "Implementatie en adoptie", "Professionalisering"],
        "https://www.kennisnet.nl/artificial-intelligence/regionale-samenwerking-stelt-vo-scholen-in-staat-om-samen-met-ai-aan-de-slag-te-gaan/",
        ["regionale samenwerking", "AI-werkgroep", "VO", "kennisdeling", "adoptie"],
        related_ids=["kennisnet"], publication="2025-04-18"
    ),
    item(
        "ai-in-de-lespraktijk-teylingen-college", "AI in de lespraktijk bij Teylingen College",
        "practice_example", "Praktijkvoorbeeld", "Teylingen College",
        "Praktijkvoorbeeld van een geschiedenisdocent en digicoach die AI inzet voor lesvoorbereiding, werkdrukvermindering, docentondersteuning en beleidsadvies.",
        "Concrete manieren tonen waarop een docent en scholenstichting AI-gebruik en professionalisering organiseren.",
        ["Docenten", "Schoolleiders", "Bestuurders", "Onderwijsadviseurs"], ["VO"],
        ["Praktijkvoorbeelden", "Lesgeven en leren met AI", "Professionalisering"],
        "https://www.kennisnet.nl/artificial-intelligence/dankzij-ai-werkt-robbert-van-empel-efficienter-en-zijn-lessen-worden-er-beter-van/",
        ["Teylingen College", "digicoach", "lesvoorbereiding", "werkdruk", "professionalisering"],
        related_ids=["kennisnet"], publication="2024-12-20"
    ),
    item(
        "bewuste-inzet-ai-openbaar-onderwijs-groningen", "Bewuste en spaarzame inzet van AI bij Openbaar Onderwijs Groningen",
        "practice_example", "Praktijkvoorbeeld", "Openbaar Onderwijs Groningen",
        "Praktijkvoorbeeld met een netwerk van ICT-kartrekkers, actuele interne richtlijnen, kennisdeling en expliciete aandacht voor duurzaamheid en professioneel oordeel.",
        "Laten zien hoe een scholenstichting AI via bestaande kennisinfrastructuur en publieke waarden bestuurbaar maakt.",
        ["Docenten", "Schoolleiders", "Bestuurders", "IT-professionals", "Beleidsmakers"], ["PO", "VO"],
        ["Praktijkvoorbeelden", "Publieke waarden en ethiek", "Beleid en governance"],
        "https://www.kennisnet.nl/artificial-intelligence/spaarzaam-gebruik-van-ai-past-bij-een-bewuste-levenshouding/",
        ["Openbaar Onderwijs Groningen", "duurzaamheid", "richtlijnen", "i-coaches", "publieke waarden"],
        related_ids=["kennisnet"], publication="2025-07-18"
    ),
    item(
        "handreiking-ai-en-informatiebeveiliging", "Handreiking AI en informatiebeveiliging binnen onderwijsinstellingen",
        "guidance", "Handreiking", "SURF",
        "Handreiking voor veilig en verantwoord AI-gebruik binnen onderwijsinstellingen, gekoppeld aan volwassenheidsniveaus en bestaande beveiligingskaders.",
        "Instellingen helpen AI-risico's en informatiebeveiligingsmaatregelen systematisch te beoordelen.",
        ["IT-professionals", "Informatiemanagers", "Bestuurders", "Beleidsmakers"], ["MBO", "HBO", "WO", "Onderzoek"],
        ["Veilige AI-omgeving", "Data en infrastructuur", "Beleid en governance"],
        "https://sec.surf.nl/assets/handreiking-ai-en-informatiebeveiliging-binnen-onderwijs/",
        ["informatiebeveiliging", "AI", "SURFaudit", "risicobeheersing", "volwassenheid"],
        organization_ids=["org-surf"], related_ids=["surf"], availability="Versie 1.0"
    ),
    item(
        "verantwoord-ai-gebruiken-risicos-vooraf-beoordelen", "Verantwoord AI gebruiken in het onderwijs: risico's vooraf beoordelen",
        "guidance", "Handreiking", "SURF Communities",
        "Praktische uitleg met stroomschema over AI Act, AVG, DPIA, FRIA, risicoclassificatie en de gevolgen van geautomatiseerde examinering.",
        "Onderwijsprofessionals helpen AI-risico's en verplichtingen vóór ingebruikname systematisch te beoordelen.",
        ["Docenten", "Bestuurders", "Privacyprofessionals", "IT-professionals", "Examencommissies"], ["MBO"],
        ["AI Act en wetgeving", "Privacy en AVG", "Toetsing en examinering"],
        "https://communities.surf.nl/vraagbaak-online-onderwijs/artikel/hoe-gebruik-je-ai-verantwoord-in-je-onderwijs-denk-vooraf-altijd",
        ["AI Act", "AVG", "DPIA", "FRIA", "geautomatiseerde examinering"],
        organization_ids=["org-surf"], related_ids=["surf"], publication="2025-03-24"
    ),
    item(
        "ethische-risicos-gepersonaliseerd-onderwijs-ai", "Ethische risico's en kansen van gepersonaliseerd onderwijs met AI",
        "guidance", "Handreiking", "SURF",
        "Ethisch risicorapport over AI-gestuurd gepersonaliseerd hoger onderwijs, met aandacht voor privacy, toegankelijkheid, kritisch denken, docentenrol en duurzaamheid.",
        "Besluitvorming over gepersonaliseerd onderwijs met AI ondersteunen met expliciete publieke-waardenafwegingen.",
        ["Bestuurders", "Beleidsmakers", "Docenten", "Onderwijsadviseurs"], ["HBO", "WO"],
        ["Publieke waarden en ethiek", "Curriculumontwikkeling", "Privacy en AVG"],
        "https://www.surf.nl/nieuws/ethische-risicos-en-kansen-van-gepersonaliseerd-onderwijs-met-ai",
        ["personalisering", "ethiek", "privacy", "toegankelijkheid", "democratisch burgerschap"],
        organization_ids=["org-surf"], related_ids=["surf"], publication="2025-04-24"
    ),
    item(
        "dpia-edugenai", "DPIA eduGenAI", "guidance", "Handreiking", "SURF",
        "Openbaar Data Protection Impact Assessment van eduGenAI met twaalf lage risico's en bijbehorende mitigerende ontwikkelmaatregelen.",
        "Privacyrisico's en maatregelen rond een sectorale generatieve-AI-dienst transparant en herbruikbaar maken.",
        ["Privacyprofessionals", "IT-professionals", "Informatiemanagers", "Bestuurders"], ["MBO", "HBO", "WO"],
        ["Privacy en AVG", "Veilige AI-omgeving", "Beleid en governance"],
        "https://www.surf.nl/nieuws/dpia-edugenai-werken-aan-veilige-en-verantwoorde-ai-in-het-onderwijs",
        ["DPIA", "eduGenAI", "privacy", "gegevensbescherming", "mitigerende maatregelen"],
        organization_ids=["org-surf"], related_ids=["surf", "edugenai-uitbreiding-pilot"], publication="2025-09-01"
    ),
    item(
        "uva-pilots-generatieve-ai-beveiligde-omgeving", "UvA-pilots met generatieve AI in een beveiligde omgeving",
        "practice_example", "Praktijkvoorbeeld", "Universiteit van Amsterdam",
        "Dertien gedocumenteerde onderwijspilots met generatieve AI als schrijfcoach, programmeerhulp, oefenhulp en feedbackinstrument binnen een beveiligde omgeving.",
        "Ervaringen delen met privacyvriendelijke pilots waarin de inzet van AI dienend blijft aan leerdoelen.",
        ["Docenten", "Onderwijsadviseurs", "IT-professionals", "Studenten"], ["WO"],
        ["Praktijkvoorbeelden", "Veilige AI-omgeving", "Lesgeven en leren met AI"],
        "https://communities.surf.nl/vraagbaak-online-onderwijs/artikel/uva-doet-ai-onderwijspilots-in-eigen-beveiligde-omgeving-het",
        ["Universiteit van Amsterdam", "pilots", "beveiligde omgeving", "leerdoelen", "generatieve AI"],
        related_ids=["surf"], publication="2024-11-15", availability="Praktijkbeschrijving van pilots in 2024"
    ),
    item(
        "ai-ethiek-volwassenheidsmodel-onderwijs", "AI-ethiek-volwassenheidsmodel voor onderwijsinstellingen",
        "product", "Product", "SURF",
        "Volwassenheidsmodel en reflectierapport waarmee onderwijsinstellingen beoordelen hoe zij AI-ethiek organisatorisch hebben ingericht.",
        "Instellingen een gestructureerd gesprek en groeipad bieden voor verantwoord AI-gebruik.",
        ["Bestuurders", "Informatiemanagers", "Beleidsmakers", "IT-professionals"], ["MBO", "HBO", "WO"],
        ["Publieke waarden en ethiek", "Beleid en governance", "Implementatie en adoptie"],
        "https://pec.surf.nl/model-ai-ethiek-in-het-onderwijs/",
        ["AI-ethiek", "volwassenheidsmodel", "governance", "reflectie", "verantwoord AI-gebruik"],
        organization_ids=["org-surf"], related_ids=["surf"], availability="Laatst bijgewerkt 6 mei 2026"
    ),
    item(
        "veilige-ai-agents-hogeschool-rotterdam", "Veilige AI-agents bij Hogeschool Rotterdam",
        "practice_example", "Praktijkvoorbeeld", "Hogeschool Rotterdam",
        "Pilotpraktijk waarin de AI-hub wordt gebruikt om AI-agents wetenschappelijke bronnen te laten doorzoeken met guardrails voor betrouwbaarheid, privacy en compliance.",
        "Laten zien hoe onderzoeksteams AI-agents binnen bestuurbare technische en organisatorische kaders ontwikkelen.",
        ["Onderzoekers", "Docenten", "IT-professionals", "Informatiemanagers"], ["HBO", "Onderzoek"],
        ["Praktijkvoorbeelden", "Veilige AI-omgeving", "Data en infrastructuur"],
        "https://www.surf.nl/praktijkverhaal/van-pilots-naar-praktijk-hogeschool-rotterdam-bouwt-met-ai-hub-veilige-en-betrouwbare-ai-agents",
        ["Hogeschool Rotterdam", "AI-agents", "AI-hub", "guardrails", "wetenschappelijke bronnen"],
        related_ids=["surf"], publication="2026-04-08", status="pilot", availability="Onderdeel van de AI-hub-pilotfase"
    ),
    item(
        "ai-toetsingskader-funderend-onderwijs", "AI Toetsingskader Funderend Onderwijs",
        "guidance", "Handreiking", "SIVON",
        "Interactief toetsingskader waarmee leveranciers en scholen bepalen of een AI-systeem onder de AI-verordening valt, welke risicoklasse geldt en welke maatregelen nodig zijn.",
        "De AI-verordening eenduidig vertalen naar beoordeling, inkoop en gebruik van educatieve AI in het funderend onderwijs.",
        ["Bestuurders", "IT-professionals", "Privacyprofessionals", "Inkoop", "Leveranciers"], ["PO", "VO"],
        ["AI Act en wetgeving", "Veilige AI-omgeving", "Beleid en governance"],
        "https://www.sivon.nl/toetsingskader/",
        ["toetsingskader", "AI-verordening", "hoog risico", "leveranciers", "menselijk toezicht"],
        organization_ids=["org-sivon"], related_ids=["sivon", "kennisnet"], publication="2026-04-01",
        availability="Versie 1.0 (voorlopig en dynamisch)"
    ),
    item(
        "whitepaper-educatieve-en-algemene-ai", "Whitepaper Educatieve AI en algemene AI",
        "guidance", "Handreiking", "NOLAI",
        "Whitepaper die educatieve AI afbakent van algemene en generatieve AI vanuit ontwikkeling, onderwijscontext en leerdoelen.",
        "Onderwijsprofessionals helpen beoordelen wanneer AI werkelijk voor leren en lesgeven is ontworpen.",
        ["Docenten", "Schoolleiders", "Bestuurders", "Onderwijsadviseurs"], ["PO", "VO"],
        ["AI-geletterdheid", "Lesgeven en leren met AI", "Publieke waarden en ethiek"],
        "https://www.ru.nl/over-ons/nieuws/whitepaper-educatieve-ai-en-algemene-ai",
        ["educatieve AI", "algemene AI", "generatieve AI", "leerdoelen", "menselijke regie"],
        organization_ids=["org-nolai"], related_ids=["nolai"], publication="2026-04-08"
    ),
    item(
        "whitepaper-micropseudonimisatie", "Whitepaper Veilig omgaan met data: micropseudonimisatie",
        "guidance", "Handreiking", "NOLAI",
        "Whitepaper over het voorkomen van datalekken met pseudonimisatie en de verbinding met verantwoord en duurzaam datagebruik in onderwijsprojecten.",
        "Privacyprofessionals en onderzoekers inzicht geven in een technische maatregel voor gevoelige onderwijsdata.",
        ["Privacyprofessionals", "Onderzoekers", "IT-professionals", "Informatiemanagers"], ["PO", "VO", "Onderzoek"],
        ["Privacy en AVG", "Data en infrastructuur", "Veilige AI-omgeving"],
        "https://www.ru.nl/over-ons/nieuws/whitepaper-veilig-omgaan-met-data-micropseudonimisatie",
        ["micropseudonimisatie", "pseudonimisatie", "onderwijsdata", "privacy", "datalekken"],
        organization_ids=["org-nolai"], related_ids=["nolai"], publication="2025-09-11"
    ),
    item(
        "whitepaper-veilig-experimenteren-taalmodellen", "Whitepaper Veilig experimenteren met taalmodellen",
        "guidance", "Handreiking", "NOLAI",
        "Stappenplan voor het bouwen van een lokale server waarmee scholen met taalmodellen kunnen experimenteren zonder gegevens naar een externe clouddienst te sturen.",
        "Scholen praktische controle geven over data en privacy bij experimenten met taalmodellen.",
        ["Docenten", "IT-professionals", "Schoolleiders"], ["PO", "VO"],
        ["Veilige AI-omgeving", "Privacy en AVG", "Data en infrastructuur"],
        "https://www.ru.nl/over-ons/nieuws/whitepaper-veilig-experimenteren-met-taalmodellen",
        ["taalmodellen", "lokale server", "open source", "privacy", "stappenplan"],
        organization_ids=["org-nolai"], related_ids=["nolai"], publication="2025-05-26"
    ),
    item(
        "whitepaper-nakijken-met-ai-vijf-vragen", "Whitepaper Nakijken met AI: vijf vragen voor leraren",
        "guidance", "Handreiking", "NOLAI",
        "Whitepaper met vijf vragen die leraren en schoolleiders moeten beantwoorden voordat zij AI inzetten voor nakijkwerk.",
        "Menselijke controle en verantwoorde keuzes bij AI-ondersteund nakijken versterken.",
        ["Docenten", "Schoolleiders", "Toetsmakers"], ["PO", "VO"],
        ["Toetsing en examinering", "Publieke waarden en ethiek", "AI-geletterdheid"],
        "https://www.ru.nl/over-ons/nieuws/whitepaper-nakijken-met-ai-5-vragen-die-leraren-zich-zouden-moeten-stellen",
        ["nakijken", "AI", "menselijke controle", "toetsing", "werkdruk"],
        organization_ids=["org-nolai"], related_ids=["nolai", "open-vragen-nakijken-met-hulp-van-ai"], publication="2025-06-09"
    ),
    item(
        "open-vragen-nakijken-met-hulp-van-ai", "Open vragen nakijken met hulp van AI",
        "research_project", "Pilot", "NOLAI",
        "Lopend co-creatieproject dat semi-automatische ondersteuning ontwikkelt voor het sneller en consistenter nakijken van open vragen bij biologie en aardrijkskunde.",
        "Een verantwoord en gevalideerd prototype ontwikkelen dat leraren ondersteunt zonder hun professionele rol weg te nemen.",
        ["Docenten", "Toetsmakers", "Onderzoekers", "Schoolleiders"], ["VO"],
        ["Toetsing en examinering", "Onderzoek", "Publieke waarden en ethiek"],
        "https://www.ru.nl/onderzoek/onderzoeksprojecten/open-vragen-nakijken-met-hulp-van-ai",
        ["open vragen", "nakijken", "semi-automatisch", "CitoLab", "co-creatie"],
        organization_ids=["org-nolai"], related_ids=["nolai"], status="pilot", availability="Lopend project 2024–2027", start="2024-01-01", end="2027-12-31"
    ),
    item(
        "generatieve-ai-in-het-vo-nolai", "Generatieve AI in het voortgezet onderwijs",
        "research_project", "Pilot", "NOLAI",
        "Lopend co-creatieonderzoek dat gebruikscases van generatieve AI beschrijft en de verdeling van controle tussen leraar, AI en leerling analyseert.",
        "Nieuwe manieren ontwikkelen om generatieve AI doordacht en met behoud van onderwijsregie in VO-scholen te verankeren.",
        ["Docenten", "Leerlingen", "Onderzoekers", "Schoolleiders"], ["VO"],
        ["Onderzoek", "Lesgeven en leren met AI", "Beleid en governance"],
        "https://www.ru.nl/onderzoek/onderzoeksprojecten/generatieve-ai-in-het-vo",
        ["generatieve AI", "VO", "regie", "automatiseringsniveaus", "gebruikscases"],
        organization_ids=["org-nolai"], related_ids=["nolai"], status="pilot", availability="Lopend sinds 1 januari 2023", start="2023-01-01"
    ),
    item(
        "adaptief-lesmateriaal-tos-leerlingen", "Adaptief lesmateriaal voor TOS-leerlingen",
        "research_project", "Pilot", "NOLAI",
        "Lopend co-creatieproject dat een prototype van educatieve AI ontwikkelt om lesmateriaal af te stemmen op het taalniveau van leerlingen met een taalontwikkelingsstoornis.",
        "Toegankelijker lesmateriaal ontwikkelen zonder de vakinhoudelijke kwaliteit of de regie van de leraar te verliezen.",
        ["Docenten", "Onderwijsadviseurs", "Onderzoekers", "Schoolleiders"], ["PO", "VO"],
        ["Lesgeven en leren met AI", "Onderzoek", "Curriculumontwikkeling"],
        "https://www.ru.nl/onderzoek/onderzoeksprojecten/adaptief-lesmateriaal-voor-tos-leerlingen",
        ["TOS", "adaptief lesmateriaal", "LLM", "inclusief onderwijs", "co-creatie"],
        organization_ids=["org-nolai"], related_ids=["nolai"], status="pilot", availability="Lopend project 2024–2027", start="2024-01-01", end="2027-12-31"
    ),
]


def normalize(value):
    return " ".join(str(value).casefold().split()).rstrip("/")


def main():
    records = json.loads(RECORDS_PATH.read_text(encoding="utf-8"))
    ids = {record["id"] for record in records}
    titles = {normalize(record["title"]) for record in records}
    urls = {
        normalize(source["url"])
        for record in records
        for source in record.get("sourceUrls", [])
    }

    for record in NEW_RECORDS:
        source_url = normalize(record["sourceUrls"][0]["url"])
        collisions = []
        if record["id"] in ids:
            collisions.append("id")
        if normalize(record["title"]) in titles:
            collisions.append("title")
        if source_url in urls:
            collisions.append("source URL")
        if collisions:
            raise SystemExit(f"Import gestopt: {record['title']} botst op {', '.join(collisions)}")
        ids.add(record["id"])
        titles.add(normalize(record["title"]))
        urls.add(source_url)

    # Bestaand record behouden, maar de generieke homepage vervangen door de specifieke bronpagina.
    handreiking = next(record for record in records if record["id"] == "handreiking-ai-in-het-onderwijs-po-vo")
    handreiking["sourceUrls"] = [{
        "label": "Officiële bron",
        "url": "https://www.kennisnet.nl/artificial-intelligence/handreiking-ai-in-het-onderwijs/",
        "sourceType": "official"
    }]
    handreiking["lastVerified"] = VERIFIED
    handreiking["verificationStatus"] = "recently_checked"
    handreiking["changeHistory"].append({
        "date": VERIFIED,
        "type": "source_updated",
        "summary": "Generieke Kennisnet-homepage vervangen door de specifieke officiële handreikingspagina."
    })

    records.extend(NEW_RECORDS)
    RECORDS_PATH.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    metadata["version"] = "Werkversie 0.2"
    metadata["updated"] = "12 juli 2026"
    metadata["sourceNote"] = (
        "Canonieke atlasdata, uitgebreid met 30 gecontroleerde officiële Nederlandse AI-onderwijsbronnen "
        "van Npuls, Kennisnet, SURF, SIVON en NOLAI."
    )
    metadata["recordCount"] = len(records)
    METADATA_PATH.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Toegevoegd: {len(NEW_RECORDS)}; totaal: {len(records)}")


if __name__ == "__main__":
    main()
