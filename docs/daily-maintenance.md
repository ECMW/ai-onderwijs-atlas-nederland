# Dagelijks onderhoud van de Atlas

## Doel en grens

Het onderhoud draait op GitHub, ook wanneer de laptop uitstaat. De bestaande workflow detecteert
veranderingen en bewaart reviewvoorstellen. De aanvullende cloudverkenning leest begrensd concrete
pagina's van bekende officiële aanbieders. Alleen volledig brononderbouwde nieuwe aanvullingen mogen
door naar de bestaande strikte inzendings- en publicatieroute. Daar zijn een eigen bot-PR, geslaagde
controles van dezelfde kandidaatcommit en bronhercontrole verplicht.

Een ontdekt linkje of een reviewvoorstel is geen publicatiebewijs. Twijfelgevallen, correcties,
archiveringssignalen en mogelijke doublures blijven ter beoordeling. De cloudroute gebruikt geen LLM
of nieuwe externe secrets en veronderstelt geen lopende Codex-sessie. Aanvullend inhoudelijk onderzoek
met Codex kan helpen, maar is geen afhankelijkheid voor de cloudcontroles.

## Architectuur

De bestaande canonieke bestanden blijven leidend:

- `data/records.json`: gepubliceerde Atlas-records;
- `data/relations.json`: relaties;
- `data/sources.json`: geregistreerde controlebronnen;
- `data/proposal-decisions.json`: blijvende registratie van afgehandelde voorstellen en bewijs-hashes.

De signaalcyclus bestaat uit vijf modules:

1. `maintenance_normalize.py` behandelt HTML uitsluitend als onbetrouwbare data, verwijdert ruis en
   maakt stabiele inhouds- en structuur-hashes;
2. `maintenance_core.py` haalt bronnen begrensd op en classificeert gebeurtenissen;
3. `maintenance_proposals.py` vergelijkt links en titels met de Atlas en maakt idempotente voorstellen;
4. `maintenance_validation.py` verrijkt en valideert ieder voorstel tegen bestaande enums;
5. `run_daily_maintenance.py` orkestreert staat, rapporten en machineleesbare voorstelbestanden.

Operationele staat staat in `maintenance-state/` en uitvoer in `maintenance-output/`. Beide mappen zijn
bewust niet canoniek en staan in `.gitignore`. GitHub Actions bewaart de laatste staat via een cache en
de rapportage als artifact. De laatst bekende succesvolle snapshot wordt bij fouten nooit overschreven.

## Dagelijkse cyclus

De bestaande workflow `.github/workflows/check-sources.yml` draait driemaal per dag om
`06:17`, `11:17` en `16:17 UTC`: in Nederland om 08:17, 13:17 en 18:17 tijdens zomertijd,
en 07:17, 12:17 en 17:17 tijdens wintertijd. GitHub kan geplande runs later starten;
dit zijn geplande tijdstippen, geen garantie. De signaalcyclus:

1. herstelt de laatste bekende staat;
2. selecteert bronnen volgens hun eigen frequentie;
3. gebruikt time-outs, maximaal drie pogingen en begrensde back-off;
4. stuurt waar beschikbaar `ETag` en `Last-Modified` mee;
5. normaliseert zichtbare inhoud en relevante links;
6. vergelijkt met de vorige succesvolle snapshot;
7. classificeert als `NEW`, `CHANGED`, `REMOVED`, `UNREACHABLE`, `SOURCE_CHANGED` of `NO_CHANGE`;
8. zoekt exacte URL-doublures en sterk gelijkende titels;
9. maakt en valideert reviewvoorstellen en behoudt eerdere open voorstellen;
10. bewaart de werkvoorraad voor brononderzoek in het JSON- en Markdownrapport bij de run.

Bij een eerste succesvolle controle wordt alleen een baseline opgeslagen (`NEW`). Dat voorkomt een
stroom voorstellen bij ingebruikname. Ook wanneer er werk voor het onderhoud ligt, verschijnt
de werkvoorraad alleen bij de workflowrun. Het aantal signalen zegt niets over het aantal
keuzes dat aan de eigenaar moet worden voorgelegd.
De linkextractie ziet veranderingen op geregistreerde pagina's; zij doorzoekt niet zelfstandig het hele
internet. De aanvullende cloudverkenning controleert een begrensde selectie officiële detailpagina's
en moet iedere voorgestelde toevoeging door de strikte inhoudelijke toelating laten beoordelen.

