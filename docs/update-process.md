# Actualiseringsproces

De keten is: **detecteren → vergelijken → voorstellen → valideren → publiceren**.

De GitHub-signaalworkflow controleert bronnen uit `sources.json`, schrijft bereikbaarheid en fingerprints
en maakt reviewvoorstellen. Deze voorstellen wijzigen nooit automatisch publieke records en vereisen
menselijke beoordeling.

De afzonderlijke, door de eigenaar gemachtigde Atlas-actualisator mag zelfstandig primaire bronnen
onderzoeken, `data/records.json` en afgeleide bestanden bijwerken en een eigen pull request mergen. Dat
mag alleen wanneer de brongegevens ondubbelzinnig zijn, duplicaatcontrole en volledige lokale tests slagen,
alle verplichte GitHub-checks groen zijn en er geen conflict of andere onzekerheid bestaat. Na merge
controleert de actualisator de Pages-deployment en de live zoekbaarheid. Externe bijdragen worden niet
door deze route gemerged.
