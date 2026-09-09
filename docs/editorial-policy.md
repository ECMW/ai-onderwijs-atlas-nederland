# Redactioneel beleid

De Atlas beschrijft bestaand aanbod rond AI en onderwijs. Een vermelding is geen
goedkeuring, kwaliteitsbeoordeling of aanbeveling. De aanwezigheid van een
officiële bron bewijst niet dat een product geschikt, veilig of effectief is voor
een bepaalde instelling.

Zelfstandige AI-software valt buiten de gekozen publieke reikwijdte. De 12
bestaande softwarevermeldingen zijn op verzoek van Eva uitgesloten op
9 september 2026. Handreikingen over het kiezen en beoordelen van toepassingen,
les- en werkmaterialen en trainingen blijven onderdeel van de Atlas. Een
training over een specifiek product is daarbij een training. Bestaande
softwaregegevens blijven canoniek bewaard met `publicationExclusion`; een
broncontrole verandert dit redactionele besluit niet.

## Feitelijke en vergelijkbare vermeldingen

Gebruik voor iedere vermelding dezelfde velden: titel, aanbieder, soort aanbod,
functie, doelgroep, sector, thema, beschikbaarheid, kosten, toegang, commerciële
aard, officiële bron en controledatum. Ontbrekende informatie blijft onbekend.
Schrijf neutraal en herleidbaar; neem geen superlatieven, garanties of koopoproepen
over. Maak geen ranglijsten en beoordeel geen organisaties zonder een expliciet,
publiek beoordelingskader.

Nieuwe automatische bijdragen moeten hun feitelijke functie onderbouwen met
volledige bronzinnen. Een gekozen categorie, ingevulde URL of naam van een
organisatie is op zichzelf geen bronbewijs. Onbekende bronautoriteiten,
parafrases, PDF's zonder betrouwbaar uitleesbare tekst en andere twijfelgevallen
worden niet automatisch gepubliceerd. De strikte toelating wordt vóór samenvoegen
opnieuw uitgevoerd; zij kent geen persoonlijk akkoord van Eva toe.

## Workshops en trainers

Workshops en cursussen gebruiken het bestaande recordtype `training`. Leg de
vorm vast in `subtype` als de officiële bron die bevestigt. De beschrijving
vermeldt de trainer alleen wanneer diens uitvoerende rol bij het aanbod is
bevestigd. Een contactpersoon is niet automatisch de trainer; een naam bewijst
geen zelfstandige boekbaarheid. Verwijs voor contact naar de zakelijke aanbodpagina.

Gebruik `availabilityText` voor locatie, duur, prijs en planning, en `eligibility`
voor deelnamevoorwaarden en benodigde accounts of producten. Vermeld onbekenden
expliciet; verzin geen onderwijssector, beschikbare datum of trainer. Bewaar
bestaande organisatiekoppelingen en voorkom dubbele vermeldingen van één cursus.

## Kosten en commerciële aard

`costType` en `accessType` staan los van `commercialStatus`. Leid commerciële aard
niet af uit prijs, naam, rechtsvorm of een licentie die bepaald gebruik toestaat.
Zonder expliciete brononderbouwing is `commercialStatus` gelijk aan `unknown` en
toont de website **Commerciële aard niet vastgesteld**. Dit geldt ook voor oudere
records waarin het veld ontbreekt.

Een classificatie als `commercial` of `non_commercial` vereist
`commercialEvidence`: een officiële HTTPS-bron, een feitelijke onderbouwing en
een geldige controledatum. Voor automatische toelating moet de bekende bron van
de aanbieder de kwalificatie van het aanbod expliciet ondersteunen met een
letterlijk teruggevonden bronzin. Een onbekende waarde is een geldige uitkomst;
verzin geen kwalificatie om een veld te vullen. Zie het
[datamodel](data-model.md) voor de precieze velden en controles.

## Datums en Nieuwe bijdragen

- **Toegevoegd aan de Atlas:** de eerste geldige toevoegdatum uit
  `changeHistory`. Dit bepaalt de volgorde bij **Nieuw in de Atlas**.
- **Gepubliceerd door de aanbieder:** uitsluitend `publicationDate`. Dit bepaalt
  de volgorde bij **Recent gepubliceerd**. Een ontbrekende publicatiedatum wordt
  niet afgeleid uit een toevoeging of controle.
- **Bron gecontroleerd:** `lastVerified`, uitsluitend na een daadwerkelijke
  controle. Een bewerking of nieuwe export is geen nieuwe broncontrole.
- **Bijgewerkt in de footer:** `metadata.updated`, de datum waarop de huidige
  editie werkelijk is gegenereerd. Een browserbezoek, signaalcontrole zonder
  wijzigingen of herpublicatie van dezelfde editie schuift deze datum niet op.

## Correcties, beheer en herstel

Maak onzekerheid en correcties zichtbaar in bronverwijzingen en
wijzigingsgeschiedenis. Archiveer vervallen records; verwijder ze niet stil.
Correcties en feedback volgen hun eigen beoordelingsroute. Automatische publicatie
is beperkt tot de expliciet gemachtigde updater en volledig toegelaten nieuwe
formulierinzendingen, onder hun afzonderlijke controles.

Beschikbaarheidsherstel publiceert alleen een vooraf gecontroleerde editie. Dit
is een herstel van toegang tot bestaande inhoud, geen nieuwe inhoudelijke
broncontrole. De oudere editie en haar eigen datums blijven herkenbaar; de
Gitgeschiedenis wordt niet teruggezet. Zie het [releaseproces](release-process.md).