## Bronregister

Iedere bron heeft minimaal:

- `id`: stabiele bron-ID;
- `name`, `owner` en `baseUrl`;
- `sourceType`: `official`, `authoritative` of `secondary`;
- `sourceRole`: `primary`, `discovery` of `verification`;
- `trustLevel`;
- `themes` en `sectors` (leeg zolang niet brononderbouwd);
- `schedule.frequency`: `daily`, `weekly` of `monthly`;
- `extraction`: type en scope;
- `allowedRecordTypes`: bestaande Atlas-enums;
- `operational`: laatste succes, hashreferentie, status en foutenteller.

De operationele waarden in het register zijn documenterende startwaarden. De actuele waarden leven in
`maintenance-state/state.json`, zodat een controle nooit ongecontroleerd canonieke data commit.
`daily` betekent controle bij iedere geplande run, dus driemaal per dag. `weekly` en `monthly` worden
pas na respectievelijk zeven en 28 dagen opnieuw gecontroleerd. Kennisnet, SURF, Npuls, MBO Digitaal,
SLO, UNESCO AI en onderwijs, edusources en de bestaande TNO-bronnen staan op `daily`. Hun bronrollen
zijn ongewijzigd: een ontdekkingsbron geldt niet automatisch als bewijs voor andermans aanbod.

### Subsidies en calls

De dagelijkse signaalcyclus volgt de rondeoverzichten van NWO, NKO en Regieorgaan SIA, het AIDO-programma
van Npuls, de Europese Digital Europe-oproepen bij RVO, de Nederlandse Erasmus+-deadlines,
de MSCA Staff Exchanges-kalender en het aanvraagloket van de onderzoeksprijs Sopra Steria – Institut de France. Nieuwe
relevante links en herkenbare datumwijzigingen komen in het bestaande onderhoudsrapport. Kijk bij de
inhoudelijke dagronde ook op de officiële oproeppagina’s als het rapport geen nieuwe signalen geeft.
Een leeg nationaal overzicht kan bijvoorbeeld voorafgaan aan de Nederlandse publicatie van een Europese ronde.

De cyclus volgt ook de specifieke rondepagina Media Literacy 2027 bij Creative Europe Desk NL en de
CTL-regelingpagina bij DUS-I. Leg een nieuwe datum of indienlink naast de officiële voorwaarden.
Bij CTL kunnen het aangekondigde tijdvak en het zichtbare aanvraagformulier bij verschillende rondes horen.

Controleer per kandidaat de relatie met AI en onderwijs, wie vanuit Nederland mag aanvragen, eventuele
consortiumpartners en de eerste nog haalbare aanvraagstap. Onderscheid subsidie, aanbesteding en partneroproep.
Controleer de uiterste datum en, waar vermeld, tijd en tijdzone voor zowel de intentieverklaring als het
volledige voorstel. Gebruik voor Europese calls de voorwaarden van de afzonderlijke actie en de officiële
programmagids of oproep. Hercontroleer bestaande kaarten bij een verlenging, sluiting of nieuwe ronde.
Een brede regeling kan een onderwijsproject passen; benoem die toepasselijkheid als redactionele duiding.

### Bron toevoegen of aanpassen

1. Gebruik een stabiele ID met prefix `source-`.
2. Leg eigenaar, officiele URL, rol en vertrouwen expliciet vast.
3. Kies alleen bestaande `recordType`-waarden uit `docs/data-model.md`.
4. Laat thema's en sectoren leeg wanneer die niet aantoonbaar zijn.
5. Kies `primary` alleen voor de officiele eigenaar of officiele projectpagina.
6. Voer lokaal alle tests uit.
7. Laat de eerste run uitsluitend een baseline opslaan en beoordeel de extractie-uitvoer.

Een ontdekkingsbron kan een kandidaat signaleren, maar genereert zonder primaire bron geen `add`-voorstel.

