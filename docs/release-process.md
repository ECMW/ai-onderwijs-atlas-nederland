# Releaseproces

## Toelating en voorbereiding

De gemachtigde dagelijkse Atlas-actualisator mag uitsluitend eigen, volledig
geverifieerde PR's samenvoegen na alle verplichte geslaagde controles. Volledig
toegelaten aanvullingen via het websiteformulier hebben een afzonderlijke
botroute. Die borgt de oorspronkelijke inzending, hoofdbranch en kandidaatcommit,
vereist twee afzonderlijke geslaagde validaties van dezelfde commit en controleert
het bronbewijs opnieuw vlak vóór samenvoegen. Een wijziging van de hoofdbranch
vereist een nieuwe kandidaat. Branchbescherming, verplichte checks en bestaande
reviewregels worden niet omzeild.

Correcties, feedback, willekeurige externe PR's en signaalvoorstellen krijgen
hierdoor geen automatische publicatietoestemming. De voorwaarden voor nieuwe
inzendingen staan in [CONTRIBUTING.md](../CONTRIBUTING.md).

Vóór vastlegging worden `scripts/generate_data.py` en de controles uitgevoerd.
De generator schrijft de publieke projectie, actuele generatie-/editiedatum en
inhoudsgebonden cacheversies. Individuele controledatums blijven behouden.
Canonieke data, afgeleide bestanden en `index.html` worden samen vastgelegd.

## Normale publicatie

GitHub Pages gebruikt GitHub Actions als bron. Alleen **Validate and deploy Pages**
publiceert. De workflow:

1. selecteert de vastgelegde broncommit en controleert de data, de strikte
   kwaliteitspoort, regressietests en JavaScript;
2. stelt uitsluitend het publieke pakket samen, met `release.json` waarin
   broncommit, workflowcommit, runnummer en herstelstatus staan;
3. controleert vlak vóór deployment of de hoofdbranch niet is gewijzigd;
4. publiceert via het `github-pages`-environment en controleert vervolgens de
   live catalogus, navigatie en exacte release-marker.

Deployment genereert de data niet opnieuw. Een nieuwe deploy van dezelfde editie
wijzigt dus niet de footer- of broncontroledatums. Een groen lokaal testresultaat
of een aangevraagde workflow bewijst nog niet dat de publicatie live is.

## Controle en automatisch herstel

**Monitor Atlas availability** is op GitHub gepland om de vijf minuten. De
controle haalt HTML en bijbehorende assets op, toetst onder meer niet-lege
brongegevens en assetversies en voert de echte opstartvolgorde uit. Een tweede
meting bevestigt een gevonden fout.

Automatisch herstel vereist dezelfde inhoudelijke fout en dezelfde herkenbare
release in beide metingen. Netwerkonzekerheid, een ongeldige of veranderende
release-marker, een veranderde hoofdbranch of een lopende publicatie blokkeert
herstel. De workflow controleert de situatie opnieuw vlak vóór deployment.

De toegestane herstelbron staat expliciet in
[`config/site-recovery.json`](../config/site-recovery.json). Herstel checkt die
bron in een aparte map uit, draait de eigen tests van die editie en past daarnaast
de actuele kwaliteitspoort en algemene opstartcontrole toe. Nieuwe functiespecifieke
tests worden niet over een oudere editie gelegd. De workflow blijft van `main`
afkomstig en publiceert via hetzelfde beschermde environment.

Dit herstel zet geen branch terug, verwijdert geen commits en verandert de
canonieke hoofddata niet. Het kan tijdelijk een oudere editie met minder records
of functies tonen. Per hoofdbranchcommit wordt hoogstens één herstelpoging
gestart; wanneer de herstelbasis al wordt getoond, blijft een nieuwe poging
achterwege. Ook een herstelde publicatie moet de livecontrole doorstaan.

Vervang de vaste herstelbron alleen door een expliciet gecontroleerde commit die
ook live is geverifieerd. Een technisch geslaagde oude workflow zonder bewijs van
werkende publicatie is daarvoor onvoldoende.

## Incident en opvolging

De monitor onderhoudt één open issue met label `atlas-beschikbaarheid` bij een
bevestigde fout of een onuitvoerbare controle. Het issue verwijst naar het bewijs
en een eventuele herstelpublicatie. Alleen een gewijzigde status leidt tot een
update. De eerste daaropvolgende gezonde controle plaatst één herstelbericht en
sluit het incident. De bezorging van mail- of pushmeldingen volgt de persoonlijke
GitHub-instellingen.

De ingestelde vijf minuten vormen geen beschikbaarheidsgarantie. GitHub kan
geplande runs vertragen of laten vervallen en schakelt ze in publieke repositories
na 60 dagen zonder activiteit uit. Controleer bij langdurige stilte ook of de
workflow nog actief is. Zie de [officiële schedule-documentatie](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
