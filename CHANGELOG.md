# Changelog

## Catalogusherontwerp — juli 2026

### Gewijzigde bestanden

- `index.html`: catalogusnavigatie en nieuwe assets.
- `catalog.css`: tweekoloms catalogus, horizontale kaarten en mobiel filterpaneel.
- `catalog.js`: zoek-, filter-, sorteer-, URL- en pagineringslogica.
- `README.md`: catalogusgedrag en witte-vlekkenbeleid.

### Nieuwe interacties

- Brede zoekbalk met categoriekeuze.
- Checkboxfilters met aantallen voor categorie, thema, sector, doelgroep en status.
- OR binnen filtergroepen en AND tussen groepen.
- Direct filteren, actieve chips, wissen, sorteren en maximaal 25 resultaten per pagina.
- Deelbare filter-URL's en browsergeschiedenis.
- Horizontale vergelijkingskaarten met veilige bronlinks.
- Witte vlekken als afzonderlijke geïdentificeerde behoefte.
- Mobiel filterpaneel dat met Escape sluit en focus teruggeeft.

### Uitgevoerde tests

- JavaScript-syntaxcontrole.
- Zoeken op `toetsing`: acht resultaten.
- Filterstatus in URL-hash.
- Geen browserconsolefouten in de geteste zoekroute.
- Bestaande dataset van 65 records ongewijzigd.

### Inhoudelijke onzekerheden

- De bronactualiteit blijft juli 2026.
- Rollen en organisatietypen zijn afgeleid voor filtering, niet toegevoegd aan bronrecords.
- Records met `Te verifiëren` of `Nog niet ingevuld` vereisen bronvalidatie.
