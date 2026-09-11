const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const catalogue = fs.readFileSync(path.join(__dirname, '..', 'catalog.js'), 'utf8');
const boot = "  addEventListener('hashchange', route); addEventListener('popstate', route); route();";
assert.equal(catalogue.split(boot).length, 2, 'Test hook must replace exactly the route startup');
const instrumented = catalogue.replace(boot, `  window.testCatalogue = {
    commercialLabel, commercialBadge, commercialDetails, offerFacts, costLabel, publicationDate, addedDate, newestRecords, newOffersMarkup, sortRecords, stateHref, parseState, hasIntent, resultsMarkup, simpleCard,
    facet, facetSelectionLabel, contributionIssueUrl, contributionPrompt, teaserCard,
    homeFilterPanel, recordsForCriteria,
    suggestionData, criteriaForQuery, relatedThemes, filterKeys: FILTER_KEYS,
    effectiveStatus, statusLabel, trustTone, filterValues, serializeFilterValues,
    accessLabel, accessOptions: Object.values(ACCESS_LABELS), recordThemes, themeOptions, route,
    searchForm, bindResultsControls, sourceActionLabel, sourceCitation, copySourceCitation, meetingSheetMarkup,
    options: SORT_OPTIONS, getState: () => state, setState: value => { state = value; }
  };`);

function record(id, date, title = id) {
  return { id, title, publicationDate: date, recordType: 'guidance', legacyType: 'Handreiking',
    providerName: 'Voorbeeld', description: 'Uitleg over privacy', themes: ['Privacy en AVG'],
    sectors: ['HBO'], audiences: ['Docenten'], keywords: [], status: 'available',
    verificationStatus: 'verified', lastVerified: '2099-12-31',
    changeHistory: [{ date: '2099-12-31', type: 'added' }],
    sourceUrls: [{ url: 'https://example.org/' + id, sourceType: 'official' }] };
}
function load(records = [], hash = '#zoeken', overrides = {}) {
  const media = () => ({ matches: false });
  const context = vm.createContext({
    window: { ATLAS_RECORDS: { records, metadata: {} }, matchMedia: media },
    document: { querySelector: selector => selector === 'main' ? {} : null },
    localStorage: { getItem: () => null }, location: { hash }, matchMedia: media,
    URLSearchParams, Intl, ...overrides
  });
  vm.runInContext(instrumented, context);
  context.window.testCatalogue.parseState();
  return context.window.testCatalogue;
}

test('commercial labels require evidence and are independent of price', () => {
  const api = load();
  const paid = { ...record('course', null), costType: 'paid' };
  assert.equal(api.commercialLabel(paid), '');
  assert.equal(api.commercialBadge(paid), '');
  const free = { ...record('tool', null), costType: 'free', commercialStatus: 'commercial',
    commercialEvidence: {url: 'https://example.org/tool', note: 'Commercial product with a free tier.', checkedOn: '2026-09-09'} };
  assert.equal(api.costLabel(free), 'Gratis');
  assert.equal(api.commercialLabel(free), 'Commercieel aanbod');
  delete free.commercialEvidence;
  assert.equal(api.commercialLabel(free), '');
  assert.equal(api.commercialBadge(free), '');
});

test('only confirmed commercial offers receive public labels on cards and details', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const api = load(data);
  const npuls = data.find(item => item.id === 'train-de-trainer-visietool-toetsen-examineren-en-ai');
  const surf = data.find(item => item.id === 'surf-onderwijsdagen-actief-leren-ai-2026');
  const nolai = data.find(item => item.id === 'nolai-meetup-oktober-2026');
  const uva = data.find(item => /universiteit van amsterdam|uva/i.test(item.providerName));
  const unclassified = {...record('unclassified-provider'), costType:'paid'};
  const nonCommercial = {...record('non-commercial'), commercialStatus:'non_commercial',
    commercialEvidence:{url:'https://example.org/evidence', note:'Evidence for this specific offering.', checkedOn:'2026-09-09'}};
  assert.ok(uva);
  for (const item of [npuls, surf, nolai, uva, unclassified, nonCommercial]) {
    for (const html of [api.simpleCard(item), api.teaserCard(item)]) {
      assert.ok(!html.includes('commercial-label'), item.id);
      assert.ok(!html.includes('Commerciële aard niet vastgesteld'), item.id);
    }
    assert.equal(api.commercialDetails(item), '');
    assert.ok(!api.offerFacts(item).some(row => /commerci/i.test(row[0])));
  }
  assert.ok(api.simpleCard(npuls).includes('Kosten onbekend'));
  assert.ok(api.simpleCard(surf).includes('Betaald'));
});

test('confirmed commercial offers retain their source evidence regardless of price', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const api = load(data);
  for (const costType of ['free', 'paid', 'unknown']) {
    const item = {...record('classified'), costType, commercialStatus:'commercial',
      commercialEvidence:{url:'https://example.org/evidence', note:'Evidence for this specific offering.', checkedOn:'2026-09-09'}};
    assert.ok(api.simpleCard(item).includes('Commercieel aanbod'));
    assert.ok(api.teaserCard(item).includes('Commercieel aanbod'));
    assert.ok(api.commercialDetails(item).includes('https://example.org/evidence'));
    delete item.commercialEvidence;
    assert.equal(api.commercialDetails(item), '');
  }
});

