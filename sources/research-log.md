# Onderzoekslog bronbasis

## 23 november 2026 · Een AI-conceptverslag controleren

Het Privacy Expertise Centrum van SURF beschrijft met ArtEZ het traject van opname naar transcript en van transcript naar notulen. De Taalwinkel beschrijft als taak van de notulist om afspraken en besluiten te controleren. De Atlas maakte zelf het fictieve fragment, de foutieve samenvatting en de correcties. Beide bronnen geven context voor de taak. Ze toetsen het oefenresultaat niet. [SURF PEC](https://pec.surf.nl/spraakherkenning-en-transcriptie-met-ai/) · [Taalwinkel](https://taalwinkel.uva.nl/studievaardigheden/vergaderen/vergaderen.html)

## 23 november 2026 · Lesvoorbereiding en toolkeuze uitlichten

De enquête van het European School Education Platform bevat 1.130 antwoorden uit meer dan 50 landen. Deelnemers melden AI-gebruik bij de lesvoorbereiding (vraag 2) en vragen om toegang tot goedgekeurde, veilige hulpmiddelen (vraag 7). De redactie koos daarom de lesgids voor 7 december en de keuzehulp voor 21 december 2026. De keuzehulp biedt vragen om toepassingen te beoordelen. Hoeveel Atlas-bezoekers beide taken hebben, is onbekend. [Onderzoeksresultaten European School Education Platform](https://school-education.ec.europa.eu/en/discover/surveys/survey-artificial-intelligence-teaching-and-learning)

## 23 november 2026 · Een klantmail over een bestelling controleren

Via het openbare kwalificatieregister van SBB is het profiel Commercieel medewerker (25874, niveau 3, versie gewijzigd 2023) geopend. Werkproces P1-K1-W6 op pagina 21 en 22 beschrijft hoe de medewerker orderafspraken controleert, betrokkenen informeert en bij afwijkingen overlegt. De Atlas gebruikt deze beroepshandeling als context voor een eigen oefening met een fictieve bestelling en een conceptmail. Het werkblad is nog niet in een klas beproefd. [SBB, profiel Commercieel medewerker, p. 21–22](https://kwalificatie-mijn.s-bb.nl/Details/DownloadDocument/1967278#page=21)

## 23 november 2026 · Een kiemproef voorbereiden

De NIBI-vindplaats voor *Tuinkers ontkiemen* en de gekoppelde docentinstructie zijn gecontroleerd. De instructie onderscheidt lestijd en waarnemingen over twee weken. De Atlas schreef bij dit materiaal een leerlingopdracht om een proef met twee veranderende omstandigheden te verbeteren. De optionele vraag aan een AI-tool is een Atlas-bewerking. [PlantKracht vmbo, Tuinkers ontkiemen](https://www.nibi.nl/nl/plantkracht-vmbo#art_10431)

## 2026-09-28 — structurele eerste tranche

### Doel en afbakening

Deze tranche bouwt een duurzame kennislaag naast de canonieke catalogus en het operationele bronnenregister. Zij probeert niet zoveel mogelijk links te verzamelen. Het stopcriterium voor deze ronde was:

1. een herhaalbaar schema en een releaseblokkerende validator;
2. een hoogwaardige eerste set primaire, officiële en wetenschappelijke bronnen;
3. concrete koppelingen tussen bronnen en Atlas-claims, inclusief bewijsleemtes;
4. correctie van aantoonbare bron- en classificatiefouten in de canonieke data.

De webinterface, zoekindex en bestaande catalogusarchitectuur zijn niet herbouwd. De bibliotheek is onderhoudsinfrastructuur en wordt niet automatisch als nieuwe publieksclaim getoond.

### Repository-audit

Bij de start bevatte de canonieke dataset 373 records, waarvan 338 in de publieke projectie. De records verwezen gezamenlijk naar 450 bronlinks. `data/sources.json` bleek een register voor monitoring en ontdekking, niet een bibliografische kennisbibliotheek. Daarom is de nieuwe laag afzonderlijk onder `sources/` geplaatst.

Belangrijkste structurele bevindingen:

- recordbronnen waren vooral gekoppeld aan een heel record, niet aan een specifieke claim;
- juridische tekst, beleid, guidance, standaarden en effectonderzoek waren niet systematisch van elkaar onderscheiden;
- er was geen expliciete plek voor tegenbewijs, beperkingen of bewijsleemtes;
- actualiteitscontrole bestond voor records, maar niet als afzonderlijke bibliotheekregel;
- twee records waren aantoonbaar verkeerd als wetgeving geclassificeerd;
- meerdere brede claims over leerwinst, veiligheid, privacyvriendelijkheid en beoordelingskwaliteit vroegen om strengere bewijsgrenzen.

### Zoek- en selectieaanpak

Actief webonderzoek is op 28 september 2026 uitgevoerd in vier clusters:

- EU- en Nederlandse rechtsbronnen: EUR-Lex, EDPB en Autoriteit Persoonsgegevens;
- normen en governance: Europese Commissie, CEN-CENELEC, ISO, NIST en ENISA;
- onderwijsbeleid en competentiekaders: OECD, UNESCO, UNICEF, Europese Commissie, Raad van de EU, Raad van Europa, Npuls, Kennisnet en NVAO;
- onafhankelijk onderzoek en tegenbewijs: peer-reviewed reviews, meta-analyses en gerandomiseerde studies over leeruitkomsten, docentregie, privacy, bias en AI-detectie.

De bronhiërarchie was: primaire rechtsbron of officiële uitgave eerst; daarna gezaghebbende guidance of sectorbron; voor effectclaims systematische reviews, meta-analyses en causale studies. Leveranciersmateriaal en nieuws werden niet gebruikt om werking, veiligheid of publieke waarde aan te tonen.

### Opgenomen basis

De eerste tranche bevat 45 bronnen:

- 25 primaire bronnen;
- 12 peer-reviewed wetenschappelijke bronnen;
- bindende EU-verordeningen, niet-bindend beleid en guidance, vrijwillige standaarden en wetenschappelijk bewijs zijn expliciet onderscheiden;
- alle bronnen bevatten begrensde ondersteunde claims, betrouwbaarheidsnotities, beperkingen, verificatiedatum en status.

De claimindex bevat 24 koppelingen:

- 16 ondersteunde, beperkte of betwiste claims;
- 8 expliciete bewijsleemtes;
- iedere koppeling verwijst naar een bestaand bestand en, voor catalogusclaims, naar een record en veld.

### Belangrijkste inhoudelijke conclusie

De wetenschappelijke basis rechtvaardigt geen generieke claim dat generatieve AI leren verbetert. Positieve gemiddelden in delen van de literatuur gaan samen met zeer hoge heterogeniteit, publicatiebias, korte interventies en het risico dat taakprestatie met leren wordt verward. De sterkste verdedigbare lijn is dat uitkomsten afhangen van pedagogisch ontwerp, scaffolding, taaktype, docentregie en toetsing zonder AI.

Daarom zijn ook studies opgenomen die tegenwicht bieden:

- onbegrensde AI-hulp kan oefenprestaties verhogen en latere AI-vrije prestaties verlagen;
- vertraagde kennisretentie kan lager uitvallen dan bij traditioneel studeren;
- AI-detectoren kennen false positives, false negatives, taalbias en omzeilbaarheid;
- privacy- en biasrisico's lopen door de hele gegevens- en besluitvormingsketen;
- docentinterventie blijft een inhoudelijke en bestuurlijke voorwaarde, niet alleen een implementatiedetail.

### Correcties in canonieke records

Vijf records zijn met primaire bronnen aangescherpt:

- AI Act: originele, geconsolideerde en wijzigingstekst gekoppeld; publicatie, thema's en gefaseerde toepassing verduidelijkt;
- AVG: primaire EUR-Lex-tekst en actuele AP-handreiking gekoppeld;
- Data Act: primaire tekst en toepassingsdatum toegevoegd;
- Digital Education Action Plan: gecorrigeerd van wetgeving naar niet-bindend beleidsdocument;
- Nederlandse Gedragscode Wetenschappelijke Integriteit: gecorrigeerd van wetgeving naar vrijwillige gedragscode/standaard en inhoudelijk op de vijf officiële principes gebracht.

### Niet opgenomen of niet als bewijs gebruikt

- De ingetrokken publicatie van Wang en Fan, *The effect of ChatGPT on students' learning performance...* (`10.1057/s41599-025-04787-y`), is uitgesloten.
- Preprints zijn niet gebruikt omdat voldoende peer-reviewed materiaal beschikbaar was.
- Consultatieversies zijn niet naast hun definitieve opvolger opgenomen.
- Een beleidsvoorstel of oude standaardisatieopdracht is niet als geldend recht of actuele norm gebruikt.
- EN 18286:2026 is als vrijwillige kwaliteitsmanagementstandaard opgenomen, maar niet als geharmoniseerde norm of bewijs van vermoeden van conformiteit zolang die status niet officieel is vastgesteld.
- Institutionele pilots en leveranciersclaims zijn niet opgewaardeerd tot bewijs van effect, veiligheid, privacyconformiteit of publieke waarde zonder directe evaluatie.

### Resterende bewijsleemtes

De zichtbaar gemaakte leemtes betreffen onder meer:

- onafhankelijke leer-, retentie- en verdelingseffecten van Nederlandse en mbo-pilots;
- netto tijdswinst, validiteit, fairness en beroep bij AI-gradering en itemgeneratie;
- projectspecifieke gegevens over datastromen, beveiliging en feitelijke mitigatie bij gesloten AI-omgevingen;
- uitkomsten voor leerlingen met beperkingen en andere ondervertegenwoordigde groepen;
- langetermijneffecten op zelfstandigheid, metacognitie en menselijke correctiecapaciteit.

### Volgende drie prioriteiten

1. Koppel de resterende hoog-risico- of hoog-impactrecords aan onafhankelijke uitkomst- en verdelingsevidentie, met voorrang voor toetsing, leerlingdata en menselijke overname.
2. Werk de acht bewijsleemtes af wanneer directe projectdocumentatie of onafhankelijke evaluatie beschikbaar komt; laat ze anders expliciet open.
3. Herverifieer tijdgevoelige bronnen en claims op hun `review_by`-datum en voeg alleen een bron toe als die een concrete claim, beperking of statuswijziging verbetert.

### Interpretatieregel

Een opgenomen bron bewijst niet automatisch dat een Atlas-record volledig juist, actueel, effectief of geschikt is. `source_statement`, `reasonable_inference` en `atlas_synthesis` hebben verschillende bewijskracht. Een structurele kwaliteitscontrole kan metadata en koppelingen afdwingen, maar geen bronwaarheid of causale geldigheid automatiseren.

## 2026-10-02 — Nederlandstalige boekentranche

De publieke boekencollectie is uitgebreid van elf naar zevenendertig titels. De
selectie omvat drie Nederlandse uitgaven van of met Viktor Mayer-Schönberger,
fundamentele werken over data, algoritmische macht, publieke waarden en
menselijke oordeelsvorming, en onderwijsgerichte titels over AI-geletterdheid,
didactiek, taalmodellen en toetsing.

Boekrecords blijven catalogusaanbod en zijn niet automatisch toegevoegd aan de
permanente claim-evidencebibliotheek in `sources/sources.json`. Een boek komt pas
in die bibliotheek wanneer het een concrete Atlas-claim of beperking beter
onderbouwt dan de beschikbare primaire rechtsbron, officiële uitgave of
wetenschappelijke studie. De selectiecriteria, bronlinks, bewijsgrenzen en
uitgestelde titels staan in
`docs/books-materials-source-review-2026-10-02.md`.

De technische toelatingspoort controleert vanaf deze tranche ook het
ISBN-13-controlecijfer en de 978/979-prefix, dubbele ISBN's, niet-lege auteurs en
het lijsttype van de taalcode. Daarmee is de uitbreiding schaalbaar zonder een
nieuwe taxonomie, pagina of onderhoudsstroom te introduceren.


## 2026-11-06 — Les- en werkmaterialen

Veertien concrete materialen en collecties toegevoegd na primaire broncontrole,
controle van toegang en vergelijking met de bestaande Atlas. Details en
aangehouden kandidaten staan in `reports/materialen-broncontrole-2026-11-06.md`.
De gedateerde CRAFT-voorbeeldles heeft een begrensde claimkoppeling; ongedateerde
aanbodpagina's blijven in record.sourceUrls. Geen effectclaims toegevoegd.

## 2026-11-22 — Een toetsafspraak voor de klas

De handreiking voor het vo van Kennisnet en de visie en eerste handreiking van
Npuls zijn opnieuw geopend. Ze behandelen hoe een docent een leerdoel verbindt
aan de rol van AI en de eigen prestatie die zichtbaar moet worden. De drie
opdrachtteksten in de toetsafspraak zijn door de Atlas geschreven. De
beoordelingssuggesties zijn voorbeelden die de docent kan aanpassen.

## 2026-11-22 — Twee lessen vergelijken bij de lesvoorbereiding

Voor *Behind the Chat* onderscheidt de Atlas nu de tijd voor het verhaal zelf
(circa 15 minuten) en voor één verhaal met een klassikaal nagesprek (circa 20
minuten). De Nederlandse aanbieder noemt gebruik op het digibord of de telefoon.
[Lesinstructie van Dé Codeerschool](https://codeerschool.nl/behind-the-chat/)

Mediawijs vermeldt voor de EDUbox twee tot drie lesuren, een computer met
internet en de mogelijkheid om individueel of in groepjes te werken. De
bestaande Atlas-vermelding bevat deze gegevens. Beide bronnen geven een
tijdsindicatie van de aanbieder. [Lesinstructie van Mediawijs](https://www.mediawijs.be/nl/tools/edubox-artificiele-intelligentie)

## 2026-11-22 — Teamproef met AI in één les

Kennisnet koppelt schoolafspraken aan onderwijsdoelen en aan de behoeften van
leerlingen en leraren. Npuls beschrijft hoe teams in het mbo, hbo en wo in
kleine stappen kunnen uitproberen en bijstellen. De twee proefkaarten, de vraag
aan de klas en de voorgestelde beslisregels zijn ontworpen door de Atlas. De
uitkomst van één les is bedoeld voor de volgende lokale keuze. [Kennisnet](https://www.kennisnet.nl/artificial-intelligence/schoolafspraken-over-het-gebruik-van-generatieve-ai/) · [Npuls](https://npuls.nl/kennisbank/ai-go-in-actie)

## 2026-11-22 — Zelfstandig leren na AI-hulp

De drie docentvragen koppelen een klasproef aan de werkelijke vergelijkingsgroep en meettaak. Meyer vond een klein revisieverschil en geen aantoonbaar verschil op een volgende schrijftaak. Bastani vergeleek begeleid oefenen met een directe toets zonder hulpmiddelen. Dietrich hield de ecologische bronteksten gelijk voor lezen en chatten. De gerapporteerde verbanden tussen vraaggedrag en kennis zijn observationeel. De Atlas heeft de suggesties voor de volgende les zelf uitgewerkt. Het institutionele novemberoverzicht van Stanford begrenst de overdraagbaarheid naar andere groepen en langere perioden. [Meyer](https://doi.org/10.1016/j.caeai.2023.100199) · [Bastani](https://doi.org/10.1073/pnas.2422633122) · [Dietrich](https://doi.org/10.1007/s10956-026-10374-w) · [Stanford SCALE](https://scale.stanford.edu/ai/evidence-base-review/evidence-base-ai-k12-november-review)

## 2026-11-22 — Twee Nederlandse praktijkervaringen en een toekomstgesprek

Fortior rapporteerde beperkingen van lesontwerpen uit een eigen chatbot, onder meer in detail en illustraties. In het vak Future Planet Studies meldde de UvA-begeleider ervaren tijdwinst bij de eerste feedback op onderzoeksvragen. De voorbeelden zijn aan bestaande Atlas-kaarten gekoppeld en als praktijkervaring aangeduid. De nieuwe teamvraag over zelfstandig afwegen gebruikt TNO's scenariomethode en UNESCO's mensgerichte leerdoelen. [Impuls Open Leermateriaal](https://www.openleermateriaal.nl/ai-in-de-klas-zo-doen-pilots-het/) · [UvA-pilot](https://tlc.uva.nl/en/article/ai-pilot-bsc-future-planet-studies/) · [TNO](https://publications.tno.nl/publication/34646519/BCdweC4U/TNO-2026-Werkzekerheid.pdf) · [UNESCO](https://www.unesco.org/en/articles/ai-competency-framework-students)

## 2026-11-22 — Leerlingwerk, mbo-examens en hergebruik in de praktijkgids

De beslissing over herkenbaar leerlingwerk steunt op de [AVG](https://eur-lex.europa.eu/eli/reg/2016/679/oj) en [voorlichting van Kennisnet](https://www.kennisnet.nl/artificial-intelligence/privacy-en-ai-hier-moeten-scholen-op-letten/). De [landelijke mbo-richtlijn](https://www.onderwijsenexaminering.nl/publicaties/gebruik-van-ai-bij-toetsing-en-examinering-in-het-mbo-landelijke-richtlijn-als-vertrekpunt/) geeft ruimte voor een schooleigen exameninstructie. De Nederlandse [CC BY 4.0-licentie](https://creativecommons.org/licenses/by/4.0/legalcode.nl) levert de voorwaarden voor delen en bewerken onder die licentie.

De vergelijking van 36 lerarenkaders door [UNESCO IITE](https://iite.unesco.org/publications/analytical-report-teacher-ai-competency-frameworks/) onderbouwt de vragen over curriculum en beoordeling. Het lesdoel voor VO-biologie hoort bij de concrete [natuurbehoudles van Wendi Cocita](https://craft.stanford.edu/resource/how-can-ai-be-used-to-help-conserve-natural-ecosystems/). De taak en het beoordelingsvoorbeeld in de gids zijn redactionele uitwerkingen.

## 2026-11-22 — Besluitblad voor schoolleiding, onderwijs en ICT

De bestaande bronkaarten bieden drie verschillende ingangen voor een school- of opleidingsbesluit. Kennisnet behandelt afspraken over onderwijs en gebruik, Npuls de risicoafweging en opvolging voor het vervolgonderwijs en de WaardenWijzer het gesprek over de belangen van betrokkenen. De bespreekversie, de keuze tussen uitvoeren, een kleine proef en uitstellen, en het voorbeeld zijn redactionele uitwerkingen. Het plaatselijke mandaat en het bewijs bij de concrete toepassing blijven bepalend. [Kennisnet](https://www.kennisnet.nl/artificial-intelligence/schoolafspraken-over-het-gebruik-van-generatieve-ai/) · [Npuls](https://npuls.nl/kennisbank/raise-raamwerk-voor-risicobeoordeling-van-ai) · [SURF en Kennisnet](https://www.surf.nl/themas/publieke-waarden/waardenwijzer)

## 2026-11-22 — Twee bronopdrachten op het leerlingblad

Figuur 2 van het HHMI-werkblad vergelijkt eilanden met en zonder poolvossen. Grafiek A gaat over fosfor in de bodem, grafiek B over stikstof in het gras. De Nederlandse voorbeeldzin die de klas met de grafieken onderzoekt, komt uit de bestaande Atlas-lesstart. [HHMI, Introduction to Systems](https://docs.google.com/document/d/1dhy_ADiJ6wpG3MRSvv4qYatKZEe7MQGkTLNDcNtV9Gk/preview)

In onderdeel 3.1 van het UBC-notebook staan de effectschattingen en standaardfouten voor lasso, random forest en boosting onder het codeblok. Studenten kunnen de getoonde uitkomsten voor de Atlas-opdracht in de leesversie raadplegen. [UBC, Double Machine Learning](https://ubcecon.github.io/praxis-ubc/docs/Causal_ML/notebook_07_double_machine_learning.html#any-learner-in-dml)
