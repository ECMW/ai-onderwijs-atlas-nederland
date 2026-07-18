# Huisstijl Eva Willems: Strand

De huisstijl combineert de rust van het Nederlandse strand met de zakelijkheid van een publiek kennisplatform. Zij is bewust niet trendgevoelig en kan zowel voor de AI & Onderwijs Atlas als voor `www.evawillems.nl` worden gebruikt.

## Karakter

- rustig en betrouwbaar;
- analytisch en toegankelijk;
- publiek en professioneel;
- warm zonder informeel te worden;
- herkenbaar zonder een zwaar logo- of beeldmerkensysteem.

## Typografie

Voorkeurslettertype: **Aptos**. De website vraagt geen extern lettertype op. Daardoor is er geen trackingverzoek, blijft de pagina snel en wordt Aptos gebruikt wanneer het lokaal is geinstalleerd.

```css
font-family: "Aptos", "Aptos Display", "Segoe UI", system-ui, sans-serif;
```

Koppen gebruiken dezelfde familie met een stevig gewicht en compacte regelafstand. Lopende tekst houdt ruime regelafstand.

## Kleuren

| Rol | Naam | Hex |
|---|---|---|
| Primaire donkere kleur | Blauwgrijs diep | `#344f5d` |
| Secundaire kleur | Blauwgrijs | `#607783` |
| Inhoudelijk accent | Olijfgroen diep | `#4f583d` |
| Zacht accent | Olijfgroen | `#6f7651` |
| Warme achtergrond | Duin | `#f6f2e9` |
| Lichte achtergrond | Schelp | `#fcfaf6` |
| Vlak en lijn | Zand | `#e8dfcf` |
| Koel vlak | Mist | `#e8eef0` |
| Hoofdtekst | Inkt | `#28383f` |
| Toetsenbordfocus | Warm koper | `#b7662f` |

Blauwgrijs draagt navigatie, primaire knoppen en vertrouwen. Olijfgroen markeert inhoudelijke accenten, status en selectie. Beige en grijs maken grote informatievlakken rustiger. Koper wordt alleen gebruikt voor toetsenbordfocus.

## Hergebruik

`brand.css` bevat alle ontwerptokens. Voor een nieuwe website:

1. neem het `:root`-blok en de fontstack over;
2. laad projectspecifieke componentstijlen eerst en de huisstijl daarna;
3. gebruik blauwgrijs voor primaire acties en olijf voor inhoudelijke accenten;
4. gebruik duin en schelp voor rustige achtergronden;
5. behoud de koperkleur voor focus, niet voor decoratie;
6. voeg geen extern fontscript toe alleen om Aptos af te dwingen.

De Atlas bevat onder `Compatibility tokens` vertalingen naar bestaande namen zoals `--navy`, `--green` en `--line`. Een nieuwe site kan direct de beschrijvende `--brand-*`-variabelen gebruiken.

## Vormtaal

- afgeronde hoeken van 8 tot 12 pixels;
- dunne zandkleurige randen;
- zachte blauwgrijze schaduwen;
- ruime witruimte;
- eenvoudige kaarten met maximaal een primair accent;
- geen drukke glanseffecten of decoratieve animaties.

Het ronde Atlas-teken gebruikt drie kleurzones als abstracte verwijzing naar lucht, duin en strand. Het is ondersteunend; de naam blijft het belangrijkste herkenningspunt.

De startpagina gebruikt dezelfde gelaagde horizon als de sociale voorvertoning. De herbruikbare vector staat in `assets/strand-horizon.svg`; gebruik deze vorm vooral voor brede introductievlakken en niet als decoratie achter lange inhoud.

## Toegankelijkheid

Donkere tekst en primaire acties hebben ruim contrast op de lichte achtergronden. Interactieve elementen houden een duidelijke focusring en mobiele hoofdacties zijn minimaal ongeveer 44 pixels hoog. Kleur is nooit de enige informatiedrager. Animatie blijft minimaal en respecteert `prefers-reduced-motion`.


## Sociale voorvertoning

`assets/social-preview.png` is de vaste 1200 x 630-voorvertoning voor LinkedIn en andere platforms die Open Graph ondersteunen. Zij gebruikt uitsluitend de Strand-kleuren, systeemlettertypen en projecttekst; er worden geen externe beeld- of fontverzoeken gedaan.