test('expired dated training and application calls never retain an active status', () => {
  const api = load();
  const training = {...record('training'), recordType:'training', legacyType:'Training', endDate:'2026-08-25'};
  const call = {...record('call'), recordType:'funding_call', legacyType:'Call', status:'open_call',
    applicationDeadline:'2026-09-04'};
  const original = JSON.stringify([training, call]);
  assert.equal(api.statusLabel(training, '2026-08-25'), 'Direct beschikbaar');
  assert.equal(api.statusLabel(training, '2026-08-26'), 'Niet meer actueel');
  assert.equal(api.statusLabel({...training, status:'planned'}, '2026-08-26'), 'Niet meer actueel');
  assert.equal(api.statusLabel(call, '2026-09-04'), 'Open voor aanvragen');
  assert.equal(api.statusLabel(call, '2026-09-05'), 'Aanvraag gesloten');
  assert.equal(api.statusLabel({...call, status:'closed_call'}, '2026-09-01'), 'Aanvraag gesloten');
  assert.equal(api.statusLabel({...call, applicationDeadline:null, fundingDeadline:'2026-09-04'}, '2026-09-05'), 'Aanvraag gesloten');
  for (const endDate of [null, 'unknown', '2026-02-30', '2026-8-25']) {
    assert.equal(api.statusLabel({...training, endDate}, '2026-09-09'), 'Direct beschikbaar');
    assert.equal(api.statusLabel({...call, applicationDeadline:endDate}, '2026-09-09'), 'Open voor aanvragen');
  }
  assert.equal(api.statusLabel({...record('guide'), endDate:'2026-01-01'}, '2026-09-09'), 'Direct beschikbaar');
  assert.equal(api.statusLabel({...call, status:'planned'}, '2026-09-09'), 'Gepland');
  assert.equal(JSON.stringify([training, call]), original, 'Display status must not rewrite canonical data');
});

test('expired availability is consistent across cards and availability filters', () => {
  const data = [
    {...record('old-training'), recordType:'training', legacyType:'Training', endDate:'2000-01-01'},
    {...record('old-call'), recordType:'funding_call', legacyType:'Call', status:'open_call', fundingDeadline:'2000-01-01'},
    record('current-guide')
  ];
  const api = load(data);
  assert.deepEqual(Array.from(api.recordsForCriteria({status:'Direct beschikbaar'}), item=>item.id), ['current-guide']);
  assert.equal(api.recordsForCriteria({status:'Open voor aanvragen'}).length, 0);
  assert.deepEqual(Array.from(api.recordsForCriteria({status:'Aanvraag gesloten'}), item=>item.id), ['old-call']);
  for (const item of data.slice(0,2)) {
    assert.equal(api.trustTone(item), 'is-neutral');
    assert.ok(!api.simpleCard(item).includes('is-confirmed'));
    assert.ok(!api.teaserCard(item).includes('Direct beschikbaar'));
  }
});

test('provider filters preserve whole comma-containing names and legacy shared URLs', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const all = load(data);
  const publicRecords = all.recordsForCriteria({});
  const providers = [...new Set(publicRecords.map(item=>item.providerName).filter(name=>name.includes(',')))];
  assert.ok(providers.length >= 3);
  for (const name of providers) {
    const expected = publicRecords.filter(item=>item.providerName === name).map(item=>item.id).sort();
    const api = load(data, '#zoeken?organization=' + encodeURIComponent(name));
    assert.deepEqual(Array.from(api.recordsForCriteria(api.getState()), item=>item.id).sort(), expected, name);
    assert.equal(api.facetSelectionLabel('organization'), name);
    assert.equal(api.filterValues('organization', api.getState().organization).length, 1);
  }
  const multi = [providers[0], 'Npuls', providers[1]];
  const encoded = all.serializeFilterValues('organization', multi);
  all.setState({organization:encoded, sector:'HBO', sort:'published'});
  const restored = load(data, all.stateHref());
  assert.deepEqual(Array.from(restored.filterValues('organization', restored.getState().organization)), multi);
  assert.equal(restored.getState().sector, 'HBO');
  assert.equal(restored.getState().sort, 'published');
  const legacy = load(data, '#zoeken?organization=Kennisnet%2CNpuls');
  assert.deepEqual(Array.from(legacy.filterValues('organization', legacy.getState().organization)), ['Kennisnet','Npuls']);
  const longest = 'MBO Digitaal, mbo-instellingen, SURF en Npuls';
  assert.deepEqual(Array.from(all.filterValues('organization', longest + ',Kennisnet')), [longest, 'Kennisnet']);
  assert.deepEqual(Array.from(all.filterValues('organization', all.serializeFilterValues('organization', [longest,'Kennisnet']))), [longest,'Kennisnet']);
});

test('access facets distinguish confirmed conditions and keep unknown access unknown', () => {
  const options = {public:'Publiek toegankelijk', registration_required:'Registratie nodig',
    paid:'Betaalde toegang', restricted:'Beperkte toegang', unknown:'Toegang niet vastgesteld'};
  const data = Object.keys(options).map(accessType=>({...record(accessType), accessType, costType:'free'}));
  const api = load(data);
  for (const [key,label] of Object.entries(options)) {
    assert.equal(api.accessLabel(data.find(item=>item.id===key)), label);
    assert.deepEqual(Array.from(api.recordsForCriteria({access:label}), item=>item.id), [key]);
    assert.ok(api.facet('access', 'Toegang', api.accessOptions).includes(label));
  }
  assert.deepEqual(Array.from(api.recordsForCriteria({access:'Toegang nog niet bevestigd'}), item=>item.id), ['unknown']);
  assert.equal(api.costLabel(data.find(item=>item.id==='paid')), 'Gratis', 'Access and price remain separate');
});

