# Dagelijkse bezoekersmeting

Deze editie schakelt dagelijkse bezoekersmeting in op het door Eva opgegeven
account `https://ecmw.goatcounter.com/`. Eva heeft publicatie en controle van de
eerste meting op 9 september 2026 expliciet goedgekeurd. Het ingelogde dashboard
is gecontroleerd: privé, alleen Sessions verzamelen. Eva heeft daarna expliciet
gevraagd het bezoekentotaal ook op de Atlas te tonen als sociaal bewijs; daarvoor
is destijds de openbare teller aangezet terwijl het dashboard privé bleef.
Op 6 november 2026 heeft Eva gevraagd het bezoekentotaal weer van de site te
verwijderen. De Atlas haalt dit totaal niet meer op en toont het nergens.
Op 22 november 2026 is ook het openbaar opvragen van tellerstanden uitgezet.
Een verse aanvraag zonder aanmelding kreeg HTTP 403. De dagreeks blijft beschikbaar in het ingelogde dashboard.
De tijdzone staat op Nederland. De eerste live ontvangst is op 9 september 2026
bevestigd in het privé dashboard na publicatie via pull request #77.
Sinds de domeinwisseling op 22 november 2026 is ook de productiepagina op
`aionderwijsatlas.nl` toegestaan. Het telpad blijft gelijk zodat de dagreeks
doorloopt. Tussen de omschakeling en het herstel werden bezoeken op het nieuwe
domein gemist. Dat tijdvak is achteraf niet uit deze meting te reconstrueren.
Eerdere bezoekersaantallen worden hiermee niet teruggehaald.

## Wat Eva krijgt

Een privé dashboard met **gemeten bezoeken per dag**, met de Nederlandse
tijdzone (de account-UI noemt deze `Netherlands: Europe/Brussels (CEST, CET)`).
De telling werkt na publicatie onafhankelijk van de laptop.
Gebruik de trend om het bereik van de Atlas te volgen; het getal is geen exact
aantal unieke mensen. GoatCounter herkent herhaalde bezoeken aan hetzelfde pad
binnen een sessie van ongeveer acht uur. Dezelfde persoon kan later opnieuw
meetellen; mensen met vergelijkbare browserkenmerken achter hetzelfde netwerk
kunnen samenvallen. Privacyinstellingen, blokkades en bots beïnvloeden de telling.
Gebruik de vaste Atlas-pagina voor de historische bezoekreeks. De pilot heeft
een eigen groep gebeurtenissen in hetzelfde privédashboard.

## Vierweekse pilot, 22 november t/m 19 december 2026

Na publicatie loopt de pilot tot 20 december 2026 om 00.00 uur Nederlandse tijd.
Bij elk signaal controleert de browser de eindtijd opnieuw, ook in een open tab.
Daarna blijft voor ongetagde bezoeken alleen de gewone bezoekmeting actief.
De afzonderlijke, vaste updatelink hieronder heeft geen einddatum.
Het laatst gecontroleerde gegevensprofiel verzamelt uitsluitend Sessions.

| Vraag | Vaste gebeurtenisnamen in GoatCounter | Wat ze meten |
| --- | --- | --- |
| Hoe komen bezoekers binnen? | `herkomst-zoekmachine`, `herkomst-sociaal`, `herkomst-overig`, `herkomst-onbekend` | De browser herkent enkele zoekmachines en sociale netwerken. Overige externe verwijzers vormen samen één groep. Een ontbrekende of onleesbare verwijzer is onbekend en kan ook direct bezoek, een gedeelde link of een privacyinstelling betekenen. Een herkenbare interne verwijzer telt niet als instroom. |
| Hoe lang duurt laden? | `laadtijd-tot-2s`, `laadtijd-2-tot-5s`, `laadtijd-boven-5s` | Tijd tot het begin van de browsergebeurtenis `load` van een werkend, zichtbaar document: tot en met 2 seconden, meer dan 2 tot en met 5, of meer dan 5. De initiële presentatie van afzonderlijke kaartjes of de optioneel geladen paperlijst kan hiervan afwijken. |
| Welke bronnen openen mensen? | `gebruik-lesmateriaal-open`, `gebruik-subsidie-open`, `gebruik-paper-open` | Activeren van een officiële lesmateriaalbron, een officiële subsidie- of callbron, of een DOI in de paperlijst. De Atlas kan niet zien of een externe site laadt, iemand een publicatie leest, les geeft of een aanvraag indient. |
| Welk materiaal kiezen mensen? | `materiaal-<openbare Atlas-code>`, met de officiële Atlas-titel van het materiaal | Een klik op een externe bron van geverifieerd openbaar les- of werkmateriaal. Een vermelding bekijken, in een vergelijking opnemen of een kaart openklappen telt niet als bronkeuze. |
| Gebruiken mensen de bibliografie? | `gebruik-literatuurlijst` | De browser heeft na een menselijke actie het downloaden van een niet-lege RIS-selectie gestart. Opslaan en importeren op het eigen apparaat blijven buiten beeld. |
| Loopt zoeken vast? | `gebruik-zoeken-zonder-resultaat` | Een uitgevoerde zoekterm of toegepaste filterselectie levert nul catalogusresultaten. Dit omvat ook een rechtstreeks gedeelde selectie. Zoeksuggesties, een lege paperselectie en alleen het veranderen van de sorteervolgorde tellen niet als zoekopdracht. |

