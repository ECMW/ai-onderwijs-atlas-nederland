# Ontdek & probeer — voorstel voor een afgebakende Atlas-proef

Status: **ontwerp / niet gepubliceerd**. Eigen Atlas-redactie, 22 november 2026.

## Doel en grens
Help onderwijsprofessionals sneller van een concrete lesvraag naar een **zelf uit te proberen, controleerbare** toepassing en een kleine leeractiviteit. De AI & Onderwijs Atlas blijft primair een brongebaseerde gids **rond AI in onderwijs**. Niet-AI-simulaties worden niet stilzwijgend als AI geclassificeerd en komen niet zonder redactionele scopebeslissing in de bestaande publieke catalogus.

## Eerste gebruikersroute
1. Ingang **Ontdek & probeer** met zoekvraag, onderwijssector, vakgebied en gewenste tijdsduur.
2. Resultaatkaart: *Wat kan ik proberen?*, *Wat leren studenten?*, *Start een proef van 10 minuten*, *Open bij aanbieder*, *Bewijs & beperkingen*.
3. Expliciet kenmerk: **AI-toepassing / klassieke simulatie / AI-component onbekend**. Geen AI-label zonder bewijs.
4. Geen verplichte login, geen persoonsgegevens van studenten, geen ongecontroleerde embedded externe inhoud. Externe links herkenbaar.
5. Gebruik bestaande Atlas-filters, deelbare URL's, bronvermelding, toegankelijkheid en statusvelden; geen tweede concurrerende catalogus.

## Pilotkandidaat: How Human Eye Works
- URL: https://human-eye.wasmer.app/
- Herkomst: screenshot van publieke socialemediapost, **geen onafhankelijke verificatie**.
- Beschreven functies: optische simulatie van het oog, lichtbreking, accommodatie, pupilreactie en afwijkingen.
- Classificatie voorlopig: **interactieve simulatie; AI niet aangetoond**.
- Mogelijke context: biologie, natuurkunde en zorgonderwijs, onder voorbehoud van inhoudelijke toets.
- Proefvraag: 'Wat verandert er in de scherpstelling als de sterkte van een corrigerende lens verandert?' Laat studenten een voorspelling formuleren, variabele aanpassen, resultaat beschrijven en modelbeperkingen benoemen.
- Publicatieblokkade: eigenaar, beschikbaarheid, kosten, privacy, toegankelijkheid, nauwkeurigheid en bron van modelclaims nog te verifiëren.

## Selectie- en kwaliteitscriteria
Een kaart komt pas publiek wanneer de primaire productpagina bereikbaar is, aanbieder en voorwaarden duidelijk zijn, de concrete onderwijswaarde aannemelijk is en er geen ononderbouwde kwaliteitsclaim staat. Beoordeel expliciet: vakinhoudelijke correctheid, leeractiviteit, doelgroep, toegankelijkheid (ook mobiel/toetsenbord), privacy, accountplicht, kosten, actualiteit en technische werking. Gebruik 'onbekend' waar niet gecontroleerd; **opname is geen keurmerk**.

## Kleine release, meetbare waarde
- Start met maximaal **5** gecontroleerde kandidaten, niet 20 willekeurige links.
- Test met 5–8 docenten: kunnen zij binnen 2 minuten een passende tool vinden, binnen 10 minuten een activiteit starten en de beperkingen begrijpen?
- Meet taakvoltooiing, bruikbaarheid van lesidee, relevante doorkliks en terugkeer; geen persoonlijke leerlingdata of verborgen tracking.
- Alleen opschalen als dit aantoonbaar meer onderwijswaarde geeft dan de bestaande zoekroute.
- Voeg daarna eventueel favorieten toe als optionele lokale browserfunctie, met transparantie over apparaatgebonden opslag.

## Uitvoering
1. Redactie valideert de pilot en de AI-scope.
2. Ontwerp integreert de route in bestaande navigatie en catalogus, zonder schema- of filterbreuk.
3. Voeg pas daarna gevalideerde canonieke records toe via `data/records.json`, genereer projecties en voer alle controles uit `AGENTS.md` uit.
4. Review op mobiele bruikbaarheid, toegankelijkheid en redactionele grenzen vóór publicatie.

**Beslispunt:** Als niet-AI-toepassingen structureel gewenst zijn, kies expliciet tussen een afzonderlijke experimentele verzameling en een formele verbreding van de Atlas-scope. De bestaande AI-taxonomie mag niet ongemerkt verwateren.