test('explicit theme aliases match existing entrances while distinct topics remain selectable', () => {
  const data = [
    {...record('law'), themes:['AI Act','AI Act en wetgeving','Governance']},
    {...record('implementation'), themes:['Implementatie','Curriculum','AI-infrastructuur','ethiek']},
    {...record('specific'), themes:['mediawijsheid','digitale geletterdheid','Mensenrechten','Open leermateriaal']}
  ];
  const api = load(data);
  assert.deepEqual(Array.from(api.recordThemes(data[0])), ['AI Act en wetgeving','Beleid en governance']);
  assert.deepEqual(Array.from(api.recordThemes(data[1])), ['Implementatie en adoptie','Curriculumontwikkeling','Data en infrastructuur','Publieke waarden en ethiek']);
  assert.deepEqual(Array.from(api.recordsForCriteria(api.criteriaForQuery('AI Act')), item=>item.id), ['law']);
  assert.deepEqual(Array.from(api.recordsForCriteria({theme:'AI Act'}), item=>item.id), ['law']);
  assert.deepEqual(Array.from(api.recordThemes(data[2])), data[2].themes);
  for (const topic of data[2].themes) {
    assert.ok(api.themeOptions().includes(topic));
    assert.ok(api.facet('theme', 'Onderwerp', api.themeOptions()).includes(topic));
  }
  const current = load(JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8')));
  const laws = current.recordsForCriteria({theme:'AI Act en wetgeving'}).map(item=>item.id);
  for (const id of ['digitale-overheid-ai-verordening-tijdlijn-2026','algoritmekader-iama-2026']) assert.ok(laws.includes(id), id);
});

test('VSO is available wherever the catalogue contains that sector', () => {
  const data = [{...record('vso-offer'),sectors:['VSO']}, record('higher-education')];
  const api = load(data);
  assert.ok(api.homeFilterPanel([]).includes('name="sector" value="VSO"'));
  assert.deepEqual(Array.from(api.recordsForCriteria(api.criteriaForQuery('VSO')), item=>item.id), ['vso-offer']);
});

test('route changes release an open mobile filter overlay and its detached keyboard handler', () => {
  const bodyClasses = new Set(['locked']);
  const panelClasses = new Set(['open']);
  const opener = {expanded:'true',setAttribute(name,value){if(name==='aria-expanded')this.expanded=value;}};
  const main = {focus(){}};
  const doc = {
    body:{classList:{remove:value=>bodyClasses.delete(value)}},
    onkeydown:()=>{throw new Error('stale filter handler');},
    querySelector:selector=>selector==='main'?main:selector==='#filters'?{classList:{remove:value=>panelClasses.delete(value)}}:selector==='.mobile-filter'?opener:null,
    querySelectorAll:()=>[]
  };
  const api = load([], '#over', {document:doc, CSS:{escape:value=>value}, scrollTo:()=>{}, clearTimeout:()=>{}});
  api.route();
  assert.equal(bodyClasses.has('locked'), false);
  assert.equal(panelClasses.has('open'), false);
  assert.equal(opener.expanded, 'false');
  assert.equal(doc.onkeydown, null);
});

test('search buttons have an explicit accessible name across both search forms', () => {
  const api = load();
  for (const id of ['home-search','catalog-search']) {
    assert.match(api.searchForm(id), /<button class="btn" aria-label="Zoeken">Zoeken<\/button>/);
  }
});

test('refreshed mobile filter controls announce the still-open panel correctly', () => {
  const filterClasses = new Set();
  const bodyClasses = new Set();
  let focusedClose = false;
  const makeOpener = () => ({expanded:'false', setAttribute(name,value){if(name==='aria-expanded')this.expanded=value;}});
  let opener = makeOpener();
  const filters = {
    classList:{contains:value=>filterClasses.has(value), add:value=>filterClasses.add(value)},
    querySelector:selector=>selector==='.close'?{focus:()=>{focusedClose=true;}}:null
  };
  const panel = {querySelectorAll:()=>[],querySelector:selector=>selector==='.mobile-filter'?opener:null};
  const doc = {
    body:{classList:{add:value=>bodyClasses.add(value)}},
    querySelector:selector=>selector==='main'?{}:selector==='#results-panel'?panel:selector==='#filters'?filters:null
  };
  const api = load([], '#zoeken?all=1', {document:doc});
  api.bindResultsControls();
  assert.equal(opener.expanded, 'false');
  opener.onclick();
  assert.equal(opener.expanded, 'true');
  assert.ok(focusedClose);
  assert.ok(bodyClasses.has('locked'));
  opener = makeOpener(); // updateSearchResults replaces only the results panel.
  api.bindResultsControls();
  assert.equal(opener.expanded, 'true');
  assert.ok(filterClasses.has('open'));
  assert.ok(bodyClasses.has('locked'));
  filterClasses.clear();
  api.bindResultsControls();
  assert.equal(opener.expanded, 'false');
});

test('workshop and trainer entry uses training filters and preserves a named trainer search', () => {
  const api = load();
  for (const q of ['workshops', 'trainers', 'trainingen', 'workshop', 'trainer']) {
    const criteria = api.criteriaForQuery(q);
    assert.equal(criteria.type, 'Training', q);
    assert.equal(criteria.q, '', q);
  }
  const criteria = api.criteriaForQuery('trainer Tanja van Grinsven');
  assert.equal(criteria.type, 'Training');
  assert.match(criteria.q, /tanja/);
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const live = load(data);
  assert.ok(live.recordsForCriteria(criteria).some(item => item.id === 'han-ai-voor-docenten-basis'));
  const training = load(data, '#zoeken?type=Training');
  const html = training.resultsMarkup();
  assert.ok(html.includes('<h2>Workshops en trainers</h2>'));
  assert.ok(html.includes('In-school AI workshop op maat'));
  assert.ok(html.includes('Copilot Chat: adoptietraining op locatie'));
});

test('excluded software stays out of results and filters while materials and legacy links remain usable', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const api = load(data);
  const ids = criteria => Array.from(api.recordsForCriteria(criteria), item => item.id);
  const software = ids({ type: 'software' });
  const materials = ids({ type: 'materials' });
  const knowledge = ids({ type: 'knowledge' });
  assert.equal(software.length, 0);
  const excluded = data.filter(item => item.publicationExclusion);
  assert.equal(excluded.filter(item => item.offerCategory === 'software').length, 12);
  const publicIds = ids({});
  for (const item of excluded) assert.ok(!publicIds.includes(item.id), item.id);
  for (const id of ['selfie-for-teachers', 'ai-waaier-voor-toetsen', 'vista-promptdatabase-ai-onderwijs', 'open-inspiratielessen-over-ai']) {
    assert.ok(materials.includes(id), id);
    assert.ok(!software.includes(id), id);
  }
  assert.ok(knowledge.includes('ai-act-service-desk'));
  for (const item of data.filter(item => !['verified','recently_checked'].includes(item.verificationStatus))) {
    assert.ok(!publicIds.includes(item.id), 'Unverified source must stay out of the public catalogue: ' + item.id);
  }
  assert.equal(new Set([...software, ...materials, ...knowledge]).size, software.length + materials.length + knowledge.length);
  assert.ok(!ids({ type: 'Voorziening' }).includes('uva-hva-ai-chat'));
  assert.ok(ids({ type: 'Hulpmiddel' }).includes('ai-waaier-voor-toetsen'));
  const combined = ids({ type: 'software,knowledge' });
  assert.equal(combined.length, software.length + knowledge.length);
  const form = api.homeFilterPanel([]);
  assert.ok(!form.includes('name="type" value="software"'));
  assert.ok(form.includes('name="type" value="knowledge"'));
  assert.ok(!form.includes('name="type" value="Hulpmiddel"'));
  assert.ok(!form.includes('name="type" value="Voorziening"'));
  const unknown = {...record('new-tool'), legacyType:'Product', recordType:'product'};
  assert.equal(load([unknown]).recordsForCriteria({type:'software'}).length, 0);
  assert.equal(load([unknown]).recordsForCriteria({type:'unclassified'}).length, 1);
});

