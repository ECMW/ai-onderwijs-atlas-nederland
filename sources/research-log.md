# Onderzoekslog bronbasis

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
