# AI & Onderwijs Atlas Nederland

De AI & Onderwijs Atlas Nederland is een gratis, open en brongebaseerde wegwijzer voor bestaand aanbod rond AI in het onderwijs. Bezoekers zoeken vanuit hun vraag en kunnen daarna combineren op thema, sector, soort aanbod, doelgroep, beschikbaarheid, organisatie en geografische reikwijdte.

- [Publieke Atlas](https://ecmw.github.io/ai-onderwijs-atlas-nederland/)
- [Bijdragen en broncode](https://github.com/ECMW/ai-onderwijs-atlas-nederland)

## Uitgangspunten

- uitsluitend bestaand aanbod met een vastgelegde bron wordt publiek getoond;
- interne redactiesignalen en bronloze concepten horen niet in de publieke catalogus;
- filters binnen een groep werken als OR, verschillende groepen als AND;
- meerdere rollen, zoals Docent en Onderzoeker, kunnen gecombineerd worden;
- zoek- en filterstaat staat in de URL en is deelbaar;
- persoonlijke rolvoorkeuren blijven lokaal in de browser;
- er zijn geen cookies, externe autocomplete of eigen backend nodig;
- GoatCounter telt bezoeken per dag zonder zoektermen of filters te ontvangen;
  de homepage toont het totale aantal gemeten bezoeken sinds 9 september 2026.
  Het uitgebreide dashboard is privé en de koppeling kan worden uitgeschakeld.

Een vermelding is geen goedkeuring, kwaliteitsbeoordeling of aanbeveling. De Atlas
presenteert vaste feitelijke velden. Kosten, toegang en commerciële aard zijn
afzonderlijke gegevens; onbekende informatie wordt niet ingevuld op basis van de
naam, rechtsvorm of prijs van een aanbieder.

## Nieuwe bijdragen

Via **Nieuwe bijdragen** ziet een bezoeker wat recent aan de Atlas is toegevoegd.
**Nieuw in de Atlas** gebruikt de eerste geldige toevoegdatum in de
wijzigingsgeschiedenis. **Recent gepubliceerd** gebruikt de vastgelegde
publicatiedatum bij de aanbieder. Een latere broncontrole maakt bestaand aanbod
niet opnieuw nieuw; ontbrekende datums blijven als onbekend herkenbaar.

## Techniek en data

De website is statische HTML, CSS en vanilla JavaScript. Er is geen applicatieserver nodig. De canonieke bron is `data/records.json`; de publieke browserprojectie staat in `data/data-v2.js` als `window.ATLAS_RECORDS`.

Het datamodel en de toegestane enums staan in [docs/data-model.md](docs/data-model.md). De publieke export bevat alleen records met een officiele bron en een bevestigde verificatiestatus.

## Dagelijks onderhoud

Bezoekersmeting staat los van brononderhoud. De inrichting, telwijze,
privacyinstellingen en activatiestappen staan in
[dagelijkse bezoekersmeting](docs/visitor-statistics.md). De telling werkt op de
publieke Atlas onafhankelijk van de laptop.

De Atlas heeft verschillende onderhoudsroutes:

- de bestaande GitHub-workflow controleert geregistreerde bronnen driemaal per dag om 06:17, 11:17 en 16:17 UTC en bewaart open reviewvoorstellen; deze cloudcontrole werkt ook met de laptop uit;
- de aanvullende cloudverkenning controleert begrensd concrete officiële detailpagina's. Alleen complete, bronbewezen nieuwe aanvullingen gaan door dezelfde strikte toelating als website-inzendingen; overige vondsten blijven ter beoordeling;
- de door de eigenaar gemachtigde Atlas-actualisator kan aanvullend inhoudelijk webonderzoek doen en uitsluitend eigen, volledig geverifieerde pull requests na alle verplichte controles mergen; een lokale Codex-sessie is geen vereiste voor de cloudroute;
- aanvullingen via het websiteformulier worden onmiddellijk getoetst aan de strikte bron- en publicatieregels. Alleen volledig toegelaten aanvullingen mogen via een eigen bot-PR automatisch worden verwerkt; twijfelgevallen blijven buiten de publieke Atlas.

De dagelijkse actualisator stopt zonder merge bij een dirty worktree, conflicten,
mislukte checks, onduidelijke bronnen, mogelijke doublures of andere materiële
onzekerheid. De website-inzendingen gebruiken een aparte route met onveranderlijke
kandidaatcommits, twee geslaagde controles van dezelfde commit en een laatste
bronhercontrole vóór samenvoegen. Gewijzigde inzendingen worden niet stilzwijgend
doorgezet; een gewijzigde hoofdbranch vereist een nieuwe kandidaat en controles.
Correcties, feedback, willekeurige externe PR's en signaalvoorstellen vallen niet
onder deze automatische toelating. Zie:

- [dagelijkse onderhoudsarchitectuur](docs/daily-maintenance.md);
- [voorbeeld van het dagrapport](docs/example-daily-report.md);
- [bronbeleid](docs/source-policy.md);
- [redactioneel beleid](docs/editorial-policy.md).

## Huisstijl

De Atlas gebruikt de herbruikbare huisstijl **Strand**: Aptos, olijfgroen, beige, grijs en blauwgrijs. De tokens staan in `brand.css` en kunnen ook voor `www.evawillems.nl` worden gebruikt. Zie [docs/brand-guide.md](docs/brand-guide.md).

## Lokaal openen en testen

Open `index.html` rechtstreeks of start een eenvoudige lokale webserver. Voer voor een inhoudelijke wijziging uit:

```text
python scripts/validate_data.py
python scripts/generate_data.py
python scripts/quality_gate.py --strict
python -m unittest discover tests -v
```

De onderhoudstests gebruiken lokale fixtures en zijn niet afhankelijk van live websites. De dagelijkse workflow kan in GitHub handmatig worden gestart via **Actions > Daily Atlas maintenance review > Run workflow**.

Voer `generate_data.py` ook uit na wijzigingen aan JavaScript of CSS: dit koppelt
de browsercacheversie van ieder geladen bestand aan de inhoud. Commit de
gegenereerde data en `index.html` samen. Publicatie valideert de vastgelegde
bestanden en maakt ze niet opnieuw aan.

De generator zet `metadata.updated` op de werkelijke generatiedatum in Nederlands
formaat. Dit is de datum bij **Bijgewerkt** in de footer. De `lastVerified`-datum
van ieder bronrecord blijft onaangetast. Een controle zonder nieuwe generatie,
een browserbezoek of het opnieuw uitrollen van dezelfde editie verschuift deze
datum niet. De dagelijkse actualisator moet de generator bij echte wijzigingen
uitvoeren en de resulterende metadata meenemen in de PR.

GitHub Pages gebruikt **GitHub Actions** als publicatiebron. Alleen de workflow
**Validate and deploy Pages** publiceert, na datavalidatie, de strikte quality
gate, alle regressietests en JavaScript-controle van het publicatiepakket.
Zet Pages niet terug op publicatie vanaf een branch: die route kan controles
omzeilen. Een lege dataset, coderingsschade, afwijkende projectie of verouderde
cacheversie blokkeert publicatie. Bij een laadfout toont de website een
herlaadmogelijkheid in plaats van nul bronrecords.

## Beschikbaarheid en herstel

**Monitor Atlas availability** draait op GitHub met een geplande frequentie van
vijf minuten, ook wanneer de laptop uitstaat. De controle haalt de gepubliceerde
HTML en assets op en test gegevens, JavaScript en de werkelijke opstartvolgorde.
Alleen tweemaal dezelfde inhoudelijke fout bij dezelfde release kan automatisch
herstel starten. Netwerkonzekerheid, een veranderende release, een gewijzigde
hoofdbranch of een lopende publicatie leiden niet tot herstel.

Herstel publiceert uitsluitend de gecontroleerde basisversie uit
`config/site-recovery.json`. Het zet `main` of de Gitgeschiedenis niet terug en
wordt hoogstens eenmaal per hoofdbranchcommit geprobeerd. De oudere editie kan
minder records en functies bevatten. `release.json` maakt zichtbaar welke
broncommit daadwerkelijk is gepubliceerd; iedere publicatie wordt daarna live
gecontroleerd.

Bij een fout of onuitvoerbare controle houdt de monitor één GitHub-incident bij
met label `atlas-beschikbaarheid`. Ongewijzigde signalen veroorzaken geen nieuwe
comments. Na herstel volgt één bericht en sluit het incident. Mail- en
pushmeldingen hangen af van de GitHub-notificatie-instellingen.

Vijf minuten is de ingestelde frequentie, geen gegarandeerde reactietijd. GitHub
kan runs vertragen of laten vervallen en schakelt geplande workflows in publieke
repositories na 60 dagen zonder repositoryactiviteit uit. Zie de
[GitHub-uitleg over schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
en het [releaseproces](docs/release-process.md).

## Bijdragen

Een aanvulling beschrijft bestaand AI-onderwijsaanbod met een directe officiële
bron. Bekende bronautoriteit, letterlijke feitelijke brononderbouwing en geslaagde
technische controles zijn voorwaarden voor automatische toelating. Onbekende of
onvoldoende onderbouwde gegevens worden niet als vaststaand gepubliceerd. Zie
[CONTRIBUTING.md](CONTRIBUTING.md).

## Licentie en maker

De Atlas is gemaakt door E.C.M. Willems. Contact: `evac.m.willems@proton.me`. Zie [LICENSE](LICENSE) voor de licentievoorwaarden.