test('choosing an AI application is framed as an assessment, not a safety endorsement', () => {
  const api = load([], '#zoeken?theme=Veilige%20AI-omgeving');
  const html = api.resultsMarkup();
  assert.ok(html.includes('<h1>Een AI-toepassing kiezen</h1>'));
  assert.ok(html.includes('geen keurmerk'));
});

test('every offering keeps the same facts including explicit unknowns', () => {
  const api = load();
  const complete = {...record('complete', '2026-09-01'), costType:'free', accessType:'public', geographicScope:'Nederland'};
  const sparse = {...record('sparse', null), providerName:'', audiences:[], sectors:[], lastVerified:'', changeHistory:[]};
  const first = Array.from(api.offerFacts(complete), row => row[0]);
  const second = Array.from(api.offerFacts(sparse), row => row[0]);
  assert.deepEqual(first, second);
  assert.ok(api.offerFacts(sparse).every(row => row[1]));
  assert.ok(api.simpleCard(sparse).includes('Kosten onbekend'));
  assert.ok(api.simpleCard(sparse).includes('Toegang niet vastgesteld'));
});

test('new contributions and product detail code carry the non-endorsement notice', () => {
  const api = load([record('notice', null)]);
  assert.ok(api.newOffersMarkup().includes('<h1>Nieuwe bijdragen</h1>'));
  assert.ok(api.newOffersMarkup().includes('geen goedkeuring, kwaliteitsbeoordeling of aanbeveling'));
});

test('new additions use the earliest valid added date, never a verification or edit date', () => {
  const api = load();
  const item = record('history', '2020-01-01');
  item.changeHistory = [{type: 'updated', date: '2026-09-09'}, {type: 'added', date: '2026-02-30'},
    {type: 'added', date: '2026-09-01'}, {type: 'added', date: '2026-07-12'}];
  assert.equal(api.addedDate(item), '2026-07-12');
  item.changeHistory = [{type: 'verified', date: '2026-09-09'}];
  assert.equal(api.addedDate(item), '');
});

test('newest additions and newest publications are separate ordered views', () => {
  const oldOffer = record('just-added', '2020-01-01');
  oldOffer.changeHistory = [{type: 'added', date: '2026-09-09'}];
  const newOffer = record('just-published', '2026-09-08');
  newOffer.changeHistory = [{type: 'added', date: '2026-09-08'}];
  const api = load([oldOffer, newOffer]);
  assert.deepEqual(Array.from(api.newestRecords('added'), r => r.id), ['just-added', 'just-published']);
  assert.deepEqual(Array.from(api.newestRecords('published'), r => r.id), ['just-published', 'just-added']);
  assert.ok(api.newOffersMarkup('added').includes('Het aanbod zelf kan al langer bestaan'));
  assert.ok(api.newOffersMarkup('published').includes('Gepubliceerd op'));
});

test('unknown recency dates are disclosed rather than invented from verification', () => {
  const unknown = record('unknown-date', null); unknown.changeHistory = [];
  const api = load([unknown]);
  for (const mode of ['added', 'published']) {
    const html = api.newOffersMarkup(mode);
    assert.ok(html.includes('Bij 1 vermeldingen is deze datum niet vastgelegd'));
    assert.ok(!html.includes('data-record-id="unknown-date"'));
    assert.ok(html.includes('#zoeken?all=1'));
  }
});

test('new offering pages keep the chosen date mode and cover all dated records once', () => {
  const data = Array.from({length: 25}, (_, i) => record('item-' + i, '2026-09-09', String(i).padStart(2, '0')));
  const api = load(data);
  const first = api.newOffersMarkup('published', 1), second = api.newOffersMarkup('published', 2);
  assert.equal((first.match(/data-record-id=/g) || []).length, 24);
  assert.equal((second.match(/data-record-id=/g) || []).length, 1);
  assert.ok(first.includes('#nieuw?volgorde=published&pagina=2'));
  assert.ok(second.includes('data-record-id="item-24"'));
  assert.equal(api.newOffersMarkup('invalid', -8), api.newOffersMarkup('added', 1));
});

