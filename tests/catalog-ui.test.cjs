const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const catalogue = fs.readFileSync(path.join(__dirname, '..', 'catalog.js'), 'utf8');
const boot = "  addEventListener('hashchange', route); addEventListener('popstate', route); route();";
assert.equal(catalogue.split(boot).length, 2, 'Test hook must replace exactly the route startup');
const instrumented = catalogue.replace(boot, `  window.testCatalogue = {
    pilotSheetText, renderPilotDecision, renderWorksheet,
    renderLearningEvidence, renderPracticeGuide, practiceCasesMarkup,
    commercialLabel, commercialBadge, commercialDetails, offerFacts, costLabel, publicationDate, addedDate, datedOffers, newOffersMarkup, papersMarkup, paperRis, sortRecords, stateHref, parseState, hasIntent, resultsMarkup, simpleCard,
    facet, bindFacetLists, facetSelectionLabel, contributionIssueUrl, contributionPrompt, teaserCard, booksMarkup, bookContextMarkup,
    recordContextMarkup, queryMatchQuality, queryMatches, sortRecords,
    homeFilterPanel, catalogFilterPanel, recordsForCriteria, renderDetail, researchPage, renderAssessment, readAssessmentDraft, assessmentParts, renderTeamTrial,
    suggestionData, criteriaForQuery, relatedThemes, renderPracticeRules, filterKeys: FILTER_KEYS,
    effectiveStatus, statusLabel, trustTone, filterValues, serializeFilterValues,
    accessLabel, accessOptions: Object.values(ACCESS_LABELS), recordThemes, themeOptions, route, syncFactDisclosure,
    searchForm, bindResultsControls, bindFilterDrawer, bindLessonCopy, sourceActionLabel, sourceCitation, copySourceCitation, meetingSheetMarkup, renderComparison, renderToolChoice,
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

test('worksheets copy the pupil task separately from teacher answers and the edited instruction', async () => {
  const worksheets = require('../data/worksheets.json');
  for (const [id, worksheet] of Object.entries(worksheets)) {
    const classPath = 'lesmateriaal/leerling/' + id.slice('werkblad-'.length) + '/';
    const location = { hash: '#' + id };
    const controls = new Map();
    const main = {querySelector(selector) {
      if (!controls.has(selector)) controls.set(selector, {isConnected: true});
      return controls.get(selector);
    }};
    const copied = [];
    const clipboard = {writeText: async text => copied.push(text)};
    const api = load([], location.hash, {
      window: {ATLAS_RECORDS: {records: [], metadata: {}, worksheets}}, location,
      document: {querySelector: () => main},
      sessionStorage: {getItem: () => 'https://example.org/'},
      navigator: {clipboard}
    });
    api.renderWorksheet(id);
    assert.match(main.innerHTML, /href="#zoeken\?q=les&amp;type=materials"/);
    assert.ok(main.innerHTML.includes('href="' + classPath + '">Open leerlingblad'));
    await controls.get('[data-work-copy]').onclick();
    assert.match(copied[0], /1\. .+\n\n2\. .+\n\n3\. /);
    for (const task of worksheet.tasks) assert.ok(copied[0].includes(task));
    assert.doesNotMatch(copied[0], /25% stijging|20% daling|zichtbaar worteltje|waarschijnlijke denkfout|https?:/);
    main.querySelector('#work-prompt').value = 'Mijn aangepaste instructie';
    await controls.get('[data-work-prompt]').onclick();
    assert.equal(copied[1], 'Mijn aangepaste instructie');
    await controls.get('[data-work-link]').onclick();
    assert.equal(copied[2], 'https://aionderwijsatlas.nl/' + classPath);

    clipboard.writeText = async () => { throw new Error('Clipboard unavailable'); };
    const fallback = main.querySelector('.lesson-copy');
    fallback.focus = () => {};
    fallback.select = () => { fallback.selected = true; };
    await controls.get('[data-work-link]').onclick();
    assert.equal(fallback.value, copied[2]);
    assert.equal(fallback.hidden, false);
    assert.equal(fallback.selected, true);

    location.hash += '?van=lesgids&sector=VO&vak=Biologie';
    api.renderWorksheet(id);
    assert.ok(main.innerHTML.includes('href="lesmateriaal/#selectie?sector=VO&amp;vak=Biologie"'));
    location.hash += '&terug=https%3A%2F%2Fexample.org';
    api.renderWorksheet(id);
    assert.match(main.innerHTML, /href="#zoeken\?q=les&amp;type=materials"/);
  }
});

test('a previous data edition without worksheets still links to the independent pupil page', () => {
  const main = {};
  const api = load([], '#werkblad-oefenvragen', {document: {querySelector: () => main}});
  api.renderWorksheet('werkblad-oefenvragen');
  assert.match(main.innerHTML, /Het werkblad kon niet worden geladen/);
  assert.match(main.innerHTML, /href="lesmateriaal\/leerling\/oefenvragen\/">Open leerlingblad/);
  assert.doesNotMatch(main.innerHTML, /data-work-copy|Kopieer mijn instructie/);
});

test('merged detail links redirect only to a present public record', () => {
  let redirected;
  const data = [record('kept')];
  const main = {};
  const api = load(data, '#item/old', {
    window: { ATLAS_RECORDS: {records: data, metadata: {recordRedirects: {old:'kept', missing:'absent'}}} },
    document: {querySelector: selector => selector === 'main' ? main : null},
    location: {hash: '#item/old', replace: value => { redirected = value; }}
  });
  api.renderDetail('old');
  assert.equal(redirected, '#item/kept');
  redirected = null;
  api.renderDetail('missing');
  assert.equal(redirected, null);
  assert.ok(main.innerHTML.includes('Niet gevonden'));
});

test('lesson detail returns fresh tabs to the local directory selection and rejects foreign or unknown return targets', () => {
  for (const [context, expected] of [
    ['van=lesgids&sector=VO&vak=Biologie&doel=poolvos', 'lesmateriaal/#selectie?sector=VO&amp;vak=Biologie&amp;doel=poolvos'],
    ['van=lesgids', 'lesmateriaal/'], ['van=https%3A%2F%2Fexample.org', '#zoeken'],
    ['van=lesgids&terug=https%3A%2F%2Fexample.org', '#zoeken'], ['van=lesgids&minuten=-4', '#zoeken'],
    ['van=lesgids&sector=niet-bestaand', '#zoeken'], ['van=lesgids&vak=Nederlands&vak=Duits', '#zoeken']
  ]) {
    const main = {querySelectorAll:() => []};
    const document = {querySelector:selector => selector === 'main' ? main : selector === '.lesson-detail a[href^="#leerlingblad?"]' ? null : {}, querySelectorAll:() => []};
    load([record('les-een')], '#item/les-een?' + context, {document}).renderDetail('les-een');
    assert.ok(main.innerHTML.includes('class="back-results" href="' + expected + '"'), context);
  }
});

test('paper list sorts by the published day, keeps equal dates stable and distinguishes publication types', () => {
  const paper = {id:'one', title:'A study', authors:['A. Boer','B. Chen'], published:'2026-11-20',
    publicationType:'journal-article', source:'Journal of Education', url:'https://doi.org/10.1000/paper', summary:'Education & AI.'};
  const data = {checkedAt:'2026-11-22', sources:[{name:'Crossref',url:'https://crossref.org/',checkedAt:'2026-11-22'},
    {name:'arXiv',url:'https://arxiv.org/',checkedAt:'2026-11-18'}],
    papers:[{...paper, title:'Older', published:'2026-11-15', publicationType:'peer-reviewed'},
      {...paper, id:'two', title:'Second paper', publicationType:'preprint',source:'arXiv',url:'https://arxiv.org/abs/1234'},
      paper, {...paper, id:'unsafe', title:'Invisible', url:'javascript:alert(1)'}]};
  const api = load([], '#papers', {URL});
  const html = api.papersMarkup(data);
  const list = html.split('<ol class="papers-list">')[1];
  assert.match(list, /Gepubliceerd tijdschriftartikel[\s\S]+A study[\s\S]+Preprint[\s\S]+Second paper[\s\S]+Peer-reviewed artikel[\s\S]+Older/);
  assert.equal((html.match(/Peer-reviewed artikel/g) || []).length, 1);
  assert.match(html, /A\. Boer, B\. Chen · <cite>Journal of Education/);
  assert.match(html, /href="https:\/\/doi\.org\/10\.1000\/paper"/);
  assert.match(html, /Education &amp; AI\./);
  assert.match(html, /datetime="2026-11-22"/);
  assert.match(html, /controle verschilt per bron/);
  assert.match(html, /arXiv ↗<\/a> · laatst gecontroleerd op <time datetime="2026-11-18"/);
  assert.doesNotMatch(html, /javascript:|Invisible/);
  assert.deepEqual(data.papers.map(item => item.title), ['Older','Second paper','A study','Invisible']);
  const sparse = api.papersMarkup({papers:[]});
  assert.match(sparse, /geen papers voor deze selectie/);
  assert.match(sparse, /controle onbekend/);
  assert.throws(() => api.papersMarkup({metadata:{}}));
});

test('a pilot sheet leaves missing evidence and the mandate visible in all three decisions', () => {
  const api = load([]);
  const entries = {doel:' Fictieve documenten ', rollen:'Opleidingsmanager beslist', bewijs:'', herzien:'De docent kan stoppen'};
  const sheet = api.pilotSheetText(entries, 'proef');
  assert.match(sheet, /Doel en afbakening\nFictieve documenten/);
  assert.match(sheet, /Wie voert uit en wie mag besluiten\?\nOpleidingsmanager beslist/);
  assert.match(sheet, /Bewijs voor het besluit\n\[In te vullen\]/);
  assert.match(sheet, /Herbeoordeling en stopafspraak\nDe docent kan stoppen/);
  assert.match(sheet, /Voorgestelde keuze\nEerst een kleine proef/);
  assert.match(api.pilotSheetText({}, 'uitvoeren'), /wie akkoord gaf/);
  assert.match(api.pilotSheetText({}, 'uitstellen'), /wie die uitzoekt/);
  assert.match(api.pilotSheetText({}, ''), /\[Nog te kiezen\]/);
});

test('a second navigation event for the same pilot sheet preserves its current fields and focus', () => {
  const panel = {};
  const main = {innerHTML:'untouched', querySelector: selector => selector === '.pilot-page' ? panel : null};
  const api = load([], '#pilotbesluit', {document:{querySelector: selector => selector === 'main' ? main : null}, clearTimeout() {}});
  api.route();
  assert.equal(main.innerHTML, 'untouched');
});

test('pilot sources resolve to public cards and the sheet copies its fields only on request', async () => {
  let copied;
  let current = 'proef';
  const doCopy = {isConnected:true}, fallback = {}, feedback = {}, advice = {};
  const form = {querySelector: selector => ({
    '[data-copy-pilot]':doCopy, '[data-pilot-advice]':advice, '[data-pilot-feedback]':feedback,
    '[data-pilot-copy]':fallback, 'input:checked':{value:current}
  })[selector], querySelectorAll: () => [{dataset:{pilotField:'doel'},value:'Mijn werkblad'}]};
  const main = {querySelector: () => form};
  const api = load([], '#pilotbesluit', {document:{querySelector: selector => selector === 'main' ? main : null},
    navigator:{clipboard:{writeText: async text => {copied = text;}}}});
  api.renderPilotDecision();
  const ids = ['schoolafspraken-over-het-gebruik-van-generatieve-ai','npuls-raise-risicobeoordeling-ai','surf-kennisnet-waardenwijzer-2025'];
  const index = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'search-index.json'), 'utf8')).map(row => row.id));
  for (const id of ids) {
    assert.ok(index.has(id));
    assert.ok(main.innerHTML.includes('href="#item/' + id + '" target="_blank" rel="noopener noreferrer"'));
  }
  form.oninput();
  assert.match(advice.textContent, /fictieve voorbeelden/);
  assert.equal(copied, undefined);
  current = 'uitstellen';
  await doCopy.onclick({currentTarget:doCopy});
  assert.match(copied, /Mijn werkblad/);
  assert.match(copied, /Voorgestelde keuze\nUitstellen of afzien/);
  assert.equal(feedback.textContent, 'Besluitblad gekopieerd.');
});

test('three teacher questions keep their cited outcomes when the rolling paper edition is unavailable', () => {
  const main = {};
  const api = load([], '#wat-werkt', {document: {querySelector: selector => selector === 'main' ? main : null}});
  api.renderLearningEvidence();
  const markup = main.innerHTML;
  const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sources', 'sources.json'), 'utf8')).sources;
  const urls = new Set(registry.filter(source => source.status === 'active').map(source => source.url_or_doi));
  const articles = [...markup.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g)].map(match => match[1]);
  assert.equal(articles.length, 3);
  for (const article of articles) {
    const doi = article.match(/href="(https:\/\/doi\.org\/[^"]+)"/)[1];
    assert.ok(urls.has(doi), doi);
    assert.match(article, /<details[\s\S]+<summary>Wie deden mee en wat is vergeleken\?/);
    assert.match(article, /Zelf doen[\s\S]+Check voor morgen/);
    assert.match(article, /<time datetime="\d{4}-\d{2}-\d{2}"/);
  }
  assert.match(articles[0], /d = 0,19[\s\S]+nieuw betoog[\s\S]+459/);
  assert.match(articles[1], /17% lager[\s\S]+één Turkse middelbare school/);
  assert.match(articles[2], /50,54[\s\S]+47,48[\s\S]+49,51[\s\S]+185/);
  assert.match(markup, /52 gerandomiseerde en quasi-experimentele onderzoeken/);
});

test('the guide connects both Dutch cases and the future discussion to published catalogue records', () => {
  const markup = load([]).practiceCasesMarkup();
  const publicIds = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'search-index.json'), 'utf8')).map(row => row.id));
  const ids = [...markup.matchAll(/href="#item\/([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids, ['open-leermateriaal-ai-in-de-klas-pilotscholen', 'uva-pilots-generatieve-ai-beveiligde-omgeving',
    'tno-scenariospel-werkzekerheid', 'unesco-ai-competency-framework-students']);
  assert.ok(ids.every(id => publicIds.has(id)));
  assert.match(markup, /Fortior[\s\S]+geen meting van leerwinst/);
  assert.match(markup, /Future Planet Studies[\s\S]+geen tijdmeting/);
  assert.match(markup, /Maak één keuze[\s\S]+Kom erop terug[\s\S]+gespreksvoorstel van de Atlas/);
});

test('a paper only shows open access for an explicit verified open value', () => {
  const api = load([], '#papers', {URL});
  const paper = {title:'Evidence in education', published:'2026-11-20', url:'https://doi.org/10.1000/study'};
  assert.match(api.papersMarkup({papers:[{...paper, access:'open'}]}), /class="paper-meta">.*Open access<\/span><\/p>/);
  for (const access of [undefined, 'Open', 'unknown', false]) {
    assert.doesNotMatch(api.papersMarkup({papers:[{...paper, access}]}), /Open access/);
  }
});

test('RIS preserves source author names, Unicode and full dates without allowing extra fields or records', () => {
  const api = load([], '#papers', {URL});
  const study = {title:'Éducation\r\nER  -\u2028TY  - FAKE', published:'2026-03-09', source:'Tijdschrift Ō',
    authors:['Elke van der Meer','Björk'], risAuthors:['van der Meer, Elke','Björk'], publicationType:'peer-reviewed',
    url:'https://doi.org/10.1234/article'};
  const other = {...study, id:'10.1000/new', title:'Second paper', published:'2025-05-31', authors:['Ana de la Cruz'],
    risAuthors:['wrong','length'], publicationType:'preprint', url:'https://example.org/preprint', source:'arXiv'};
  assert.deepEqual(api.paperRis([study,other]).split('\r\n'), [
    'TY  - JOUR', 'AU  - van der Meer, Elke', 'AU  - Björk', 'TI  - Éducation ER  - TY  - FAKE', 'PY  - 2026',
    'DA  - 2026/03/09', 'T2  - Tijdschrift Ō', 'DO  - 10.1234/article', 'UR  - https://doi.org/10.1234/article', 'ER  -', '',
    'TY  - UNPB', 'AU  - Ana de la Cruz', 'TI  - Second paper', 'PY  - 2025', 'DA  - 2025/05/31',
    'T2  - arXiv', 'DO  - 10.1000/new', 'UR  - https://example.org/preprint', 'ER  -', ''
  ]);
  const sparse = api.paperRis([{...other, id:'not-a-doi', risAuthors:[' '], publicationType:'unclassified'}]);
  assert.match(sparse, /^TY  - GEN\r\nAU  - Ana de la Cruz/);
  assert.doesNotMatch(sparse, /^DO  - /m);
});

test('usage markers distinguish real catalogue outcomes and official actions', () => {
  const api = load([], '#zoeken', {URL});
  const sample = record('item', '2026-11-22');
  assert.match(api.simpleCard({...sample,offerCategory:'materials'}), /href="https:\/\/example.org\/item" data-atlas-usage="lesson-open"/);
  assert.match(api.simpleCard({...sample,recordType:'funding_call'}), /href="https:\/\/example.org\/item" data-atlas-usage="funding-open"/);
  assert.doesNotMatch(api.simpleCard(sample), /data-atlas-usage/);
  assert.doesNotMatch(api.simpleCard({...sample,offerCategory:'materials',sourceUrls:[]}), /data-atlas-usage/);
  assert.doesNotMatch(api.resultsMarkup(), /data-atlas-empty-search/);
  api.setState({all:'1',q:'',sort:'az'});
  assert.doesNotMatch(api.resultsMarkup(), /data-atlas-empty-search/);
  api.setState({q:'missing',sort:'relevant'});
  assert.match(api.resultsMarkup(), /data-atlas-empty-search/);
  const paper = {title:'Article',published:'2026-11-22',url:'https://doi.org/10.1234/test'};
  assert.match(api.papersMarkup({papers:[paper]}), /data-atlas-usage="paper-doi-open"/);
  assert.doesNotMatch(api.papersMarkup({papers:[{...paper,url:'https://example.org/paper'}]}), /data-atlas-usage/);
});

test('specific paper searches offer the papers page and keep regular matching records', () => {
  const data = [{...record('method'), title:'Wetenschappelijke artikelen', description:'Papers voor onderzoekers'}];
  for (const query of ['paper', 'recente papers', 'artikelen over AI in het onderwijs', 'wetenschappelijke artikelen']) {
    const api = load(data, '#zoeken?' + new URLSearchParams({q:query}));
    assert.ok(api.suggestionData(query).flatMap(section => section.items).some(item => item.href === '#papers'));
    assert.match(api.resultsMarkup(), /href="#papers">Papers over AI en onderwijs<\/a>/);
    if (query === 'wetenschappelijke artikelen') assert.match(api.resultsMarkup(), /data-record-id="method"/);
  }
  const api = load(data, '#zoeken?q=AI');
  assert.ok(!api.suggestionData('AI').flatMap(section => section.items).some(item => item.href === '#papers'));
});

test('education practice questions lead to applicable public records and retain specific details', () => {
  const api = load([
    {...record('lesson'), title:'Les over AI voor groep 7', themes:['AI-geletterdheid'], sectors:['PO'], offerCategory:'materials', costType:'free'},
    {...record('lesson-design'), title:'Lesontwerp met AI', themes:['Lesgeven en leren met AI'], sectors:['MBO'], offerCategory:'materials'},
    {...record('assessment'), title:'Een toets aanpassen', themes:['Toetsing en examinering'], sectors:['HBO'], offerCategory:'knowledge'},
    {...record('agreements'), title:'Afspraken voor het schoolteam', themes:['Beleid en governance'], sectors:['VO']},
    {...record('workshop'), title:'Workshop voor het onderwijsteam', sectors:['WO'], recordType:'training', legacyType:'Training'}
  ]);
  const examples = [
    ['Waar vind ik gratis lesmateriaal voor het basisonderwijs?', {sector:'PO', type:'materials', cost:'Gratis'}, 'lesson'],
    ['Een les over AI geven voor groep 7', {theme:'AI-geletterdheid', type:'materials', q:'groep 7'}, 'lesson'],
    ['Ik wil met AI een les voorbereiden voor het middelbaar beroepsonderwijs', {theme:'Lesgeven en leren met AI', sector:'MBO'}, 'lesson-design'],
    ['Hoe herontwerp ik een toets voor het hoger beroepsonderwijs?', {theme:'Toetsing en examinering', sector:'HBO'}, 'assessment'],
    ['Teamafspraken maken voor de middelbare school', {q:'afspraken', sector:'VO'}, 'agreements'],
    ['Teamscholing vinden voor het hoger onderwijs', {type:'Training', sector:'HBO,WO'}, 'workshop']
  ];
  for (const [query, expected, id] of examples) {
    const criteria = api.criteriaForQuery(query);
    for (const [key, value] of Object.entries(expected)) assert.equal(criteria[key], value, query);
    assert.deepEqual(Array.from(api.recordsForCriteria(criteria), record => record.id), [id], query);
  }
});

test('sector names stay visible in ordinary searches and questions respect selected filters', () => {
  const data = [{...record('hbo'), title:'HBO cursus'}, {...record('vo'), sectors:['VO']}, {...record('wo'), sectors:['WO']}];
  const api = load(data);
  for (const [query, ids] of [['voortgezet onderwijs', ['vo']], ['hoger onderwijs', ['hbo', 'wo']], ['hogeschool', ['hbo']]]) {
    const criteria = api.criteriaForQuery(query);
    assert.equal(criteria.q, query);
    assert.deepEqual(Array.from(api.recordsForCriteria(criteria), record => record.id), ids);
  }
  for (const query of ['Universiteit Utrecht', 'Hogeschool Rotterdam', 'Schoolafspraken over het gebruik van generatieve AI']) {
    assert.equal(api.criteriaForQuery(query).q, query);
  }
  const explicit = {sector:'WO', theme:'Privacy en AVG', type:'Boek', cost:'Betaald', sort:'published'};
  const combined = api.criteriaForQuery('Ik zoek gratis lesmateriaal voor de basisschool over klimaat', explicit);
  for (const [key, value] of Object.entries(explicit)) assert.equal(combined[key], value);
  assert.equal(combined.q, 'klimaat');
});

test('practice links count matching offers and retain the chosen sectors and audience', () => {
  const lesson = { ...record('lesson'), title: 'Een les over AI', offerCategory: 'materials' };
  const data = [lesson, { ...lesson, id: 'other-audience', audiences: ['Onderzoekers'] },
    { ...lesson, id: 'other-sector', sectors: ['PO'] }];
  const api = load(data, '#zoeken?sector=HBO,WO&audience=Docenten');
  const html = api.resultsMarkup();
  assert.ok(html.includes('Meerdere sectoren'));
  const links = [...html.matchAll(/<a class="practice-link" href="([^"]+)"><strong>([^<]+)/g)];
  assert.deepEqual(links.map(match => match[2]), ['Een les voorbereiden', 'AI-afspraken maken', 'Subsidies en calls', 'Onderzoek doen of promoveren']);
  assert.match(load(data, links[1][1].replaceAll('&amp;', '&')).resultsMarkup(), /href="#teamproef"/);
  const href = links[0][1].replaceAll('&amp;', '&');
  const params = new URLSearchParams(href.split('?')[1]);
  assert.equal(params.get('sector'), 'HBO,WO');
  assert.equal(params.get('audience'), 'Docenten');
  assert.equal(params.get('type'), 'materials');
  assert.ok(html.includes('<small>1 resultaat '));
  const destination = load(data, href).resultsMarkup();
  assert.match(destination, /class="practice-back"/);
  assert.ok(destination.includes('data-record-id="lesson"'));
  assert.ok(!destination.includes('data-record-id="other-'));
});

test('teachers can reach an assessment agreement from the redesign route, agreement route and named search', () => {
  const recordList = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const items = recordList.filter(row => ['visie-op-toetsing-examinering-en-ai-en-handreikingen', 'toetsing-en-generatieve-ai-in-het-voortgezet-onderwijs'].includes(row.id));
  const home = load(items, '#zoeken?sector=HBO').resultsMarkup();
  const destination = home.match(/<a class="practice-link" href="([^"]+)"><strong>Een toets herontwerpen/)[1].replaceAll('&amp;', '&');
  const html = load(items, destination).resultsMarkup();
  assert.match(html, /href="#toetsafspraak">Maak een toetsafspraak/);
  assert.ok(html.includes('data-record-id="visie-op-toetsing-examinering-en-ai-en-handreikingen"'));
  assert.ok(load(items, '#zoeken?q=afspraken&type=materials,knowledge').resultsMarkup().includes('href="#toetsafspraak"'));
  assert.ok(load(items, '#zoeken?q=toetsafspraak').suggestionData('Toetsafspraak maken')
    .some(section => section.items.some(item => item.href === '#toetsafspraak')));
  for (const query of ['AI-bestendige toets', 'toets AI resilient']) {
    const api = load(items, '#zoeken?q=' + encodeURIComponent(query));
    assert.ok(api.suggestionData(query).some(section => section.items.some(item => item.href === '#toetsafspraak?start=eigen')));
    assert.match(api.resultsMarkup(), /href="#toetsafspraak\?start=eigen"/);
  }
  assert.ok(!load(items, '#zoeken?q=toets&sector=PO').resultsMarkup().includes('href="#toetsafspraak"'));
  assert.ok(!load(items, '#zoeken?q=privacy').resultsMarkup().includes('href="#toetsafspraak"'));
});

test('the team card keeps private notes out of links, supports a later review and prints the actual decision', async () => {
  const memory = new Map();
  const tab = new Map();
  const store = map => ({getItem: key => map.get(key) || null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key)});
  const fields = ['group', 'owner', 'date', 'rule', 'observation', 'decision'].map(name => ({name, value: ''}));
  const form = {elements: fields};
  const nodes = new Map();
  const main = {querySelector(selector) {
    if (selector === '.trial-form form') return form;
    if (!nodes.has(selector)) nodes.set(selector, {isConnected: true, focus(){}, select(){}});
    return nodes.get(selector);
  }};
  let printed = 0;
  let copied = '';
  const open = (hash, session = tab, device = store(memory)) => {
    const api = load([], hash, {
      sessionStorage: store(session), localStorage: device,
      document: {querySelector: selector => selector === 'main' ? main : null},
      window: {ATLAS_RECORDS: {records: [], metadata: {}}, print() { printed++; }},
      navigator: {clipboard: {writeText(text) { copied = text; }}}
    });
    api.renderTeamTrial();
    return api;
  };
  const api = open('#teamproef?casus=feedback');
  assert.match(main.innerHTML, /dezelfde tekst met één tip/);
  assert.match(main.innerHTML, /name="rule"[^>]*>We proberen de AI-tip/);
  assert.equal(memory.size, 0);
  assert.equal(tab.size, 0);
  assert.ok(api.suggestionData('teamproef met AI').some(section => section.items.some(item => item.href === '#teamproef')));
  Object.assign(fields[0], {value:'Nederlands <klas 2>'});
  Object.assign(fields[2], {value:'2026-12-08'});
  Object.assign(fields[3], {value:'Vergelijk de uitleg bij dezelfde tekst.'});
  Object.assign(fields[4], {value:'De korte tip was begrijpelijker.'});
  Object.assign(fields[5], {value:'Aanpassen en opnieuw proberen'});
  form.oninput();
  assert.equal(memory.size, 0);
  assert.equal(tab.size, 1);
  assert.match(main.querySelector('.trial-print').innerHTML, /Nederlands &lt;klas 2&gt;/);
  await main.querySelector('[data-trial-copy]').onclick();
  assert.ok(copied.includes('Nederlands <klas 2>') && copied.includes('Aanpassen en opnieuw proberen'));
  assert.match(copied, /#teamproef\?casus=feedback$/);
  assert.match(copied, /8 dec\.? 2026/);
  main.querySelector('[data-trial-print]').onclick();
  assert.equal(printed, 1);
  main.querySelector('[data-trial-save]').onclick();
  assert.equal(memory.size, 1);
  open('#teamproef?casus=feedback', new Map());
  assert.match(main.innerHTML, /value="Nederlands &lt;klas 2&gt;"/);
  assert.match(main.innerHTML, /class="trial-review" open/);
  assert.match(main.innerHTML, /<option selected>Aanpassen en opnieuw proberen/);
  open('#teamproef?casus=lesvoorbereiding', new Map());
  assert.match(main.innerHTML, /totale voorbereidingstijd/);
  assert.doesNotMatch(main.innerHTML, /Nederlands &lt;klas 2&gt;/);
  const recalledTab = new Map();
  open('#teamproef', recalledTab);
  main.querySelector('[data-trial-remove]').onclick();
  assert.equal(memory.size, 0);
  assert.equal(JSON.parse(recalledTab.get('atlas.teamproef.feedback')).group, 'Nederlands <klas 2>');
  const blocked = {getItem(){throw Error();},setItem(){throw Error();}};
  tab.set('atlas.teamproef.feedback', 'beschadigd');
  open('#teamproef?casus=__proto__', tab, blocked);
  assert.match(main.innerHTML, /name="rule"[^>]*>We proberen de AI-tip/);
  main.querySelector('[data-trial-save]').onclick();
  assert.match(main.querySelector('.trial-feedback').textContent, /Kopieer de kaart/);
});

test('assessment agreements distinguish independent work, optional AI feedback and verifying a supplied answer', () => {
  const api = load();
  const goal = 'Twee bronnen op betrouwbaarheid beoordelen.';
  const parts = mode => Object.fromEntries(api.assessmentParts({goal, mode, evidence:'', criterion:''}));
  assert.match(parts('zelfstandig')['Wat je laat zien'], /een gegeven verandert/);
  assert.match(parts('feedback')['Gebruik van AI'], /eerst zelf een concept/);
  assert.match(parts('feedback')['Wat je laat zien'], /Werkte je zonder AI/);
  assert.match(parts('controleren')['Gebruik van AI'], /AI-antwoord van je docent/);
  assert.match(parts('controleren')['Wat je laat zien'], /vindplaats in de bron/);
  for (const mode of ['zelfstandig', 'feedback', 'controleren']) {
    assert.equal(parts(mode).Leerdoel, goal);
    assert.ok(parts(mode)['Hierop word je beoordeeld']);
  }
  assert.equal(api.assessmentParts({goal:' ',mode:'zelfstandig',criterion:''}).length, 0);
  assert.equal(api.assessmentParts({goal,mode:'__proto__',criterion:''}).length, 0);
});

function assessmentFormFixture() {
  const goal = {value:'',setCustomValidity() {},focus() { this.focused = true; },reportValidity() { this.validated = true; }};
  const mode = {value:''}, evidence = {value:''}, criterion = {value:''}, task = {...goal}, alternative = {value:''};
  const start = {value:'',focus() {}}, clear = {}, jump = {};
  const compareGoal = {}, applied = {}, preview = {focus() { this.focused = true; }};
  const picks = ['zelfstandig','feedback'].map(key => ({dataset:{assessmentApply:key}}));
  const compare = {open:true,querySelector:() => compareGoal,querySelectorAll:() => picks};
  const radios = ['zelfstandig','feedback','controleren'].map(key => ({value:key, set checked(value) {
    if (value) mode.value = key;
    else if (mode.value === key) mode.value = '';
  }}));
  const form = {elements:{namedItem:() => mode}, querySelector:s => ({
    '#assessment-goal':goal,'#assessment-evidence':evidence,'#assessment-criterion':criterion,'#assessment-task':task,
    '#assessment-alternative':alternative,'[data-assessment-clear]':clear,'.assessment-compare':compare,'[data-assessment-apply-note]':applied
  })[s], querySelectorAll:() => radios};
  const copy = {isConnected:true,focus() { this.focused = true; }}, review = {}, feedback = {}, field = {hidden:true,focus() {},select() { this.selected = true; }};
  const result = {querySelector:s => ({'[data-assessment-copy]':copy,'[data-assessment-review]':review,'[role="status"]':feedback,textarea:field})[s]};
  const main = {querySelector:s => ({'.assessment-form':form,'[data-assessment-result]':result,'#assessment-start':start,'#assessment-preview-title':preview,'[data-assessment-jump]':jump})[s]};
  const document = {querySelector:s => s === 'main' ? main : null};
  return {document, main, form, goal, mode, task, evidence, criterion, alternative, start, clear, compare, compareGoal, picks, applied, preview, result, copy, review, feedback, field};
}

test('the spotlight opens the saved own question, requires its text and preserves the full question when switching examples', async () => {
  const ui = assessmentFormFixture();
  const longQuestion = 'Onderbouw met een gegeven uit de casus. '.repeat(35) + 'Einde van de vraag.';
  const stored = new Map([
    ['atlas.toetsafspraak.start','adviesmail'],
    ['atlas.toetsafspraak', JSON.stringify({task:longQuestion,mode:'feedback',goal:'Een bron wegen.'})]
  ]);
  const location = {hash:'#toetsafspraak?start=eigen'};
  const history = {replaceState:(_state, _title, hash) => { location.hash = hash; }};
  const storage = {getItem:key => stored.get(key),setItem:(key,value) => stored.set(key,value)};
  let copied;
  const api = load([], location.hash, {document:ui.document, location, history, sessionStorage:storage,
    navigator:{clipboard:{writeText:async text => { copied = text; }}}});
  api.renderAssessment();
  assert.ok(ui.main.innerHTML.includes(longQuestion));
  assert.match(ui.main.innerHTML, /id="assessment-task" rows="4" required/);
  assert.ok(ui.main.innerHTML.indexOf('id="assessment-task"') < ui.main.innerHTML.indexOf('id="assessment-goal"'));
  assert.ok(!ui.main.innerHTML.includes('value="adviesmail" selected'));
  ui.goal.value = 'Een bron wegen.';
  ui.mode.value = 'feedback';
  ui.task.value = '  ';
  ui.form.oninput();
  assert.ok(!ui.result.innerHTML.includes('data-assessment-copy'));
  ui.picks[1].onclick();
  assert.ok(ui.task.focused && ui.task.validated);
  ui.task.value = longQuestion;
  ui.form.oninput();
  await ui.copy.onclick();
  assert.ok(copied.includes(longQuestion) && copied.includes('Lever je concept en eindversie in.'));
  ui.evidence.value = 'Verdedig één bronkeuze aan de hand van de casus.';
  ui.form.oninput();
  await ui.copy.onclick();
  assert.ok(copied.includes(ui.evidence.value));
  ui.start.value = 'voedselweb';
  ui.start.onchange();
  assert.equal(location.hash, '#toetsafspraak?start=voedselweb');
  assert.ok(ui.main.innerHTML.includes('value="voedselweb" selected'));
  ui.start.value = '';
  ui.start.onchange();
  assert.equal(location.hash, '#toetsafspraak?start=eigen');
  assert.ok(ui.main.innerHTML.includes(longQuestion) && ui.main.innerHTML.includes(ui.evidence.value));
  assert.match(ui.main.innerHTML, /id="assessment-task" rows="4" required/);
  assert.equal(stored.get('atlas.toetsafspraak.start'), '');
  assert.equal(load([], location.hash, {sessionStorage:storage}).readAssessmentDraft().task,longQuestion);
});

test('the editable concept preserves choices in its tab and copies the exact classroom text or selects it for manual copying', async () => {
  const stored = new Map(), storage = {getItem:k => stored.get(k), setItem:(k,v) => stored.set(k,v)};
  const {document, main, form, goal, mode, task, evidence, criterion, alternative, clear, compare, compareGoal, picks, applied, preview, result, copy, feedback, field} = assessmentFormFixture();
  let copied = '';
  const navigator = {clipboard:{writeText:async value => { copied = value; }}};
  const location = {hash:'#toetsafspraak'};
  const api = load([], location.hash, {document,sessionStorage:storage,navigator,location});
  api.renderAssessment();
  assert.ok(!result.innerHTML.includes('data-assessment-copy'));
  const comparison = main.innerHTML.match(/<details class="assessment-custom assessment-compare">([\s\S]*?)<\/details>/)[1];
  assert.equal((comparison.match(/Wat kunt u daaruit afleiden/g)||[]).length,2);
  assert.match(comparison,/een gegeven verandert[\s\S]+hoe de leerling een advies weegt/);
  assert.match(comparison,/Wat organiseert u\?[\s\S]+twee inlevermomenten/);
  assert.ok(comparison.includes('href="https://npuls.nl/_assets/9235efab-b04a-4c63-aeb9-ccd71518a0cf/Npuls-Handreiking-2-AI-B5.pdf"'));
  picks[0].onclick();
  assert.ok(goal.focused && goal.validated && compare.open);
  assert.equal(mode.value,'');
  goal.value = 'Argumenten uit <twee bronnen> wegen.';
  evidence.value = 'Een geannoteerde schets met twee controleerbare verwijzingen.';
  criterion.value = 'De gekozen passage draagt het argument.';
  mode.value = 'controleren';
  form.oninput();
  assert.equal(compareGoal.textContent,'Uw leerdoel: '+goal.value);
  assert.match(result.innerHTML, /&lt;twee bronnen&gt;/);
  assert.ok(result.innerHTML.includes('Suggestie voor de beoordeling'));
  await copy.onclick();
  const expected = api.assessmentParts({goal:goal.value,mode:mode.value,evidence:evidence.value,criterion:criterion.value}).map(pair => pair.join('\n')).join('\n\n');
  assert.equal(copied, expected);
  assert.ok(copied.includes(criterion.value) && copied.includes(evidence.value) && !copied.includes('Geef iedereen hetzelfde'));
  assert.match(feedback.textContent, /gekopieerd/);
  assert.equal(location.hash, '#toetsafspraak');
  const fresh = () => load([], '#toetsafspraak', {sessionStorage:storage}).readAssessmentDraft();
  assert.equal(fresh().goal, goal.value);
  assert.equal(fresh().mode, mode.value);
  assert.equal(fresh().evidence, evidence.value);
  assert.equal(fresh().criterion, criterion.value);
  navigator.clipboard.writeText = async () => { throw Error('Geblokkeerd'); };
  await copy.onclick();
  assert.equal(field.value, expected);
  assert.ok(field.selected && !field.hidden);
  task.value = 'Werk met twee bronnen.'; alternative.value = 'Werk met papier.';
  for (const pick of picks) {
    compare.open = true;
    pick.onclick();
    assert.equal(fresh().mode,pick.dataset.assessmentApply);
    assert.equal(compare.open,false);
    assert.ok(preview.focused);
    assert.match(applied.textContent,/Controleer of de ingevulde opdracht/);
    assert.deepEqual([fresh().goal,fresh().task,fresh().alternative,fresh().evidence,fresh().criterion],
      [goal.value,task.value,alternative.value,evidence.value,criterion.value]);
  }
  clear.onclick();
  assert.ok(goal.focused && !fresh().goal && !fresh().mode && !fresh().criterion && !fresh().evidence);
  assert.ok(!result.innerHTML.includes('data-assessment-copy'));
  for (const damaged of ['{', 'null', '{"goal":false,"mode":"__proto__","criterion":[]}']) {
    stored.set('atlas.toetsafspraak', damaged);
    assert.ok(!fresh().goal && !fresh().mode);
  }
});

test('switching AI roles preserves custom instructions and requires a review before copying, including after a reload', async () => {
  const stored = new Map();
  const storage = {getItem:key => stored.get(key),setItem:(key,value) => stored.set(key,value)};
  let copied;
  function open(choice = '') {
    const ui = assessmentFormFixture();
    const hash = '#toetsafspraak?start=' + (choice || 'eigen');
    const api = load([], hash, {document:ui.document, sessionStorage:storage,
      navigator:{clipboard:{writeText:async text => { copied = text; }}}});
    const draft = api.readAssessmentDraft(choice);
    for (const key of ['task','goal','mode','evidence','criterion','alternative']) ui[key].value = draft[key];
    api.renderAssessment();
    return ui;
  }
  const pending = ui => {
    assert.match(ui.applied.textContent,/Controleer of de ingevulde opdracht/);
    assert.match(ui.result.innerHTML,/data-assessment-review aria-describedby="assessment-apply-note"/);
    assert.doesNotMatch(ui.result.innerHTML,/data-assessment-copy/);
  };
  let ui = open();
  assert.match(ui.main.innerHTML,/id="assessment-apply-note" data-assessment-apply-note role="status"/);
  ui.task.value = 'Schrijf een adviesbrief aan de beheerder.';
  ui.goal.value = 'Een advies onderbouwen.';
  ui.evidence.value = 'Vraag AI om twee suggesties.';
  ui.mode.value = 'feedback';
  ui.form.oninput();
  assert.match(ui.result.innerHTML,/data-assessment-copy/);
  ui.picks[1].onclick();
  assert.match(ui.result.innerHTML,/data-assessment-copy/);
  ui.mode.value = 'zelfstandig';
  ui.form.oninput();
  pending(ui);
  assert.match(ui.result.innerHTML,/Vraag AI om twee suggesties/);
  const adjusted = 'Verdedig mondeling één keuze uit je adviesbrief.';
  ui.evidence.value = adjusted;
  ui.form.oninput();
  const notice = ui.applied.textContent;
  pending(ui);
  assert.equal(JSON.parse(stored.get('atlas.toetsafspraak')).reviewRequired,true);
  const example = open('adviesmail');
  assert.match(example.result.innerHTML,/data-assessment-copy/);
  example.picks[0].onclick();
  pending(example);
  assert.equal(JSON.parse(stored.get('atlas.toetsafspraak.adviesmail')).reviewRequired,true);
  ui = open();
  pending(ui);
  assert.equal(ui.applied.textContent, notice);
  assert.equal(ui.evidence.value,adjusted);
  ui.review.onclick();
  assert.match(ui.result.innerHTML,/data-assessment-copy/);
  assert.doesNotMatch(ui.result.innerHTML,/data-assessment-review/);
  assert.equal(ui.applied.textContent,'');
  assert.ok(ui.copy.focused);
  await ui.copy.onclick();
  assert.ok(copied.includes(adjusted) && copied.includes(ui.task.value));
  assert.match(open().result.innerHTML,/data-assessment-copy/);
  const restoredExample = open('adviesmail');
  pending(restoredExample);
  restoredExample.clear.onclick();
  assert.equal(restoredExample.mode.value,'feedback');
  assert.match(restoredExample.result.innerHTML,/data-assessment-copy/);
  assert.equal(JSON.parse(stored.get('atlas.toetsafspraak.adviesmail')).reviewRequired,false);
});

test('each custom assessment field triggers review on changing roles and empty fields use the new defaults immediately', () => {
  for (const key of ['evidence','criterion','alternative']) {
    const ui = assessmentFormFixture();
    const api = load([], '#toetsafspraak?start=eigen', {document:ui.document});
    api.renderAssessment();
    ui.task.value = 'Toets de conclusie aan de twee gegeven bronnen.';
    ui.goal.value = 'Een conclusie verantwoorden.';
    ui.mode.value = 'controleren';
    ui.form.oninput();
    ui.picks[1].onclick();
    assert.match(ui.result.innerHTML,/data-assessment-copy/);
    ui[key].value = 'Gebruik één tip om de conclusie te verbeteren.';
    ui.form.oninput();
    assert.match(ui.result.innerHTML,/data-assessment-copy/);
    ui.picks[0].onclick();
    assert.doesNotMatch(ui.result.innerHTML,/data-assessment-copy/);
    assert.match(ui.result.innerHTML,/data-assessment-review/);
    assert.ok(ui.result.innerHTML.includes(ui[key].value));
    ui[key].value = '  ';
    ui.form.oninput();
    assert.match(ui.result.innerHTML,/data-assessment-copy/);
    assert.doesNotMatch(ui.result.innerHTML,/data-assessment-review|Gebruik één tip/);
    assert.equal(ui.applied.textContent,'');
  }
});

test('two adaptable assessments each supply classroom instructions, independent work, a no-AI route and three rubric levels', () => {
  const api = load();
  for (const [key, task] of [['voedselweb','rupsen'], ['adviesmail','30 studenten']]) {
    const draft = api.readAssessmentDraft(key);
    const parts = Object.fromEntries(api.assessmentParts(draft));
    assert.ok(parts.Opdracht.includes(task));
    assert.ok(parts['Wat je laat zien'] && parts['Zonder AI']);
    assert.match(parts['Hierop word je beoordeeld'], /In opbouw —[\s\S]+Voldoende —[\s\S]+Sterk —/);
    assert.ok(draft.task.length <= 1000 && draft.criterion.length <= 500);
  }
  const saved = {
    'atlas.toetsafspraak':JSON.stringify({goal:'Eigen leerdoel',mode:'feedback'}),
    'atlas.toetsafspraak.voedselweb':JSON.stringify({goal:'Mijn aangepaste ecologievraag',mode:'zelfstandig',task:'Teken en motiveer.'})
  };
  const restored = load([], '#toetsafspraak', {sessionStorage:{getItem:key=>saved[key]}});
  assert.equal(restored.readAssessmentDraft().goal,'Eigen leerdoel');
  assert.equal(restored.readAssessmentDraft('voedselweb').task,'Teken en motiveer.');
  assert.equal(restored.readAssessmentDraft('adviesmail').mode,'feedback');
});

const classroomLessons = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'))
  .filter(item => item.lessonStart);
const lessonRoute = '#zoeken?q=les&type=materials';

test('the lesson route and direct searches show usable lessons in teaching-level order', () => {
  for (const hash of [lessonRoute, '#zoeken?q=lesstart', '#zoeken?q=lesstarts']) {
    const html = load(classroomLessons, hash).resultsMarkup();
    const levels = [...html.matchAll(/<summary><span class="lesson-level">([^<]+)</g)].map(match => match[1]);
    for (const level of ['Groep 7–8', 'Vmbo · leerjaar 2–3', 'Mbo · mediavormgeving', 'Hbo en wo · bachelor']) {
      assert.ok(levels.includes(level), level);
    }
    assert.ok(levels.indexOf('Groep 7–8') < levels.indexOf('Vmbo · leerjaar 2–3'));
    for (const item of classroomLessons) {
      assert.ok(html.includes(`class="lesson-material" href="${item.lessonStart.sourceUrl}"`));
    }
  }
  assert.ok(!load(classroomLessons, '#zoeken?q=privacy').resultsMarkup().includes('class="lesson-choice"'));
});

test('a specific lesson level and audience take precedence over a collection’s broader scope', () => {
  const html = load(classroomLessons, lessonRoute + '&sector=PO&audience=Docenten').resultsMarkup();
  assert.match(html, /name="atlas-lesson-starts" open/);
  assert.match(html, /data-lesson-id="digiduck-ai-lespakket-groep-7-8"/);
  assert.ok(!html.includes('data-lesson-id="ai-slim-bekeken-doorlopende-leerlijn"'));
  assert.ok(html.includes('data-record-id="ai-slim-bekeken-doorlopende-leerlijn"'));
  assert.ok(html.includes('>Lesstart · Groep 7–8</a>'));
  assert.ok(!html.includes('>Lesstart · Vmbo'));
  const ordinary = load(classroomLessons, '#zoeken?q=afvalsorteerder').resultsMarkup();
  assert.ok(ordinary.includes('>Lesstart · Vmbo · leerjaar 2–3</a>'));
  const mbo = load(classroomLessons, lessonRoute + '&sector=MBO&audience=Docenten').resultsMarkup();
  assert.match(mbo, /data-lesson-id="mbo-mediawijs-open-ai-leermaterialen"/);
  assert.ok(!load(classroomLessons, lessonRoute + '&sector=PO&cost=Betaald').resultsMarkup().includes('class="lesson-starts"'));
});

test('item details show only available lessons backed by a known official material link', () => {
  const lesson = classroomLessons.find(item => item.id === 'digiduck-ai-lespakket-groep-7-8');
  for (const [item, available] of [
    [lesson, true], [{ ...lesson, status: 'archived' }, false],
    [{ ...lesson, sourceUrls: [lesson.sourceUrls[0], { url:lesson.lessonStart.sourceUrl, sourceType:'secondary' }] }, false]
  ]) {
    const main = { querySelectorAll: () => [] };
    const document = { querySelector: selector => selector === 'main' ? main : {}, querySelectorAll: () => [] };
    load([item], '#item/' + item.id, { document }).renderDetail(item.id);
    assert.equal(main.innerHTML.includes('Lesstart voor de klas'), available);
    assert.ok(main.innerHTML.includes('Feitelijke beschrijving'));
    assert.equal(load([item], lessonRoute).resultsMarkup().includes('class="lesson-choice"'), available);
  }
});

test('copying a classroom assignment includes the learner task, reflection and both sources', async () => {
  const item = classroomLessons.find(row => row.id === 'mbo-mediawijs-open-ai-leermaterialen');
  const lesson = item.lessonStart;
  let copied = '';
  for (const [navigator, allowed] of [
    [{ clipboard: { writeText: async value => { copied = value; } } }, true], [{}, false]
  ]) {
    const feedback = {};
    const field = { hidden:true, focus() {}, select() { this.selected = true; } };
    const panel = { dataset: { lessonId:item.id },
      querySelector: selector => selector === '.lesson-copy' ? field : feedback };
    const button = { closest: () => panel, isConnected:true };
    load([item], lessonRoute, { navigator }).bindLessonCopy({ querySelectorAll: () => [button] });
    await button.onclick();
    const text = allowed ? copied : field.value;
    for (const part of [lesson.question, 'Leerdoel: ' + lesson.learningGoal, lesson.task, lesson.reflection, lesson.sourceUrl,
      `https://aionderwijsatlas.nl/#item/${item.id}`]) assert.ok(text.includes(part));
    assert.ok(!text.includes(lesson.preparation));
    assert.equal(field.hidden, allowed);
    assert.equal(/gekopieerd/i.test(feedback.textContent), allowed);
    if (!allowed) assert.equal(field.selected, true);
  }
});