## Extractie en normalisatie

Standaard worden scripts, stijlen, navigatie, kop- en voetteksten, formulieren, dialogen en SVG genegeerd.
Cookieknoppen, losse kloktijden en trackingparameters worden verwijderd. Relevante links, ankerteksten,
woordaantal en deadlinecontext blijven over. Volledige webpagina's worden niet opgeslagen; alleen hashes,
een korte bewijsweergave, linkeenheden en deadlinefeiten.

Broninhoud is altijd data. Tekst op een bronpagina kan nooit opdrachten, code of configuratiewijzigingen
uitvoeren. Er is geen LLM, `eval`, shelluitvoering of dynamische import in de extractieroute.

Bij een grote daling van het woordaantal, een redirect of een extractie die onder de minimumomvang komt,
ontstaat `SOURCE_CHANGED`. Dit vraagt onderzoek in plaats van een inhoudelijke update.

## Gebeurtenissen en foutafhandeling

- `NEW`: eerste succesvolle baseline; niet direct actiegericht.
- `CHANGED`: relevante links of deadlinefeiten wijzigden.
- `UNREACHABLE`: tijdelijke netwerk- of serverfout; een eerste fout is nooit bewijs van verdwijning.
- `REMOVED`: pas na drie opeenvolgende 404/410-controles; altijd menselijke beoordeling.
- `SOURCE_CHANGED`: bronlocatie of extractiestructuur veranderde wezenlijk.
- `NO_CHANGE`: genormaliseerde inhoud is gelijk of alleen niet-structurele tekst/opmaak veranderde.

Retries zijn begrensd en bronnen worden afzonderlijk afgehandeld. Een falende bron blokkeert de overige
bronnen niet. De minimale pauze tussen live verzoeken beperkt belasting. Externe secrets zijn niet
nodig. Het signaaldeel heeft `contents: read` en `issues: write`; het doorzetten van volledig toegelaten
cloudvondsten vraagt daarnaast `actions: write` voor een expliciete start van de bestaande inzendingsworkflow.
Bronextractie krijgt geen recht om canonieke data te committen of een PR te mergen.

### Concrete nieuwe inhoud op GitHub

`scripts/discover_official_content.py` leest links uit onderhoudssnapshots (ook de eerste baseline)
en bezoekt per run maximaal twaalf bronpagina's, inclusief de aanvullende toelatingscontrole.
De AI-themabronnen van Kennisnet en SURF zijn afzonderlijk geregistreerd voor gerichtere ontdekking.
Een volledige, korte bronzin moet het aanbod, de aanbieder, het type, de doelgroep, sector en het
thema expliciet verbinden. Alleen Nederlands HTML-aanbod met herkenbare hoofdtekst kan in deze
route automatisch worden toegelaten. Downloadbestanden, dynamische pagina's, onduidelijke gegevens
en wijzigingen aan bestaand aanbod vragen verdere beoordeling. De grenzen beperken automatische
toelating; ze zijn geen oordeel over de waarde van een bron.

Maximaal drie volledig toegelaten vondsten gaan per run naar `scripts/publish_discovery.py`.
Die maakt een herkenbare botinzending, controleert bestaande inzendingen om doublures te voorkomen
en start expliciet de gewone beschermde toelatingsroute. De tweede broncontrole, beide verplichte
validaties en de laatste bronhercontrole blijven verplicht. Kosten en commerciële aard worden niet
uit de organisatievorm afgeleid. Onbekende velden blijven onbekend.

`discovery-state/state.json` bewaart wachtrij, bewijs-hashes, uitgestelde kandidaten en terugkoppeling
van de inzendingsroute. Een gesloten of bewerkte botinzending blijft herkenbaar afgehandeld of ter
beoordeling en kan daardoor niet iedere nieuwe ronde vullen. Een mislukte brokerstap kan veilig
opnieuw worden gestart: bestaande GitHub-issues blijven ook na verlies van een cache herkenbaar.
Het artifact bij de run bevat de voorstellen met hun bewijs en de resultaten van de verkenning.
In `discovery-output/research-queue.json` staan de bronlinks die ook na deze run verder
onderzoek vragen, met hun laatst bekende status.

