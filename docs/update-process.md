# Actualiseringsproces

De keten is: **detecteren → vergelijken → voorstellen → valideren → publiceren**.

De GitHub-signaalworkflow controleert bronnen uit `sources.json`, schrijft bereikbaarheid en fingerprints
en maakt reviewvoorstellen. Deze voorstellen wijzigen nooit automatisch publieke records en vereisen
menselijke beoordeling.

De bestaande GitHub-workflow loopt om 06:17, 11:17 en 16:17 UTC, ook wanneer de laptop uitstaat.
Bronnen met frequentie `daily` worden iedere run gecontroleerd; wekelijkse en maandelijkse bronnen
behouden hun eigen interval. GitHub kan deze geplande controles vertragen. Open voorstellen blijven
in de onderhoudsstaat bewaard tot een besluit met dezelfde bewijs-hash is vastgelegd.

Aanvullende cloudverkenning leest begrensd detailpagina's van bekende officiële aanbieders. Alleen
complete, bronbewezen nieuwe aanvullingen worden via de bestaande strikte inzendingsroute verwerkt.
Een bronverwijzing alleen is onvoldoende; ontbrekende feiten en twijfel blijven ter beoordeling.
Er zijn geen nieuwe externe secrets of een actieve lokale Codex-sessie nodig voor deze cloudroute.

De aanvullend inzetbare, door de eigenaar gemachtigde Atlas-actualisator mag zelfstandig primaire bronnen
onderzoeken, `data/records.json` en afgeleide bestanden bijwerken en een eigen pull request mergen. Dat
mag alleen wanneer de brongegevens ondubbelzinnig zijn, duplicaatcontrole en volledige lokale tests slagen,
alle verplichte GitHub-checks groen zijn en er geen conflict of andere onzekerheid bestaat. Na merge
controleert de actualisator de Pages-deployment en de live zoekbaarheid. Externe bijdragen worden niet
door deze route gemerged.

Website-inzendingen en volledig onderbouwde cloudvondsten volgen de afzonderlijke toelatings- en
publicatieroute in [release-process.md](release-process.md). Ontdekte links worden daar niet
ongecontroleerd in omgezet.
