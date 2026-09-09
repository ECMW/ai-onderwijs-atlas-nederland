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
10. levert een JSON- en Markdownrapport op;
11. maakt of actualiseert hoogstens een open review-Issue wanneer menselijk handelen nodig is.

Bij een eerste succesvolle controle wordt alleen een baseline opgeslagen (`NEW`). Dat voorkomt een
stroom voorstellen bij ingebruikname. Wanneer er geen nieuwe of open voorstellen zijn, eindigt de
signaalcyclus succesvol met `Geen actie nodig` in het run-overzicht en zonder nieuw review-Issue.
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
De bestaande review-Issue en runsummary tonen zowel onderhoudssignalen als kandidaten waarvoor
verdere broncontrole nodig is. Ongewijzigde signalen geven geen herhaalde wijzigingsmelding.

De cloudroute werkt zelfstandig zonder lokale Codex-automation, extra API-sleutels of een taalmodel.
De eerder aanwezige lokale actualisator is gepauzeerd om dubbele geplande uitvoeringen te voorkomen.

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
bij een run zonder nieuwe verandering en wanneer een later signaal het review-Issue bijwerkt. Een
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

1. Open het enige Issue met label `atlas-daily-review`.
2. Download het artifact van de gelinkte workflowrun.
3. Begin met hoge materialiteit: deadlines, calls, beeindiging, wetgeving en gebroken officiele links.
4. Open de primaire bron zelf en controleer titel, status, doelgroep, sector en datum.
5. Controleer mogelijke doublures en relaties.
6. Kies accepteren, afwijzen, aanpassen of aanvullend onderzoek.
7. Verwerk een geaccepteerd voorstel via de normale pull-requestroute.
8. Registreer afgehandelde voorstellen met `accepted` of `rejected`, proposal- en evidence-hash.

Website-inzendingen hebben een aparte actieve route: `process-atlas-submission.yml` laat uitsluitend
volledig brononderbouwde aanvullingen toe. `publish-auto-verified-contribution.yml` controleert de
onveranderlijke kandidaatcommit, beide geslaagde validaties, de actuele inzending en de bron opnieuw.
Pas daarna kan de eigen bot-PR worden gemerged en de gecontroleerde Pages-publicatie worden gestart.
De cloudverkenning gebruikt dezezelfde toelating voor complete, bronbewezen nieuwe aanvullingen;
een samenvattend review-Issue wordt niet als inzending behandeld. Onzekere inzendingen, correcties,
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