De cloudroute werkt zelfstandig zonder lokale Codex-automation, extra API-sleutels of een taalmodel.
De aanvullende inhoudelijke beoordeling gebruikt de bestaande lokale actualisator en kan
plaatsvinden zodra die beschikbaar is.

## Voorstelformaat

Ieder voorstel bestaat als JSON in `maintenance-output/proposals/` en bevat onder meer:

- stabiele `proposalId` op basis van bron, actie, doel en bewijs-hash;
- actie `add`, `update`, `archive` of `investigate`;
- detectie- en controletijd;
- doelrecord indien bekend;
- oude en voorgestelde waarden;
- primaire bronnen en korte bewijsweergave;
- confidence, materiality en duplicateRisk;
- uitgevoerde controles, onzekerheden en mogelijke relaties;
- aanbevolen beslissing `human_review`;
- `publicationAllowed: false`.

Ontbrekende feiten blijven `Nog niet ingevuld`, leeg of expliciet onzeker. Er worden geen nieuwe
categorieen bedacht. Gelijke voorstellen houden dezelfde ID en verhogen alleen `occurrences` bij een
nieuwe waarneming. De ledger bewaart ook de volledige open voorstellen. Daardoor blijven ze zichtbaar
in volgende runrapporten, ook zonder nieuwe verandering. Een
beslissing `accepted` of `rejected` in `data/proposal-decisions.json` handelt uitsluitend het bijbehorende
voorstel met dezelfde bewijs-hash af. Acceptatie in dit bestand publiceert zelf niets.

Dit behoud geldt vanaf de eerste run met de volledige ledger. Oudere ledgerregels bevatten alleen
tellers en kunnen verloren voorstelinhoud niet reconstrueren. De cache is operationele opslag;
besluiten blijven daarom in Git vastgelegd en rapporten zijn 30 dagen als artifact beschikbaar.

Voorbeeld afwijzing:

```json
{
  "proposalId": "proposal-0123456789abcdef",
  "evidenceHash": "de-hash-uit-het-voorstel",
  "decision": "rejected",
  "decidedAt": "2026-07-17T10:00:00Z",
  "reason": "Niet relevant voor de Atlas"
}
```

## Beoordelingsprocedure voor signalen

1. Open de laatste geslaagde run van de workflow `Daily Atlas maintenance review` op `main`.
2. Download het artifact `atlas-maintenance-<run-id>`. De voorstellen staan in
   `maintenance-output/daily-report.json`, de resultaten van de verkenning in `discovery-output/`.
3. Begin met aantoonbare belemmeringen voor bezoekers, gemelde fouten en wijzigingen die bestaand
   aanbod onbruikbaar of misleidend maken. Controleer bijvoorbeeld of het lesmateriaal nog opent
   of een workshop nog toegankelijk is. Geef een naderende deadline voorrang als die op een concrete
   vermelding van toepassing is.
4. Open de primaire bron zelf en controleer titel, status, doelgroep, sector en datum.
5. Controleer mogelijke doublures en relaties.
6. Kies accepteren, afwijzen, aanpassen of aanvullend onderzoek.
7. Verwerk een geaccepteerd voorstel via de normale pull-requestroute.
8. Registreer afgehandelde voorstellen met `accepted` of `rejected`, de voorstel-ID en de bijbehorende bewijs-hash.

### Wanneer beslist de eigenaar?

De actualisator verwerkt controleerbare correcties binnen het bestaande mandaat. Een nieuwe
aanvulling heeft voorrang als die een concrete leemte vult bij lesvoorbereiding, toetsing,
teamafspraken over AI of professionalisering. Feedback van een bezoeker kan laten zien waar
iemand vastloopt. Controleer bij een herstel dezelfde handeling van begin tot eind.

