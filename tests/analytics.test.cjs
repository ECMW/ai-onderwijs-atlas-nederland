const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const code = fs.readFileSync(path.join(__dirname, '../analytics.js'), 'utf8');

const pilot = '2026-11-22T00:00:00+01:00';
const afterPilot = '2026-12-20T00:00:00+01:00';
function run({ site = 'atlas-test', href = 'https://aionderwijsatlas.nl/', now = afterPilot,
  navigator = {}, status = 'ready', blocked = false, embedded = false, prerendering = false,
  directory = false, directoryLinks = [], records = [], empty = false, visibilityState = 'visible', referrer = 'https://private.example/?secret=PRIVATE',
  navigation = {type:'navigate',loadEventStart:500}, fetchSupported = true, detail = null, hits = false } = {}) {
  const requests = [], notices = [], listeners = [];
  const dom = {directory,empty,detail,hits};
  let time = Date.parse(now);
  class Clock extends Date { static now() { return time; } }
  const context = vm.createContext({ URL, URLSearchParams, navigator, location: new URL(href),
    Date:Clock, performance:{getEntriesByType:() => navigation ? [navigation] : []},
    ATLAS_STARTUP: { status, published:record => ['verified','recently_checked'].includes(record.verificationStatus) },
    ATLAS_RECORDS: {records},
    document: {
      readyState: 'loading', prerendering, visibilityState, referrer,
      createElement: () => ({ append() {} }),
      querySelectorAll: selector => selector.includes('article a[data-atlas-item-id]') ? directoryLinks : [],
      querySelector: selector => {
        if (selector.startsWith('meta')) return {content:site};
        if (selector === 'body > footer') return {append:item => notices.push(item)};
        if (selector === 'main[data-atlas-lesson-directory]') return dom.directory && {};
        if (selector === '[data-atlas-search-hits]') return dom.hits ? {} : null;
        if (selector === '[data-atlas-material-detail]') return dom.detail;
        return selector === '[data-atlas-empty-search]' && dom.empty ? {} : null;
      }
    },
    addEventListener: (name, fn, options) => listeners.push({ name, fn, options }),
    fetch: fetchSupported && ((url, options) => {
      requests.push({ url, options });
      return blocked ? Promise.reject(new Error('network blocked')) :
        Promise.resolve({ ok: true });
    })
  });
  context.window = context; context.self = context; context.top = embedded ? {} : context;
  vm.runInContext(code, context);
  assert.equal(requests.length, 0, 'Wait for Atlas startup');
  for (const listener of listeners.filter(item => item.name === 'load')) {
    assert.equal(listener.options.once, true); listener.fn();
  }
  return { requests, notices, context, dom, setTime: value => { time = Date.parse(value); },
    fire: (type, attrs = {}) => listeners.filter(item => item.name === type).forEach(item => item.fn({type,...attrs})),
    events: () => requests.map(item => new URL(item.url).searchParams).filter(p => p.get('e') === '1').map(p => p.get('p')),
    measurementRequests: () => requests.filter(item => new URL(item.url).pathname === '/count')
  };
}

test('disabled or invalid configuration never sends data', () => {
  for (const site of ['', 'https://wrong.example', 'a/b', 'evil.com', 'A B']) {
    assert.equal(run({ site }).requests.length, 0);
  }
});

test('daily counter sends only a fixed Atlas path and no visitor search state or credentials', () => {
  const app = run({ href: 'https://aionderwijsatlas.nl/?q=PRIVATE&utm_source=PRIVATE#zoeken?q=PRIVATE&sector=PO' });
  assert.equal(app.measurementRequests().length, 1);
  assert.equal(app.requests.length, 1);
  const { url, options } = app.measurementRequests()[0];
  const request = new URL(url);
  assert.equal(request.origin, 'https://atlas-test.goatcounter.com');
  assert.equal(request.pathname, '/count');
  assert.deepEqual([...request.searchParams.keys()].sort(), ['p', 'r', 'rnd', 't']);
  assert.equal(request.searchParams.get('p'), '/ai-onderwijs-atlas-nederland/');
  assert.equal(request.searchParams.get('r'), '');
  assert.ok(!url.includes('PRIVATE'));
  assert.equal(options.credentials, 'omit');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.mode, 'no-cors');
  assert.equal(app.notices.length, 1);
});

