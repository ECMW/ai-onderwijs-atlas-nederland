# AI & Onderwijs Atlas Nederland

De AI & Onderwijs Atlas Nederland is een gratis, open en brongebaseerde wegwijzer voor bestaand aanbod rond AI in het onderwijs. Bezoekers zoeken vanuit hun vraag en kunnen daarna combineren op thema, sector, soort aanbod, doelgroep, beschikbaarheid, organisatie, geografische reikwijdte en actualiteit.

- Publieke Atlas: https://ecmw.github.io/ai-onderwijs-atlas-nederland/
- Bijdragen en broncode: https://github.com/ECMW/ai-onderwijs-atlas-nederland

## Uitgangspunten

- uitsluitend bestaand aanbod met een vastgelegde bron wordt publiek getoond;
- interne redactiesignalen en bronloze concepten horen niet in de publieke catalogus;
- filters binnen een groep werken als OR, verschillende groepen als AND;
- meerdere rollen, zoals Docent en Onderzoeker, kunnen gecombineerd worden;
- zoek- en filterstaat staat in de URL en is deelbaar;
- persoonlijke voorkeuren, favorieten en bewaarde zoekopdrachten blijven lokaal in de browser;
- er zijn geen trackers, cookies, externe autocomplete of backend nodig.

## Techniek en data

De website is statische HTML, CSS en vanilla JavaScript. Er is geen buildstap nodig. De canonieke bron is `data/records.json`; de publieke browserprojectie staat in `data/data-v2.js` als `window.ATLAS_RECORDS`.

Het datamodel en de toegestane enums staan in [docs/data-model.md](docs/data-model.md). De publieke export bevat alleen records met een officiele bron en een bevestigde verificatiestatus.

## Dagelijks onderhoud

De Atlas heeft twee gescheiden onderhoudsroutes:

- de GitHub-signaalworkflow controleert geregistreerde bronnen om 05:00 UTC, classificeert veranderingen en maakt uitsluitend reviewvoorstellen;
- de door de eigenaar gemachtigde dagelijkse Atlas-actualisator zoekt en controleert primaire bronnen, werkt canonieke data bij en mag uitsluitend eigen, volledig geverifieerde pull requests zelfstandig mergen nadat alle verplichte controles zijn geslaagd.

De autonome route stopt zonder merge bij een dirty worktree, conflicten, mislukte checks, onduidelijke bronnen, mogelijke doublures of andere materiële onzekerheid. Na iedere merge controleert zij de Pages-publicatie en live zoekbaarheid. Externe bijdragen en voorstellen uit de signaalworkflow blijven altijd onder menselijke beoordeling. Zie:

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
python -m unittest discover tests -v
```

De onderhoudstests gebruiken lokale fixtures en zijn niet afhankelijk van live websites. De dagelijkse workflow kan in GitHub handmatig worden gestart via **Actions > Daily Atlas maintenance review > Run workflow**.

## Bijdragen

Een externe correctie of aanvulling moet een officiele bron bevatten. Automatische controles geven structuur-, bron- en duplicaatsignalen; een mens neemt voor externe bijdragen altijd het publicatiebesluit. Zie [CONTRIBUTING.md](CONTRIBUTING.md).

## Licentie en maker

De Atlas is gemaakt door Eva Willems. Contact: `evac.m.willems@proton.me`. Zie [LICENSE](LICENSE) voor de licentievoorwaarden.
