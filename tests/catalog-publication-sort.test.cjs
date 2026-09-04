const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const catalogue = fs.readFileSync(path.join(__dirname, '..', 'catalog.js'), 'utf8');
const boot = "  addEventListener('hashchange', route); addEventListener('popstate', route); route();";
assert.equal(catalogue.split(boot).length, 2, 'Test hook must replace exactly the route startup');
const instrumented = catalogue.replace(boot, `  window.testCatalogue = {
    publicationDate, sortRecords, stateHref, parseState, hasIntent, resultsMarkup, simpleCard,
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

