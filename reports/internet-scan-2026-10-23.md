# Zes brongecontroleerde aanvullingen voor de Atlas

Peildatum: 23 oktober 2026. Classificatie: PUBLIC.

De zes aanvullingen zijn gecontroleerd tegen de 433 canonieke records op de
hoofdbranch, op titel, aanbieder, bron-URL en inhoud. De bestaande records blijven
ongewijzigd. Na toevoeging bevat de canonieke dataset 439 records, waarvan 401
publiek worden getoond.

| Record | Gecontroleerde bron en afbakening |
|---|---|
| `surf-pec-fg-gesprekskaart-ai-algoritmen` | [SURF PEC](https://pec.surf.nl/fg-gesprekskaart-ai-algoritmen/), downloadpagina en volledige PDF. Gesprekskaart voor FG's, met eigen scope en CC BY-NC-SA 4.0 in de PDF. Geen duplicaat van de bestaande Praatplaat AI en Privacy. |
| `npuls-raise-risicobeoordeling-ai` | [Npuls](https://npuls.nl/kennisbank/raise-raamwerk-voor-risicobeoordeling-van-ai), concept-PDF en beschikbaarheid van het Excel-sjabloon. Status `pilot`: eerste versie in praktijktoetsing. Onderzoek en shadow AI/IT buiten scope. Publicatiedatum van de detailpagina: 28 september 2026; concept-PDF: 14 september 2026. CC BY-SA 4.0. Niet hetzelfde als de Europese RAISE Advisory Board-oproep. |
| `ecio-ai-toetsing-praktische-handvatten` | [ECIO](https://ecio.nl/handreiking/ai-en-toetsing-praktische-handvatten/), publiek leesbare handreiking en checklist. Voor mbo, hbo en wo. De update van 4 augustus 2026 is geen vastgestelde oorspronkelijke publicatiedatum. Juridische tijdlijnen worden niet als zelfstandige rechtsinformatie overgenomen. |
| `npuls-ai-duurzaamheid-verkenning-2026` | [Npuls](https://npuls.nl/kennisbank/ai-en-duurzaamheid), detailpagina en PDF. Publicatiedatum 29 juni 2026, CC BY-SA 4.0. Een verkenning voor vervolgonderwijs, afzonderlijk van Kennisnet en NOLAI. Ingedeeld als `knowledge`, omdat het een kennispublicatie met handelingsperspectieven is. Geen losse energie- of watercijfers overgenomen. |
| `klokhuis-ai-lespakket` | [NTR / Het Klokhuis](https://hetklokhuis.nl/dossier/168/het-klokhuis-over-ai/826/lespakket) en de gekoppelde docentenhandleiding van 15 pagina's. Lespakket voor groep 6, 7 en 8; geen zelfstandige softwarevermelding voor de AI Studio. |
| `generation-ai-basislessen-6-8` | [Generation AI](https://www.elearning.generation-ai.eu/nl/courses/lesson-plans-basic-6-8/), onderliggende les Verantwoord gebruik en Nederlandse docentenhandleiding van 13 pagina's. Leeftijdsverschil tussen de algemene lestekst (6–12) en het cursusoverzicht/de handleiding (6–8) expliciet vastgelegd. |

## Toegang en bewijsgrenzen

De zes materiaalpagina's zijn publiek toegankelijk. Aanvullend zijn de downloads
van de FG-kaart, RAISE-conceptversie, RAISE-documentatiesjabloon, Npuls-verkenning,
Klokhuis-handleiding en Generation AI-handleiding gecontroleerd. De RAISE-PDF was
te groot voor de webreader, maar is rechtstreeks opgehaald en lokaal uitgelezen.
Time-outs bij ECIO en Generation AI zijn met een geslaagde rechtstreekse
hercontrole opgelost; ze zijn niet als geslaagde webreadercontroles geregistreerd.
De Excel-inhoud en de volledige uitvoering van iedere les zijn niet getest.

Onbekende publicatiedatums en hergebruiklicenties blijven onbekend. Kosten en
toegang betreffen het gepubliceerde digitale materiaal; commerciële aard blijft
`unknown`. Opname is geen effectbewijs, aanbeveling, juridische goedkeuring of
certificering. Er zijn geen nieuwe monitoringstromen ingericht.

De vijf werkmaterialen krijgen `offerCategory: materials`; de Npuls-verkenning
krijgt `knowledge`. Alle zes blijven vindbaar in de algemene Atlas. Verificatie
van de registratie (`verified`) staat los van de ontwikkelstatus van het aanbod,
zoals de praktijktoetsing van RAISE.

## Lokale validatie

Datavalidatie, de strikte quality gate, 182 Python-tests, 81 Node-tests,
JavaScript-syntaxiscontrole en `git diff --check` zijn geslaagd. De vijf
quality-gatewaarschuwingen betreffen gedeelde bronnen van bestaande records;
geen van de zes aanvullingen introduceert zo'n waarschuwing. Een vergelijking
met de uitgangscommit bevestigt dat alle 433 bestaande canonieke records
inhoudelijk ongewijzigd zijn. Publicatie en live release worden afzonderlijk
gecontroleerd na de GitHub-controles.
