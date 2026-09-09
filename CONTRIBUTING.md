# Bijdragen

Gebruik **Bijdragen & feedback** op de website om bestaand aanbod aan te vullen,
een feitelijke correctie door te geven of feedback te geven. De formulieren openen
op GitHub en vereisen een GitHub-account. Inzendingen zijn openbaar; deel geen
persoonsgegevens of vertrouwelijke informatie. Een vermelding in de Atlas is geen
goedkeuring, kwaliteitsbeoordeling of aanbeveling.

## Een aanvulling indienen

Vul de vaste velden in: titel, aanbieder, soort aanbod, functie, sector, doelgroep,
thema, beschikbaarheid, geografische reikwijdte, kosten en commerciële aard. Voeg
een directe officiële HTTPS-bron toe. Beschrijf de functie met één of twee
volledige, feitelijke zinnen uit die bron. Wervende superlatieven, garanties en
koopoproepen worden niet automatisch verwerkt, ook niet als ze op de bronpagina
staan. Een zoekresultaat, aangevinkt label of gekozen categorie is geen bewijs.

Kosten, toegang en commerciële aard hebben verschillende betekenissen. Gratis
aanbod is niet automatisch niet-commercieel; betaald aanbod is niet automatisch
commercieel. Kies **Niet vastgesteld** wanneer de commerciële aard niet expliciet
is onderbouwd. Een vastgestelde commerciële of niet-commerciële aard vereist een
officiële bron én een volledige feitelijke bronzin die deze kwalificatie benoemt.
Een prijs, rechtsvorm of algemene licentievoorwaarde is daarvoor onvoldoende.

## Wat er na een aanvulling gebeurt

1. De automatische toelating controleert onder meer structuur, doublures, de
   bekende combinatie van aanbieder en brondomein, titel, aanbieder, feitelijke
   bronzinnen en de relevantie voor AI en onderwijs. Onbekende bronautoriteiten,
   onleesbare bronnen en onvoldoende onderbouwing blijven ter beoordeling.
2. Een volledig toegelaten aanvulling krijgt een bot-PR met precies één nieuw
   record en de afgeleide publieke bestanden. Twee afzonderlijke workflows
   moeten dezelfde onveranderlijke commit goedkeuren.
3. Vlak vóór samenvoegen worden de bron en de ongewijzigde inzending opnieuw
   gecontroleerd. Een nieuwe hoofdbranch vereist opnieuw voorbereiden en testen.
   Samenvoegen omzeilt geen branchbescherming of verplichte controles.
4. Na samenvoegen wordt de normale websitepublicatie aangevraagd. De deployment
   controleert de vastgelegde gegevens en verifieert daarna de gepubliceerde site.

Het oorspronkelijke issue toont de status: aanvullende informatie nodig, controles
bezig of publicatie aangevraagd. Een aangevraagde publicatie is nog geen bevestiging
dat de nieuwe editie live staat. Automatische toelating geeft geen persoonlijk
akkoord van Eva en beoordeelt niet de kwaliteit of geschiktheid van het aanbod.

Correcties, feedback, willekeurige externe PR's en voorstellen uit de dagelijkse
signaalcontrole worden via hun eigen beoordelingsroute behandeld. De automatische
toelating voor nieuwe formulierinzendingen verleent hiervoor geen publicatierecht.

## Werken aan de data of code

De canonieke gegevens staan in `data/records.json`. Bewerk geen browserexport los
van deze bron. Voer vóór een PR uit:

```text
python scripts/validate_data.py
python scripts/generate_data.py
python scripts/quality_gate.py --strict
python -m unittest discover tests -v
```

Genereer ook na wijzigingen aan JavaScript of CSS opnieuw, zodat de assetversies
in `index.html` overeenkomen met de inhoud. Neem alle gegenereerde wijzigingen
samen op in de PR. De generator vernieuwt de datum van de editie; individuele
`lastVerified`-datums veranderen alleen na een daadwerkelijke broncontrole.
Zie ook het [datamodel](docs/data-model.md), het
[redactioneel beleid](docs/editorial-policy.md) en het
[releaseproces](docs/release-process.md).
