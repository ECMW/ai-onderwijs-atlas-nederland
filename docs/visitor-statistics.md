# Dagelijkse bezoekersmeting

Deze editie schakelt dagelijkse bezoekersmeting in op het door Eva opgegeven
account `https://ecmw.goatcounter.com/`. Eva heeft publicatie en controle van de
eerste meting op 9 september 2026 expliciet goedgekeurd. Het ingelogde dashboard
is gecontroleerd: privé, publieke teller uit, alleen Sessions verzamelen.
De tijdzone staat op Nederland. De eerste live ontvangst is op 9 september 2026
bevestigd in het privé dashboard na publicatie via pull request #77.
De code telt uitsluitend op de publieke Atlas-origin, niet in lokale previews.
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
Dit is geen afzonderlijke telling van alle paginaweergaven of van zoekacties.

GoatCounter is momenteel gratis voor redelijk openbaar gebruik, waaronder
persoonlijke websites en kleine/middelgrote bedrijven. De Atlas lijkt binnen die
omschrijving te passen; de voorwaarden van de aanbieder blijven van toepassing.

## Inrichting en uitrolcontrole

1. Het bestaande account is [ecmw.goatcounter.com](https://ecmw.goatcounter.com/).
   Alleen de Atlas krijgt de koppeling. Het sitedomein is `ecmw.github.io`.
   Een wachtwoord of API-token is niet nodig voor het tellen en hoort niet in
   de repository of chat. Inloggen gebeurt door Eva in de browser.
2. De accountinstellingen zijn op 9 september 2026 gecontroleerd en opgeslagen:
   tijdzone Nederland, dashboard alleen voor ingelogde gebruikers, publieke
   teller uit. Onder **Data collection** staat alleen **Sessions** aan.
   **Individual pageviews**, **Referrer**, **User-Agent**, **Size**, **Country**,
   **Region** en **Language** staan uit. Sessions gebruikt nog steeds tijdelijk
   IP-adres en browserkenmerken voor ontdubbeling. **Your site** staat op
   `https://ecmw.github.io`, omdat GoatCounter het gemeten Atlas-pad zelf toevoegt.
   Bevestiging van het accountadres gebeurt via de e-mail van GoatCounter.
3. De accountnaam `ecmw` staat bij `atlas-goatcounter-site` in `index.html`.
   Het account is door Eva opgegeven en in de ingelogde account-UI gecontroleerd.
4. Voer de generator, datavalidatie, strikte quality gate, regressietests en
   `git diff --check` uit. Publiceer pas na Eva's expliciete goedkeuring.
5. Controleer na publicatie één gewoon browserbezoek en de ontvangst in het
   privé dashboard. Controleer in het netwerkpaneel dat er één meetverzoek is
   met alleen `p`, `t`, `r` (leeg) en `rnd`, zonder Referer-header of cookies.
   Een succesvolle lokale test bewijst nog geen ontvangst door GoatCounter.
6. Bekijk [de grafiek per dag](https://ecmw.goatcounter.com/?group=day).
   Een dagelijkse e-mail is een optionele accountinstelling; de koppeling
   activeert geen e-mails of Codex-taak.

## Technische afbakening

`analytics.js` gebruikt de gedocumenteerde browser-GET naar `/count`. Het vaste
pad `/ai-onderwijs-atlas-nederland/` bundelt alle Atlas-schermen. Navigeren,
zoeken en filteren veroorzaken geen extra verzoek. De browser verstuurt geen
URL-querystring, hash, verwijzer, rolvoorkeur of schermformaat. `credentials:
'omit'` en `referrerPolicy: 'no-referrer'` sluiten cookies en de Referer-header uit.
De willekeurige `rnd` voorkomt caching en is geen blijvend bezoekerskenmerk.

De standaard externe `count.js` wordt niet geladen: die kan `location.search`
als campagnegegevens meesturen, ook bij een vast ingesteld paginapad.
Er is geen externe script-afhankelijkheid voor het starten van de Atlas.
Een mislukt telverzoek wordt opgevangen. De beschikbaarheidsmonitor meldt
laad- of integriteitsfouten in het optionele analyticsbestand als waarschuwing;
die mogen geen automatische terugzetting van een werkende Atlas veroorzaken.
De controles vóór publicatie blijven ook dit JavaScriptbestand strikt valideren.
Tests simuleren de verzoeken lokaal;
er worden geen fictieve bezoeken naar een echte teller gestuurd.

Alleen de productie-origin `https://ecmw.github.io` en de Atlas-startpagina
(ook `index.html`) mogen tellen. Do Not Track, Global Privacy Control,
`navigator.webdriver`, prerendering en iframes zijn uitgesloten. Eigen bezoeken
kunnen per opening worden overgeslagen met `?atlas-no-count=1` vóór de hash.
Blokkering van alle bots is niet gegarandeerd.

Stoppen kan door de accountnaam weer leeg te maken en de gecontroleerde versie
te publiceren. De aanbieder beheert de statistieken; ze worden niet openbaar
in de Atlas of repository opgeslagen. Een sitecode is openbaar en beschermt
niet tegen kunstmatig ingestuurde tellingen.

## Primaire bronnen

Gecontroleerd op 9 september 2026:

- [Dienst en gratis gebruik](https://www.goatcounter.com/)
- [Sessies en telwijze](https://www.goatcounter.com/help/sessions)
- [Pixel en stabiele parameters](https://www.goatcounter.com/help/pixel)
- [Privacybeleid](https://www.goatcounter.com/help/privacy)
- [Instellingen in de broncode](https://github.com/arp242/goatcounter/blob/main/settings.go)
- [Standaard meetscript](https://github.com/arp242/goatcounter/blob/main/public/count.js)

De accountinstellingen zijn bevestigd in de werkelijke account-UI en de
publicatie is goedgekeurd. E-mailbevestiging is een accountactie voor Eva.
De eerste live meting is bevestigd na een bezoek aan de gepubliceerde Atlas;
de bezoekenaantallen zelf blijven in het privé dashboard. Bij latere wijzigingen
blijft een live controle nodig: een geslaagde lokale test bewijst geen ontvangst.
Ontwikkelbroncode bewijst geen specifieke productieconfiguratie.
