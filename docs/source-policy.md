# Bronnenbeleid

Gebruik officiële of aantoonbaar gezaghebbende openbare bronnen. Zoekresultaten, sociale media, persoonlijke blogs en marketingclaims zijn geen primaire bron. Sla geen volledige bronteksten op. Respecteer robotsbeleid, timeouts en gebruiksvoorwaarden. Een verified record vereist minimaal één bron-URL en controledatum.

## Drie gescheiden bronlagen

De Atlas gebruikt drie bronlagen met verschillende functies:

1. `data/records.json[].sourceUrls` onderbouwt een concrete vermelding bij de
   aanbieder of eigenaar;
2. `data/sources.json` is een operationeel register voor ontdekking en
   bereikbaarheidssignalen;
3. `sources/sources.json` en `sources/claim-links.json` vormen de permanente
   kennisbibliotheek voor juridische, bestuurlijke, technische en
   wetenschappelijke claims.

Meng deze schema's niet. Een ontdekkingsbron is geen claimbewijs en een
bibliografische publicatie wordt niet automatisch een te monitoren aanbieder.

## Bronhiërarchie en bewijsgrenzen

Gebruik in beginsel: primaire officiële bron > peer-reviewed onderzoek >
transparante institutionele onderzoeksbron > goed onderbouwde technische bron >
secundaire of journalistieke bron > commerciële of opiniërende bron. Gebruik
secundaire bronnen vooral om de oorspronkelijke bron te vinden. Leveranciers zijn
alleen primaire bron voor controleerbare feiten over hun eigen systeem of aanbod;
hun effectiviteits- en veiligheidsclaims zijn geen onafhankelijk bewijs.

Houd steeds uit elkaar:

- wetgeving, verdragen, beleid, guidance en vrijwillige standaarden;
- geldend recht, voorstellen en gefaseerde toekomstige verplichtingen;
- peer-reviewed onderzoek en preprints;
- benchmarks, gebruiksprestaties en praktijkuitkomsten;
- correlatie en causaliteit;
- wat een bron rechtstreeks aantoont, een redelijke afleiding en eigen
  Atlas-synthese.

Belangrijke claims worden in `sources/claim-links.json` gekoppeld als
`SUPPORTED`, `SUPPORTED_WITH_LIMITS`, `CONTESTED` of `EVIDENCE_GAP`. Tegenbewijs
en onzekerheid blijven zichtbaar. Een vervangen bron wordt niet verwijderd maar
gemarkeerd als `superseded`; een ingetrokken of niet meer bruikbare bron als
`archived`, steeds met opvolger of reden.

## Vaste bron voor open leermaterialen

Raadpleeg bij iedere inhoudstranche voor het vervolgonderwijs ook [edusources](https://edusources.nl/) als vaste vindplaats. Publiceer een afzonderlijk leermateriaal alleen wanneer de detailpagina of de oorspronkelijke bron de titel, aanbieder, beschikbaarheid en gebruiksvoorwaarden voldoende onderbouwt. Een zoekresultaat alleen is geen publicatiegrond.

## Vast register van primaire bronnen

Naast Nederlandse onderwijsbronnen onderhoudt de Atlas een expliciet bronregister in `data/sources.json`. Het register omvat onder meer officiële bronnen van UNESCO, de Europese Commissie en haar AI Office, EUR-Lex, RVO en Erasmus+. Alleen de eigenaar of officiële projectpagina geldt als primaire bron. Een bron in het register is geen publicatiebewijs op zichzelf: ieder Atlas-record behoudt een eigen, controleerbare bron en verificatiedatum.

## Vaste bron voor AI, werk en ontwikkeling: TNO

Neem [TNO](https://www.tno.nl/nl) mee bij inhoudscontrole rond AI, de toekomst van werk, skills en leven lang ontwikkelen. Het bronregister bevat zowel de organisatie als ontdekkingsbron als de concrete projectpagina over werkzekerheid voor periodieke controle. Neem alleen aanbod op met een gecontroleerde officiële detailpagina of publicatie en een expliciete relevantie voor de Atlas. Maak bij sectoroverstijgende instrumenten onderscheid tussen de door TNO genoemde doelgroep en redactioneel geduide onderwijsrelevantie. Een downloadbare publicatie is niet automatisch open gelicentieerd; een onbekende publicatiedatum blijft leeg.

## Organisaties als bron

Iedere in de Atlas geverifieerde organisatie met een officiële website wordt als **officiële ontdekkingsbron** geregistreerd. De organisatie kan daarmee eigen aanbod, publicaties, programma’s en calls signaleren. De organisatiehomepage zelf is geen voldoende bewijs voor een nieuw Atlas-record: de actualisator controleert steeds de concrete officiële detailpagina, status, doelgroep en eventuele deadline. Organisaties zonder vastgelegde officiële bron blijven buiten het register tot die bron is bevestigd.
