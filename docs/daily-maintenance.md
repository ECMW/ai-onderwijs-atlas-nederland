# Dagelijks onderhoud van de Atlas

## Doel en grens

De onderhoudsstraat detecteert veranderingen en bereidt beslissingen voor. Zij publiceert, wijzigt,
archiveert of verwijdert nooit zelfstandig Atlas-records. Een mens controleert ieder voorstel aan de
hand van de officiele bron en neemt het publicatiebesluit.

## Architectuur

De bestaande canonieke bestanden blijven leidend:

- `data/records.json`: gepubliceerde Atlas-records;
- `data/relations.json`: relaties;
- `data/sources.json`: geregistreerde controlebronnen;
- `data/proposal-decisions.json`: blijvende registratie van afgewezen voorstellen en bewijs-hashes.

De cyclus bestaat uit vier modules:

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

De workflow `.github/workflows/check-sources.yml` draait om `05:00 UTC`: in Nederland om 07:00 tijdens
zomertijd en om 06:00 tijdens wintertijd. De cyclus:

1. herstelt de laatste bekende staat;
2. selecteert bronnen volgens hun eigen frequentie;
3. gebruikt time-outs, maximaal drie pogingen en begrensde back-off;
4. stuurt waar beschikbaar `ETag` en `Last-Modified` mee;
5. normaliseert zichtbare inhoud en relevante links;
6. vergelijkt met de vorige succesvolle snapshot;
7. classificeert als `NEW`, `CHANGED`, `REMOVED`, `UNREACHABLE`, `SOURCE_CHANGED` of `NO_CHANGE`;
8. zoekt exacte URL-doublures en sterk gelijkende titels;
9. maakt en valideert alleen reviewvoorstellen;
10. levert een JSON- en Markdownrapport op;
11. maakt of actualiseert hoogstens een open review-Issue wanneer menselijk handelen nodig is.

Bij een eerste succesvolle controle wordt alleen een baseline opgeslagen (`NEW`). Dat voorkomt een
stroom voorstellen bij ingebruikname. Wanneer niets relevants is gevonden, eindigt de run succesvol met
`Geen actie nodig` in het run-overzicht en zonder nieuw Issue.

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
bronnen niet. De minimale pauze tussen live verzoeken beperkt belasting. Secrets zijn niet nodig en de
workflow heeft alleen `contents: read` en `issues: write`.

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
categorieen bedacht. Gelijke voorstellen houden dezelfde ID en verhogen alleen `occurrences`. Een
afwijzing in `data/proposal-decisions.json` onderdrukt hetzelfde voorstel zolang de bewijs-hash gelijk is.

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

## Beoordelingsprocedure

1. Open het enige Issue met label `atlas-daily-review`.
2. Download het artifact van de gelinkte workflowrun.
3. Begin met hoge materialiteit: deadlines, calls, beeindiging, wetgeving en gebroken officiele links.
4. Open de primaire bron zelf en controleer titel, status, doelgroep, sector en datum.
5. Controleer mogelijke doublures en relaties.
6. Kies accepteren, afwijzen, aanpassen of aanvullend onderzoek.
7. Verwerk een geaccepteerd voorstel via de normale pull-requestroute.
8. Registreer afwijzingen met proposal- en evidence-hash.

Automatische bijdragecontroles geven alleen labels en commentaar. Zij mergen, committen, sluiten of
publiceren niets. De oude automatische publicatieworkflow is expliciet uitgeschakeld.

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
geteste extractiemethode per bron toe. Geen enkele beperking rechtvaardigt automatische publicatie.