test('only real calendar dates qualify; check and import dates are never fallbacks', () => {
  const api = load();
  assert.equal(api.publicationDate(record('leap', '2024-02-29')), '2024-02-29');
  for (const value of [null, undefined, '', '2026-02-29', '2026-02-30', '2026-13-01', '04-09-2026']) {
    assert.equal(api.publicationDate(record('unknown', value)), '');
  }
});
test('newest and oldest sort keep unknown dates last and break ties consistently', () => {
  const data = [record('unknown', null), record('new', '2026-09-03'),
    record('old-b', '2024-02-29', 'B'), record('invalid', '2026-02-30'),
    record('old-a', '2024-02-29', 'A')];
  const api = load(data);
  api.setState({ sort: 'published' });
  assert.deepEqual(api.sortRecords([...data]).map(r => r.id), ['new', 'old-a', 'old-b', 'invalid', 'unknown']);
  api.setState({ sort: 'published-oldest' });
  assert.deepEqual(api.sortRecords([...data]).map(r => r.id), ['old-a', 'old-b', 'new', 'invalid', 'unknown']);
});
test('sort URLs preserve filters and allow discovery without a search term', () => {
  const api = load([], '#zoeken?sort=published&sector=HBO&audience=Docenten%2COnderzoekers');
  assert.equal(api.getState().sort, 'published');
  assert.equal(api.getState().audience, 'Docenten,Onderzoekers');
  assert.equal(new URLSearchParams(api.stateHref().split('?')[1]).get('sector'), 'HBO');
  api.setState({ sort: 'published' });
  assert.equal(api.hasIntent(), true);
});
test('removed and invalid sorting modes safely fall back without discarding filters', () => {
  for (const sort of ['checked', 'available', 'new', 'nonsense']) {
    const api = load([], '#zoeken?sort=' + sort + '&sector=PO');
    assert.equal(api.getState().sort, 'relevant');
    assert.equal(api.getState().sector, 'PO');
  }
  assert.deepEqual(Object.keys(load().options), ['relevant', 'published', 'published-oldest', 'az']);
});
test('chronological results are globally ordered, not grouped by type', () => {
  const api = load([record('unknown', null), record('dated', '2026-09-03')],
    '#zoeken?theme=Privacy%20en%20AVG&sort=published');
  const html = api.resultsMarkup();
  assert.ok(!html.includes('class="result-group"'));
  assert.ok(html.indexOf('data-record-id="dated"') < html.indexOf('data-record-id="unknown"'));
  assert.ok(html.includes('Publicatiedatum bekend bij 1 van 2 resultaten'));
  assert.ok(html.includes('<time datetime="2026-09-03">'));
  assert.ok(html.includes('Publicatiedatum onbekend'));
  assert.ok(html.includes('aria-describedby="sort-summary"'));
  assert.ok(!html.includes('option value="checked"'));
  assert.ok(!html.includes('option value="available"'));
});
test('title sorting and its explanation remain available', () => {
  const api = load([record('z', null, 'Zebra'), record('a', null, 'Atlas')], '#zoeken?sort=az');
  const html = api.resultsMarkup();
  assert.ok(html.indexOf('data-record-id="a"') < html.indexOf('data-record-id="z"'));
  assert.ok(html.includes('Gesorteerd op titel, van A tot Z.'));
});

test('multi-select filter pulldowns expose selected values and counts', () => {
  const item = record('both', '2026-09-03');
  item.sectors = ['HBO', 'WO'];
  const api = load([item], '#zoeken?sector=HBO%2CWO&sort=published');
  const html = api.facet('sector', '2. Sector', ['HBO', 'WO']);
  assert.ok(/<details[^>]*\sopen(?:\s|>)/.test(html));
  assert.ok(html.includes('Kies één of meer opties tegelijk.'));
  assert.ok(html.includes('HBO, WO'));
  assert.ok(html.includes('aria-label="2 geselecteerd"'));
  assert.equal((html.match(/type="checkbox"/g) || []).length, 2);
  assert.equal((html.match(/ checked /g) || []).length, 2);
});
test('empty filter values have clear placeholders and URL values are escaped', () => {
  const api = load();
  assert.equal(api.facetSelectionLabel('sector'), 'Alle sectoren');
  assert.equal(api.facetSelectionLabel('organization'), 'Alle aanbieders');
  api.setState({ sector: '<img src=x>', sort: 'published' });
  const html = api.facet('sector', 'Sector', []);
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(!html.includes('<img'));
});

test('results consistently show availability and retain source links and pilot status', () => {
  const item = record('example', '2026-09-03');
  const api = load([item], '#zoeken?sort=published');
  const html = api.resultsMarkup();
  assert.ok(html.includes('>Direct beschikbaar<'));
  assert.ok(!html.includes('>Officiële bron<'));
  assert.ok(!html.includes('data-quick="status|'));
  assert.ok(!html.includes('data-quick="source|'));
  assert.ok(html.includes('href="https://example.org/example"'));
  assert.ok(api.simpleCard({ ...item, status: 'pilot' }).includes('>Pilot<'));
});

