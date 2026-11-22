# UX-benchmark: succesvolle patronen voor de Atlas

Status: productontwerp, geen implementatie of bewezen effect. 22 november 2026.

## Referenties en overdraagbare patronen

| Voorbeeld | Onderbouwd patroon | Atlas-toepassing | Niet kopiëren |
|---|---|---|---|
| Pinterest | Ideeën zoeken, visueel ontdekken, bewaren in borden, verwante suggesties. Officiële documentatie: https://help.pinterest.com/en/article/search-for-ideas-on-pinterest en https://help.pinterest.com/en-gb/article/boards | Vrij ontdekken, later bewaren in lokale favorieten, inhoudelijk verwante materialen | Engagement-optimalisatie, verborgen personalisatie, onverklaarbare ranking |
| PhET | Simulaties plus docentenactiviteiten en communitymateriaal. https://phet.colorado.edu/en/activities | Korte uitvoerbare lesproef, voorbereidingstijd en beperkingen naast iedere bron | Niet-geteste claims over leerwinst |
| Nielsen Norman Group | Zoeken en navigatie vullen elkaar aan; filters, zoekhulp en nulresultaten vragen aparte aandacht. https://www.nngroup.com/articles/web-ux-study-guide/ | Twee gelijkwaardige ingangen: 'Gericht vinden' en 'Vrij ontdekken'; altijd bereikbaar vanuit navigatie | Alleen een zoekbalk of alleen een voorgeselecteerde feed |
| Wikipedia | Verkenning via gerelateerde onderwerpen en controleerbare bronnen (ontwerpobservatie, geen effectclaim) | Bronvermelding en verwante onderwerpen naast aanbod | Onbeheerde gebruikersbijdragen in canonieke records |
| Airbnb | Vergelijken en verfijnen als ontwerpinspiratie (nog niet afzonderlijk empirisch onderzocht) | Duidelijke resultaatkaarten en vergelijkingsroute | Commerciële ranking of druk om snel te kiezen |

## Ontwerpregels voor de homepage
- **Twee gelijkwaardige primaire routes**: 'Gericht vinden' en 'Vrij ontdekken'. Beide blijven zichtbaar en bereikbaar; geen geforceerde keuze.
- 'Gericht vinden' biedt praktijkvragen (les, toetsing, afspraken, kennis, experiment). 'Vrij ontdekken' biedt volledige catalogus, thematisch bladeren, zoekfunctie, filters en sortering.
- Resultaten blijven op één canonieke brongebaseerde kennisbasis steunen; de aparte niet-AI-proefcollectie wordt als zodanig gemarkeerd en niet ongemerkt aan AI-resultaten toegevoegd.
- Resultaatkaarten tonen: *wat is het?*, *wat kun je ermee?*, *voor wie?*, *tijd/kosten/toegang*, *bron en beperkingen*, en één primaire actie.
- Ondersteun 'geen resultaten' met filters wissen en gerelateerde onderwerpen, zonder onbewezen items te fabriceren.
- Vermijd verborgen tracking en aanbevelingen die alleen betrokkenheid maximaliseren. Toon transparante sortering.
- Behoud auteur E.C.M. Willems en duidelijke scheiding tussen eigen Atlas-lesideeën en externe producten.

## Acceptatieonderzoek
Test met 5–8 onderwijsprofessionals, verdeeld over minimaal twee sectoren:
1. Vind gericht een lesactiviteit.
2. Verken zonder specifieke zoekterm drie relevante mogelijkheden.
3. Vind kosten, accountplicht en bron van een resultaat.
4. Bewaar of deel een relevant resultaat.
5. Schakel zonder verlies van context tussen de twee routes.

Meet per taak succes, tijd, fouten en ervaren helderheid; vergelijk met de huidige Atlas. Implementeer eerst de grootste aantoonbare knelpunten. Geen nieuwe backend of accountplicht voor deze eerste iteratie.

## Prioriteit
P0: beide routes en zichtbare volledige catalogus behouden.
P1: praktische actie en beperkingen op iedere kaart.
P2: lokaal bewaren, verwante resultaten, verfijnde ontdekking na gebruikerstest.
