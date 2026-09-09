const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const catalogue = fs.readFileSync(path.join(__dirname, '..', 'catalog.js'), 'utf8');
const boot = "  addEventListener('hashchange', route); addEventListener('popstate', route); route();";
assert.equal(catalogue.split(boot).length, 2, 'Test hook must replace exactly the route startup');
const instrumented = catalogue.replace(boot, `  window.testCatalogue = {
    commercialLabel, offerFacts, costLabel, publicationDate, addedDate, newestRecords, newOffersMarkup, sortRecords, stateHref, parseState, hasIntent, resultsMarkup, simpleCard,
    facet, facetSelectionLabel, contributionIssueUrl, contributionPrompt, teaserCard,
    homeFilterPanel, recordsForCriteria,
    suggestionData, criteriaForQuery, relatedThemes, filterKeys: FILTER_KEYS,
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
function load(records = [], hash = '#zoeken') {
  const media = () => ({ matches: false });
  const context = vm.createContext({
    window: { ATLAS_RECORDS: { records, metadata: {} }, matchMedia: media },
    document: { querySelector: selector => selector === 'main' ? {} : null },
    localStorage: { getItem: () => null }, location: { hash }, matchMedia: media,
    URLSearchParams, Intl
  });
  vm.runInContext(instrumented, context);
  context.window.testCatalogue.parseState();
  return context.window.testCatalogue;
}

test('commercial labels require evidence and are independent of price', () => {
  const api = load();
  const paid = { ...record('course', null), costType: 'paid' };
  assert.equal(api.commercialLabel(paid), 'Commerciële aard niet vastgesteld');
  const free = { ...record('tool', null), costType: 'free', commercialStatus: 'commercial',
    commercialEvidence: {url: 'https://example.org/tool', note: 'Commercial product with a free tier.', checkedOn: '2026-09-09'} };
  assert.equal(api.costLabel(free), 'Gratis');
  assert.equal(api.commercialLabel(free), 'Commercieel aanbod');
  delete free.commercialEvidence;
  assert.equal(api.commercialLabel(free), 'Commerciële aard niet vastgesteld');
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

test('offer forms separate AI software from work materials and preserve legacy links', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const api = load(data);
  const ids = criteria => Array.from(api.recordsForCriteria(criteria), item => item.id);
  const software = ids({ type: 'software' });
  const materials = ids({ type: 'materials' });
  const knowledge = ids({ type: 'knowledge' });
  assert.ok(software.includes('uva-hva-ai-chat'));
  assert.ok(software.includes('chatgpt-edu'));
  for (const id of ['selfie-for-teachers', 'ai-waaier-voor-toetsen', 'vista-promptdatabase-ai-onderwijs', 'open-inspiratielessen-over-ai']) {
    assert.ok(materials.includes(id), id);
    assert.ok(!software.includes(id), id);
  }
  assert.ok(knowledge.includes('nolai-kennisbank'));
  assert.ok(knowledge.includes('ai-act-service-desk'));
  assert.equal(new Set([...software, ...materials, ...knowledge]).size, software.length + materials.length + knowledge.length);
  assert.ok(ids({ type: 'Voorziening' }).includes('uva-hva-ai-chat'));
  assert.ok(ids({ type: 'Hulpmiddel' }).includes('ai-waaier-voor-toetsen'));
  const combined = ids({ type: 'software,knowledge' });
  assert.equal(combined.length, software.length + knowledge.length);
  const form = api.homeFilterPanel([]);
  assert.ok(form.includes('name="type" value="software"'));
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