test('each flat and grouped result opens an email draft with its own public item link', () => {
  const item = { ...record('email-cafe', null, 'AI & onderwijs: "café" + 100%? #leren'),
    providerName: 'Onderzoek & Opleiding' };
  const other = record('second-result', null);
  for (const hash of ['#zoeken?sector=HBO', '#zoeken?theme=Privacy%20en%20AVG']) {
    const api = load([item, other], hash, {
      location: { hash, href: `http://localhost:8000/?atlas-no-count=1${hash}` }
    });
    const html = api.resultsMarkup();
    const cards = [...html.matchAll(/<article class="result-card"[\s\S]*?<\/article>/g)];
    assert.equal(cards.length, 2);
    for (const [card] of cards) {
      const anchors = [...card.matchAll(/<a[^>]+href="(mailto:[^"]+)"[^>]*>Delen via e-mail<\/a>/g)];
      assert.equal(anchors.length, 1);
      const email = new URL(anchors[0][1].replaceAll('&amp;', '&'));
      assert.equal(email.pathname, '', 'The visitor chooses the recipient');
      assert.deepEqual([...email.searchParams.keys()], ['subject', 'body']);
      const expected = card.includes('data-record-id="email-cafe"') ? item : other;
      assert.equal(email.searchParams.get('subject'), `AI & Onderwijs Atlas: ${expected.title}`);
      const body = email.searchParams.get('body');
      assert.ok(body.includes(expected.title));
      assert.ok(body.includes(`Aanbieder: ${expected.providerName}`));
      assert.ok(body.endsWith(`https://ecmw.github.io/ai-onderwijs-atlas-nederland/#item/${expected.id}`));
      assert.ok(!/localhost|atlas-no-count|sector=|theme=/.test(body));
      assert.ok(card.includes('aria-label="Delen via e-mail:'));
    }
    assert.ok(html.includes('aria-label="Delen via e-mail: AI &amp; onderwijs: &quot;café&quot;'));
  }
});

test('source citations preserve official references without inventing authors or publication dates', () => {
  const item = {
    ...record('citation-caf\u00e9/ruimte', '2001-02-03', 'Bron & onderwijs: "caf\u00e9"'),
    providerName: 'Onderzoek & Opleiding',
    sourceUrls: [
      { url: 'https://secondary.example.org/background', sourceType: 'secondary' },
      { url: 'https://official.example.org/report?chapter=1&lang=nl', sourceType: 'official' },
      { url: 'https://official.example.org/appendix', sourceType: 'official' },
      { url: 'https://authoritative.example.org/commentary', sourceType: 'authoritative' }
    ]
  };
  const hash = '#zoeken?sector=HBO';
  const api = load([item], hash, { location: { hash, href: `http://localhost:8000/?atlas-no-count=1${hash}` } });
  const text = api.sourceCitation(item);
  assert.ok(text.includes(item.title));
  assert.ok(text.includes(`Aanbieder: ${item.providerName}`));
  assert.ok(text.includes('2001'));
  assert.ok(text.includes('https://official.example.org/report?chapter=1&lang=nl'));
  assert.ok(text.includes('https://official.example.org/appendix'));
  assert.ok(text.includes(`https://ecmw.github.io/ai-onderwijs-atlas-nederland/#item/${encodeURIComponent(item.id)}`));
  assert.ok(!/secondary\.example|authoritative\.example|localhost|atlas-no-count|sector=|2099|Auteur:/i.test(text));
  for (const publicationDate of [null, '', '2001-02-30']) {
    const undated = api.sourceCitation({ ...item, publicationDate });
    assert.ok(!/2001|2099/.test(undated), 'Invalid or missing publication dates must not fall back to source-check or import dates');
  }
  const sparse = api.sourceCitation({ ...item, providerName: '', publicationDate: null, sourceUrls: [] });
  assert.ok(!/undefined|null/.test(sparse));
  assert.ok(sparse.includes(`https://ecmw.github.io/ai-onderwijs-atlas-nederland/#item/${encodeURIComponent(item.id)}`));
});

test('copying a source citation reports success only after the clipboard accepts it', async () => {
  const item = record('clipboard-success', '2001-02-03');
  const feedback = { textContent: '' };
  const fallback = { hidden: true };
  const textarea = { value: '', readOnly: true, focus() {}, select() { throw new Error('Manual fallback should not run after successful copying'); } };
  const copied = [];
  let acceptWrite;
  const api = load([item], '#zoeken', {
    navigator: { clipboard: { writeText: text => { copied.push(text); return new Promise(resolve => { acceptWrite = resolve; }); } } },
    document: { querySelector: selector => ({ main: {}, '#detail-feedback': feedback, '#citation-fallback': fallback, '#source-citation': textarea })[selector] || null }
  });
  const copying = api.copySourceCitation(item);
  assert.ok(!/gekopieerd/i.test(feedback.textContent), 'Copying is not successful while the clipboard write is pending');
  acceptWrite();
  await copying;
  assert.deepEqual(copied, [api.sourceCitation(item)]);
  assert.match(feedback.textContent, /gekopieerd/i);
  assert.equal(fallback.hidden, true);
});

test('blocked or unavailable clipboards expose the complete citation for manual copying', async () => {
  for (const navigator of [
    { clipboard: { writeText: async () => { throw new Error('Clipboard permission denied'); } } },
    {}
  ]) {
    const item = record('clipboard-fallback', null, 'Handreiking & toelichting');
    const feedback = { textContent: '' };
    const fallback = { hidden: true };
    let selected = false;
    const textarea = { value: '', readOnly: true, focus() {}, select() { selected = true; } };
    const api = load([item], '#zoeken', {
      navigator,
      document: { querySelector: selector => ({ main: {}, '#detail-feedback': feedback, '#citation-fallback': fallback, '#source-citation': textarea })[selector] || null }
    });
    await api.copySourceCitation(item);
    assert.equal(fallback.hidden, false);
    assert.equal(textarea.value, api.sourceCitation(item));
    assert.equal(selected, true);
    assert.ok(!/gekopieerd/i.test(feedback.textContent), 'A rejected clipboard write must not be announced as successful');
  }
});