Een feit dat nog onzeker is, blijft in onderzoek. Leg een keuze privé voor zodra de primaire
bronnen zijn gecontroleerd en verdere afhandeling een bevoegdheid van de eigenaar vraagt.
Dat kan bijvoorbeeld spelen als relevant lesmateriaal uitsluitend met toestemming van de
rechthebbende mag worden overgenomen en verwijzen naar de officiële bron het probleem niet oplost.
Vermeld de getroffen gebruikers, de concrete keuze, de opties met hun gevolgen, het advies en wat
er bij uitstel gebeurt. Houd bij welke keuze al is voorgelegd. Breng die pas opnieuw onder de
aandacht bij nieuwe informatie die het besluit wezenlijk verandert.

### Bijdragen per e-mail en inzendingen via GitHub

De website opent een voorbereid e-mailbericht op het bestaande contactadres. Beoordeel de bijdrage
via de gewone redactionele route. Gebruik bij voorgesteld lesmateriaal de criteria voor bruikbaar
les- en werkmateriaal. Neem alleen openbare broninformatie en bevindingen op in de repository.

Bij rechtstreekse GitHub-inzendingen laat `process-atlas-submission.yml` uitsluitend
volledig brononderbouwde aanvullingen toe. `publish-auto-verified-contribution.yml` controleert de
onveranderlijke kandidaatcommit, beide geslaagde validaties, de actuele inzending en de bron opnieuw.
Pas daarna kan de eigen bot-PR worden gemerged en de gecontroleerde Pages-publicatie worden gestart.
De cloudverkenning gebruikt dezezelfde toelating voor complete, bronbewezen nieuwe aanvullingen.
Onzekere inzendingen, correcties,
feedback en willekeurige externe PR's worden niet via deze toelating gepubliceerd.
Zie `docs/release-process.md`.

## Autonome Atlas-actualisator

De cloudverkenning kan alleen gegevens toelaten die deterministisch uit bekende officiële bronnen
zijn vastgesteld. Zij doet geen vrij webonderzoek of redactionele interpretatie. Voor uitgebreider
inhoudelijk onderzoek kan de door de eigenaar gemachtigde Codex-actualisator aanvullend worden gebruikt.
Die lokale uitvoering is niet nodig voor de geplande cloudruns. Voor iedere aanvullende inhoudelijke run:

1. controleert zij repository, open branches, bestaande dagelijkse PR's en de lokale worktree;
2. gebruikt zij alleen concrete informatie die rechtstreeks via officiële primaire bronnen is bevestigd;
3. controleert zij record-ID, genormaliseerde titel, canonieke URL, aanbieder en inhoudelijke overlap;
4. houdt zij `data/records.json`, publieke projectie, metadata en zoekindex synchroon;
5. draait zij datavalidatie, alle unittests, JavaScript-syntaxcontroles en relevante headless smoketests;
6. maakt of actualiseert zij alleen bij materiële wijzigingen een eigen branch en pull request;
7. zet zij die PR gereed zodat alle verplichte controles werkelijk draaien;
8. mergeert zij uitsluitend wanneer alle checks slagen en GitHub geen conflict of onzekerheid meldt;
9. verifieert zij daarna de Pages-deployment en live zoekbaarheid van nieuwe of bijgewerkte records.

Zij verlaagt nooit branchbescherming, omzeilt geen checks en mergeert geen externe pull requests. Bij twijfel
blijft de PR ongemerged en vermeldt het runrapport de exacte blokkade. Wanneer geen betrouwbare wijziging
beschikbaar is, maakt zij geen lege commit of PR.

### Praktijkgids bijhouden in dezelfde ronde

