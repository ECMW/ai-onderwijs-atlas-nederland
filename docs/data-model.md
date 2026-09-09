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

## Vaste neutrale informatievelden

Elke vermelding gebruikt dezelfde feitelijke velden: titel, aanbieder, soort aanbod, functie, doelgroep, sector, thema, beschikbaarheid, kosten, toegang, commerciële aard, officiële bron en controledatum. Ontbrekende informatie blijft herkenbaar als onbekend. `purpose` legt de opgegeven functie vast; `description` blijft beschikbaar voor compatibiliteit en broncontrole. Nieuwe automatische bijdragen bevatten daarin alleen volledige, feitelijke bronzinnen. Wervende superlatieven, garanties en koopoproepen worden niet automatisch verwerkt, ook niet wanneer de aanbieder ze zelf publiceert.

Een vermelding is geen goedkeuring, kwaliteitsbeoordeling of aanbeveling door de Atlas of Eva. De commerciële kwalificatie is informatie over de aard van het aanbod, geen kwaliteitsoordeel. Bestaande records worden door deze modeluitbreiding niet massaal geherclassificeerd.

Relaties staan los in `data/relations.json` met `sourceId`, `relationType`, `targetId`, `sourceUrl` en `verificationStatus`. Toegestane relatietypen zijn `offered_by`, `part_of`, `funded_by`, `relevant_for`, `related_to`, `replaces`, `successor_of`, `based_on`, `implements`, `governed_by`.