test('a delayed clipboard rejection cannot change a different page or use detached fallback controls', async () => {
  for (const replacement of [null, { value: '', readOnly: true, focus() { throw new Error('An old copy action must not steal focus'); }, select() {} }]) {
    const item = record('citation-before-navigation', null);
    const originalFallback = { hidden: true };
    const feedback = { textContent: '' };
    const originalField = { value: '', readOnly: true, focus() {}, select() {} };
    const current = { main: {}, '#detail-feedback': feedback, '#citation-fallback': originalFallback, '#source-citation': originalField };
    let rejectWrite;
    const api = load([item], '#zoeken', {
      navigator: { clipboard: { writeText: () => new Promise((resolve, reject) => { rejectWrite = reject; }) } },
      document: { querySelector: selector => current[selector] || null }
    });
    const copying = api.copySourceCitation(item);
    current['#detail-feedback'] = replacement ? { textContent: '' } : null;
    current['#citation-fallback'] = replacement ? { hidden: true } : null;
    current['#source-citation'] = replacement;
    rejectWrite(new Error('Permission denied after navigation'));
    await assert.doesNotReject(copying);
    assert.equal(originalFallback.hidden, true);
    if (replacement) {
      assert.equal(replacement.value, '');
      assert.equal(current['#citation-fallback'].hidden, true);
      assert.equal(current['#detail-feedback'].textContent, '');
    }
  }
});

test('meeting sheets include all matching records even when a themed group shows only three cards', () => {
  const matching = Array.from({ length: 5 }, (_, index) => record(`meeting-${index}`, null, `Overlegitem ${index}`));
  const excluded = { ...record('excluded-sheet-item', null), publicationExclusion: { reason: 'Outside public scope', decidedOn: '2026-09-01' } };
  const unverified = { ...record('unverified-sheet-item', null), verificationStatus: 'needs_review' };
  const differentTheme = { ...record('different-theme', null), themes: ['Onderzoek'], description: 'Onderzoeksprogramma' };
  const api = load([...matching, excluded, unverified, differentTheme], '#zoeken?theme=Privacy%20en%20AVG');
  assert.equal([...api.resultsMarkup().matchAll(/<article class="result-card"/g)].length, 3, 'The fixture must exercise the abbreviated grouped result view');
  const html = api.meetingSheetMarkup();
  for (const item of matching) {
    assert.ok(html.includes(item.title));
    assert.ok(html.includes(item.sourceUrls[0].url));
    assert.ok(html.includes(`https://ecmw.github.io/ai-onderwijs-atlas-nederland/#item/${item.id}`));
  }
  for (const item of [excluded, unverified, differentTheme]) assert.ok(!html.includes(item.id));
  assert.ok(!/2099|Broncontrole|Waarom zie ik dit/.test(html));
});

test('meeting sheets preserve chronological ordering, complete criteria and current filter membership', () => {
  const shared = { providerName: 'Onderzoek & Opleiding', geographicScope: 'Nederland', accessType: 'registration_required' };
  const oldest = { ...record('meeting-old', '2001-02-03', 'Oudste vermelding'), ...shared };
  const newest = { ...record('meeting-new', '2020-05-06', 'Nieuwste vermelding'), ...shared };
  const undated = { ...record('meeting-undated', null, 'Ongedateerde vermelding'), ...shared };
  const otherSector = { ...record('meeting-other-sector', '2021-01-01', 'Verkeerde sector'), ...shared, sectors: ['PO'] };
  const params = new URLSearchParams({ q: 'privacy', theme: 'Privacy en AVG', audience: 'Docenten', sector: 'HBO',
    status: 'Direct beschikbaar', geography: 'Nederland', organization: shared.providerName, access: 'Registratie nodig', sort: 'published' });
  const api = load([oldest, undated, otherSector, newest], `#zoeken?${params}`);
  const html = api.meetingSheetMarkup();
  assert.ok(html.indexOf(newest.title) < html.indexOf(oldest.title));
  assert.ok(html.indexOf(oldest.title) < html.indexOf(undated.title));
  assert.ok(!html.includes(otherSector.title));
  const criteria = html.match(/<dl\b[^>]*class="[^"]*\bmeeting-criteria\b[^"]*"[^>]*>([\s\S]*?)<\/dl>/)?.[1];
  assert.ok(criteria, 'The printable search context must be a distinct criteria list');
  for (const value of ['privacy', 'Privacy en AVG', 'Docenten', 'HBO', 'Direct beschikbaar', 'Nederland', 'Onderzoek &amp; Opleiding', 'Registratie nodig']) {
    assert.ok(criteria.includes(value), `Print criteria must retain ${value}, including choices after the first four`);
  }
  api.setState({ ...api.getState(), sort: 'published-oldest' });
  const ascending = api.meetingSheetMarkup();
  assert.ok(ascending.indexOf(oldest.title) < ascending.indexOf(newest.title));
  assert.ok(ascending.indexOf(newest.title) < ascending.indexOf(undated.title));
});

test('no saving controls remain on cards or results; contributions are visible', () => {
  const item = record('example', '2026-09-03');
  const api = load([item], '#zoeken?sort=published');
  for (const html of [api.simpleCard(item), api.teaserCard(item), api.resultsMarkup()]) {
    assert.ok(!/data-favorite|data-save-search|Bewaar/.test(html));
  }
  assert.ok(api.resultsMarkup().includes('Aanbod toevoegen of feedback geven'));
  assert.ok(api.contributionPrompt().includes('href="#bijdragen"'));
});

test('contributions use distinct templates and correction retains exact item context', () => {
  const api = load();
  const item = record('item-with-id', null, 'Naam & uitleg? #test');
  for (const [kind, template] of [['addition', 'atlas-aanvulling.yml'], ['correction', 'feitelijke-correctie.yml'], ['feedback', 'feedback.yml']]) {
    const url = new URL(api.contributionIssueUrl(kind, item));
    assert.equal(url.origin, 'https://github.com');
    assert.equal(url.searchParams.get('template'), template);
    if (kind === 'correction') {
      assert.equal(url.searchParams.get('title'), '[Correctie] ' + item.title);
      assert.equal(url.searchParams.get('record'), item.title + '\nhttps://ecmw.github.io/ai-onderwijs-atlas-nederland/#item/item-with-id');
    }
  }
});

