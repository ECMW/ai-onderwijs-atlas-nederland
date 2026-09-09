# Datamodel v2

De canonieke dataset is `data/records.json`. Verplichte velden zijn `id`, `title`, `recordType`, `status` en `verificationStatus`.

Enums:

- recordType: `organization`, `programme`, `product`, `service`, `guidance`, `training`, `subsidy`, `funding_call`, `pilot`, `practice_example`, `community`, `standard`, `legislation`, `policy_document`, `research_project`, `identified_need`, `white_spot`.
- status: `available`, `pilot`, `in_development`, `planned`, `open_call`, `closed_call`, `archived`, `needs_verification`, `identified_need`, `unknown`.
- verificationStatus: `verified`, `recently_checked`, `stale`, `changed`, `broken_source`, `needs_review`.
- accessType: `public`, `registration_required`, `paid`, `unknown`.
- costType: `free`, `paid`, `freemium`, `unknown`.
- commercialStatus: `commercial`, `non_commercial`, `unknown`. Dit veld is aanvullend; een ontbrekend veld in oudere records betekent `unknown`.
- sourceType: `official`, `authoritative`, `secondary`.

Status beschrijft het aanbod; verificatiestatus beschrijft de betrouwbaarheid en actualiteit van de registratie. De configureerbare redactionele norm is `VERIFICATION_STALE_DAYS = 90`.

## Commerciële aard en brononderbouwing

`commercialStatus` staat los van `costType`, `accessType`, het recordtype en de naam of rechtsvorm van de aanbieder. Gratis aanbod kan commercieel zijn; een betaalde opleiding bij een onderwijsinstelling is niet op grond van de prijs als commercieel te classificeren. De Atlas leidt dit veld niet automatisch uit andere velden af.

- `commercial`: commercieel aanbod, met vastgelegde officiële brononderbouwing.
- `non_commercial`: niet-commercieel aanbod, met vastgelegde officiële brononderbouwing.
- `unknown`: commerciële aard niet vastgesteld. Een oud ontbrekend veld heeft dezelfde betekenis en is geen impliciete kwalificatie als niet-commercieel.

Bij een vastgestelde aard is `commercialEvidence` verplicht:

```json
{
  "url": "https://aanbieder.example/over-het-aanbod",
  "note": "Feitelijke onderbouwing van de kwalificatie uit deze officiële bron.",
  "checkedOn": "2026-09-09"
}
```

`url` moet een publieke HTTPS-bron zonder inloggegevens zijn. `note` bevat 10–1200 tekens brononderbouwing zonder HTML. `checkedOn` is een geldige controledatum in `JJJJ-MM-DD`, niet in de toekomst. Bij `unknown` blijft `commercialEvidence` afwezig of `null`. De gegevens- en publicatiecontroles toetsen deze structuur. De inhoudelijke juistheid van een beheerde classificatie moet uit de vastgelegde broncontrole blijken.

De automatische route voor nieuwe bijdragen stelt strengere eisen: de bron moet bij de bekende aanbieder horen, volledig uitgelezen worden en de letterlijke onderbouwende zin moet de commerciële of niet-commerciële aard van het aanbod expliciet benoemen. Een prijs, bedrijfsvorm, algemene licentievoorwaarde of aangevinkte keuze geldt niet als zelfstandig bewijs. Twijfelgevallen blijven ter beoordeling; er wordt geen persoonlijk akkoord van Eva toegekend.

## Aanbodvorm voor publieksfilters

`offerCategory` is een optionele redactionele indeling van de vorm, naast het
bestaande `recordType`. Toegestane waarden zijn `software`, `materials` en
`knowledge`. De website toont **Les- en werkmaterialen** en **Handreikingen,
kennisbanken en ondersteuning**. De categorie `software` blijft in de canonieke
gegevens bewaard; de 12 bestaande softwarevermeldingen zijn publiek uitgesloten.

