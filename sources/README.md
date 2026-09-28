# Kennis- en bronnenbibliotheek

Deze map bevat de claimgerichte kennisbasis van de Atlas. Zij vult twee bestaande
bronlagen aan zonder hun functie over te nemen:

- `data/records.json[].sourceUrls` bewijst het bestaan en de kenmerken van een
  concreet Atlas-aanbod;
- `data/sources.json` stuurt operationele ontdekking en bronmonitoring;
- `sources/sources.json` registreert gezaghebbende publicaties voor juridische,
  bestuurlijke, technische en wetenschappelijke claims;
- `sources/claim-links.json` legt vast welke bron een bestaande Atlas-claim
  ondersteunt, begrenst, tegenspreekt of nog niet voldoende onderbouwt.

De bibliotheek staat in de publieke repository, maar wordt niet als onderdeel
van het GitHub Pages-catalogusartifact gepubliceerd. Sla geen volledige
bronteksten, persoonsgegevens, vertrouwelijke analyses of interne methoden op.

## Bronrecord

Elk record bevat minimaal:

- `source_id`: stabiele, unieke sleutel;
- `title` en `author_or_organisation`;
- `publication_date`: `YYYY`, `YYYY-MM` of `YYYY-MM-DD`, zonder schijndetail;
- `url_or_doi`: canonieke publieke HTTPS-locatie;
- `source_type`, `primary_or_secondary`, `legal_effect` en
  `peer_review_status`;
- bestaande Atlas-`topics` en `jurisdiction`;
- begrensde `claims_supported`;
- `reliability_notes` en `limitations`;
- `last_verified` en `status` (`active`, `superseded` of `archived`);
- waar van toepassing `atlas_record_ids`.

Een bronrecord zegt niet dat alle inhoud van de publicatie waar is, dat een
instrument juridisch bindend is of dat een beschreven interventie effectief is.
Die reikwijdte hoort expliciet in `legal_effect`, `reliability_notes` en
`limitations`.

## Claimkoppeling

Een claimkoppeling verwijst naar een bestaand bestand en, bij records, naar een
stabiele `record_id` en veldnaam. `claim_kind` bewaakt het onderscheid tussen:

- `source_statement`: wat een bron rechtstreeks stelt of vastlegt;
- `reasonable_inference`: een begrensde afleiding uit één of meer bronnen;
- `atlas_synthesis`: eigen analyse of synthese van de Atlas.

`evidence_status` is `SUPPORTED`, `SUPPORTED_WITH_LIMITS`, `CONTESTED` of
`EVIDENCE_GAP`. Een evidence gap mag een lege `source_ids`-lijst hebben: een bron
wordt nooit verzonnen om een veld te vullen. Tijdgevoelige claims krijgen een
`review_by`-datum.

## Onderhoudsstappen

1. Zoek eerst op ID, titel, DOI en genormaliseerde URL naar doublures.
2. Open de oorspronkelijke bron en controleer titel, eigenaar, datum, status en
   reikwijdte; een zoekresultaat is geen bewijs.
3. Zoek bij materiële claims ook naar tegenbewijs en methodologische beperkingen.
4. Werk de bron en relevante claimkoppelingen in dezelfde wijziging bij.
5. Markeer een vervangen bron als `superseded` met `superseded_by`; archiveer
   alleen met een reden.
6. Noteer de onderzoeksbeslissing beknopt in `research-log.md`.
7. Draai `python scripts/validate_sources.py` en de volledige testset.

De validator controleert onder meer verplichte velden, enums, datums, UTF-8,
unieke ID's en URL's, bronstatus, preprintmarkering en verweesde bron-, claim- en
recordkoppelingen. Een actieve bron die langer dan 90 dagen niet is geverifieerd
wordt zichtbaar als waarschuwing.
