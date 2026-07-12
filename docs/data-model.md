# Datamodel v2

De canonieke dataset is `data/records.json`. Verplichte velden zijn `id`, `title`, `recordType`, `status` en `verificationStatus`.

Enums:

- recordType: `organization`, `programme`, `product`, `service`, `guidance`, `training`, `subsidy`, `funding_call`, `pilot`, `practice_example`, `community`, `standard`, `legislation`, `policy_document`, `research_project`, `identified_need`, `white_spot`.
- status: `available`, `pilot`, `in_development`, `planned`, `open_call`, `closed_call`, `archived`, `needs_verification`, `identified_need`, `unknown`.
- verificationStatus: `verified`, `recently_checked`, `stale`, `changed`, `broken_source`, `needs_review`.
- accessType: `public`, `registration_required`, `paid`, `unknown`.
- costType: `free`, `paid`, `freemium`, `unknown`.
- sourceType: `official`, `authoritative`, `secondary`.

Status beschrijft het aanbod; verificatiestatus beschrijft de betrouwbaarheid en actualiteit van de registratie. De configureerbare redactionele norm is `VERIFICATION_STALE_DAYS = 90`.

Relaties staan los in `data/relations.json` met `sourceId`, `relationType`, `targetId`, `sourceUrl` en `verificationStatus`. Toegestane relatietypen zijn `offered_by`, `part_of`, `funded_by`, `relevant_for`, `related_to`, `replaces`, `successor_of`, `based_on`, `implements`, `governed_by`.
