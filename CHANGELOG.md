# Changelog

## 2026-07-12 — Makkelijker ontdekken op basis van v2-data

- De catalogus gebruikt rechtstreeks `window.ATLAS_RECORDS` als canonieke databron.
- De homepage bestaat uit precies vijf taakgerichte blokken; “Nieuw toegevoegd” is bewust weggelaten omdat een betrouwbaar `addedDate` ontbreekt.
- Live zoeken groepeert matches per soort aanbod met aantallen en toont bijpassende organisaties.
- Resultaatkaarten tonen alleen type, titel, aanbieder, één omschrijvingsregel, sectoren en de detailactie.
- Relevantieverklaringen zijn uitsluitend gebaseerd op werkelijke matches met thema, sector, status of zoekterm.
- Thema, Sector en Beschikbaarheid zijn de drie primaire filters; alle overige filters staan achter “Meer filters (n)”.
- Eén los thema opent een gegroepeerde ontdekweergave per soort aanbod.
- Verwante thema’s worden berekend uit inhoudelijke co-occurrence in records; er wordt geen gebruikersgedrag gesuggereerd of gevolgd.
- Alle publieke en beheerroutes zijn gecontroleerd zonder consolefouten.

## 2026-07-12 — Van zoeken naar ontdekken

- Zonder zoekvraag worden niet langer alle 84 records getoond.
- Bezoekers starten via een zoekterm, populair onderwerp of herkenbare rol.
- Alleen Thema en Sector zijn primaire filters; de rest staat onder “Meer filters”.
- Eenvoudigere kaarten leggen uit waarom een resultaat bij de selectie past.
- De homepage focust op zoeken, veel gezocht, direct bruikbaar, nieuw en bijdragen.

## 2026-07-12 — Taakgestuurde catalogus 2.0

- Eén consistente zoekervaring vervangt overlappende zoeklagen.
- Nieuwe facetvolgorde: thema, sector, soort aanbod, doelgroep, beschikbaarheid, organisatie en actualiteit.
- Dynamische aantallen, uitgeschakelde lege opties, actieve filterchips en deelbare URL-selecties.
- Zoek­suggesties, Nederlandse synoniemen en gewogen relevantiesortering.
- Taakgestuurde homepage met veelgezochte onderwerpen en direct bruikbaar aanbod.
- Volledig mobiel filterpaneel, toegankelijkere focus en scanbare horizontale resultaatkaarten.
- Centrale weergave van datasetdatum en verwijdering van inconsistente aanvullende UX-laag.

## Calls, training, hulpmiddelen en praktijk — 12 juli 2026

- Twee actuele Regieorgaan SIA-calls toegevoegd, beide open tot 15 september 2026.
- AI-GO in Actie, Visietool Toetsen en een geplande train-de-trainer toegevoegd.
- Drie concrete Kennisnet-handreikingen toegevoegd.
- Praktijkvoorbeelden van ROER College Schöndeln en Thomas More Hogeschool toegevoegd.
- Totaal verhoogd van 74 naar 84 records.
- Een landelijke publieke AI-voorziening is niet als beschikbaar product toegevoegd: officiële bronnen beschrijven deze nog als behoefte of verkenning.

## Officiële contentuitbreiding — 12 juli 2026

- Negen afzonderlijke records toegevoegd uit officiële pagina's van Kennisnet, Npuls en SURF Communities.
- Nieuwe inhoud: schoolafspraken, privacy, kansen en risico's, studiedata, toetsing, AI-waaier, kansengelijkheid, toetsontwerp en het praktijkvoorbeeld Unicoz.
- Totaal verhoogd van 65 naar 74 records.
- Alle nieuwe records bevatten aanbieder, officiële bron-URL en controledatum.

## Catalogusherontwerp — juli 2026

### Gewijzigde bestanden

- `index.html`: catalogusnavigatie en nieuwe assets.
- `catalog.css`: tweekoloms catalogus, horizontale kaarten en mobiel filterpaneel.
- `catalog.js`: zoek-, filter-, sorteer-, URL- en pagineringslogica.
- `README.md`: catalogusgedrag en witte-vlekkenbeleid.

### Nieuwe interacties

- Brede zoekbalk met categoriekeuze.
- Checkboxfilters met aantallen voor categorie, thema, sector, doelgroep en status.
- OR binnen filtergroepen en AND tussen groepen.
- Direct filteren, actieve chips, wissen, sorteren en maximaal 25 resultaten per pagina.
- Deelbare filter-URL's en browsergeschiedenis.
- Horizontale vergelijkingskaarten met veilige bronlinks.
- Witte vlekken als afzonderlijke geïdentificeerde behoefte.
- Mobiel filterpaneel dat met Escape sluit en focus teruggeeft.

### Uitgevoerde tests

- JavaScript-syntaxcontrole.
- Zoeken op `toetsing`: acht resultaten.
- Filterstatus in URL-hash.
- Geen browserconsolefouten in de geteste zoekroute.
- Bestaande dataset van 65 records ongewijzigd.

### Inhoudelijke onzekerheden

- De bronactualiteit blijft juli 2026.
- Rollen en organisatietypen zijn afgeleid voor filtering, niet toegevoegd aan bronrecords.
- Records met `Te verifiëren` of `Nog niet ingevuld` vereisen bronvalidatie.