test('both public entry documents use the same historical counter path', () => {
  for (const root of ['https://aionderwijsatlas.nl/', 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/']) {
    for (const entry of ['', 'index.html']) {
      const requests = run({href: root + entry + '#papers'}).requests;
      assert.equal(requests.length, 1);
      assert.equal(new URL(requests[0].url).searchParams.get('p'), '/ai-onderwijs-atlas-nederland/');
    }
  }
});

test('local copies, other sites, opt-outs, automated visits and failed startups are excluded', () => {
  for (const overrides of [
    { href: 'http://localhost:8000/' },
    { href: 'https://preview.example/ai-onderwijs-atlas-nederland/' },
    { href: 'https://ecmw.github.io/kies-ai/' },
    { href: 'https://aionderwijsatlas.nl/data/papers.json' },
    { href: 'https://aionderwijsatlas.nl.example/' },
    { href: 'https://aionderwijsatlas.nl/?atlas-no-count=1#papers' },
    { href: 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/?atlas-no-count=1' },
    { navigator: { doNotTrack: '1' } }, { navigator: { globalPrivacyControl: true } },
    { navigator: { webdriver: true } }, { status: 'failed' },
    { embedded: true }, { prerendering: true }
  ]) assert.equal(run(overrides).requests.length, 0, JSON.stringify(overrides));
});

test('a blocked analytics service does not break Atlas startup or navigation', async () => {
  const app = run({ blocked: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
});

function click(app, marker, attrs = {}) {
  app.fire(attrs.type || 'click', {isTrusted:true, button:0, target:{closest: () => ({dataset:{atlasUsage:marker}})}, ...attrs});
}
test('the four-week pilot stops at Dutch midnight even in a tab kept open; regular visits continue', () => {
  for (const now of ['2026-11-21T23:59:59+01:00', afterPilot]) {
    const app = run({now});
    click(app,'lesson-open');
    assert.equal(app.requests.length,1);
    assert.doesNotMatch(app.notices[0].textContent,/19 december/);
  }
  const app = run({now:'2026-12-19T23:59:59.999+01:00'});
  assert.match(app.notices[0].textContent,/19 december/);
  click(app,'lesson-open');
  app.setTime(afterPilot);
  click(app,'funding-open'); app.fire('atlas-ris-downloaded'); app.dom.empty = true; app.fire('atlas-empty-search');
  assert.deepEqual(app.events(),['herkomst-overig','laadtijd-tot-2s','gebruik-lesmateriaal-open']);
});

test('external channels use a fixed category; internal navigation and reloads do not become referrals', () => {
  for (const [referrer, channel] of [
    ['https://www.google.nl/search?q=PRIVATE','herkomst-zoekmachine'],['https://l.linkedin.com/path/PRIVATE','herkomst-sociaal'],
    ['https://notgoogle.nl/PRIVATE','herkomst-overig'],['https://linkedin.com.other.example/PRIVATE','herkomst-overig'],
    ['','herkomst-onbekend'],['not a URL','herkomst-onbekend'],['https://aionderwijsatlas.nl/lesmateriaal/',null],
    ['https://www.aionderwijsatlas.nl/',null],['https://ecmw.github.io/ai-onderwijs-atlas-nederland/',null]]) {
    const app = run({now:pilot, referrer});
    assert.deepEqual(app.events().filter(e => e.startsWith('herkomst-')),channel ? [channel] : []);
  }
  for (const navigation of [null,{type:'reload',loadEventStart:33},{type:'back_forward',loadEventStart:55},
    {type:'navigate',activationStart:20,loadEventStart:100}]) {
    assert.deepEqual(run({now:pilot,navigation}).events(),[]);
  }
});

test('only a visible, supported initial load reports one coarse timing; exclusions cover every event', () => {
  for (const [ms,bucket] of [[1,'laadtijd-tot-2s'],[2000,'laadtijd-tot-2s'],[2001,'laadtijd-2-tot-5s'],[5000,'laadtijd-2-tot-5s'],
    [5001,'laadtijd-boven-5s'],[0,null],[NaN,null]]) {
    const app = run({now:pilot,navigation:{type:'navigate',loadEventStart:ms}});
    assert.deepEqual(app.events().filter(e=>e.startsWith('laadtijd-')), bucket ? [bucket] : []);
  }
  for (const options of [{navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}},
    {navigator:{webdriver:true}},{visibilityState:'hidden'},{fetchSupported:false},{embedded:true},{prerendering:true},
    {href:'https://aionderwijsatlas.nl/?atlas-no-count'},{status:'failed'}]) {
    const app = run({now:pilot, empty:true, ...options});
    click(app,'lesson-open'); app.fire('atlas-ris-downloaded');
    assert.equal(app.requests.length,0);
  }
});

test('only fixed content categories are counted once per document without titles, search, referrer or item identifiers', () => {
  const app = run({now:pilot, href:'https://aionderwijsatlas.nl/?PRIVATE=secret#zoeken?q=PRIVATE'});
  click(app,'PRIVATE'); click(app,'lesson-open',{isTrusted:false}); click(app,'lesson-open',{defaultPrevented:true});
  click(app,'lesson-open',{type:'auxclick',button:2});
  assert.equal(app.events().length,2);
  for (let n = 0; n < 2; n++) {
    click(app,'lesson-open'); click(app,'paper-doi-open',{type:'auxclick',button:1}); click(app,'funding-open');
    app.fire('atlas-ris-downloaded');
    app.fire('atlas-empty-search');
  }
  app.context.location.hash = '#zoeken?vak=PRIVATE';
  app.dom.empty = true; app.fire('atlas-empty-search'); app.fire('atlas-empty-search');
  assert.deepEqual(app.events(),['herkomst-overig','laadtijd-tot-2s','gebruik-lesmateriaal-open','gebruik-paper-open','gebruik-subsidie-open','gebruik-literatuurlijst','route-zoekselectie','gebruik-zoeken-zonder-resultaat']);
  assert.ok(run({now:pilot, empty:true}).events().includes('gebruik-zoeken-zonder-resultaat'));
  for (const {url,options} of app.requests.slice(1)) {
    const params = new URL(url).searchParams;
    assert.deepEqual([...params.keys()].sort(), ['e','p','r','rnd','t']);
    assert.equal(params.get('r'),''); assert.equal(params.get('e'),'1');
    assert.equal(options.credentials,'omit'); assert.equal(options.referrerPolicy,'no-referrer');
    assert.match(params.get('t'), /^(Gebruik|Herkomst|Laadtijd|Route) · /);
    assert.doesNotMatch(url,/PRIVATE|private\.example|#zoeken|sector=|https%3A|secret/i);
  }
  const hidden = run({now:pilot}); hidden.context.document.visibilityState = 'hidden'; click(hidden,'lesson-open');
  assert.ok(!hidden.events().includes('gebruik-lesmateriaal-open'));
});

test('the lesson directory shares the historical visit path and gates only with the static directory marker', () => {
  for (const root of ['https://aionderwijsatlas.nl/', 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/']) {
    for (const entry of ['lesmateriaal/','lesmateriaal/index.html']) {
      const href = root + entry;
      assert.equal(run({href,directory:false}).requests.length,0);
      const app = run({href,directory:true,status:null,now:pilot,referrer:root});
      assert.equal(new URL(app.requests[0].url).searchParams.get('p'),'/ai-onderwijs-atlas-nederland/');
      assert.deepEqual(app.events().filter(name => /^(herkomst|laadtijd)-/.test(name)), ['laadtijd-tot-2s']);
      click(app,'lesson-open');
      assert.ok(app.events().includes('gebruik-lesmateriaal-open'));
      assert.equal(run({href:href+'?atlas-no-count',directory:true,now:pilot}).requests.length,0);
    }
  }
  assert.equal(run({href:'https://aionderwijsatlas.nl/boeken/',directory:true,now:pilot}).requests.length,0);
});

function materialLink(id, title, href) {
  return {href,textContent:title,dataset:{atlasUsage:'lesson-open',atlasItemId:id,atlasItemTitle:title},
    closest:() => ({querySelector:() => ({getAttribute:() => '../#item/' + id})})};
}
const selectLink = (app, link) => app.fire('click',{isTrusted:true,button:0,target:{closest:() => link}});
const materialRequests = app => app.requests.map(req => new URL(req.url).searchParams).filter(params => params.get('p').startsWith('materiaal-'));

test('lesson directory selections keep official material counts without transmitting filter text or return links', () => {
  const canonical = '../#item/les-een';
  for (const [href, accepted] of [
    [canonical, true], [canonical + '?van=lesgids&sector=VO&doel=PRIVATE+lesdoel', true],
    [canonical + '?van=lesgids&terug=https%3A%2F%2Fexample.org', false],
    [canonical + '?van=lesgids&van=anders', false], [canonical + '?van=anders', false],
    ['https://example.org/' + canonical + '?van=lesgids', false], ['../#item/andere-les?van=lesgids', false]
  ]) {
    const link = materialLink('les-een', 'Publieke brontitel', 'https://example.org/materiaal');
    link.closest = () => ({querySelector:() => ({getAttribute:() => href})});
    const app = run({now:pilot, href:'https://aionderwijsatlas.nl/lesmateriaal/#selectie?doel=PRIVATE', directory:true, directoryLinks:[link]});
    selectLink(app, link);
    assert.equal(materialRequests(app).length, Number(accepted), href);
    assert.ok(app.requests.every(request => !request.url.includes('PRIVATE') && !request.url.includes('lesgids%26')));
  }
});

test('material choices use only the public canonical code and title and deduplicate by material and document', () => {
  const href = 'https://example.org/official?PRIVATE=at-source';
  const study = {id:'les-een',title:'Één les voor de klas',offerCategory:'materials',verificationStatus:'verified',
    sourceUrls:[{url:href,sourceType:'official'}]};
  const other = {...study,id:'les-twee',title:'Tweede les'};
  const records = [study,other,{...study,id:'concept',verificationStatus:'draft'},
    {...study,id:'uitgesloten',publicationExclusion:true},{...study,id:'software',offerCategory:'software'},
    {...study,id:'onbetrouwbaar',sourceUrls:[{url:href,sourceType:'secondary'}]},
    {...study,id:'titel-met-url',title:'Een les op https://private.example/'},
    {...study,id:'geen-slug?PRIVATE=ja'}];
  const app = run({now:pilot,records});
  selectLink(app, materialLink(study.id,'PRIVATE form data',href));
  selectLink(app, materialLink(study.id,'changed DOM title',href));
  selectLink(app, materialLink(other.id,'ignored',href));
  for (const item of records.slice(2)) selectLink(app,materialLink(item.id,item.title,href));
  selectLink(app,materialLink('unknown','PRIVATE',href));
  const wrong = run({now:pilot,records});
  selectLink(wrong,materialLink(study.id,study.title,'https://other.example/?PRIVATE'));
  assert.equal(materialRequests(wrong).length,0);
  assert.deepEqual(materialRequests(app).map(p => [p.get('p'),p.get('t')]),[
    ['materiaal-les-een','Één les voor de klas'],['materiaal-les-twee','Tweede les']]);
  assert.equal(app.events().filter(name=>name==='gebruik-lesmateriaal-open').length,1);
  assert.ok(app.requests.every(req=>!req.url.includes('PRIVATE')));
  const optOut = run({now:pilot,records,navigator:{globalPrivacyControl:true}});
  selectLink(optOut,materialLink(other.id,other.title,href));
  assert.equal(optOut.requests.length,0);
  wrong.setTime(afterPilot);
  selectLink(wrong,materialLink(study.id,study.title,href));
  assert.equal(materialRequests(wrong).length,0);

  const link = materialLink(study.id,study.title,href);
  const staticApp = run({now:pilot,href:'https://aionderwijsatlas.nl/lesmateriaal/',directory:true,directoryLinks:[link]});
  link.dataset.atlasItemTitle = 'PRIVATE changed after load';
  link.textContent = 'PRIVATE changed after load';
  selectLink(staticApp,link); selectLink(staticApp,link);
  selectLink(staticApp,materialLink('new-node','PRIVATE',href));
  assert.deepEqual(materialRequests(staticApp).map(p=>[p.get('p'),p.get('t')]),[['materiaal-les-een','Één les voor de klas']]);
});

const updateHref = 'https://aionderwijsatlas.nl/?via=linkedin-update';
const updateEvents = app => app.events().filter(name => name.startsWith('linkedin-update-'));
test('only a new visible canonical update-link visit starts the durable campaign', () => {
  for (const options of [
    {href:'https://aionderwijsatlas.nl/'}, {href:updateHref.toUpperCase()}, {href:updateHref+'-extra'},
    {href:updateHref+'&via=linkedin-update'}, {href:updateHref+'&via=PRIVATE'}, {href:updateHref+'&atlas-no-count'},
    {href:updateHref+'#item/PRIVATE'}, {href:updateHref.replace('/?','/index.html?')},
    {href:updateHref.replace('/?','/lesmateriaal/?'),directory:true},
    {href:'https://ecmw.github.io/ai-onderwijs-atlas-nederland/?via=linkedin-update'},
    {navigation:{type:'reload'}},{navigation:{type:'back_forward'}},{navigation:{type:'navigate',activationStart:89}},
    {navigation:null},{visibilityState:'hidden'},{prerendering:true},{embedded:true},
    {navigator:{webdriver:true}},{navigator:{doNotTrack:'1'}},{navigator:{globalPrivacyControl:true}},{status:'failed'}]) {
    const app = run({href:updateHref,now:'2027-05-01T12:00:00Z', ...options});
    app.fire('atlas-ris-downloaded');
    assert.deepEqual(updateEvents(app),[],JSON.stringify(options));
  }
  const app = run({href:updateHref+'&trk=PRIVATE&ref=PRIVATE',referrer:'https://private.example/?PRIVATE',now:afterPilot});
  assert.deepEqual(app.events(),['linkedin-update-bezoek']);
  assert.equal(app.requests.length,2);
  assert.match(app.notices[0].textContent,/LinkedIn-updatelink/);
  app.context.location.hash='#zoeken?q=PRIVATE';
  const wrong = {href:'https://example.org/PRIVATE',dataset:{}};
  selectLink(app,wrong);
  selectLink(app,{href:'https://other.example/lesmateriaal/',dataset:{}});
  selectLink(app,{href:'https://aionderwijsatlas.nl/lesmateriaal/?PRIVATE',dataset:{}});
  click(app,'lesson-open',{isTrusted:false});
  assert.deepEqual(updateEvents(app),['linkedin-update-bezoek']);
  selectLink(app,{href:'https://aionderwijsatlas.nl/lesmateriaal/',dataset:{}});
  app.fire('atlas-ris-downloaded');
  assert.deepEqual(app.events(),['linkedin-update-bezoek','linkedin-update-vervolgstap']);
  for (const req of app.requests.slice(1)) {
    const params = new URL(req.url).searchParams;
    assert.deepEqual([...params.keys()].sort(), ['e','p','r','rnd','t']);
    assert.equal(params.get('e'),'1'); assert.equal(params.get('r'),'');
    assert.ok(['LinkedIn-update · link geopend','LinkedIn-update · vervolgstap gekozen'].includes(params.get('t')));
    assert.equal(req.options.credentials,'omit'); assert.equal(req.options.referrerPolicy,'no-referrer');
    assert.doesNotMatch(req.url,/PRIVATE|via=|trk=|private\.example/);
  }
});

test('each real qualifying update-link action counts one generic next step; pilot expiry never enables extra tracking', () => {
  for (const kind of ['lesson-open','funding-open','paper-doi-open','ris-download']) {
    const app = run({now:'2027-03-01T10:00:00Z',href:updateHref});
    if (kind === 'ris-download') app.fire('atlas-ris-downloaded');
    else {
      const link = {dataset:{atlasUsage:kind},href:'https://provider.example/PRIVATE'};
      for (const attrs of [{isTrusted:false},{defaultPrevented:true},{type:'auxclick',button:2}]) {
        click(app,kind,{target:{closest:()=>link},...attrs});
      }
      assert.deepEqual(app.events(),['linkedin-update-bezoek']);
      selectLink(app,link); selectLink(app,link);
    }
    assert.deepEqual(app.events(),['linkedin-update-bezoek','linkedin-update-vervolgstap']);
  }
  const app = run({now:'2026-12-19T23:59:59+01:00',href:updateHref});
  app.setTime(afterPilot); app.fire('atlas-ris-downloaded');
  assert.deepEqual(updateEvents(app),['linkedin-update-bezoek','linkedin-update-vervolgstap']);
  assert.ok(!app.events().includes('gebruik-literatuurlijst'));
  const optedOut = run({now:afterPilot, href:updateHref});
  optedOut.context.navigator.globalPrivacyControl = true; optedOut.fire('atlas-ris-downloaded');
  assert.deepEqual(optedOut.events(),['linkedin-update-bezoek']);
  const returned = run({now:afterPilot, href:updateHref});
  returned.fire('pagehide'); returned.fire('pageshow',{persisted:true}); returned.fire('atlas-ris-downloaded');
  assert.deepEqual(returned.events(),['linkedin-update-bezoek']);
});

test('every verified public material with an official external source can be ranked, independently of sector and record type', () => {
  const projected = fs.readFileSync(path.join(__dirname,'../data/data-v2.js'),'utf8');
  const records = JSON.parse(projected.trim().replace(/^window\.ATLAS_RECORDS=/,'').replace(/;$/, '')).records;
  const app = run({now:pilot,records});
  const expected = [];
  for (const record of records) {
    if (record.offerCategory !== 'materials' || Object.hasOwn(record,'publicationExclusion') ||
        !['verified','recently_checked'].includes(record.verificationStatus)) continue;
    const source = record.sourceUrls.find(item => item.sourceType === 'official' && /^https?:\/\//i.test(item.url) &&
      !['aionderwijsatlas.nl','www.aionderwijsatlas.nl','ecmw.github.io'].includes(new URL(item.url).hostname));
    if (!source) continue;
    selectLink(app,materialLink(record.id,'ignored',source.url));
    expected.push([record.id,record.title]);
  }
  assert.ok(expected.length);
  assert.deepEqual(materialRequests(app).map(params=>[params.get('p').slice('materiaal-'.length),params.get('t')]), expected);
});

test('shared and revised searches count each fixed outcome once against the same denominator', () => {
  for (const initiallyEmpty of [false,true]) {
    const app = run({now:pilot, href:'https://aionderwijsatlas.nl/#zoeken?q=PRIVATE', empty:initiallyEmpty, hits:!initiallyEmpty});
    for (const hit of [true,false,true]) {
      app.dom.hits = hit; app.dom.empty = !hit;
      app.fire(hit ? 'atlas-search-results' : 'atlas-empty-search');
    }
    assert.deepEqual(app.events().filter(name => name.includes('zoek')).sort(),
      ['route-zoekselectie','route-zoekselectie-met-resultaat','gebruik-zoeken-zonder-resultaat'].sort());
    assert.ok(!app.requests.some(request => request.url.includes('PRIVATE')));
  }
});

test('direct detail opens count own sources and explicit back, excluding related cards and closing a tab', () => {
  const record = {id:'materiaal-een', title:'Publieke titel', offerCategory:'materials', verificationStatus:'verified',
    sourceUrls:[{sourceType:'official',url:'https://example.org/les'}]};
  const own = materialLink(record.id, record.title, record.sourceUrls[0].url);
  own.matches = () => false; own.closest = () => null;
  const related = {...own, closest:selector => selector === '.related-cards' ? {} : null};
  const back = {href:'https://aionderwijsatlas.nl/#zoeken', dataset:{}, matches:selector => selector === '.detail-nav .back-results'};
  const shell = {dataset:{atlasMaterialDetail:record.id}, querySelectorAll:() => [own], contains:l => [own,related,back].includes(l)};
  const start = () => run({now:pilot,href:'https://aionderwijsatlas.nl/#item/materiaal-een',records:[record],detail:shell});
  const fire = (app,link,type='click',attrs={}) => app.fire(type,{isTrusted:true,button:type==='auxclick'?1:0,
    target:{closest:selector => (selector === 'a' || link.dataset?.atlasUsage) ? link : null},...attrs});
  const routes = app => app.events().filter(path => path.startsWith('route-'));
  const returned = start();
  returned.fire('pagehide'); returned.fire('atlas-material-detail');
  fire(returned,related); fire(returned,back,'auxclick'); fire(returned,back,'click',{ctrlKey:true});
  assert.deepEqual(routes(returned),['route-materiaaldetail-bekeken']);
  fire(returned,back); fire(returned,back);
  assert.deepEqual(routes(returned),['route-materiaaldetail-bekeken','route-materiaaldetail-terug-zonder-bron']);
  const opened = start();
  fire(opened,own,'auxclick'); fire(opened,own); fire(opened,back);
  assert.deepEqual(routes(opened),['route-materiaaldetail-bekeken','route-materiaaldetail-bron-gekozen']);
  assert.ok(!opened.requests.filter(r => new URL(r.url).searchParams.get('p').startsWith('route-'))
    .some(r => /materiaal-een|Publieke|example\.org/.test(r.url)));
  assert.deepEqual(routes(run({now:pilot,records:[],detail:shell})),[]);
});

test('the lesson guide compares document loads with its verified source activations', () => {
  const link = materialLink('les-een','Titel van de les','https://example.org/les');
  const app = run({now:pilot,href:'https://aionderwijsatlas.nl/lesmateriaal/',directory:true,directoryLinks:[link]});
  selectLink(app,{...link}); selectLink(app,link); selectLink(app,link);
  assert.deepEqual(app.events().filter(name=>name.startsWith('route-')),['route-lesgids-bekeken','route-lesgids-bron-gekozen']);
});
