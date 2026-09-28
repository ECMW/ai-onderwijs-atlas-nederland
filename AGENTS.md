# AI & Onderwijs Atlas: vaste werkregels

Lees voor inhoudelijke wijzigingen eerst `README.md`, `docs/source-policy.md`,
`sources/README.md`, `docs/editorial-policy.md` en `docs/data-model.md`. Behoud
de bestaande Atlas-taxonomie en scheid canonieke records, publieke projectie,
operationele bronmonitoring en de kennisbibliotheek.

## Bronnenwerk

1. Raadpleeg eerst `sources/sources.json` en `sources/claim-links.json`.
2. Hergebruik relevante bestaande bronnen en controleer of zij sinds
   `last_verified` zijn gewijzigd, vervangen of ingetrokken.
3. Doe een actuele webcontrole bij tijdgevoelige feiten, wetgeving, guidance,
   standaarden, calls, cijfers, kosten, beschikbaarheid en technische claims.
4. Geef voorrang aan primaire officiële bronnen, daarna peer-reviewed onderzoek,
   gezaghebbende institutionele publicaties en pas daarna secundaire uitleg.
5. Voeg nieuwe betrouwbare bronnen met volledige metadata aan de centrale
   bibliotheek toe; voorkom dubbele ID's, URL's en DOI's.
6. Verwijder oude bronnen niet stilzwijgend. Gebruik `superseded` of `archived`
   en leg de opvolger of reden vast.
7. Voeg geen feitelijke claim toe zonder voldoende bewijs. Leg ontbrekend,
   gemengd of strijdig bewijs als `EVIDENCE_GAP`, `CONTESTED` of
   `SUPPORTED_WITH_LIMITS` vast.
8. Houd wetgeving, beleid, niet-bindende guidance, vrijwillige standaarden,
   preprints, peer-reviewed bewijs en leveranciersinformatie uit elkaar.
9. Gebruik leveranciersbronnen alleen voor controleerbare feiten over het eigen
   systeem of aanbod; marketingclaims zijn geen onafhankelijk bewijs.
10. Zoek ook naar tegenbewijs en beperkingen. Beschrijf afzonderlijk wat de bron
    aantoont, wat redelijk kan worden afgeleid en wat Atlas-synthese is.
11. Behoud het auteurschap van oorspronkelijke Atlas-analyses en taxonomieën.
    Schrijf die niet aan externe bronnen toe en publiceer geen interne methoden
    of niet-openbare context via de bronnenbibliotheek.

`data/sources.json` is uitsluitend het operationele ontdek- en monitorregister.
Bibliografische bronnen en claimkoppelingen horen in `sources/`. Bewerk
`data/data-v2.js` en `data/search-index.json` nooit los van
`data/records.json`.

Voer bij inhoudelijke wijzigingen minimaal uit:

```text
python scripts/validate_sources.py
python scripts/validate_data.py
python scripts/generate_data.py
python scripts/quality_gate.py --strict
python -m unittest discover tests -v
git diff --check
```

Voer `generate_data.py` alleen uit wanneer canonieke records of geladen
JavaScript/CSS zijn gewijzigd. Publiceer pas na geslaagde controles en verifieer
na publicatie de exacte release en een verse browserlading.
