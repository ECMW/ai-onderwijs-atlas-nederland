# Resultaatrapport — officiële Nederlandse AI-onderwijsbronnen, batch 1

Datum: 12 juli 2026  
Branch: `content-expansion-official-resources-batch-1`

## Resultaat in het kort

- Bestaande records vóór deze tranche: 84
- Nieuwe records: 30
- Totaal na deze tranche: 114
- Concrete kandidaten beoordeeld: 48
- Kandidaten toegevoegd: 30
- Kandidaten afgewezen of samengevoegd: 18
- Bestaande records verloren: 0
- Mogelijke duplicaten na eindcontrole: 0
- Nieuwe records zonder specifieke officiële bron: 0
- Nieuwe records met `needs_review`: 0
- Bestaande bron gecorrigeerd: 1 (`handreiking-ai-in-het-onderwijs-po-vo` verwijst nu naar de specifieke Kennisnet-handreiking)

## Bezochte officiële bronnen

- Npuls: `npuls.nl`, waaronder kennisbank en gedocumenteerde eduGenAI-pilot.
- Kennisnet: `kennisnet.nl`, waaronder AI-handreiking, tools en praktijkvoorbeelden.
- SURF: `surf.nl`, `sec.surf.nl`, `pec.surf.nl` en `communities.surf.nl`.
- SIVON: `sivon.nl`, waaronder het interactieve AI Toetsingskader Funderend Onderwijs.
- NOLAI: de actuele officiële NOLAI-pagina's op `ru.nl`; `nolai.nl` verwijst naar deze omgeving.

Alle 30 gepubliceerde records hebben een specifieke landingspagina. Er is geen algemene homepage als definitieve bron gebruikt.

## Afwijzingen en duplicatecontrole

Van de 18 niet-geïmporteerde concrete kandidaten:

- 14 bleken al als zelfstandig record in de canonieke data aanwezig;
- 1 Engelstalige eduGenAI-pagina beschreef dezelfde pilot en is samengevoegd met de geselecteerde Nederlandse bron;
- 2 Learning Analytics Magazines hadden AI niet centraal genoeg staan voor deze tranche;
- 1 NOLAI-whitepaperoverzicht is niet als extra record opgenomen, omdat de vier afzonderlijke whitepapers een specifiekere bron bieden.

Gesloten calls, agenda-items, vacatures, vraagarticulaties en algemene nieuwsberichten zonder zelfstandig hulpmiddel zijn al vóór de concrete kandidatenlijst uitgesloten. Zie `reports/content-expansion-candidates.md` voor de individuele beslissingen.

De geautomatiseerde audit vergelijkt nieuwe titels met alle bestaande titels met een gelijkenisdrempel van 0,88. Uitkomst: 0 mogelijke titelduplicaten. Identieke id's, titels en bron-URL's worden door het importscripts vóór schrijven geblokkeerd.

## Verdeling per type

| Type | Aantal |
|---|---:|
| Handreiking | 17 |
| Praktijkvoorbeeld | 6 |
| Pilot | 4 |
| Product / hulpmiddel | 2 |
| Training | 1 |

## Verdeling per thema

Een record kan meerdere thema's hebben.

| Thema | Aantal |
|---|---:|
| Beleid en governance | 15 |
| Veilige AI-omgeving | 10 |
| Lesgeven en leren met AI | 8 |
| Publieke waarden en ethiek | 8 |
| AI-geletterdheid | 6 |
| Praktijkvoorbeelden | 6 |
| AI Act en wetgeving | 5 |
| Curriculumontwikkeling | 5 |
| Implementatie en adoptie | 5 |
| Privacy en AVG | 5 |
| Professionalisering | 5 |
| Data en infrastructuur | 4 |
| Onderzoek | 3 |
| Toetsing en examinering | 3 |

## Verdeling per sector

Een record kan meerdere sectoren hebben.

| Sector | Aantal |
|---|---:|
| VO | 18 |
| PO | 13 |
| MBO | 11 |
| HBO | 10 |
| WO | 10 |
| Onderzoek | 3 |

## Verificatie en onzekerheden

- Alle nieuwe records hebben `lastVerified: 2026-07-12` en `verificationStatus: recently_checked`.
- `eduGenAI`, de AI-hub-praktijk van Hogeschool Rotterdam en de drie NOLAI-projecten zijn bewust als `pilot` opgenomen, niet als algemeen beschikbare dienst of gereed product.
- Het SIVON-toetsingskader is beschikbaar als versie 1.0; de detailmetadata vermeldt expliciet dat het kader voorlopig en dynamisch is.
- Onbekende prijs- en kosteninformatie is niet ingevuld en blijft `unknown`.
- Een geautomatiseerde GET-controle bereikte 20 van de 30 specifieke bronnen rechtstreeks. Tien Npuls- en SURF-pagina's gaven in de lokale Python-controle een TLS/anti-bot-gerelateerde `URLError`; deze tien pagina's zijn daarom afzonderlijk in de browser geopend en inhoudelijk geverifieerd. Dit is geen inhoudelijke reviewachterstand.

Records die nog menselijke inhoudsreview nodig hebben: 0. De pull request blijft wel de afgesproken menselijke publicatiegrens; er wordt niet rechtstreeks naar `main` gemerged.

## Validaties

- `scripts/validate_data.py`: `OK: 114 records`
- `python -m unittest tests.test_data -v`: 7 van 7 tests geslaagd
- `scripts/audit_content_batch_1.py`:
  - 30 batchrecords gevonden;
  - 0 datakwaliteitsfouten;
  - 0 mogelijke titelduplicaten;
  - 30 records met één officiële specifieke bron.
- Gegenereerd vanuit canonieke data:
  - `data/data-v2.js`
  - `data/search-index.json`
  - `data/metadata.json` met `recordCount: 114`

## Route- en detailpaginacontrole

Geteste routes zonder 404 of ontbrekende hoofdinhoud:

- `#home`
- `#zoeken`
- `#item/ai-impact-game`
- `#over`
- `#beheer`
- `#wijzigingen`

Handmatig in de lokale browser gecontroleerde nieuwe detailpagina's:

1. `in-gesprek-over-digitale-geletterdheid`
2. `ai-impact-game`
3. `voldoen-aan-de-ai-verordening`
4. `ai-in-de-lespraktijk-teylingen-college`
5. `handreiking-ai-en-informatiebeveiliging`
6. `uva-pilots-generatieve-ai-beveiligde-omgeving`
7. `ai-toetsingskader-funderend-onderwijs`
8. `whitepaper-educatieve-en-algemene-ai`
9. `open-vragen-nakijken-met-hulp-van-ai`
10. `adaptief-lesmateriaal-tos-leerlingen`

Voor alle tien is gecontroleerd:

- juiste titel;
- inhoudelijke beschrijving aanwezig;
- feitenblok aanwezig;
- geen 404- of niet-gevondenmelding;
- precies één zichtbare externe bronlink;
- bronlink komt overeen met de canonieke recorddata.

Aanvullend is vindbaarheid gecontroleerd via:

- thema `AI Act en wetgeving`;
- sector `MBO`;
- doelgroep `Privacyprofessionals`;
- type `Praktijkvoorbeeld`.

In alle vier controles was minimaal één nieuw, vooraf aangewezen batchrecord zichtbaar.