- `software`: een AI-toepassing of AI-werkomgeving om daadwerkelijk te gebruiken.
  Ook aanbod in ontwikkeling kan hieronder vallen; beschikbaarheid blijft apart.
- `materials`: lessen, werkbladen, kaarten, spellen, vragenlijsten, scans en
  andere materialen waarmee gebruikers zelf werken. Een online scan of
  promptverzameling is daardoor niet automatisch AI-software.
- `knowledge`: uitleg, bronnenverzamelingen, catalogi, advies en toegang tot
  ondersteuning. Een portaal naar trainingen is geen afzonderlijke training.

Een indeling kan uit de bestaande gecontroleerde beschrijving volgen. Leg deze
redactionele wijziging vast in `changeHistory`; wijzig `lastVerified` niet zonder
nieuwe broncontrole. De indeling zegt niets over kwaliteit, veiligheid of
verantwoord gebruik. Bronverwijzingen, beschikbaarheid en onzekerheid blijven
zelfstandig zichtbaar.

Bij handreikingen zonder expliciete indeling gebruikt de interface `knowledge`.
Bij oudere producten of voorzieningen zonder indeling toont de interface
**Aanbodvorm nog niet ingedeeld**. Nieuwe bijdragen worden niet op grond van hun
naam automatisch als AI-software aangemerkt. Alle overige recordsoorten behouden
hun eigen herkenbare keuze, waaronder trainingen, subsidies en praktijkvoorbeelden.

De publieke filterwaarden zijn korte sleutels (`type=materials`,
`type=knowledge`), zodat komma's in een weergavenaam geen extra filters veroorzaken.
Oude URL's met bijvoorbeeld `type=Hulpmiddel`, `type=Voorziening` of
`type=Handreiking` behouden hun selectie binnen het resterende publieke aanbod. Kaarten, detailpagina's
en nieuwe filters gebruiken de nieuwe vormnamen.

## Redactionele uitsluiting van publieke weergave

Het optionele object `publicationExclusion` bevat een niet-lege `reason` en een
beslisdatum `decidedOn` in `JJJJ-MM-DD`. De aanwezigheid sluit een record uit van
de publieke data, zoekindex en interface. Ook een onjuist ingevulde uitsluiting
wordt nooit als toestemming tot weergave behandeld; de datavalidatie blokkeert
dan de release.

Op 9 september 2026 zijn op verzoek van Eva de 12 zelfstandige
softwarevermeldingen uitgesloten om verwarring over de reikwijdte te voorkomen.
De canonieke records, relaties, broncontrole en beschikbaarheid blijven bewaard.
Terugplaatsen vergt een expliciet redactioneel besluit; een nieuwe broncontrole
heft de uitsluiting niet op.

## Vaste neutrale informatievelden

Elke vermelding gebruikt dezelfde feitelijke velden: titel, aanbieder, soort aanbod, functie, doelgroep, sector, thema, beschikbaarheid, kosten, toegang, commerciële aard, officiële bron en controledatum. Ontbrekende informatie blijft herkenbaar als onbekend. `purpose` legt de opgegeven functie vast; `description` blijft beschikbaar voor compatibiliteit en broncontrole. Nieuwe automatische bijdragen bevatten daarin alleen volledige, feitelijke bronzinnen. Wervende superlatieven, garanties en koopoproepen worden niet automatisch verwerkt, ook niet wanneer de aanbieder ze zelf publiceert.

Een vermelding is geen goedkeuring, kwaliteitsbeoordeling of aanbeveling door de Atlas of Eva. De commerciële kwalificatie is informatie over de aard van het aanbod, geen kwaliteitsoordeel. Bestaande records worden door deze modeluitbreiding niet massaal geherclassificeerd.

Relaties staan los in `data/relations.json` met `sourceId`, `relationType`, `targetId`, `sourceUrl` en `verificationStatus`. Toegestane relatietypen zijn `offered_by`, `part_of`, `funded_by`, `relevant_for`, `related_to`, `replaces`, `successor_of`, `based_on`, `implements`, `governed_by`.
