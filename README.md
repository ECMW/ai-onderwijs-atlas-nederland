# AI & Onderwijs Atlas Nederland

De publieke interface is taakgestuurd: bezoekers zoeken eerst op hun vraag en verfijnen daarna op thema, sector, soort aanbod, doelgroep, beschikbaarheid, organisatie en actualiteit. Alle selecties worden in de URL bewaard en zijn daardoor deelbaar.

De standaardvolgorde gebruikt een transparant relevantiemodel: titelmatches wegen het zwaarst, gevolgd door thema's en trefwoorden, daarna beschrijving. Direct beschikbaar en recent gecontroleerd aanbod krijgt een kleine bonus; te verifiëren aanbod niet.

Een statisch, toegankelijk kennisplatform dat zonder installatie werkt. Open `index.html` in een moderne browser.

## Beheerarchitectuur

De canonieke v2-data staat in `data/records.json`. GitHub Actions valideert en publiceert iedere merge naar `main`. Officiële bronnen worden dagelijks op metadatawijzigingen gecontroleerd; resultaten worden uitsluitend als reviewvoorstel of Issue aangeboden. Zie `docs/update-process.md`.

## Gegevens toevoegen

De website leest de gegevens uit `data/data.js`, zodat zij ook via `file://` werkt. Voeg per bronrecord een object toe aan `items`. Gebruik minimaal `id`, `title` en `type`. Ondersteunde velden zijn onder meer `description`, `organisation`, `sector` (array), `audience`, `keywords` (array), `status`, `year`, `url`, `related` (array) en `added` (ISO-datum). Ontbrekende velden worden als “Nog niet ingevuld” getoond.

`data/items.json` is beschikbaar als uitwisselingsformaat. Houd dit bestand bij publicatie gelijk aan `data/data.js`.

## Publiceren

Vervang vóór publieke publicatie de voorbeeld-URL in `index.html`, `robots.txt` en `sitemap.xml` door het definitieve domein. Publiceer vervolgens de volledige map op een statische webserver.

## Bronbeleid

Neem uitsluitend informatie over uit de aangeleverde markdownbronnen. Voeg geen aannames toe. Voeg duplicaten samen en leg herkomst bij voorkeur per record vast.

## Catalogusinteracties

De zoekcatalogus ondersteunt directe filters op categorie, thema, sector, doelgroep en status. Filters binnen één groep werken als OR; verschillende groepen als AND. De selectie wordt in de URL-hash opgeslagen en is daardoor deelbaar. Witte vlekken worden als geïdentificeerde behoefte weergegeven en niet als beschikbaar aanbod.