Instroom en laadtijd vereisen een zichtbare nieuwe navigatie en ondersteunde
Navigation Timing. Herladen, terug/vooruit en activering van een vooraf geladen
pagina leveren geen nieuwe herkomst- of snelheidsmeting op. Blokkades, een
onbekende verwijzer en trage pagina's die bezoekers voortijdig sluiten beperken
de dekking. Elk signaal telt hoogstens één keer per document, ook bij meerdere
klikken of het opnieuw tekenen van de resultaten. Een nieuw document heeft
een nieuwe telling; GoatCounter kan terugkerende sessies zelf samenvoegen.
Een gebeurtenis is een gebruikssignaal en geen maat voor aantallen personen,
een individuele route, leerresultaat of maatschappelijke impact.

Open in het privédashboard de dagweergave voor
[materiaalkeuzes](https://ecmw.goatcounter.com/?group=day&filter=is%3Aevent%20in%3Apath%20at%3Astart%20materiaal-),
[gebruik](https://ecmw.goatcounter.com/?group=day&filter=is%3Aevent%20in%3Apath%20at%3Astart%20gebruik-),
[routes](https://ecmw.goatcounter.com/?group=day&filter=is%3Aevent%20in%3Apath%20at%3Astart%20route-),
[herkomst](https://ecmw.goatcounter.com/?group=day&filter=is%3Aevent%20in%3Apath%20at%3Astart%20herkomst-) of
[laadtijd](https://ecmw.goatcounter.com/?group=day&filter=is%3Aevent%20in%3Apath%20at%3Astart%20laadtijd-). Kies
voor de bezoektrend uitsluitend het vaste paginapad
`/ai-onderwijs-atlas-nederland/`. Lees elke categorie apart: één bezoek kan
meerdere verschillende signalen opleveren. Het onbewerkte totaal van
pagina's en gebeurtenissen is daardoor geen noemer voor bezoekerspercentages.

Bij **materiaalkeuzes** staat iedere openbare titel onder één vaste materiaalcode,
gedeeld door de catalogus, de detailkaart en de statische lesgids. Twee verschillende
materialen kiezen levert twee materiaalrijen op. Herhaald klikken op hetzelfde
materiaal in één geopend document telt één keer. De overkoepelende gebruiksrij
voor lesmateriaal telt eveneens hoogstens één keer per document, ongeacht hoeveel
materialen iemand koos. Kijk welke titels in de gekozen periode het vaakst een
bronklik kregen. De positie in de lijst en het aantal plekken waar een materiaal
zichtbaar is, kunnen dat beïnvloeden.

Bij een filter zonder treffers kan GoatCounter de gewone pagina's tonen. Lees
uitsluitend gebeurtenisrijen waarvan de code met de gekozen groep begint. Ontbreken
die, dan is er voor die groep in die periode geen waargenomen signaal.

## De vaste link voor een LinkedIn-update

Deel [de Atlas-updatelink](https://aionderwijsatlas.nl/?via=linkedin-update)
in de update. In het [privéoverzicht voor deze link](https://ecmw.goatcounter.com/?group=day&filter=is%3Aevent%20in%3Apath%20at%3Astart%20linkedin-update-)
staan twee vaste gebeurtenissen.

- `linkedin-update-bezoek` telt het openen van de link op de zichtbare startpagina
  bij een nieuwe navigatie. Een herlading, directe dieplink, terug/vooruit of
  vooraf geladen pagina levert geen campagneopening op. Er moet precies één
  `via`-waarde zijn die overeenkomt met `linkedin-update`. Overige parameters
  worden genegeerd en de privacyuitsluiting `atlas-no-count` blijft leidend.
- `linkedin-update-vervolgstap` telt hoogstens één bewuste handeling in datzelfde
  geopende document. Dat kan de officiële bron van lesmateriaal of een subsidie
  zijn, een DOI in de paperlijst, een gestarte RIS-download of de link naar de
  lesgids. Navigatie tussen Atlas-schermen binnen dat document mag voorafgaan
  aan de keuze. Bij een nieuw document eindigt de koppeling.

Deze twee signalen blijven ook na 19 december 2026 werken. Beide verzenden
alleen hun vaste code en omschrijving. De campagne gebruikt geen cookies,
browseropslag, bron- of materiaaltitel, zoekterm, URL, referrer of extra
bezoekerskenmerk. Het openen van een doorgestuurde link telt ook. De cijfers
zeggen iets over het gebruik van deze link en een eerste vervolgstap.
Het platform van herkomst en het bereik van het bericht blijven onbekend.


GoatCounter is momenteel gratis voor redelijk openbaar gebruik, waaronder
persoonlijke websites en kleine/middelgrote bedrijven. De Atlas lijkt binnen die
omschrijving te passen; de voorwaarden van de aanbieder blijven van toepassing.

## Inrichting en uitrolcontrole

1. Het bestaande account is [ecmw.goatcounter.com](https://ecmw.goatcounter.com/).
   Alleen de Atlas krijgt de koppeling. Het sitedomein is `ecmw.github.io`.
   Een wachtwoord of API-token is niet nodig voor het tellen en hoort niet in
   de repository of chat. Inloggen gebeurt door Eva in de browser.
2. De accountinstellingen zijn op 9 september 2026 gecontroleerd en opgeslagen:
   tijdzone Nederland, dashboard alleen voor ingelogde gebruikers. **Allow adding
   visitor counts on your website** is op 22 november 2026 uitgezet.
   Onder **Data collection** staat alleen **Sessions** aan.
   **Individual pageviews**, **Referrer**, **User-Agent**, **Size**, **Country**,
   **Region** en **Language** staan uit. Sessions gebruikt nog steeds tijdelijk
   IP-adres en browserkenmerken voor ontdubbeling. **Your site** staat op
   `https://ecmw.github.io`, omdat GoatCounter het gemeten Atlas-pad zelf toevoegt.
   Bevestiging van het accountadres gebeurt via de e-mail van GoatCounter.
3. De accountnaam `ecmw` staat bij `atlas-goatcounter-site` in `index.html`.
   Het account is door Eva opgegeven en in de ingelogde account-UI gecontroleerd.
4. Voer de generator, datavalidatie, strikte quality gate, regressietests en
   `git diff --check` uit. Publiceer pas na Eva's expliciete goedkeuring.
5. Controleer de release en bezoekershandelingen met `?atlas-no-count=1` of
   gesimuleerde meetverzoeken. Het privédashboard kan later ontvangst van
   werkelijke bezoekers bevestigen. Stuur daarvoor geen proefgebeurtenissen in.
6. Bekijk [de grafiek per dag](https://ecmw.goatcounter.com/?group=day).
   Een dagelijkse e-mail is een optionele accountinstelling; de koppeling
   activeert geen e-mails of Codex-taak.

## Technische afbakening

`analytics.js` gebruikt de gedocumenteerde browser-GET naar `/count`. Het vaste
pad `/ai-onderwijs-atlas-nederland/` bundelt de Atlas en de lesmaterialenpagina.
Het gewone bezoek stuurt `p`, de vaste Atlas-titel in `t`, een lege `r` en
`rnd`. Pilotgebeurtenissen gebruiken `e=1`, een lege `r` en `rnd`. Bij
algemene signalen zijn `p` en `t` vaste Nederlandse categorieën. Alleen bij
een gekozen lesmateriaalbron bevat `p` de openbare materiaalcode met
`materiaal-` ervoor en `t` de bijbehorende openbare titel uit de catalogus.
Andere record-ID's en titels, echte URL's, zoektermen, filterwaarden, exacte
tijdmetingen en schermformaten worden nooit meegestuurd. De verwijzer wordt alleen lokaal
omgezet in een categorie. De integratie gebruikt geen cookies of browseropslag;
een tijdelijke verzameling vaste namen in het geheugen voorkomt dubbeltellingen. `credentials:
'omit'` en `referrerPolicy: 'no-referrer'` sluiten cookies en de Referer-header uit.
De willekeurige `rnd` voorkomt caching en is geen blijvend bezoekerskenmerk.

De standaard externe `count.js` wordt niet geladen: die kan `location.search`
als campagnegegevens meesturen, ook bij een vast ingesteld paginapad.
Er is geen externe script-afhankelijkheid voor het starten van de Atlas.
De website haalt geen openbaar bezoekentotaal op.
Een mislukt telverzoek wordt opgevangen. De beschikbaarheidsmonitor meldt
laad- of integriteitsfouten in het optionele analyticsbestand als waarschuwing;
die mogen geen automatische terugzetting van een werkende Atlas veroorzaken.
De controles vóór publicatie blijven ook dit JavaScriptbestand strikt valideren.
Tests simuleren de verzoeken lokaal;
er worden geen fictieve bezoeken naar een echte teller gestuurd.

Alleen de startdocumenten en `lesmateriaal/` (ook beide `index.html`-varianten)
op het eigen domein en het oorspronkelijke GitHub Pages-projectpad mogen tellen.
Het startdocument vereist een werkende Atlas, de statische lesmaterialenpagina
haar eigen directorymarkering. Do Not Track, Global Privacy Control,
`navigator.webdriver`, verborgen documenten, prerendering en iframes zijn uitgesloten. Eigen bezoeken
kunnen per opening worden overgeslagen met `?atlas-no-count=1` vóór de hash.
Blokkering van alle bots is niet gegarandeerd.

Stoppen kan door de accountnaam weer leeg te maken en de gecontroleerde versie
te publiceren. De aanbieder beheert de statistieken; ze worden niet openbaar
in de Atlas of repository opgeslagen. Een sitecode is openbaar en beschermt
niet tegen kunstmatig ingestuurde tellingen.

## Primaire bronnen

GoatCounter-inrichting gecontroleerd op 9 september 2026. Pixelparameters,
gebeurtenissen en Navigation Timing geraadpleegd voor de pilot op 22 november 2026.

- [Dienst en gratis gebruik](https://www.goatcounter.com/)
- [Sessies en telwijze](https://www.goatcounter.com/help/sessions)
- [Pixel en stabiele parameters](https://www.goatcounter.com/help/pixel)
- [GoatCounter-gebeurtenissen](https://www.goatcounter.com/help/events)
- [Navigation Timing van het W3C](https://www.w3.org/TR/navigation-timing-2/)
- [Privacybeleid](https://www.goatcounter.com/help/privacy)
- [Instellingen in de broncode](https://github.com/arp242/goatcounter/blob/main/settings.go)
- [Standaard meetscript](https://github.com/arp242/goatcounter/blob/main/public/count.js)

De accountinstellingen zijn bevestigd in de werkelijke account-UI en de
publicatie is goedgekeurd. E-mailbevestiging is een accountactie voor Eva.
De eerste live meting is bevestigd na een bezoek aan de gepubliceerde Atlas;
het bezoekentotaal wordt sinds 6 november 2026 niet meer op de Atlas getoond. Bij latere wijzigingen
blijft een live controle nodig: een geslaagde lokale test bewijst geen ontvangst.
Ontwikkelbroncode bewijst geen specifieke productieconfiguratie.

## Zoekkeuzes en lesmateriaal in de proef

Vergelijk de tellers binnen hetzelfde datumbereik. Elke teller neemt per geladen document hoogstens eenmaal toe.

| Vraag | Basis | Uitkomst |
|---|---|---|
| Levert zoeken iets op? | `route-zoekselectie` telt een uitgevoerde selectie op de zoekpagina met een zoekterm of actief filter. Ook een gedeelde selectie telt. | `route-zoekselectie-met-resultaat` telt minstens één treffer. `gebruik-zoeken-zonder-resultaat` telt nul treffers. Een bezoeker die de selectie wijzigt kan in hetzelfde document beide uitkomsten bereiken. |
| Kiezen lezers materiaal uit de lesgids? | `route-lesgids-bekeken` telt de geopende statische lesgids. | `route-lesgids-bron-gekozen` telt het activeren van een geverifieerde externe materiaallink in die gids. De opdracht zelf is ook op de pagina te gebruiken. |
| Wat gebeurt er op de detailpagina van een lesmateriaal? | `route-materiaaldetail-bekeken` telt een beschikbaar publiek materiaal met een eigen officiële externe bron, ook bij rechtstreeks openen. | `route-materiaaldetail-bron-gekozen` telt de keuze voor een eigen bron. `route-materiaaldetail-terug-zonder-bron` telt het gebruik van de teruglink in dezelfde tab vóór een eigen bronkeuze op die detailweergave. In één document kunnen meerdere materialen worden bekeken, met verschillende uitkomsten. |

Bronkeuze omvat activeren met het toetsenbord, een gewone klik of een middelklik. Gerelateerde kaarten tellen niet mee bij de eigen bronkeuze van een detailpagina. Sluiten van een tab, de terugknop van de browser en vertrek via andere links leveren geen terugkeersignaal. De tellers bevatten alleen de vaste categorienaam. Ze registreren geen stappen per persoon, zoektekst, materiaalcode of titel. De afzonderlijke ranglijst van gekozen materialen heeft een eigen telwijze.