test('a shared learner sheet opens independently, prints one assignment and shares its public URL', async () => {
  const location = { hash:'', href:'http://localhost:8000/?atlas-no-count=1' };
  const archived = { ...classroomLessons[0], id:'vorige-editie', status:'archived' };
  const older = { ...classroomLessons[0], id:'les-zonder-leerdoel', lessonStart:{...classroomLessons[0].lessonStart} };
  delete older.lessonStart.learningGoal;
  const data = { records:[...classroomLessons, archived, older], metadata:{} };
  const main = { focus() {} }, print = {}, share = {}, feedback = {};
  const document = { body:{classList:{remove() {}}}, querySelectorAll: () => [],
    querySelector: selector => ({ main, '[data-print-sheet]':print, '[data-share-sheet]':share, '#action-feedback':feedback })[selector] || null };
  let printCount = 0, copied = '';
  const api = load(data.records, '#home', { document, location, window:{ATLAS_RECORDS:data, print:() => printCount++},
    navigator:{clipboard:{writeText:async text => { copied = text; }}}, CSS:{escape:text => text}, scrollTo() {}, clearTimeout() {} });
  const cards = load(classroomLessons, lessonRoute).resultsMarkup();
  for (const item of classroomLessons) {
    location.hash = '#leerlingblad?item=' + item.id;
    assert.ok(cards.includes(`href="${location.hash}">Open leerlingblad</a>`));
    api.route();
    assert.ok(main.innerHTML.includes(item.lessonStart.question));
    if (item.lessonStart.learningGoal) assert.ok(main.innerHTML.includes(item.lessonStart.learningGoal));
    assert.ok(main.innerHTML.includes(item.lessonStart.task));
    assert.ok(main.innerHTML.includes(item.lessonStart.reflection));
    assert.ok(main.innerHTML.includes(`href="${item.lessonStart.sourceUrl}"`));
    assert.ok(!main.innerHTML.includes(item.lessonStart.preparation));
    assert.equal((main.innerHTML.match(/<h1 /g) || []).length, 1);
    for (const other of classroomLessons.filter(row => row !== item)) assert.ok(!main.innerHTML.includes(other.lessonStart.question));
    print.onclick();
    await share.onclick();
    assert.equal(copied, 'https://aionderwijsatlas.nl/' + location.hash);
    assert.match(feedback.textContent, /leerlingblad gekopieerd/);
  }
  assert.equal(printCount, classroomLessons.length);
  location.hash = '#leerlingblad?item=' + older.id;
  api.route();
  assert.ok(main.innerHTML.includes(older.lessonStart.task));
  assert.ok(!main.innerHTML.includes('learner-goal'));
  for (const hash of ['#leerlingblad', '#leerlingblad?item=onbekend', '#leerlingblad?item=vorige-editie']) {
    location.hash = hash;
    api.route();
    assert.ok(main.innerHTML.includes('Kies een andere lesstart'));
    assert.ok(!main.innerHTML.includes('data-print-sheet'));
  }
});

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