test('funding task appears under help and reuses existing subsidy and call filters', () => {
  const data = [
    { ...record('grant'), legacyType: 'Subsidie', sectors: ['PO'] },
    { ...record('call'), legacyType: 'Call', status: 'open_call' },
    record('guidance')
  ];
  const api = load(data);
  const html = api.homeFilterPanel([]);
  const help = html.split('Waar zoekt u hulp bij?</summary>')[1].split('</details>')[0];
  assert.ok(help.includes('Subsidies en calls vinden'));
  assert.ok(help.includes('name="type" value="Subsidie of call,Subsidie"'));
  assert.ok(html.includes('value="Subsidie of call"'));
  assert.ok(html.includes('value="Subsidie"'));
  assert.ok(!html.includes('value="Subsidies"'));
  assert.deepEqual(Array.from(api.recordsForCriteria({ type:'Subsidie of call,Subsidie' }), r=>r.id), ['grant','call']);
  assert.deepEqual(Array.from(api.recordsForCriteria({ type:'Subsidie of call,Subsidie', sector:'HBO', status:'Open voor aanvragen' }), r=>r.id), ['call']);
});

test('suggested counts use exactly the linked criteria and exclude filtered-out records', () => {
  const data = [record('hbo'), { ...record('po-a'), sectors:['PO'] },
    { ...record('po-b'), sectors:['PO'] }, { ...record('researcher'), sectors:['PO'], audiences:['Onderzoekers'] }];
  const api = load(data, '#zoeken?sector=PO&audience=Docenten&sort=published');
  const before = JSON.stringify(api.getState());
  const sections = api.suggestionData('privacy');
  assert.ok(sections.length > 0);
  for (const item of sections.flatMap(section=>section.items)) {
    if (item.href.startsWith('#zoeken')) {
      const criteria = Object.fromEntries(new URLSearchParams(item.href.split('?')[1]));
      assert.equal(criteria.sector, 'PO');
      assert.equal(criteria.audience, 'Docenten');
      assert.equal(criteria.sort, 'published');
      const count = api.recordsForCriteria(criteria).length;
      assert.ok(count > 0);
      assert.equal(item.count, count);
    } else assert.ok(['#item/po-a','#item/po-b'].includes(item.href));
  }
  assert.equal(JSON.stringify(api.getState()),before);
});

test('suggestions and Enter use the same natural-language query interpretation', () => {
  const api=load();
  const criteria=api.criteriaForQuery('ik ben docent en onderzoeker en zoek iets over ai act', {sector:'HBO',sort:'published'});
  assert.equal(criteria.audience,'Docenten,Onderzoekers');
  assert.equal(criteria.theme,'AI Act en wetgeving');
  assert.equal(criteria.sector,'HBO');
  assert.equal(criteria.sort,'published');
});

test('subsidy searches include subsidies and calls even without a financing theme', () => {
  const data=[{...record('grant'),legacyType:'Subsidie'}, {...record('call'),legacyType:'Call'},record('guide')];
  const api=load(data);
  for(const query of ['subsidie','subsidies','call','calls']) {
    const criteria=api.criteriaForQuery(query);
    assert.deepEqual(Array.from(api.recordsForCriteria(criteria),r=>r.id),['grant','call']);
    assert.equal(criteria.theme,'');
  }
});

test('retired freshness links keep remaining filters without showing the retired facet', () => {
  const data=[record('hbo'),{...record('po'),sectors:['PO']}];
  for(const suffix of ['','&sector=PO']) {
    const api=load(data,'#zoeken?freshness=Recent%20gecontroleerd'+suffix);
    assert.ok(api.hasIntent());
    assert.equal(api.getState().freshness,undefined);
    assert.ok(!api.filterKeys.includes('freshness'));
    assert.ok(!api.stateHref().includes('freshness'));
    assert.ok(!api.resultsMarkup().includes('Recent gecontroleerd'));
    assert.equal(api.recordsForCriteria(api.getState()).length,suffix?1:2);
  }
});

test('related theme counts represent destinations and retain contextual filters', () => {
  const data=[{...record('po'),sectors:['PO'],themes:['Privacy en AVG','AI Act en wetgeving']},
    {...record('po-law'),sectors:['PO'],themes:['AI Act en wetgeving']},
    {...record('hbo'),themes:['Privacy en AVG','AI Act en wetgeving']}];
  const api=load(data,'#zoeken?theme=Privacy%20en%20AVG&sector=PO&audience=Docenten');
  assert.deepEqual(Array.from(api.relatedThemes('Privacy en AVG'),pair=>Array.from(pair)),[['AI Act en wetgeving',2]]);
  assert.ok(api.resultsMarkup().includes('sector=PO'));
});

test('actual catalogue suggestions have exact counts across roles, sectors and topics', () => {
  const dataWindow={};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','data','data-v2.js'),'utf8'),{window:dataWindow});
  let checked=0;
  for(const filters of ['', '&sector=PO&audience=Docenten', '&sector=HBO&audience=Docenten%2COnderzoekers', '&type=Training', '&organization=Kennisnet']) {
    const api=load(dataWindow.ATLAS_RECORDS.records,'#zoeken?sort=published'+filters);
    for(const query of ['privacy','toets','AI Act','SURF','subsidies','training']) {
      const expectedIds = new Set(api.recordsForCriteria(api.criteriaForQuery(query)).map(r=>r.id));
      for(const item of api.suggestionData(query).flatMap(s=>s.items)) {
        if(item.href.startsWith('#zoeken')) {
          const actual=api.recordsForCriteria(Object.fromEntries(new URLSearchParams(item.href.split('?')[1]))).length;
          assert.ok(actual>0);
          assert.equal(item.count,actual,query+' '+filters+' '+item.label);
        } else assert.ok(expectedIds.has(decodeURIComponent(item.href.slice(6))));
        checked++;
      }
    }
  }
  assert.ok(checked>50);
});
