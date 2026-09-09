# Privacy en veiligheid

De Atlas publiceert brongebaseerd aanbod en bevat geen geheime backend. GitHub Actions heeft minimale
rechten; tokens blijven in GitHub Secrets. Externe tekst wordt niet als HTML uitgevoerd. Netwerkcontroles
zijn begrensd, beleefd en fouttolerant. Reviewvoorstellen en externe bijdragen kunnen niet automatisch
publiceren.

De door de eigenaar gemachtigde Atlas-actualisator mag alleen eigen wijzigingen publiceren via een
pull request met volledige validatie en verplichte groene checks. Zij mag geen branchbescherming verlagen,
checks omzeilen of bij brononzekerheid mergen.

## Optionele bezoekersmeting

Deze editie koppelt GoatCounter aan Eva's account `ecmw`. Eva heeft de publicatie
op 9 september 2026 goedgekeurd. De accountinstellingen zijn gecontroleerd en opgeslagen:
alleen Sessions verzamelen en dashboard privé. Op Eva's verzoek is alleen de
openbare bezoekenteller aangezet. De homepage leest het geaggregeerde totaal
voor het Atlas-pad, zonder cookies of verwijzer; dit registreert geen extra bezoek.
De koppeling kan uit door `atlas-goatcounter-site` in `index.html` leeg te maken.
Na publicatie vraagt de browser
eenmaal per paginalading een telling aan voor het vaste Atlas-pad. Zoektermen,
filters, URL-querystrings, fragmenten, verwijzende websites en opgeslagen
rolvoorkeuren worden niet meegestuurd. De aanvraag sluit cookies en credentials
uit en gebruikt geen browseropslag of extern JavaScript.

De aanbieder ontvangt daarbij technisch wel het IP-adres en browserkenmerken.
GoatCounter gebruikt die tijdelijk om herhaalde bezoeken te herkennen. Dit is
dus geen garantie dat er nergens persoonsgegevens worden verwerkt. Gebruik de
minimale accountinstellingen en controleer het actuele
[privacybeleid van GoatCounter](https://www.goatcounter.com/help/privacy).
De website toont na activering een korte toelichting in de footer.

Do Not Track, Global Privacy Control, automatische browsercontroles, lokale
kopieën en ingesloten pagina's worden uitgesloten van de meting. Het openbare
totaal blijft leesbaar voor bezoekers die niet gemeten willen worden. De teller is optioneel: een
geblokkeerd of mislukt meetverzoek beïnvloedt het aanbod en zoeken niet.
Zie [de inrichting en telwijze](visitor-statistics.md).