test('books page separates Dutch reading, study and practice books with metadata', () => {
  const books = [
    {...record('essay'), recordType:'book', legacyType:'Boek', title:'Essayboek', authors:['A. Auteur'], isbn:'9780000000001', bookCategory:'reading', language:['nl'], pageCount:80, publicationYear:2025},
    {...record('study'), recordType:'book', legacyType:'Boek', title:'Studieboek', authors:['B. Auteur'], isbn:'9780000000002', bookCategory:'study', language:['nl']},
    {...record('practice'), recordType:'book', legacyType:'Boek', title:'Praktijkboek', authors:['C. Auteur'], isbn:'9780000000003', bookCategory:'practice', language:['nl']},
    {...record('english'), recordType:'book', legacyType:'Boek', title:'English book', authors:['D. Author'], isbn:'9780000000004', bookCategory:'reading', language:['en']}
  ];
  const html = load(books).booksMarkup();
  for (const heading of ['Leesboeken en essays', 'Studieboeken', 'Praktijk- en handboeken']) assert.ok(html.includes(heading));
  for (const title of ['Essayboek', 'Studieboek', 'Praktijkboek']) assert.ok(html.includes(title));
  for (const [label, value] of [['Auteur(s)','A. Auteur'], ['Jaar','2025'], ['ISBN','9780000000001'], ['Omvang','80 pagina&#39;s'], ['Uitgever','Voorbeeld']]) {
    assert.ok(html.includes(`<div><dt>${label}</dt><dd>${value}</dd></div>`), label);
  }
  assert.match(html, /<article class="result-card book-card"[^>]*>[\s\S]*?<h2>[\s\S]*?<dl class="offer-facts">[\s\S]*?<\/dl>\s*<p class="description">[^<]+<\/p>\s*<\/div><div class="card-actions/);
  assert.ok(!html.includes('English book'));
});

test('book details expose availability and the record-specific evidence limit', () => {
  const html = load().bookContextMarkup({
    recordType: 'book',
    availabilityText: 'Verkrijgbaar bij de uitgever.',
    notes: 'Auteurssynthese; geen effectbewijs <zonder bron>.',
  });
  assert.ok(html.includes('<h2>Praktisch en beschikbaarheid</h2>'));
  assert.ok(html.includes('Verkrijgbaar bij de uitgever.'));
  assert.ok(html.includes('<h2>Duiding en bewijsgrens</h2>'));
  assert.ok(html.includes('geen effectbewijs &lt;zonder bron&gt;'));
});

test('material details expose practical restrictions and evidence limits without treating verification as validation', () => {
  const api = load();
  const html = api.recordContextMarkup({ recordType:'guidance', availabilityText:'Download; fysiek exemplaar alleen voor leden.',
    notes:'Concept, geen gevalideerde scan <script>bad()</script>.', verificationNote:'Alleen bestaan en doelgroep gecontroleerd.' });
  assert.ok(html.includes('fysiek exemplaar alleen voor leden'));
  assert.ok(html.includes('geen gevalideerde scan &lt;script&gt;'));
  assert.ok(!html.includes('<script>bad()'));
  assert.ok(html.includes('Alleen bestaan en doelgroep gecontroleerd.'));
  assert.equal(api.recordContextMarkup({recordType:'guidance'}).trim(), '');
});

test('provider names do not match arbitrary shorter words inside the query', () => {
  const data = [{...record('provider'),providerName:'AIGovernanceofficer.nl'},
    {...record('unrelated'),description:'Informatie over onderwijs',themes:[],keywords:[]}];
  const api=load(data);
  assert.deepEqual(Array.from(api.recordsForCriteria({q:'AIGovernanceofficer'}),r=>r.id),['provider']);
  assert.equal(api.queryMatches(data[1], 'governanceofficer'),false);
  assert.equal(api.queryMatches(data[1], 'AI'),false);
});

test('synonyms preserve the other search terms and match complete words', () => {
  const data=[{...record('uu'),title:'AVG handreiking',providerName:'Universiteit Utrecht',description:'Gegevensbescherming'},
    {...record('other'),title:'AVG',providerName:'Andere aanbieder'},
    {...record('partial'),title:'Recall procedure',description:'Informatie',themes:[],keywords:[]}];
  const api=load(data);
  assert.deepEqual(Array.from(api.recordsForCriteria({q:'privacy Utrecht'}),r=>r.id),['uu']);
  assert.equal(api.queryMatches(data[2],'call'),false);
  assert.equal(api.queryMatches({...data[2],title:'Call voor projecten'},'call'),true);
});

test('spelling tolerance keeps exact results first and supports known Meesterproef spelling', () => {
  const data=[{...record('typo'),title:'Privacyy handreiking',description:'Informatie',themes:[]},
    {...record('exact'),title:'Privacy handreiking',description:'Informatie',themes:[]}];
  const api=load(data,'#zoeken?q=privacy');
  assert.ok(api.queryMatches(data[1],'privcy'));
  assert.equal(api.sortRecords(data).map(r=>r.id).join(','),'exact,typo');
  const canonical=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/records.json'),'utf8'));
  const actual=load(canonical,'#zoeken?q=masterproef');
  assert.equal(actual.sortRecords(Array.from(actual.recordsForCriteria({q:'masterproef'})))[0].id,'meesterproef-studio');
});

test('ordinary queries stay visible and never replace an explicitly selected filter', () => {
  const api=load();
  for (const q of ['privacy','AI Act','workshop','HBO']) {
    const criteria=api.criteriaForQuery(q,{sector:'PO',type:'Training',sort:'published'});
    assert.equal(criteria.q,q);
    assert.equal(criteria.sector,'PO');
    assert.equal(criteria.type,'Training');
    assert.equal(criteria.sort,'published');
    assert.ok(!criteria.theme);
  }
});

test('spelling correction never changes requested years or document numbers', () => {
  const api=load();
  assert.equal(api.queryMatches({...record('old'),title:'AI rapport 2025'},'2026'),false);
  assert.equal(api.queryMatches({...record('current'),title:'AI rapport 2026'},'2026'),true);
});

test('costs combine with access, sector and query without treating unknown as free', () => {
  const data=[{...record('free'),costType:'free',accessType:'public'},
    {...record('members'),costType:'free',accessType:'restricted'},
    {...record('paid'),costType:'paid',accessType:'public'},record('unknown')];
  const api=load(data,'#zoeken?q=privacy&sector=HBO&cost=Gratis&access=Publiek%20toegankelijk');
  assert.equal(api.recordsForCriteria(api.getState()).map(r=>r.id).join(','),'free');
  assert.equal(load(data,api.stateHref()).recordsForCriteria(api.getState()).map(r=>r.id).join(','),'free');
  assert.equal(api.recordsForCriteria({cost:'Gratis'}).map(r=>r.id).join(','),'free,members');
});

test('books and materials page reuses the selected public Dutch materials with costs, access and official sources', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const selectedIds = [
    'vu-handboek-ai-geletterdheid-studenten', 'open-inspiratielessen-over-ai',
    'mbo-mediawijs-open-ai-leermaterialen', 'eerlijk-over-ai-ai-coach-opleiding-open-source',
    'ai-waaier-voor-toetsen', 'han-toolkit-ai-bestendig-toetsen',
    'ai-voor-docenten-gesprekskaarten-ai-onderwijs', 'ai-voor-docenten-kies-handleidingen-kaarten',
    'techyourfuture-les-basiskennis-ai', 'mediawijs-edubox-artificiele-intelligentie',
    'data-maatschappij-ai-omgeving-posters', 'hu-care-werkvormen-ai-geletterdheid'
  ];
  const api = load(data);
  const html = api.booksMarkup();
  assert.ok(html.includes('<h1>Boeken en materialen</h1>'));
  const materials = html.slice(html.indexOf('<section id="boeken-materialen"'));
  assert.ok(materials.includes('<h2 tabindex="-1">Les- en werkmaterialen</h2>'));
  const cards = [...materials.matchAll(/<article class="result-card"[\s\S]*?<\/article>/g)].map(match => match[0]);
  assert.equal(cards.length, selectedIds.length);
  for (const id of selectedIds) {
    const item = data.find(item => item.id === id);
    const card = cards.find(card => card.includes(`data-record-id="${id}"`));
    assert.ok(card, id);
    assert.equal(html.split(`data-record-id="${id}"`).length - 1, 1, 'Each selected material appears once');
    assert.ok(card.includes(`<dt>Kosten</dt><dd>${api.costLabel(item)}</dd>`));
    assert.ok(card.includes(`<dt>Toegang</dt><dd>${api.accessLabel(item)}</dd>`));
    const source = item.sourceUrls.find(source => source.sourceType === 'official');
    assert.ok(card.includes(`href="${source.url.replaceAll('&', '&amp;')}"`), id);
    assert.ok(card.includes('Bekijk materiaal'));
  }
  const allMaterialsLink = materials.match(/href="(#zoeken\?type=materials)"/);
  assert.ok(allMaterialsLink, 'Visitors can open the complete materials filter');
  const search = load(data, allMaterialsLink[1]);
  assert.equal(search.getState().type, 'materials');
  const resultIds = search.recordsForCriteria(search.getState()).map(item => item.id);
  for (const id of selectedIds) assert.ok(resultIds.includes(id), id);
  for (const item of data.filter(item => item.recordType === 'book')) {
    assert.ok(!materials.includes(`data-record-id="${item.id}"`), 'Books keep their separate groups');
  }
});

