# Les- en werkmaterialen en nieuwste toevoegingen op Home

Peildatum: 23 oktober 2026. Classificatie: PUBLIC.

Vijf aanvullingen zijn vergeleken met de 439 bestaande canonieke records op
titel, maker, bron-URL en inhoud. Bestaande records blijven ongewijzigd.
De Atlas bevat hiermee 444 canonieke en 406 publieke vermeldingen.

| Toevoeging | Broncontrole en grens |
|---|---|
| [Experience AI – Understanding AI](https://experience-ai.org/en/units/understanding-ai-11-14) | Moduleoverzicht en openbare detailpagina van les 1 gecontroleerd. De accountgebonden downloads zijn niet ingezien; toegang daarom `registration`. |
| [Dwengo KIKS](https://www.dwengo.org/kiks/) | Projectpagina en leerlingencursus gelezen. Oudere cursus blijft als zodanig herkenbaar; Python-notebooks niet uitgevoerd. |
| [Dwengo Taaltechnologie](https://www.dwengo.org/chatbot/) | Projectpagina, docentenhandleiding en losse opdracht woordembeddings gecontroleerd. Historische uitspraken over de chatbotmarkt niet als actuele feiten overgenomen. |
| [AI Assessment Scale](https://aiassessmentscale.com/resources/) | Actuele PDF 2.1 inhoudelijk gecontroleerd. Licentiegrens en verschil met eerdere Nederlandse vertalingen vastgelegd. PowerPoint alleen als downloadaanbod bevestigd. |
| [AI Unplugged](https://www.aiunplugged.org/) | Officiële collectie, kaarten en Engelse spelregels geopend. Geen licentie of publicatiedatum verzonnen. |

De recordvelden bevatten de geraadpleegde directe bronnen, toegang,
hergebruikvoorwaarden waar vastgesteld en inhoudelijke beperkingen. Nederlandse
sectorlabels voor buitenlandse materialen zijn redactionele toepassingsindelingen,
geen gecertificeerde curriculumdekking. Beschikbaarheid is geen effectbewijs.

De drie rechtstreeks gecontroleerde documenten met vastgestelde publicatieperiode
zijn ook opgenomen in `sources/sources.json`, met begrensde claimkoppelingen.
Ongedateerde aanbodpagina's blijven volledig herleidbaar via `sourceUrls` in de
canonieke records: het bibliografische schema vereist een publicatiedatum, die
voor die pagina's niet is vastgesteld. Een update- of controledatum is daarvoor
geen vervanging. Er zijn geen nieuwe monitoringstromen aangemaakt.

Niet toegevoegd: bestaande vermeldingen van TeachAI, de AI Impact Game en EDUbox;
de Northwestern-collectie AI Unplugged waarvan de officiële pagina herhaaldelijk
een fout gaf; algemene Dwengo-overzichten die deze concrete pakketten overlappen.

## Home en sortering

Home en de lege startroute openen telkens met `Nieuwste in de Atlas eerst`, ook na
een eerdere andere sortering. De eerste geldige `added`-datum uit de geschiedenis
bepaalt de volgorde. Een recente broncontrole, publicatiedatum of tweede
toevoegnotitie schuift een oud record niet naar boven. Gelijke datums worden op
titel en vervolgens ID gerangschikt; onbekende datums blijven onderaan. Alle
publieke records blijven beschikbaar. Een opgeslagen rol blijft als filter werken.

De toevoegdatum staat op de resultaatkaart. Uitgebreid zoeken houdt zijn bestaande
standaard op relevantie; de nieuwe sorteeroptie is daar ook beschikbaar en wordt
in gedeelde zoeklinks behouden.

## Validatie

Bronnen- en datavalidatie, strikte kwaliteitscontrole, 182 Python-tests, 83 Node-tests,
JavaScript-syntaxis en diffcontrole zijn geslaagd. De vijf kwaliteitswaarschuwingen
betreffen bestaande gedeelde bronnen. De bronbibliotheektest gebruikt nu de
werkelijke controledatum voor levende repositorydata in plaats van de vaste
septemberdatum; synthetische testgevallen houden hun vaste datum. Gerichte
regressietests dekken sortering, ongeldige en ontbrekende datums, gelijke datums,
nieuwe broncontroles op oude records, zoeklinks en herhaald terugkeren naar Home.
De 439 bestaande records zijn met de uitgangscommit vergeleken en ongewijzigd.
Controles hebben de canonieke data niet herschreven. De lokale browserpreview
toont de nieuwe sorteerkeuze en nieuwste materialen, met behoud van de opgeslagen rol.
GitHub-controles, exacte release en verse browserlading worden afzonderlijk
gecontroleerd bij publicatie.