Pas vóór publicatie van een lesstart of werkblad de [toelatingsregel voor bruikbaar materiaal](editorial-policy.md#bruikbaar-les--en-werkmateriaal) toe. Leg vast hoe de vakinhoud, doelgroep en uitvoerbaarheid van het concrete materiaal zijn gecontroleerd. Beschrijf gedocumenteerde leservaring alleen als die beschikbaar is.

Open bij een gewijzigde lesstart ook het leerlingblad vanuit de lesgids. Controleer of de leerling elke genoemde voorbeeldzin, figuur of tabel kan vinden met de informatie op dat blad. Verwijs bij een langere bron naar de pagina of het onderdeel. Controleer bij een afdruk welke gegevens de docent apart moet meegeven.

Gebruik het [verbeterregister](../reports/verbeterregister.md) voor productverbeteringen. Begin bij de laatst gepubliceerde editie en de open PR's. Werk bij een afgeronde verbetering de oorspronkelijke taak, het aangetoonde resultaat, de resterende aanname en de volgende controle bij. Het register bevat publieke productbevindingen. Individuele meldingen en privéstatistieken blijven in hun bestaande omgeving.

Controleer bij een gewijzigde bron ook de bijbehorende lesvraag, toetsopdracht of onderzoekssamenvatting in de praktijkgids. De bron- en claimkoppelingen in `sources/` leggen vast op welke uitkomst, doelgroep of gebruiksvoorwaarde de tekst berust. Geef bij lesduur aan welke concrete bronles de aanbieder heeft getimed. Houd een ervaring van één instelling herkenbaar als praktijkverslag.

Gebruik bij herhaalde zoekacties zonder resultaat de bestaande geaggregeerde tellers en vrijwillig gemelde voorbeelden. De telling bevat geen zoekwoorden. Controleer een concrete verbetering met een zoekvraag, een passend lesmateriaal en de oorspronkelijke bron. De beslisregels hierboven blijven gelden voor wijzigingen in de reikwijdte en voor privacykeuzes.

### Dagelijkse productverbetering

Open elke dag de actuele uitgave op het publieke domein, het [verbeterregister](../reports/verbeterregister.md), de open PR's en issues en de vorige taakuitkomst. Gebruik de resultaten van de bestaande broncontroles. Ligt een wijziging nog ter beoordeling, controleer de kandidaat en de publieke versie apart.

Bekijk bij elke uitvoering welke doelgroepen en taken in recente rondes weinig aandacht kregen. Gebruik het register om af te wisselen tussen lesgeven en leren, toets- en onderwijsontwerp, leidinggeven en besturen, ICT en privacy, ondersteunend werk en onderzoek of financiering. Loop de gekozen taak door tot het punt waarop de bezoeker kan handelen, bijvoorbeeld een ouderbrief openen, een risicowerkblad downloaden of vaststellen wie een aanvraag mag indienen. Vergelijk waar relevant met oorspronkelijke onderwijsbronnen en kennisplatforms. Gebruik beschikbare, rechtmatig verzamelde signalen en houd privécijfers buiten de repository.

1. Kies een concrete vraag van een onderwijsprofessional, leerling of student. Probeer de hele taak, bijvoorbeeld van vak en leerdoel naar een opdracht die een leerling daadwerkelijk kan uitvoeren. Onderzoek daarbij ook de vormgeving en gebruikservaring. Is de juiste informatie herkenbaar, blijft ze leesbaar bij inzoomen en is de volgende handeling bereikbaar? Leg de beginsituatie en de bron vast. Bij een visuele wijziging vergelijk je dezelfde taak vóór en na de ingreep op dezelfde schermbreedte. Geef aan of het knelpunt in de browser is gereproduceerd, door een bezoeker is gemeld of nog een vermoeden is.
2. Maak een korte selectie uit de kansen in het register. Weeg elke dag gebruikerswaarde, bereik, wat de Atlas toevoegt aan bestaande platforms en de sterkte van het bewijs af tegen bouwkosten, terugkerend onderhoud en risico. Vergelijk toevoegen, vereenvoudigen en behouden. Kies de kleinste ingreep die de onderzochte taak aantoonbaar verder helpt. Als die taak al slaagt en verdere aanwijzingen ontbreken, volstaat behouden.
3. Werk in een eigen schone werkboom. Hergebruik een passende PR en kies vooraf de beoordelingsroute. Een correctie van bestaande canonieke records doorloopt de afzonderlijke gegevenscontrole van de gemachtigde actualisator. Als zo'n correctie samenhangt met een interfaceverbetering, koppel de voorstellen en test ook de combinatie. Controleer bronnen, dataprojectie en de gebruikelijke tests. Herhaal de oorspronkelijke taak op telefoon en desktop, ook met het toetsenbord. Controleer de echte afdruk, bron of download als die bij de taak hoort.
4. Noteer in de taakuitkomst welke doelgroep en taak aandacht verdienen en welke keuze de onderhoudslast waard is. Leg bij een materiële verbetering de bevinding, wijziging, controles, resterende aanname en eerstvolgende proef vast in het register. Een productronde levert hoogstens één afgebakende product-PR op. Een ronde zonder wijziging eindigt met de korte taakuitkomst. Publicatie volgt het bestaande releaseproces.

### Uitgelicht om de twee weken

Bekijk tijdens de dagelijkse taak welke editie hierna aan de beurt is. De startpagina wisselt elke veertien dagen automatisch. Is er voor de volgende periode een concreet signaal van belangstelling, vergelijk dan de redactionele keuze met dat signaal. Een recente behoeftepeiling kan iets zeggen over een doelgroep. Geaggregeerde bronkliks kunnen iets zeggen over het gebruik van een gemeten route. Houd rekening met de zichtbaarheid van het vorige uitgelichte onderwerp en de looptijd van de meting. Bewaar de dashboardcijfers privé. [Reikwijdte van de bezoekersmeting](visitor-statistics.md)

Kies bij voldoende aanleiding een ander onderwerp dan in de voorafgaande editie. Open het materiaal en controleer of een bezoeker de beloofde taak vanaf de startpagina kan uitvoeren. Leg de periode, de bron of het soort signaal en de redactionele afweging vast in het verbeterregister. Koppel de startdatum van die editie in `SPOTLIGHT_SELECTIONS` in `catalog.js` aan de bestaande onderwerpcode. Ontbreekt een overtuigend nieuw signaal, dan volstaat de automatische afwisseling. Een wissel op zichzelf vraagt geen PR.

## Lokaal testen en handmatig starten

Voer vanuit de repository uit:

```text
python -m unittest discover tests -v
python scripts/run_daily_maintenance.py
```

De tests gebruiken alleen `tests/fixtures/maintenance/` en nooit live websites. De echte lokale run doet
wel netwerkverzoeken. In GitHub: Actions > Daily Atlas maintenance review > Run workflow.

## Tijdstip configureren

Pas zowel de cronregel in `.github/workflows/check-sources.yml` als de documenterende waarde in
`config/maintenance.json` aan. GitHub cron gebruikt altijd UTC. Houd beide waarden gelijk en leg de
Nederlandse zomer- en wintertijd vast.

## Rollback en diagnose

1. Schakel bij ongewenste signalen tijdelijk de schedule-trigger uit; publicatie is niet geraakt.
2. Download `maintenance-output` en bekijk eerst `events.json`, daarna `daily-report.json`.
3. Controleer per bron `lastHttpStatus`, `lastError`, `consecutiveFailures` en de vorige snapshot.
4. Wis alleen de cache wanneer een bewust nieuwe baseline nodig is. De eerstvolgende run wordt dan `NEW`.
5. Zet code en workflow via een normale revert-PR terug; raak `data/records.json` niet aan.

Bekende beperking: generieke HTML-extractie ziet relevante links en deadlines, maar begrijpt geen
JavaScript-only pagina's, PDF-inhoud of bron-specifieke API's. Voeg daarvoor later een expliciete,
geteste extractiemethode per bron toe. Geen enkele beperking rechtvaardigt automatische publicatie van
een onbevestigd signaal of reviewvoorstel.


## Automatische kwaliteitsbewaking

Naast de broncontrole draait de workflow `.github/workflows/quality-gate.yml` dagelijks om 05:15 UTC en bij iedere pull request of wijziging op `main`. Deze netwerkvrije kwaliteits-poort controleert dat:

- de publieke browserprojectie exact overeenkomt met de publiceerbare canonieke records;
- de publieke telling klopt;
- ieder publiek record een titel, omschrijving, geldige controledatum en officiële bron heeft;
- records zonder publicatiestatus, behoeften en witte vlekken nooit in de publieke export staan.

Een fout laat de workflow mislukken en blokkeert daarmee een veilige publicatieroute. Mogelijke gedeelde officiële bron-URL’s zijn waarschuwingen in een intern artifact, geen automatische inhoudelijke beslissing. De workflow wijzigt of publiceert zelf nooit gegevens.