test('materials selection excludes other records and respects language, category and publication changes', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const material = data.find(item => item.id === 'vu-handboek-ai-geletterdheid-studenten');
  const other = {...material, id:'other-material', title:'Overig Nederlandstalig materiaal'};
  assert.ok(!load([...data, other]).booksMarkup().includes('data-record-id="other-material"'));
  for (const change of [
    {language:['en']}, {offerCategory:'software'}, {offerCategory:'knowledge'},
    {publicationExclusion:{reason:'Review required'}}, {verificationStatus:'unverified'}, {sourceUrls:[]}
  ]) {
    const changed = data.map(item => item.id === material.id ? {...item, ...change} : item);
    assert.ok(!load(changed).booksMarkup().includes(`data-record-id="${material.id}"`), JSON.stringify(change));
  }
});

test('book group links scroll below the sticky header and move focus while invalid or missing groups open the page top', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const html = load(data).booksMarkup();
  const groups = ['reading', 'study', 'practice', 'materials'];
  for (const group of groups) assert.ok(html.includes(`href="#boeken?groep=${group}"`));
  assert.equal((html.match(/<h2 tabindex="-1">/g) || []).length, 4);
  for (const [group, missing] of [...groups.map(group => [group, false]), ['', false], ['unknown', false], ['__proto__', false], ['materials', true]]) {
    const events = [];
    const main = {focus:()=>events.push('main-focus')};
    const heading = {focus:options=>{assert.equal(options.preventScroll, true); events.push('group-focus');}};
    const section = {style:{}, querySelector:selector=>selector==='h2'?heading:null,
      scrollIntoView:options=>{assert.equal(options.block, 'start'); events.push('group-scroll');}};
    const header = {classList:{remove(){}}, getBoundingClientRect:()=>({height:96})};
    const selector = `#boeken-${group === 'materials' ? 'materialen' : group}`;
    const doc = {
      querySelector:requested=>requested==='main'?main:requested==='.site-header'?header:
        !missing && groups.includes(group) && requested===selector?section:null,
      querySelectorAll:()=>[]
    };
    const hash = `#boeken${group ? `?groep=${group}` : ''}`;
    const api = load(missing ? [] : data, hash, {document:doc, CSS:{escape:value=>value}, scrollTo:()=>events.push('top-scroll'), clearTimeout:()=>{}});
    api.route();
    assert.ok(main.innerHTML.includes('<h1>Boeken en materialen</h1>'));
    if (groups.includes(group) && !missing) {
      assert.deepEqual(events, ['group-scroll', 'group-focus'], hash);
      assert.equal(section.style.scrollMarginTop, '112px', 'The destination clears the sticky navigation');
    } else {
      assert.deepEqual(events, ['top-scroll', 'main-focus'], hash);
    }
  }
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

test('results show the effective status and practical dates before source actions', () => {
  const api = load();
  const call = {...record('call'), recordType:'funding_call', status:'closed_call',
    applicationDeadline:'invalid', fundingDeadline:'2026-09-15'};
  const card = api.simpleCard(call);
  assert.match(card, /Aanvraag gesloten[\s\S]*<dt>Aanvraagdeadline<\/dt><dd><time datetime="2026-09-15">[^<]+<\/time>[\s\S]*class="card-actions/);
  const course = {...record('course'), recordType:'training', startDate:'2027-01-14', endDate:'2027-05-13'};
  assert.match(api.simpleCard(course), /<dt>Periode<\/dt><dd><time datetime="2027-01-14">.*datetime="2027-05-13"/);
  assert.match(api.simpleCard({...course, endDate:course.startDate}), /<dt>Datum<\/dt><dd><time/);
  assert.match(api.simpleCard({...course, endDate:null}), /<dt>Startdatum<\/dt><dd><time/);
  assert.match(api.simpleCard({...course, startDate:null}), /<dt>Einddatum<\/dt><dd><time/);
  assert.doesNotMatch(api.simpleCard({...course, startDate:null, endDate:'2027-02-30'}), /<time/);
});

test('every offer fact groups its own label and value before the description, actions and comparison control', () => {
  const item = {...record('workshop', '2026-10-05'), recordType:'training', legacyType:'Training',
    description:'Beschrijving met <persoonlijke> keuze.', language:['nl'], costType:'free', sectors:['HBO','WO'],
    applicationDeadline:'2026-11-20', startDate:'2026-12-01', endDate:'2026-12-03', commercialStatus:'commercial',
    commercialEvidence:{url:'https://example.org/workshop', note:'De aanbieder bevestigt de voorwaarden.', checkedOn:'2026-10-05'}};
  const api = load([item], '#zoeken?sort=published');
  const html = api.simpleCard(item, true);
  const facts = html.match(/<dl class="offer-facts">([\s\S]*?)<\/dl>/)[1];
  const factGroup = /<div><dt>([^<]+)<\/dt><dd>[\s\S]*?<\/dd><\/div>/g;
  const labels = [...facts.matchAll(factGroup)].map(match => match[1]);
  assert.equal(facts.replace(factGroup, '').trim(), '');
  assert.deepEqual(labels, ['Verschenen op','Aanbieder','Status','Aanmelddeadline','Periode','Commercieel karakter','Kosten','Toegang','Taal','Voor wie','Sectoren']);
  assert.match(facts, /commercial-label is-commercial/);
  assert.match(facts, /<div class="sector-chips"><span>HBO<\/span><span>WO<\/span><\/div>/);
  const sections = ['class="type-label"','<h2>','<dl','</dl>','<p class="description">Beschrijving met &lt;persoonlijke&gt; keuze.</p>',
    'class="card-actions','>Bekijk details</a>','>Delen via e-mail</a>','data-sheet-pick='];
  const order = sections.map(section => html.indexOf(section));
  assert.ok(order.every((position,index) => position >= 0 && (!index || position > order[index-1])));
  assert.doesNotMatch(api.simpleCard(item), /data-sheet-pick=|<dt>Verschenen op<\/dt>/);
});

test('a clipped label or value gains one keyboard control and releases it when both fit', () => {
  let button, focusedTitle = false;
  const document = {
    querySelector: selector => selector === 'main' ? {} : null,
    createElement: tag => {
      assert.equal(tag, 'button');
      return {setAttribute(name, value) { this[name] = value; }, remove() { button = null; }};
    }
  };
  const {syncFactDisclosure} = load([], '#zoeken', {document});
  const label = {textContent:'Commercieel karakter', clientWidth:120, scrollWidth:120};
  const value = {clientWidth:120, scrollWidth:120, querySelector:() => button, append:control => { button = control; }};
  const group = {children:[label, value], closest:() => ({querySelector:() => ({focus:() => { focusedTitle = true; }})})};
  syncFactDisclosure(group);
  assert.equal(button, undefined);
  label.scrollWidth = 140;
  syncFactDisclosure(group);
  const first = button;
  assert.equal(first.type, 'button');
  assert.equal(first['aria-label'], 'Lees het volledige kenmerk: Commercieel karakter');
  assert.equal(first['aria-haspopup'], 'dialog');
  label.scrollWidth = 120;
  value.scrollWidth = 240;
  syncFactDisclosure(group);
  assert.equal(button, first);
  value.clientWidth = 240;
  document.activeElement = button;
  syncFactDisclosure(group);
  assert.equal(button, null);
  assert.equal(focusedTitle, true);
});

test('funding cards preserve the documented amount and only show a valid checked opening date', () => {
  const api = load();
  const amount = 'Maximaal € 30.000 per aanvraag; totaal voor de ronde € 500.000.';
  const call = {...record('funding'), recordType:'funding_call', status:'planned', applicationOpenDate:'2027-01-05',
    applicationDeadline:'2027-03-30', fundingAmount:amount, applicantTypes:['Hogescholen']};
  const facts = api.simpleCard(call).match(/<dl class="offer-facts">([\s\S]*?)<\/dl>/)[1];
  assert.ok(facts.includes('<dt>Bedrag</dt><dd>' + amount + '</dd>'));
  assert.match(facts, /<dt>Aanvragen vanaf<\/dt><dd><time datetime="2027-01-05">/);
  assert.match(facts, /<dt>Aanvraagdeadline<\/dt><dd><time datetime="2027-03-30">/);
  assert.match(facts, /<dt>Aanvragers<\/dt><dd>Hogescholen<\/dd>/);
  assert.doesNotMatch(facts, /<dt>Kosten<\/dt>/);
  for (const fundingAmount of [null, '  Nog niet ingevuld ', 'Varieert']) {
    assert.doesNotMatch(api.simpleCard({...call, fundingAmount, applicationOpenDate:'2027-02-30'}), /<dt>(Bedrag|Aanvragen vanaf)<\/dt>/);
  }
  assert.doesNotMatch(api.simpleCard({...call, verificationStatus:'needs_review'}), /<dt>(Bedrag|Aanvragen vanaf)<\/dt>/);
});

test('cards group details and email beside an optional primary source, before the comparison choice', () => {
  const item = {...record('call'), recordType:'funding_call'};
  const api = load([item]);
  for (const sourceUrls of [item.sourceUrls, []]) {
    const card = api.simpleCard({...item, sourceUrls}, true);
    const mainActions = card.match(/<div class="offer-main-actions">([\s\S]*?)<\/div>\s*<\/div>\s*<label class="sheet-pick">/)[1];
    const secondary = mainActions.split('<div class="offer-secondary-actions">');
    assert.equal(secondary.length, 2);
    if (sourceUrls.length) assert.match(secondary[0], /class="card-cta primary"[^>]*>Officiële oproep en voorwaarden/);
    else assert.equal(secondary[0].trim(), '');
    const labels = [...secondary[1].matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map(match => match[1]);
    assert.deepEqual(labels, ['Bekijk details','Delen via e-mail']);
    assert.ok(card.indexOf('<p class="description">') < card.indexOf(mainActions));
  }
  const book = {...record('boek'),recordType:'book',bookCategory:'reading',language:['nl']};
  const bookPage = load([book]).booksMarkup().match(/<article class="result-card book-card"[\s\S]*?<\/article>/)[0];
  assert.match(bookPage, /class="card-cta primary"[^>]*>Bekijk details/);
  assert.match(bookPage, /Uitgevers- of auteursbron/);
  assert.doesNotMatch(bookPage, /offer-secondary-actions|share-email/);
});

test('a zoned call deadline closes exactly at the published instant and appears in Dutch local time', () => {
  const api = load();
  const call = {...record('timed-call'), recordType:'funding_call', legacyType:'Call', status:'open_call',
    applicationDeadline:'2026-12-01', applicationDeadlineAt:'2026-12-01T14:00:00+01:00', applicantTypes:['Bekostigde hogescholen']};
  const cutoff = Date.parse('2026-12-01T13:00:00Z');
  assert.equal(api.effectiveStatus(call, '2026-12-01', cutoff - 1), 'open_call');
  assert.equal(api.effectiveStatus(call, '2026-12-01', cutoff), 'closed_call');
  assert.equal(api.effectiveStatus({...call, applicationDeadlineAt:'2026-12-01T14:00'}, '2026-12-01', cutoff), 'open_call');
  assert.equal(api.effectiveStatus({...call, applicationDeadlineAt:null}, '2026-12-02', cutoff), 'closed_call');
  assert.equal(api.effectiveStatus({...call, applicationOpenDate:'2026-12-01'}, '2026-11-30', cutoff - 86400000), 'planned');
  const html = api.simpleCard(call);
  assert.match(html, /<time datetime="2026-12-01T14:00:00\+01:00">[^<]+14:00<\/time> \(Nederlandse tijd\)/);
  assert.match(html, /Aanvragers<\/dt><dd>Bekostigde hogescholen/);
  assert.match(html, /Officiële oproep en voorwaarden/);
  assert.doesNotMatch(html, /<dt>Kosten<\/dt>/);
  const sameDay = [
    {...call, id:'date-only', applicationDeadline:'2099-12-01', applicationDeadlineAt:null},
    {...call, id:'later', applicationDeadline:'2099-12-01', applicationDeadlineAt:'2099-12-01T14:00:00+01:00'},
    {...call, id:'earlier', applicationDeadline:'2099-12-01', applicationDeadlineAt:'2099-12-01T15:00:00+03:00'}
  ];
  const funding = load(sameDay, '#zoeken?type=Subsidie+of+call');
  assert.deepEqual(Array.from(funding.sortRecords(sameDay), record => record.id), ['earlier', 'later', 'date-only']);
});

test('returning to an open detail after its published cutoff refreshes the status', () => {
  const call = {...record('cutoff'), recordType:'funding_call', legacyType:'Call', status:'open_call',
    applicationDeadline:'2026-12-01', applicationDeadlineAt:'2026-12-01T14:00:00+01:00'};
  let now = Date.parse(call.applicationDeadlineAt) - 1;
  let onVisibility;
  const main = {};
  const document = {hidden:false, addEventListener(name, handler) { if (name === 'visibilitychange') onVisibility = handler; },
    querySelector: selector => selector === 'main' ? main : selector === '.catalog-grid' ? null : {},
    querySelectorAll: () => []};
  const api = load([call], '#item/cutoff', {document, Date:class extends Date { static now() { return now; } }});
  api.renderDetail('cutoff');
  assert.match(main.innerHTML, /Open voor aanvragen/);
  document.hidden = true;
  onVisibility();
  now++;
  document.hidden = false;
  onVisibility();
  assert.match(main.innerHTML, /Aanvraag gesloten/);
  assert.doesNotMatch(main.innerHTML, /Open voor aanvragen/);
});

test('funding entry shows open and announced rounds, with matching status links and sector-preserving return', () => {
  const grant = {...record('open'), recordType:'funding_call', legacyType:'Call', status:'open_call',
    availabilityText:'Doorlopend tot het subsidieplafond is bereikt', sectors:['HBO']};
  const data = [grant, {...grant, id:'planned', status:'planned'}, {...grant, id:'developing', status:'in_development'}, {...grant, id:'closed', status:'closed_call'},
    {...grant, id:'portal', recordType:'subsidy', legacyType:'Subsidie', status:'available', availabilityText:'Doorlopend / per call'},
    {...grant, id:'other', sectors:['WO']}];
  const home = load(data, '#zoeken?sector=HBO').resultsMarkup();
  const entry = home.match(/<a class="practice-link" href="([^"]+)"><strong>Subsidies en calls<\/strong>[\s\S]*?<small>1 open · 2 aangekondigd/)[1].replaceAll('&amp;', '&');
  const api = load(data, entry);
  const html = api.resultsMarkup();
  assert.equal(api.getState().status, 'Open voor aanvragen,Gepland,In ontwikkeling');
  assert.match(html, /Doorlopend tot het subsidieplafond is bereikt/);
  assert.match(html, /data-record-id="open"/);
  assert.match(html, /data-record-id="planned"/);
  assert.match(html, /data-record-id="developing"/);
  assert.doesNotMatch(html, /data-record-id="(?:closed|other|portal)"/);
  assert.match(html, /href="#zoeken\?sector=HBO">← Andere taak/);
  const nav = html.match(/<nav aria-label="Aanvraagstatus">([\s\S]+?)<\/nav>/)[1];
  assert.match(nav, /aria-current="page">Open en aangekondigd \(3\)/);
  assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
  for (const [href, label] of [...nav.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(match => match.slice(1))) {
    const target = load(data, href.replaceAll('&amp;', '&'));
    assert.equal(target.getState().sector, 'HBO');
    assert.equal(target.recordsForCriteria(target.getState()).length, Number(label.match(/\((\d+)\)/)[1]));
    if (label === 'Open (1)') assert.equal(target.getState().status, 'Open voor aanvragen');
    if (label === 'Aangekondigd (2)') assert.equal(target.getState().status, 'Gepland,In ontwikkeling');
    assert.ok(target.resultsMarkup().includes('>Open en aangekondigd (3)</a>'));
  }
  assert.match(nav, /Regelingen en overige oproepen \(1\)/);
  const legacy = load(data, '#zoeken?sector=HBO&type=Subsidie+of+call&status=Gepland').resultsMarkup()
    .match(/<nav aria-label="Aanvraagstatus">([\s\S]+?)<\/nav>/)[1];
  assert.match(legacy, /aria-current="page">Aangekondigd \(2\)/);
  assert.equal((legacy.match(/aria-current="page"/g) || []).length, 1);
  const all = load(data, entry.replace(/&status=[^&]+/, '')).resultsMarkup();
  const sorted = [...all.matchAll(/data-record-id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(sorted[0], 'open');
  assert.deepEqual(sorted.slice(1,3).sort(), ['developing', 'planned']);
  assert.deepEqual(sorted.slice(3), ['portal', 'closed']);
  assert.match(api.simpleCard(data.find(item => item.id === 'portal')), /Regeling of informatiebron/);
  const empty = load(data, entry.replace('sector=HBO', 'sector=PO')).resultsMarkup();
  assert.match(empty, /Geen subsidies of calls bij deze selectie/);
  assert.match(load(data, '#zoeken?sector=PO').resultsMarkup(), /0 open · 0 aangekondigd/);
  assert.match(empty, /href="#zoeken\?[^"]*sector=PO[^"]*">Bekijk alle aanvraagstatussen/);
  assert.match(api.simpleCard({...grant, availabilityText:''}), /Geen uiterste datum bevestigd/);
});

test('funding tile and status links update when an open call closes while an announced round remains', () => {
  let now = Date.parse('2026-11-23T12:59:59.999Z');
  const clock = {Date:class extends Date { static now() { return now; } }};
  const grant = {...record('cutoff'), recordType:'funding_call', legacyType:'Call', status:'open_call'};
  const data = [{...grant, applicationDeadlineAt:'2026-11-23T14:00:00+01:00'}, {...grant, id:'future', applicationOpenDate:'2026-11-25'}];
  const home = load(data, '#home', clock);
  assert.match(home.resultsMarkup(), /1 open · 1 aangekondigd/);
  now++;
  const tile = home.resultsMarkup().match(/<a class="practice-link" href="([^"]+)"><strong>Subsidies en calls<\/strong>[\s\S]*?<small>0 open · 1 aangekondigd/);
  const landing = load(data, tile[1].replaceAll('&amp;', '&'), clock).resultsMarkup();
  assert.doesNotMatch(landing, /data-record-id="cutoff"/);
  assert.match(landing, /data-record-id="future"/);
  assert.match(landing, /aria-current="page">Open en aangekondigd \(1\)/);
  assert.match(landing, /<span>Open \(0\)<\/span>/);
  assert.match(load(data, '#zoeken?type=Subsidie+of+call&status=Open+voor+aanvragen', clock).resultsMarkup(), /Geen open oproepen bij deze selectie/);
  const announced = landing.match(/<a href="([^"]+)">Aangekondigd \(1\)<\/a>/)[1];
  assert.equal(load(data, announced.replaceAll('&amp;', '&'), clock).getState().status, 'Gepland,In ontwikkeling');
});

test('funding details show the documented scope of an amount, application conditions and official source before generic facts', () => {
  const call = {...record('call'), recordType:'funding_call', legacyType:'Call', status:'open_call',
    applicantTypes:['Consortia'], eligibility:'Minstens drie rechtspersonen uit drie landen.',
    sourceUrls:[{url:'https://example.org/call', sourceType:'official'}, {url:'https://example.org/ronde.pdf', sourceType:'official', label:'Voorwaarden van deze ronde'}],
    fundingAmount:'Per aanvraag maximaal € 50.000; rondebudget € 500.000, te verifiëren.'};
  function detail(item) {
    const main = {};
    const document = {querySelector: selector => selector === 'main' ? main : {}, querySelectorAll: () => []};
    load([item], '#item/call', {document}).renderDetail('call');
    return main.innerHTML;
  }
  const html = detail(call);
  assert.match(html, /Aanvraag en voorwaarden[\s\S]+Consortia[\s\S]+drie rechtspersonen uit drie landen/);
  assert.equal(html.split(call.eligibility).length, 2);
  assert.match(html, /<dt>Bedrag<\/dt><dd>Per aanvraag maximaal € 50.000; rondebudget € 500.000, te verifiëren\.<\/dd>/);
  assert.match(html, /Officiële bronnen[\s\S]*https:\/\/example.org\/call[\s\S]*<dt>Kosten/);
  assert.match(html, /href="https:\/\/example.org\/ronde\.pdf"[^>]+>Voorwaarden van deze ronde/);
  assert.doesNotMatch(detail({...call, fundingAmount:null, totalBudget:500000}), /<dt>Bedrag|500000/);
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

test('VSO is absent from sector filters and visible sector labels', () => {
  const item = {...record('vso-offer'), sectors:['PO','VO','VSO']};
  const api = load([item]);
  assert.ok(!api.homeFilterPanel([]).includes('name="sector" value="VSO"'));
  assert.ok(!api.simpleCard(item).includes('<span>VSO</span>'));
  assert.ok(!api.offerFacts(item).includes('VSO'));
});
test('offer cards show all public sectors and give the official source after the access terms', () => {
  const item = {
    ...record('leskaart'),
    offerCategory: 'materials',
    sectors: ['PO', 'VO', 'MBO', 'HBO', 'WO'],
    sourceUrls: [
      {url: 'https://example.org/secondary', sourceType: 'secondary'},
      {url: 'https://example.org/leskaart', sourceType: 'official'}
    ]
  };
  const html = load([item]).simpleCard(item);
  for (const sector of item.sectors) assert.ok(html.includes(`<span>${sector}</span>`), sector);
  const officialAction = html.match(/<a [^>]*href="https:\/\/example\.org\/leskaart"[^>]*>Bekijk materiaal&nbsp;↗<\/a>/);
  assert.ok(officialAction);
  assert.ok(html.indexOf('<dt>Toegang</dt>') < officialAction.index);
  assert.ok(officialAction.index < html.indexOf('>Bekijk details</a>'));
  assert.ok(html.includes('>Delen via e-mail</a>'));
  assert.ok(!html.includes('https://example.org/secondary'));
});
test('home and search filters lead with sector, then offer type, before other refinements', () => {
  const data = [{ ...record('training'), recordType: 'training', legacyType: 'Training' }];
  const api = load(data);
  const assertGroupOrder = (markup, labels) => {
    const positions = labels.map(label => markup.indexOf(label));
    assert.ok(positions.every(position => position >= 0), `Expected all filter groups: ${labels.join(', ')}`);
    assert.deepEqual(positions, [...positions].sort((left, right) => left - right));
  };

  const home = api.homeFilterPanel([]);
  assertGroupOrder(home, ['Voor welke sector?', 'Vakgebied', 'Wat zoekt u?', 'Waar zoekt u hulp bij?', 'Waar is het aanbod beschikbaar?', 'Voor wie?', 'Beschikbaarheid']);

  const search = api.catalogFilterPanel(['Training'], ['Docenten'], ['Voorbeeld']);
  assertGroupOrder(search, ['Voor welke sector?', 'Vakgebied', 'Wat zoekt u?', 'Onderwerp', 'Regio', 'Doelgroep', 'Beschikbaarheid', 'Aanbieder', 'Meer filters']);
});

test('subjects use explicit public metadata, allow multiple choices and combine with sector and offer type', () => {
  const data = [
    { ...record('math'), subjects: ['Wiskunde', 'Econometrie'], sectors: ['VO'], offerCategory: 'materials' },
    { ...record('biology'), subjects: ['Biologie'], sectors: ['VO'], offerCategory: 'materials' },
    { ...record('higher'), subjects: ['Wiskunde'], sectors: ['HBO'], offerCategory: 'materials' },
    { ...record('reference'), subjects: ['Biologie'], sectors: ['VO'], offerCategory: 'knowledge' },
    { ...record('legacy'), keywords: ['Biologie'], sectors: ['VO'], offerCategory: 'materials' }
  ];
  const api = load(data);
  const ids = criteria => Array.from(api.recordsForCriteria(criteria), item => item.id);
  assert.equal(api.facetSelectionLabel('vak'), 'Alle vakgebieden');
  assert.deepEqual(ids({}), data.map(item => item.id));
  assert.deepEqual(ids({vak: 'Biologie'}), ['biology', 'reference']);
  assert.deepEqual(ids({vak: 'Wiskunde,Biologie', sector: 'VO', type: 'materials'}), ['math', 'biology']);
  assert.deepEqual(ids({vak: 'Econometrie', sector: 'HBO'}), []);
  assert.deepEqual(ids({q: 'Econometrie'}), ['math']);
  assert.ok(ids({q: 'Biologie'}).includes('legacy'));

  const selected = load(data, '#zoeken?vak=Biologie%2CEconometrie&sector=VO&type=materials&sort=az');
  const panel = selected.catalogFilterPanel(['materials', 'knowledge'], ['Docenten'], ['Voorbeeld']);
  const block = panel.match(/<form class="subject-filter">[\s\S]+?<\/form>/)[0];
  assert.match(block, /value="Biologie, Econometrie"/);
  assert.doesNotMatch(block, /checkbox|<small>|<datalist|suggestion|page-step/);
  const results = selected.resultsMarkup();
  assert.match(results, /data-remove="vak\|Econometrie"/);
  assert.match(results, /data-record-id="biology"[\s\S]*data-record-id="math"/);
  const shared = new URLSearchParams(selected.stateHref().split('?')[1]);
  assert.equal(shared.get('vak'), 'Biologie,Econometrie');
  assert.equal(shared.get('sector'), 'VO');
  const sheet = load(data, '#overlegblad?' + shared).meetingSheetMarkup();
  assert.match(sheet, /<dt>Vakgebied<\/dt><dd>Biologie of Econometrie<\/dd>/);
  assert.equal((sheet.match(/class="sheet-entry"/g) || []).length, 2);
  assert.match(load(data, '#zoeken?vak=Biologie&sector=HBO').resultsMarkup(), /Geen exacte match/);
});

test('free subject text matches record content and lesson tasks; facet counts stay consistent', () => {
  const data = [
    {...record('text', null, 'Media en mens'), keywords:['visuele cultuur'], sectors:['VO']},
    {...record('lesson'), lessonStart:{task:'Onderzoek cultuur met visuele patronen'}, sectors:['HBO']},
    {...record('provider'), providerName:'Visuele cultuur academie', sectors:['VO']}
  ];
  const api = load(data, '#zoeken?vak=VISUELE%20cultuur');
  assert.deepEqual(Array.from(api.recordsForCriteria(api.getState()), r=>r.id), ['text','lesson']);
  assert.deepEqual(Array.from(api.recordsForCriteria({vak:'  visuele   CULTUUR  ',sector:'VO'}), r=>r.id), ['text']);
  assert.equal(api.recordsForCriteria({vak:'blubberologie'}).length,0);
  const panel=api.catalogFilterPanel([],[],[]);
  assert.match(panel, /data-facet="sector" value="VO"[^>]*><span>VO[^<]*<\/span><small>1<\/small>/);
  assert.match(panel, /<label for="subject-search">Vakgebied<\/label>/);
  assert.match(panel, /<button[^>]+type="submit">Toepassen<\/button>/);
  assert.deepEqual(Array.from(api.filterValues('vak','mens, natuur & techniek')),['mens, natuur & techniek']);
});

test('provider search retains its threshold and remains scoped to providers', () => {
  const api = load();
  function list(key, length) {
    const options = Array.from({length}, (_, index) => String(index + 1));
    return api.facet(key, key, options, new Map(options.map(value => [value, 1])));
  }
  assert.doesNotMatch(list('organization', 12), /class="facet-search"/);
  assert.match(list('organization', 13), /aria-label="Zoek binnen aanbieders"/);
  assert.doesNotMatch(list('sector', 13), /class="facet-search"/);
});

test('expanding a facet focuses its first newly visible enabled checkbox and collapsing keeps focus on the button', () => {
  let expanded = false;
  let focus = 'button';
  const inputs = ['visible', 'already selected', 'first hidden', 'next hidden'].map((name, index) => ({
    getClientRects: () => index < 2 || expanded ? [{}] : [], focus: () => { focus = name; }
  }));
  const options = {classList: {contains: () => expanded, toggle: () => expanded = !expanded},
    querySelectorAll(selector) { assert.equal(selector, 'input:enabled'); return inputs; }};
  const more = {previousElementSibling: options, setAttribute(name, value) { this[name] = value; }};
  const api = load([], '#zoeken', {document: {querySelector: selector => selector === 'main' ? {} : null,
    querySelectorAll: selector => selector === '.facet-more' ? [more] : []}});
  api.bindFacetLists();
  more.onclick();
  assert.equal(focus, 'first hidden');
  assert.equal(more['aria-expanded'], 'true');
  focus = 'button';
  more.onclick();
  assert.equal(focus, 'button');
  assert.equal(more['aria-expanded'], 'false');
  inputs.splice(2);
  more.onclick();
  assert.equal(focus, 'button', 'no newly available checkbox leaves focus on the button');
});

test('the classroom task drilldown and return link preserve the selected subject', () => {
  const data = [{...record('example', null, 'Les voor de klas'), subjects: ['Biologie'], sectors: ['VO'], offerCategory: 'materials'}];
  const root = load(data, '#zoeken?sector=VO&vak=Biologie').resultsMarkup();
  const link = root.match(/<a class="practice-link" href="([^"]+)"><strong>Een les voorbereiden/)[1].replaceAll('&amp;', '&');
  assert.equal(new URLSearchParams(link.split('?')[1]).get('vak'), 'Biologie');
  const back = load(data, link).resultsMarkup().match(/aria-label="Praktijkvragen"><a href="([^"]+)"/)[1].replaceAll('&amp;', '&');
  assert.equal(new URLSearchParams(back.split('?')[1]).get('vak'), 'Biologie');
});

test('free Dutch teaching materials keep sector and subject and can find material with no lesson keyword', () => {
  const sample = {...record('experiment', null, 'Dataproef met grafieken'), offerCategory:'materials', subjects:['Biologie'], sectors:['VO'], language:['nl'], costType:'free'};
  const data = [sample, {...sample,id:'english',language:['en']}, {...sample,id:'paid',costType:'paid'}, {...sample,id:'sector',sectors:['HBO']}];
  const start = load(data, '#zoeken?q=les&type=materials&sector=VO&vak=Biologie');
  assert.equal(start.recordsForCriteria(start.getState()).length, 0);
  const href = start.resultsMarkup().match(/href="([^"]+)">Gratis Nederlandstalig lesmateriaal<\/a>/)[1].replaceAll('&amp;', '&');
  const next = load(data, href);
  assert.deepEqual(Object.fromEntries(new URLSearchParams(href.split('?')[1])), {sector:'VO', vak:'Biologie', type:'materials', cost:'Gratis', language:'nl'});
  assert.deepEqual(Array.from(next.recordsForCriteria(next.getState()), record => record.id), ['experiment']);
});

test('research page exposes only public record links, current call statuses and precise PhD navigation suggestions', () => {
  const eur = record('eur-generative-ai-in-research-emodule'), talis = record('oecd-talis-2024-database-ai-onderwijs');
  const aido = {...record('npuls-aido-praktijkgericht-ai-en-dataonderzoek-2026'), status:'planned'};
  const main = {querySelectorAll:()=>[], querySelector:()=>({})};
  const setup = data => load(data, '#onderzoek?sector=MBO&vak=Wiskunde', {document:{querySelector: selector => selector === 'main' ? main : null}});
  const api = setup([eur, {...talis, publicationExclusion: 'test'}, aido]);
  api.researchPage();
  assert.match(main.innerHTML, /href="#item\/eur-generative-ai-in-research-emodule"/);
  assert.doesNotMatch(main.innerHTML, /href="#item\/oecd-talis|href="#item\/professional-doctorate/);
  assert.match(main.innerHTML, /Npuls AIDO voor mbo, hbo en wo<\/a> · Gepland/);
  const open = main.innerHTML.match(/data-open-funding href="([^"]+)">Bekijk open subsidies en calls/)[1];
  assert.deepEqual(Object.fromEntries(new URLSearchParams(open.replaceAll('&amp;', '&').split('?')[1])), {
    sector:'MBO', vak:'Wiskunde', type:'Subsidie of call,Subsidie', status:'Open voor aanvragen'
  });
  setup([talis]).researchPage();
  assert.match(main.innerHTML, /href="#item\/oecd-talis-2024-database-ai-onderwijs"/);
  assert.match(main.innerHTML, /zelfrapportage[\s\S]+formulier/);
  for (const query of ['phd','promotieplek','promoveren','promovendi']) {
    assert.ok(api.suggestionData(query).flatMap(group => group.items).some(item => item.href.startsWith('#onderzoek')));
    const results = load([], '#zoeken?q=' + query + '&sector=WO').resultsMarkup();
    assert.match(results, /href="#onderzoek\?[^"]*sector=WO[^"]*">Onderzoek doen of promoveren<\/a>/);
  }
  assert.ok(!api.suggestionData('onderzoek').flatMap(group => group.items).some(item => item.href.startsWith('#onderzoek')));
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

test('the mobile filter opener survives a results update and restores focus on close', () => {
  const classes = () => {
    const members = new Set();
    return { add: key => members.add(key), remove: key => members.delete(key), contains: key => members.has(key) };
  };
  const attributes = {};
  const opener = { setAttribute: (name, value) => { attributes[name] = value; }, focus: () => { focused = 'opener'; } };
  let focused;
  const closer = {focus: () => { focused = 'close'; }};
  const apply = {};
  const filters = {
    classList: classes(), setAttribute() {}, removeAttribute() {},
    querySelector: selector => ({'.close': closer, '.apply': apply, summary: {focus: () => { focused = 'facet'; }}})[selector]
  };
  const results = {querySelectorAll: () => [], querySelector: () => null};
  const media = {};
  const document = {
    body: {classList: classes()},
    querySelector: selector => ({'main': {}, '#results-panel': results, '.result-head h2': {focus: () => { focused = 'results'; }}})[selector]
  };
  const api = load([], '#zoeken', {document, matchMedia: () => media});
  api.bindFilterDrawer(filters, opener);
  opener.onclick();
  api.bindResultsControls();
  assert.equal(attributes['aria-expanded'], 'true');
  assert.ok(filters.classList.contains('open'));
  assert.ok(document.body.classList.contains('locked'));
  assert.equal(focused, 'close');
  document.onkeydown({key: 'Escape'});
  assert.equal(focused, 'opener');
  assert.equal(attributes['aria-expanded'], 'false');
  opener.onclick();
  apply.onclick();
  assert.equal(focused, 'results');
  opener.onclick();
  media.onchange({matches: false});
  assert.equal(focused, 'facet');
  assert.equal(attributes['aria-expanded'], 'false');
  assert.ok(!document.body.classList.contains('locked'));
});

test('ordinary training searches preserve visible words and find named trainers', () => {
  const api = load();
  for (const q of ['workshops', 'trainers', 'trainingen', 'workshop', 'trainer']) {
    const criteria = api.criteriaForQuery(q);
    assert.equal(criteria.q, q);
    assert.ok(!criteria.type);
  }
  const criteria = api.criteriaForQuery('trainer Tanja van Grinsven');
  assert.equal(criteria.q, 'trainer Tanja van Grinsven');
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const live = load(data);
  assert.ok(live.recordsForCriteria(criteria).some(item => item.id === 'han-ai-voor-docenten-basis'));
  const training = load(data, '#zoeken?type=Training');
  const html = training.resultsMarkup();
  assert.ok(html.includes('<h2>Workshops en trainers</h2>'));
  const titles = training.recordsForCriteria({type:'Training'}).map(item => item.title);
  assert.ok(titles.includes('In-school AI workshop op maat'));
  assert.ok(titles.includes('Copilot Chat: adoptietraining op locatie'));
});

test('restoring more catalog cards keeps their sort order and the meeting sheet includes every record', () => {
  const rows = Array.from({length:53}, (_, i) => record('test-' + String(i).padStart(2,'0')));
  const route = '#zoeken?sort=az';
  const history = {state:{atlasResults:{route, shown:48}}};
  const api = load(rows, route, {window:{ATLAS_RECORDS:{records:rows, metadata:{}}, history}});
  const visibleIds = html => [...html.matchAll(/data-record-id="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(visibleIds(api.resultsMarkup()), rows.slice(0,48).map(row => row.id));
  history.state.atlasResults.route = '#home';
  assert.deepEqual(visibleIds(api.resultsMarkup()), rows.slice(0,24).map(row => row.id));
  assert.equal((api.meetingSheetMarkup().match(/class="sheet-entry"/g) || []).length,53);
});

test('excluded software stays out of results and filters while materials and legacy links remain usable', () => {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8'));
  const api = load(data);
  const ids = criteria => Array.from(api.recordsForCriteria(criteria), item => item.id);
  const software = ids({ type: 'software' });
  const materials = ids({ type: 'materials' });
  const knowledge = ids({ type: 'knowledge' });
  const educationApps = ['aigo-patientsim', 'aigo-transcribe-tool', 'aigo-docschoon', 'aigo-kennisclip-generator', 'aigo-dicteermachine'];
  const iris = 'iris-connect-ai-inzichten';
  const irisRecord = data.find(item => item.id === iris);
  const irisPublished = irisRecord.changeHistory.some(entry => entry.date >= '2026-11-19');
  const publicApps = educationApps.filter(id => data.some(item => item.id === id && !item.publicationExclusion));
  assert.deepEqual(software.sort(), (irisPublished ? [...publicApps, iris] : publicApps).sort());
  for (const sector of ['PO', 'HBO']) {
    assert.equal(ids({ theme: 'Professionalisering', sector }).includes(iris), irisPublished, sector);
  }
  const excluded = data.filter(item => item.publicationExclusion);
  assert.equal(excluded.filter(item => item.offerCategory === 'software' && item.id !== iris).length, 11);
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

test('explicitly admitted education software remains searchable while excluded software stays hidden', () => {
  const admitted = {...record('education-app'), recordType:'product', legacyType:'Product', offerCategory:'software'};
  const excluded = {...admitted, id:'excluded-app', publicationExclusion:{reason:'Outside scope',decidedOn:'2026-09-09'}};
  const unverified = {...admitted, id:'unverified-app', verificationStatus:'needs_review'};
  assert.deepEqual(Array.from(load([admitted,excluded,unverified]).recordsForCriteria({type:'software'}), item=>item.id), ['education-app']);
});

test('choosing an AI application is framed as an assessment, not a safety endorsement', () => {
  const api = load([], '#zoeken?theme=Veilige%20AI-omgeving');
  const html = api.resultsMarkup();
  assert.ok(html.includes('Beoordeel de toepassing in uw eigen situatie'));
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
  assert.ok(api.newOffersMarkup().includes('<h1>Nieuw aanbod</h1>'));
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
  assert.deepEqual(Array.from(api.datedOffers('added'), entry => entry.record.id), ['just-added', 'just-published']);
  assert.deepEqual(Array.from(api.datedOffers('published'), entry => entry.record.id), ['just-published', 'just-added']);
  assert.ok(api.newOffersMarkup('added').includes('Het aanbod zelf kan al langer bestaan'));
  assert.ok(api.newOffersMarkup('published').includes('Gepubliceerd op'));
});

test('sorting Nieuw aanbod reads each publication date once, including unknown dates', () => {
  const items = [record('b', '2026-09-09'), record('unknown', ''), record('a', '2026-09-09')];
  let reads = 0;
  const api = load(items);
  for (const item of items) {
    const date = item.publicationDate;
    Object.defineProperty(item, 'publicationDate', {get() { reads++; return date; }});
  }
  assert.deepEqual(Array.from(api.datedOffers('published'), entry => entry.record.id), ['a', 'b']);
  assert.equal(reads, items.length);
});

test('new offers show the active date mode, full notice and date next to each title', () => {
  const api = load([record('example', '2026-09-09')]);
  for (const [current, other, activeLabel, dateLabel] of [
    ['added', 'published', 'Nieuw in de Atlas', 'Toegevoegd'],
    ['published', 'added', 'Recent gepubliceerd', 'Gepubliceerd op']
  ]) {
    const html = api.newOffersMarkup(current);
    const nav = html.match(/<nav class="new-offers-modes"[^>]*>([\s\S]*?)<\/nav>/)[1];
    assert.ok(nav.includes(`<span aria-current="page">${activeLabel}</span>`));
    assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(match => match[1]), [`#nieuw?volgorde=${other}`]);
    assert.match(html, /<header[^>]*>\s*<h1>Nieuw aanbod<\/h1><p class="listing-notice">Opname in de Atlas betekent geen goedkeuring, kwaliteitsbeoordeling of aanbeveling van het aanbod of de aanbieder\.<\/p><\/header>/);
    assert.match(html, /<details class="new-offers-explanation"><summary>[^<]+<\/summary>[\s\S]*?bekende (publicatie|toevoeg)datum\.<\/p>\s*<\/details>/);
    const firstCard = html.match(/<article class="result-card"[\s\S]*?<\/article>/)[0];
    assert.ok(firstCard.includes(`<dl class="offer-facts"><div><dt>${dateLabel}</dt><dd><time datetime="`));
    assert.equal((firstCard.match(/<time /g) || []).length, 1);
  }
});

test('unknown recency dates are disclosed rather than invented from verification', () => {
  const unknown = record('unknown-date', null); unknown.changeHistory = [];
  const api = load([unknown]);
  for (const mode of ['added', 'published']) {
    const html = api.newOffersMarkup(mode);
    assert.ok(html.includes('Bij één vermelding ontbreekt deze datum'));
    assert.ok(!html.includes('data-record-id="unknown-date"'));
    assert.ok(html.includes('#zoeken?all=1'));
  }
});

test('new offering pages keep the chosen date mode and cover all dated records once', () => {
  const data = Array.from({length: 26}, (_, i) => record('item-' + i, i < 25 ? '2026-09-09' : '2026-09-08', String(i).padStart(2, '0')));
  const api = load(data);
  const first = api.newOffersMarkup('published', 1), second = api.newOffersMarkup('published', 2);
  assert.equal((first.match(/data-record-id=/g) || []).length, 25);
  assert.equal((second.match(/data-record-id=/g) || []).length, 1);
  assert.ok(first.includes('#nieuw?volgorde=published&pagina=2'));
  assert.ok(first.includes('data-record-id="item-24"'));
  assert.ok(second.includes('data-record-id="item-25"'));
  assert.ok(!second.includes('data-record-id="item-24"'));
  assert.equal(api.newOffersMarkup('invalid', -8), api.newOffersMarkup('added', 1));
});

test('all latest-day additions including Meesterproef remain on the first new-offers page', () => {
  const data = Array.from({length: 34}, (_, i) => ({...record('new-' + i, null, 'Aanbod ' + i),
    changeHistory: [{type: 'added', date: '2026-10-09'}]}));
  data.push({...record('meesterproef-studio', null, 'Meesterproef Studio'),
    changeHistory: [{type: 'added', date: '2026-10-09'}, {type: 'verified', date: '2026-10-10'}]});
  data.push({...record('older', '2020-01-01'), changeHistory: [{type: 'added', date: '2026-10-08'}]});
  const api = load(data), first = api.newOffersMarkup('added', 1), second = api.newOffersMarkup('added', 2);
  assert.equal((first.match(/data-record-id=/g) || []).length, 35);
  assert.ok(first.includes('data-record-id="meesterproef-studio"'));
  assert.ok(!first.includes('data-record-id="older"'));
  assert.ok(second.includes('data-record-id="older"'));
  assert.ok(!second.includes('data-record-id="meesterproef-studio"'));
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
  assert.deepEqual(Object.keys(load().options), ['relevant', 'added', 'published', 'published-oldest', 'az']);
});

test('newest Atlas sorting uses the first valid addition and never a fresh verification', () => {
  const item = (id, history, title = id) => ({...record(id, '2099-12-31', title), changeHistory: history});
  const added = date => ({date, type:'added'});
  const data = [
    item('unknown', []),
    item('old', [added('2020-01-01'), added('2026-10-23'), {date:'2099-12-31',type:'verified'}]),
    item('b', [added('2026-10-23')], 'Same'),
    item('a', [added('2026-10-23')], 'Same'),
    item('invalid', [added('2026-02-30')])
  ];
  const api = load(data, '#zoeken?sort=added&sector=HBO');
  assert.equal(api.getState().sort, 'added');
  assert.deepEqual(api.sortRecords([...data]).map(r => r.id), ['a','b','old','invalid','unknown']);
  const params = new URLSearchParams(api.stateHref().split('?')[1]);
  assert.equal(params.get('sort'), 'added');
  assert.equal(params.get('sector'), 'HBO');
  const html = api.resultsMarkup();
  assert.ok(html.indexOf('data-record-id="a"') < html.indexOf('data-record-id="old"'));
  assert.ok(html.includes('<div><dt>Toegevoegd</dt><dd><time'));
  assert.ok(html.includes('Toevoegdatum onbekend'));
  assert.ok(html.includes('Een broncontrole verandert de toevoegdatum niet'));
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
      assert.ok(body.endsWith(`https://aionderwijsatlas.nl/#item/${expected.id}`));
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
  assert.ok(text.includes(`https://aionderwijsatlas.nl/#item/${encodeURIComponent(item.id)}`));
  assert.ok(!/secondary\.example|authoritative\.example|localhost|atlas-no-count|sector=|2099|Auteur:/i.test(text));
  for (const publicationDate of [null, '', '2001-02-30']) {
    const undated = api.sourceCitation({ ...item, publicationDate });
    assert.ok(!/2001|2099/.test(undated), 'Invalid or missing publication dates must not fall back to source-check or import dates');
  }
  const sparse = api.sourceCitation({ ...item, providerName: '', publicationDate: null, sourceUrls: [] });
  assert.ok(!/undefined|null/.test(sparse));
  assert.ok(sparse.includes(`https://aionderwijsatlas.nl/#item/${encodeURIComponent(item.id)}`));
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

test('chosen meeting sheets travel by URL, retain order and only show public records', () => {
  const items = [record('first'), record('second'), {...record('private'), verificationStatus:'needs_review'}];
  const api = load(items, '#overlegblad?item=second&item=private&item=missing&item=first&item=second');
  const html = api.meetingSheetMarkup();
  assert.match(html, /Gekozen voor het overleg/);
  assert.match(html, /data-share-sheet/);
  assert.equal((html.match(/class="sheet-entry"/g) || []).length, 2);
  assert.ok(html.indexOf('<h2>second</h2>') < html.indexOf('<h2>first</h2>'));
  assert.ok(!html.includes('example.org/private'));
  assert.ok(!load(items, '#overlegblad?item=missing').meetingSheetMarkup().includes('class="sheet-entry"'));
  const storage = {getItem: key => key === 'atlas.sheetPicks' ? 'item=second' : ''};
  const search = load(items, '#zoeken', {sessionStorage:storage}).resultsMarkup();
  assert.match(search, /href="#overlegblad\?item=second"/);
  assert.match(search, /data-sheet-pick="second"[^>]* checked/);
});

test('the last operated card offers the next available actions and remembers its checkbox on return', () => {
  const records = [record('a'), record('b')];
  const route = '#zoeken?type=materials&sector=VO';
  const history = {state: {}, replaceState(next) { this.state = next; }};
  const summary = {};
  let inline;
  function checkbox(id) {
    const links = {
      insertAdjacentHTML(_position, html) {
        inline = {id, html, remove() { inline = null; }};
      },
      querySelector: () => inline
    };
    return {dataset: {sheetPick: id}, closest: () => links};
  }
  const inputs = records.map(row => checkbox(row.id));
  const panel = {
    querySelector: selector => ({
      '[data-picked-actions]': summary, '[data-inline-picks]': inline,
      '[data-result-list]': {children: {length: 48}}
    })[selector],
    querySelectorAll: selector => selector === '[data-sheet-pick]' ? inputs : []
  };
  const api = load(records, route, {
    document: {querySelector: selector => selector === 'main' || selector === '#results-panel' ? panel : null},
    window: {ATLAS_RECORDS: {records, metadata: {}}, history},
    scrollY: 800
  });
  api.bindResultsControls();
  function choose(index, checked) {
    inputs[index].checked = checked;
    inputs[index].onchange();
  }
  choose(0, true);
  assert.equal(inline.id, 'a');
  assert.match(inline.html, /data-inline-compare[^>]*hidden/);
  assert.match(inline.html, /data-inline-sheet href="#overlegblad\?item=a"\s*>Open mijn overlegblad \(1\)/);
  assert.match(inline.html, /<span\s*>Kies nog een/);
  choose(1, true);
  assert.equal(inline.id, 'b');
  assert.match(inline.html, /data-inline-compare href="#vergelijken\?item=a&amp;item=b"\s*>/);
  assert.match(inline.html, /data-inline-sheet href="#overlegblad\?item=a&amp;item=b"\s*>/);
  inline.onclick({target: {closest: () => true}});
  assert.deepEqual({...history.state.atlasResults}, {route, shown: 48, y: 800, focusId: 'b', focusControl: 'pick'});
  choose(1, false);
  assert.equal(inline.id, 'b');
  assert.match(inline.html, /data-inline-compare[^>]*hidden/);
  assert.match(inline.html, /Open mijn overlegblad \(1\)/);
  choose(0, false);
  assert.equal(inline, null);
  assert.equal(summary.hidden, true);
});

test('the tool guide contrasts two published teaching situations, preserves source limits and keeps decisions on the page', () => {
  const ids = ['aigo-transcribe-tool', 'aigo-dicteermachine'];
  const tools = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/records.json'), 'utf8')).filter(item => ids.includes(item.id));
  assert.equal(tools.length, 2);
  function render(records) {
    const choices = {}, feedback = {};
    const main = {querySelector:selector => selector === 'fieldset' ? choices : feedback};
    const api = load(records, '#toolkeuze', {document: {querySelector:selector => selector === 'main' ? main : null}});
    api.renderToolChoice();
    return {html:main.innerHTML, choose:index => { choices.onchange({target:{value:String(index)}}); return feedback.textContent; }};
  }
  const guide = render(tools);
  assert.match(guide.html, /Een bestaande opname uitschrijven[\s\S]+Tijdens het spreken een concept schrijven/);
  assert.match(guide.html, /#vergelijken\?item=aigo-transcribe-tool&amp;item=aigo-dicteermachine/);
  assert.match(guide.html, /#zoeken\?type=software/);
  assert.match(guide.html, /minimumleeftijd en ondersteuning van schermlezers[\s\S]+niet vastgesteld/);
  assert.match(guide.html, /privacywerking en de effecten op leren niet onafhankelijk getoetst/);
  assert.match(guide.html, /datetime="2026-11-22"/);
  for (const card of guide.html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/g)) {
    assert.match(card[1], /Leshandeling[\s\S]+Gratis · Publiek toegankelijk[\s\S]+Gegevens en privacy[\s\S]+Toegankelijkheid/);
    assert.match(card[1], /https:\/\/github\.com\/AIgovernanceofficer\/[\w-]+#readme/);
  }
  assert.doesNotMatch(guide.html, /data-atlas-usage|<iframe|<audio|<input type="file"/);
  assert.match(guide.choose(0), /leerdoel/);
  assert.match(guide.choose(1), /fictieve oefenzin/);
  assert.match(guide.choose(2), /passage als tekst/);
  const limited = render([{...tools[0],publicationExclusion:{reason:'private'}}, {...tools[1],costType:'unknown'}]);
  assert.doesNotMatch(limited.html, /#vergelijken|Transcribe-tool/);
  assert.match(limited.html, /Kosten onbekend/);
  assert.match(render([]).html, /momenteel niet beschikbaar/);
});

function compareAt(data, hash, sessionValues = {}) {
  const location = {hash, href: 'http://localhost/?voorbeeld=1' + hash};
  const stored = new Map(Object.entries(sessionValues));
  const nodes = new Map();
  function control(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {checked: hash.includes('verschillen=1')});
    return nodes.get(selector);
  }
  const knownRows = [{hidden:false}];
  const main = {querySelector:control, querySelectorAll:selector => selector === '[data-compare-equal]' ? knownRows : []};
  const clipboard = {text:'', async writeText(value) { this.text = value; }};
  const api = load(data.records, hash, {
    window:{ATLAS_RECORDS:data}, location, document:{querySelector:selector => selector === 'main' ? main : control(selector)},
    sessionStorage:{getItem:key => stored.get(key), setItem:(key, value) => stored.set(key, value)},
    history:{replaceState:(_state, _title, value) => { location.hash = value; }}, navigator:{clipboard}
  });
  api.renderComparison();
  return {main, control, knownRows, stored, clipboard, location};
}

test('comparison links resolve public selections in order, keep unknowns and source links visible', () => {
  const a = {...record('a', null, 'A & B'), sectors:['VO', 'MBO'], language:['en', 'nl'], costType:'unknown', accessType:'public'};
  const b = {...record('b'), sectors:['MBO', 'VO'], language:['nl', 'en'], costType:'unknown', accessType:'registration_required'};
  const unavailable = {...record('private'), publicationExclusion:{reason:'niet publiek'}};
  const data = {records:[a,b,unavailable], metadata:{recordRedirects:{old:'a'}}};
  const view = compareAt(data, '#vergelijken?item=b&item=private&item=old&item=a&verschillen=1');
  const html = view.main.innerHTML;
  assert.ok(html.includes('U vergelijkt 2 vermeldingen'));
  assert.ok(html.indexOf('href="#item/b"') < html.indexOf('href="#item/a"'));
  assert.ok(html.includes('A &amp; B') && html.includes('niet meer in de publieke Atlas'));
  assert.ok(!html.includes('example.org/private'));
  assert.match(html, /<tr data-compare-equal hidden><th scope="row">Sector/);
  assert.match(html, /<tr data-compare-equal hidden><th scope="row">Taal/);
  assert.match(html, /<tr><th scope="row">Kosten<\/th><td>Kosten onbekend<\/td><td>Kosten onbekend/);
  assert.match(html, /<tr><th scope="row">Toegang<\/th><td>Registratie nodig<\/td><td>Publiek toegankelijk/);
  assert.match(html, /<tr><th scope="row">Officiële bron/);
  assert.ok(html.includes('https://example.org/a') && html.includes('https://example.org/b'));
  assert.ok(html.includes('#overlegblad?item=b&amp;item=a'));
});

test('a personal comparison becomes shareable on fresh load and preserves the chosen view', async () => {
  const data = {records:['a','b','c'].map(id => record(id)), metadata:{}};
  const values = {'atlas.sheetPicks':'item=c&item=a&item=b','atlas.compareSearch':'#zoeken?sector=HBO'};
  const view = compareAt(data, '#vergelijken', values);
  assert.equal(view.location.hash, '#vergelijken?item=c&item=a&item=b');
  assert.ok(view.main.innerHTML.includes('compare-many'));
  assert.ok(view.main.innerHTML.includes('href="#zoeken?sector=HBO"'));
  const toggle = view.control('#compare-differences');
  toggle.checked = true;
  toggle.onchange();
  assert.equal(view.knownRows[0].hidden, true);
  await view.control('[data-share-comparison]').onclick();
  const url = new URL(view.clipboard.text);
  assert.equal(url.origin + url.pathname, 'https://aionderwijsatlas.nl/');
  assert.equal(url.hash, '#vergelijken?item=c&item=a&item=b&verschillen=1');
  assert.ok(compareAt(data, url.hash).main.innerHTML.includes('U vergelijkt 3 vermeldingen'));
  toggle.checked = false;
  toggle.onchange();
  assert.equal(view.knownRows[0].hidden, false);
  assert.ok(!view.location.hash.includes('verschillen=1'));
});

test('incomplete and outdated links let visitors continue choosing without silently changing their own selection', () => {
  const data = {records:[record('local'), record('a')], metadata:{}};
  const view = compareAt(data, '#vergelijken?item=removed&item=a', {'atlas.sheetPicks':'item=local'});
  assert.ok(view.main.innerHTML.includes('Kies een tweede vermelding'));
  assert.ok(!view.main.innerHTML.includes('<table'));
  assert.equal(view.stored.get('atlas.sheetPicks'), 'item=local');
  view.control('[data-comparison-choose]').onclick();
  assert.equal(view.stored.get('atlas.sheetPicks'), 'item=local&item=a');
  const empty = compareAt(data, '#vergelijken?item=removed', {'atlas.sheetPicks':'item=local&item=a'});
  assert.ok(!empty.main.innerHTML.includes('<table'));
  assert.ok(empty.main.innerHTML.includes('Kies aanbod om te vergelijken'));
});

test('themed results and meeting sheets both include every matching record', () => {
  const matching = Array.from({ length: 5 }, (_, index) => record(`meeting-${index}`, null, `Overlegitem ${index}`));
  const excluded = { ...record('excluded-sheet-item', null), publicationExclusion: { reason: 'Outside public scope', decidedOn: '2026-09-01' } };
  const unverified = { ...record('unverified-sheet-item', null), verificationStatus: 'needs_review' };
  const differentTheme = { ...record('different-theme', null), themes: ['Onderzoek'], description: 'Onderzoeksprogramma' };
  const api = load([...matching, excluded, unverified, differentTheme], '#zoeken?theme=Privacy%20en%20AVG');
  assert.equal([...api.resultsMarkup().matchAll(/<article class="result-card"/g)].length, 5, 'The full matching catalogue remains visible');
  const html = api.meetingSheetMarkup();
  for (const item of matching) {
    assert.ok(html.includes(item.title));
    assert.ok(html.includes(item.sourceUrls[0].url));
    assert.ok(html.includes(`https://aionderwijsatlas.nl/#item/${item.id}`));
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
      assert.equal(url.searchParams.get('record'), item.title + '\nhttps://aionderwijsatlas.nl/#item/item-with-id');
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

test('the practice guide connects each teaching stage to published material and real task pages', () => {
  const dataWindow = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'data-v2.js'), 'utf8'), {window:dataWindow});
  const records = dataWindow.ATLAS_RECORDS.records;
  const main = {querySelectorAll:() => []};
  const api = load(records, '#praktijkgids', {document:{querySelector:selector => selector === 'main' ? main : null}});
  api.renderPracticeGuide();
  const ids = new Set(records.map(record => record.id));
  const linkedIds = Array.from(main.innerHTML.matchAll(/href="#item\/([^"]+)"/g), match => match[1]);
  for (const id of linkedIds) assert.ok(ids.has(id), id);
  for (const id of ['digiduck-ai-lespakket-groep-7-8','stanford-craft-ai-ecosystemen','mbo-mediawijs-open-ai-leermaterialen','vu-ai-wijs-informatie-zoeken-beoordelen-2026']) {
    assert.ok(linkedIds.includes(id), id);
  }
  for (const href of ['lesmateriaal/', '#toetsafspraak', '#toolkeuze', '#regels-in-de-praktijk', '#wat-werkt']) {
    assert.ok(main.innerHTML.includes(`href="${href}"`), href);
  }
});

test('comparing AI tools is reachable directly from the search box', () => {
  const api = load([], '#zoeken?sector=VO&vak=Biologie');
  for (const query of ['AI-tools vergelijken', 'Welke AI-toepassing past bij mijn les?']) {
    api.setState(api.criteriaForQuery(query));
    assert.equal(api.suggestionData(query)[0].items[0].href, '#toolkeuze');
    assert.match(api.resultsMarkup(), /data-question-route href="#toolkeuze"/);
    assert.equal(api.getState().vak, 'Biologie');
  }
});

test('worksheet routes help with preparation queries without counting worksheets as catalogue records', () => {
  const exercises = '#werkblad-oefenvragen', biology = '#werkblad-biologiepracticum';
  for (const [query, href, filters] of [
    ['tijd besparen', exercises], ['Hoe kan ik als docent tijd besparen bij mijn les?', exercises],
    ['lesvoorbereiding', exercises], ['oefenvragen maken', exercises], ['Hoe maak ik quizvragen?', exercises],
    ['biologie practicum', biology], ['Hoe bereid ik een practicum voor biologie voor?', biology],
    ['practicum', biology, 'sector=VO&vak=Biologie&type=materials'], ['kiemproef', biology]
  ]) {
    const api = load([], '#zoeken?' + (filters || ''));
    assert.equal(api.suggestionData(query)[0].items[0].href, href, query);
    api.setState(api.criteriaForQuery(query));
    assert.equal(api.recordsForCriteria(api.getState()).length, 0, query);
    const html = api.resultsMarkup();
    assert.ok(html.includes(`data-question-route href="${href}"`), query);
    assert.match(html, /1 werkblad voor ‘/);
    assert.match(html, /Geen andere treffers in de catalogus/);
    assert.doesNotMatch(html, /0 resultaten voor|Uw zoekopdracht levert/);
  }
});

test('worksheet links from search and lesson navigation follow the chosen subject, sector and material filters', () => {
  const exercises = '#werkblad-oefenvragen', biology = '#werkblad-biologiepracticum';
  for (const [query, filters] of [
    ['biologie practicum', 'sector=MBO'], ['biologie practicum', 'vak=Geschiedenis'],
    ['practicum', 'vak=Scheikunde'], ['biologie practicum voor hoger onderwijs', ''],
    ['tijd besparen bij de administratie', ''], ['training oefenvragen', ''], ['oefenvragen', 'type=Training'],
    ['tijd besparen', 'language=en'], ['tijd besparen', 'organization=Voorbeeld']
  ]) {
    const api = load([], '#zoeken?' + filters);
    const options = api.suggestionData(query).flatMap(section => section.items);
    assert.ok(!options.some(option => option.href.startsWith('#werkblad-')), query + ' / ' + filters);
    api.setState(api.criteriaForQuery(query));
    assert.doesNotMatch(api.resultsMarkup(), /data-question-route href="#werkblad-/, query + ' / ' + filters);
  }
  const lesson = filters => load([], '#zoeken?q=les&type=materials&' + filters).resultsMarkup();
  const vo = lesson('sector=VO&vak=Biologie'), mbo = lesson('sector=MBO&vak=Nederlands');
  assert.ok(vo.includes(`data-question-route href="${exercises}"`));
  assert.ok(vo.includes(`data-question-route href="${biology}"`));
  assert.ok(mbo.includes(`data-question-route href="${exercises}"`));
  assert.ok(!mbo.includes(biology));
  const entry = {...record('biology',null,'Een biologie practicum'), subjects:['Biologie']};
  const mixed = load([entry], '#zoeken?q=biologie%20practicum').resultsMarkup();
  assert.match(mixed, /1 resultaat voor ‘biologie practicum’/);
  assert.ok(mixed.includes(`data-question-route href="${biology}"`));
  assert.doesNotMatch(mixed, /Geen andere treffers/);
});

test('teacher questions offer real routes without silently changing the selected subject or sector', () => {
  const dataWindow = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'data-v2.js'), 'utf8'), {window:dataWindow});
  const records = dataWindow.ATLAS_RECORDS.records;
  const api = load(records, '#zoeken?sector=VO&vak=Biologie&type=materials');
  const q = 'Waar vind ik een les over ecosystemen voor de onderbouw?';
  const criteria = api.criteriaForQuery(q);
  assert.equal(criteria.q, q);
  assert.equal(criteria.sector, 'VO');
  assert.equal(criteria.vak, 'Biologie');
  const option = api.suggestionData(q)[0].items[0];
  const broader = Object.fromEntries(new URLSearchParams(option.href.split('?')[1]));
  assert.deepEqual([broader.q, broader.sector, broader.vak, broader.type], ['ecosystemen', 'VO', 'Biologie', 'materials']);
  const matched = api.recordsForCriteria(broader);
  assert.equal(option.count, matched.length);
  assert.ok(matched.some(r => r.id === 'hhmi-introduction-to-systems' || r.id === 'stanford-craft-ai-ecosystemen'));
  assert.ok(matched.every(r => r.sectors.includes('VO') && r.subjects.includes('Biologie') && r.offerCategory === 'materials'));
  api.setState(criteria);
  assert.match(api.resultsMarkup(), /Bekijk lesmateriaal over ecosystemen/);
  assert.match(api.resultsMarkup(), /of het niveau bij uw klas past/);
  const blocked = load(records, '#zoeken?sector=VO&vak=onbekend-proefvak');
  assert.ok(!blocked.suggestionData(q).flatMap(s => s.items).some(s => s.href.includes('q=ecosystemen')));
  assert.equal(blocked.criteriaForQuery(q).vak, 'onbekend-proefvak');
  const training = load(records, '#zoeken?type=Training');
  assert.ok(!training.suggestionData(q).flatMap(s => s.items).some(s => s.href.includes('q=ecosystemen')));
  assert.equal(load(records).criteriaForQuery('Een biologieles over ecosystemen in het voortgezet onderwijs').vak, 'Biologie');
  assert.equal(blocked.criteriaForQuery('Een biologieles over ecosystemen').vak, 'onbekend-proefvak');
});

test('school privacy and learning-effect questions offer guidance outside the filtered catalogue totals', () => {
  const privacy = {...record('generatieve-ai-en-privacy-hier-moeten-scholen-op-letten'), title:'Generatieve AI en privacy', sectors:['PO', 'VO', 'MBO']};
  const api = load([privacy], '#zoeken?sector=HBO&vak=Econometrie');
  for (const q of ['Mag ik leerlingwerk uploaden naar ChatGPT?', 'Kan ik het werk van mijn studenten delen met AI?', 'privacy leerlinggegevens']) {
    const criteria = api.criteriaForQuery(q);
    api.setState(criteria);
    assert.equal(criteria.q, q);
    assert.equal(api.recordsForCriteria(criteria).length, 0);
    const routes = api.suggestionData(q)[0].items;
    assert.deepEqual(Array.from(routes, item => item.href), ['#regels-in-de-praktijk', '#item/' + privacy.id]);
    assert.match(routes[1].meta, /algemene uitleg voor PO, VO, MBO/);
    assert.match(api.resultsMarkup(), /data-atlas-empty-search/);
    assert.doesNotMatch(api.resultsMarkup(), /geen aantoonbaar werkend alternatief/);
    assert.equal(api.getState().vak, 'Econometrie');
    assert.equal(api.getState().sector, 'HBO');
  }
  for (const q of ['Helpt AI-feedback leerlingen beter te leren?', 'Wat weten we over het effect van feedback door AI?', 'Heeft AI-feedback op leerlingwerk effect?', 'AI-feedback']) {
    api.setState(api.criteriaForQuery(q));
    assert.equal(api.suggestionData(q)[0].items[0].href, '#wat-werkt');
    assert.match(api.resultsMarkup(), /data-question-route href="#wat-werkt"/);
  }
  for (const query of ['feedback geven op de Atlas', 'Hoe bespreek ik leerlingwerk zonder AI?', 'Welke privacyregeling heeft Hogeschool Utrecht?', 'regenwormquantum123', '']) {
    api.setState(api.criteriaForQuery(query));
    assert.doesNotMatch(api.resultsMarkup(), /data-question-route/);
  }
  const withoutRecord = load([]);
  assert.ok(!withoutRecord.suggestionData('leerlingwerk')[0].items.some(item => item.href.startsWith('#item/')));
});

test('an unfamiliar open question can keep its topic and filters on an explicit retry', () => {
  const topic = {...record('speels'), title:'Gamificatie voor docenten', sectors:['VO'], subjects:['Wiskunde']};
  const api = load([topic], '#zoeken?sector=VO&vak=Wiskunde');
  const q = 'Heeft de Atlas iets over gamificatie?';
  api.setState(api.criteriaForQuery(q));
  assert.equal(api.recordsForCriteria(api.getState()).length, 0);
  assert.match(api.resultsMarkup(), /class="alternative" href="[^"]*q=gamificatie[^"]*sector=VO[^"]*vak=Wiskunde/);
  assert.equal(api.getState().q, q);
  api.setState(api.criteriaForQuery('Heeft de Atlas iets over zirconiumblauw?'));
  assert.doesNotMatch(api.resultsMarkup(), /class="alternative"|data-question-route/);
});

test('practice rules distinguish law, school guidance and a specific reuse licence', () => {
  const main = {};
  const api = load([], '#regels-in-de-praktijk', {document:{querySelector:sel => sel === 'main' ? main : null}});
  api.renderPracticeRules();
  assert.match(main.innerHTML, /id="rules-heading"/);
  assert.match(main.innerHTML, /kan een leerling herkenbaar zijn/);
  assert.match(main.innerHTML, /deze toepassing, dit account en dit gebruik/);
  assert.match(main.innerHTML, /eur-lex\.europa\.eu\/eli\/reg\/2016\/679/);
  assert.match(main.innerHTML, /kennisnet\.nl\/artificial-intelligence\/privacy-en-ai-hier-moeten-scholen-op-letten\//);
  assert.match(main.innerHTML, /kennisnet\.nl\/artificial-intelligence\/schoolafspraken-over-het-gebruik-van-generatieve-ai\//);
  assert.match(main.innerHTML, /creativecommons\.org\/licenses\/by\/4\.0\/legalcode\.nl/);
  assert.match(main.innerHTML, /time datetime="2026-11-22"/);
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
    assert.ok(!criteria.theme);
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

test('facet counts omit only their own filter and count each record once', () => {
  const data = [
    { ...record('a'), sectors: ['HBO', 'HBO'], providerName: 'Team A, Team B' },
    { ...record('b'), sectors: ['VO'], providerName: 'Team A, Team B' },
    { ...record('c'), sectors: ['HBO'], providerName: 'Ander' },
    { ...record('d'), sectors: ['PO'], providerName: 'Ander' },
    { ...record('e'), sectors: ['HBO'], providerName: 'Team C' }
  ];
  const api = load(data);
  api.setState({ q: 'privacy', sector: 'HBO,MBO', organization: JSON.stringify(['Team A, Team B', 'Team C']) });
  const sectors = api.facet('sector', 'Sector', ['HBO', 'VO', 'PO']);
  assert.match(sectors, /<span>HBO<\/span><small>2<\/small>/);
  assert.match(sectors, /<span>VO<\/span><small>1<\/small>/);
  assert.match(sectors, /<span>PO<\/span><small>0<\/small>/);
  const providers = api.facet('organization', 'Aanbieder', ['Team A, Team B','Ander']);
  assert.match(providers, /<span>Team A, Team B<\/span><small>1<\/small>/);
  assert.match(providers, /<span>Ander<\/span><small>1<\/small>/);
  api.setState({ q: 'zzzzzz' });
  assert.match(api.facet('sector', 'Sector', ['HBO']), /<span>HBO<\/span><small>0<\/small>/);
});

test('facet options refresh when an open call expires during a browser session', () => {
  let now = Date.parse('2026-11-17T22:59:55Z');
  class Clock extends Date { static now() { return now; } }
  const data = [{ ...record('call'), recordType: 'funding_call', legacyType: 'Call',
    status: 'open_call', applicationDeadline: '2026-11-17' }];
  const api = load(data, '#zoeken', { Date: Clock });
  const statuses = () => api.facet('status', 'Beschikbaarheid', ['Open voor aanvragen', 'Aanvraag gesloten']);
  assert.match(statuses(), /<span>Open voor aanvragen<\/span><small>1<\/small>/);
  now = Date.parse('2026-11-17T23:01:05Z');
  assert.doesNotMatch(statuses(), /<span>Open voor aanvragen<\/span>/);
  assert.match(statuses(), /<span>Aanvraag gesloten<\/span><small>1<\/small>/);
});

test('language can be combined with sector and is preserved in task links and the meeting sheet', () => {
  const data = [
    { ...record('nl'), title: 'Les A', offerCategory: 'materials', language: ['nl'] },
    { ...record('both'), title: 'Les B', offerCategory: 'materials', language: ['nl', 'en'] },
    { ...record('en'), title: 'Les C', offerCategory: 'materials', language: ['en'] },
    { ...record('multilingual'), title: 'Les D', offerCategory: 'materials', language: ['Meertalig'] },
    { ...record('unknown'), title: 'Les E', offerCategory: 'materials' },
    { ...record('po'), title: 'Les F', sectors: ['PO'], offerCategory: 'materials', language: ['nl'] }
  ];
  const api = load(data, '#zoeken?sector=HBO&language=nl');
  const selected = criteria => Array.from(api.recordsForCriteria(criteria), item => item.id);
  assert.deepEqual(selected(api.getState()), ['nl', 'both']);
  assert.deepEqual(selected({ language: 'nl,en', sector: 'HBO' }), ['nl', 'both', 'en']);
  assert.deepEqual(selected({ language: 'Meertalig' }), ['multilingual']);
  assert.deepEqual(selected({ language: 'unknown' }), ['unknown']);
  const filters = api.catalogFilterPanel(['materials'], ['Docenten'], ['Voorbeeld']);
  assert.match(filters, /data-facet="language" value="nl"\s+checked\s*><span>Nederlands<\/span><small>2<\/small>/);
  assert.match(filters, /<span>Engels<\/span><small>2<\/small>/);
  assert.match(api.resultsMarkup(), /class="practice-link" href="[^"]*language=nl[^"]*q=les/);
  assert.match(api.resultsMarkup(), /data-remove="language\|nl">Nederlands ×/);
  assert.match(api.resultsMarkup(), /<dt>Taal<\/dt><dd>Nederlands, Engels<\/dd>/);
  assert.match(api.meetingSheetMarkup(), /<dt>Taal<\/dt><dd>Nederlands<\/dd>/);
  assert.match(api.stateHref(), /language=nl/);
});
