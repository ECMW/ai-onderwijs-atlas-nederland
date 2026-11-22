// Browser-like smoke tests: execute the actual scripts in index.html order.
// The small DOM below supplies only the selectors used by the tested routes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(process.env.ATLAS_SITE_ROOT || path.join(__dirname, '..'));
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(match => !match[1].includes('application/ld+json'))
  .map(match => ({ src: /\bsrc="([^"]+)"/.exec(match[1])?.[1], code: match[2] }));

class Element {
  constructor(tagName = 'div', attributes = {}, parent = null) {
    this.tagName = tagName.toUpperCase(); this.attributes = attributes;
    this.parent = parent; this.children = []; this.dataset = {};
    this.textContent = ''; this.value = attributes.value || ''; this.checked = 'checked' in attributes;
    this.name = attributes.name || '';
    Object.entries(attributes).filter(([key]) => key.startsWith('data-')).forEach(([key, value]) => {
      this.dataset[key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    });
    const classes = new Set((attributes.class || '').split(/\s+/).filter(Boolean));
    this.classList = { contains: key => classes.has(key), add: key => classes.add(key),
      remove: key => classes.delete(key), toggle: (key, force) => {
        const add = force === undefined ? !classes.has(key) : force;
        add ? classes.add(key) : classes.delete(key); return add;
      } };
  }
  set innerHTML(html) {
    this.html = html; this.children = []; if (this.onRender) this.onRender(html);
    let current = this;
    for (const token of html.matchAll(/<(\/?)([a-z][\w-]*)([^>]*?)>/gi)) {
      const [, close, name, raw] = token;
      if (close) { if (current !== this) current = current.parent; continue; }
      const attributes = {};
      for (const attr of raw.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g)) {
        attributes[attr[1]] = attr[2] ?? attr[3] ?? attr[4] ?? '';
      }
      const node = new Element(name, attributes, current); current.children.push(node);
      if (!['input', 'br', 'hr', 'img', 'meta', 'link'].includes(name.toLowerCase())) current = node;
    }
  }
  get innerHTML() { return this.html || ''; }
  matches(selector) {
    if (selector.includes(':checked') && !this.checked) return false;
    selector = selector.replace(/:checked/g, '');
    const tag = /^[a-z][\w-]*/i.exec(selector)?.[0];
    if (tag && this.tagName !== tag.toUpperCase()) return false;
    const outsideAttributes = selector.replace(/\[[^\]]*\]/g, '');
    for (const [, kind, value] of outsideAttributes.matchAll(/([.#])([\w-]+)/g)) {
      if (kind === '.' ? !this.classList.contains(value) : this.attributes.id !== value) return false;
    }
    for (const [, key, operation, value] of selector.matchAll(/\[([\w-]+)(?:(\^?=)"([^"]*)")?\]/g)) {
      if (!(key in this.attributes)) return false;
      if (operation === '=' && this.attributes[key] !== value) return false;
      if (operation === '^=' && !this.attributes[key].startsWith(value)) return false;
    }
    return true;
  }
  querySelectorAll(selector) {
    const alternatives = selector.split(','); const found = [];
    const walk = node => {
      for (const child of node.children) {
        const matched = alternatives.some(alternative => {
          // Whitespace inside a quoted attribute is not a descendant selector.
          const parts = alternative.trim().match(/(?:[^\s"']|"[^"]*"|'[^']*')+/g);
          if (!child.matches(parts.at(-1))) return false;
          let ancestor = child.parent;
          for (let index = parts.length - 2; index >= 0; index--) {
            while (ancestor && !ancestor.matches(parts[index])) ancestor = ancestor.parent;
            if (!ancestor) return false; ancestor = ancestor.parent;
          }
          return true;
        });
        if (matched) found.push(child); walk(child);
      }
    };
    walk(this); return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
  contains(other) { return Boolean(other && (other === this || this.contains(other.parent))); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener() {}
  focus() { this.closest('document').activeElement = this; }
  getBoundingClientRect() { return { top: 0, bottom: 0 }; }
}

function checkSkipLink(document, location, window) {
  const href = location.href;
  const main = document.querySelector('main');
  let focused, scrolledTo;
  main.focus = () => { focused = main; };
  window.scrollTo = options => { scrolledTo = options.top; };
  const skip = document.querySelector('a.skip');
  const activation = new Event('click', {cancelable:true});
  skip.onclick?.(activation);
  if (!activation.defaultPrevented) location.hash = skip.getAttribute('href');
  assert.equal(location.href, href);
  assert.equal(focused, main);
  assert.equal(scrolledTo, 0);
}

test('a shared lesson directory selection reopens with the same sector, subject and goal, and reset restores all lessons', async () => {
  const script = fs.readFileSync(path.join(root, 'lesgids-filter.js'), 'utf8');
  const template = fs.readFileSync(path.join(__dirname, '../scripts/lesson_directory.html'), 'utf8');
  const cases = [
    ['doelles', 'VO', 'Biologie', 'Voedselweb tekenen'], ['ander-niveau', 'HBO', 'Biologie', 'Voedselweb tekenen'],
    ['ander-vak', 'VO', 'Aardrijkskunde', 'Voedselweb tekenen'], ['ander-doel', 'VO', 'Biologie', 'Planten herkennen']
  ];
  function open(href) {
    const location = new URL(href), document = new Element('document'), events = new EventTarget();
    const cards = cases.map(([id, sector]) => '<article data-id="' + id + '"><span data-directory-sectors="' + sector +
      '"></span><span data-directory-subject></span><span data-directory-goal></span><a class="directory-card-link" href="../#item/' + id + '"></a></article>');
    document.innerHTML = template.replace('$sections', '<section aria-labelledby="groep">' + cards.join('') + '</section>');
    const form = document.querySelector('[data-directory-filter]');
    document.querySelectorAll('article').forEach((card, i) => {
      card.querySelector('[data-directory-subject]').textContent = cases[i][2];
      card.querySelector('[data-directory-goal]').textContent = cases[i][3];
    });
    const fields = form.querySelectorAll('input,select');
    for (const field of fields) field.validity = {valid:true};
    form.addEventListener = events.addEventListener.bind(events);
    form.reportValidity = () => true;
    let copied;
    const window = new EventTarget();
    vm.runInNewContext(script, {document, location, URLSearchParams, window,
      history:{replaceState:(_, __, url) => { location.href = new URL(url, location).href; }},
      navigator:{clipboard:{writeText:async url => { copied = url; }}}, requestAnimationFrame:callback => callback()});
    return {form, location, events, skip:() => checkSkipLink(document, location, window),
      visible:() => document.querySelectorAll('article').filter(card => !card.hidden).map(card => card.dataset.id),
      share:async () => { await form.querySelector('[data-share-lessons]').onclick(); return copied; },
      reset:() => { fields.forEach(field => { field.value = ''; }); events.dispatchEvent(new Event('reset')); }};
  }
  const base = 'https://example.org/lesmateriaal/';
  const original = open(base + '?atlas-no-count=1');
  for (const [field, value] of [['sector','VO'], ['subject','Biologie'], ['goal','voedselweb']]) {
    original.form.querySelector('[data-filter-' + field + ']').value = value;
    original.events.dispatchEvent(new Event('input'));
  }
  assert.deepEqual(original.visible(), ['doelles']);
  const hash = '#selectie?sector=VO&vak=Biologie&doel=voedselweb';
  assert.equal(original.location.hash, hash);
  const shared = await original.share();
  assert.equal(shared, base + hash);
  const reopened = open(shared);
  reopened.skip();
  assert.deepEqual(reopened.visible(), ['doelles']);
  reopened.reset();
  assert.deepEqual(reopened.visible(), cases.map(row => row[0]));
  assert.equal(reopened.location.href, base);
});

function boot({ replacements = {}, omitted = [], omitGuard = false, fetch, href = 'https://example.org/atlas/?view=public#home' } = {}) {
  const document = new Element('document');
  document.innerHTML = page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  document.body = document.querySelector('body');
  const main = document.querySelector('main'); const renders = [];
  main.onRender = html => renders.push(html);
  const listeners = new Map(); const errors = [];
  const dispatch = (kind, event = {}) => {
    for (const handler of listeners.get(kind) || []) handler(event);
  };
  const location = new URL(href); location.replace = value => { location.href = new URL(value, location).href; };
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const context = vm.createContext({ document, location, URL, URLSearchParams, Intl, Event, fetch,
    dispatchEvent: event => dispatch(event.type, event),
    localStorage: storage, sessionStorage: storage, CSS: { escape: value => value },
    matchMedia: () => ({ matches: false }), scrollTo() {}, scrollBy() {}, scrollY: 0,
    requestAnimationFrame: callback => callback(), setTimeout, clearTimeout,
    addEventListener: (kind, handler) => {
      if (!listeners.has(kind)) listeners.set(kind, []); listeners.get(kind).push(handler);
    }
  });
  context.window = context;
  for (const script of scripts) {
    const filename = script.src?.split('?')[0];
    if (omitGuard && !filename && script.code.includes('window.ATLAS_STARTUP')) continue;
    if (omitted.includes(filename)) continue;
    const code = filename ? replacements[filename] ?? fs.readFileSync(path.join(root, filename), 'utf8') : script.code;
    try { vm.runInContext(code, context, { filename: filename || 'index-inline.js' }); }
    catch (error) {
      errors.push(error);
      dispatch('error', { filename: new URL(filename || 'index-inline.js', location).href, target: context, error });
    }
  }
  dispatch('load');
  return { context, document, main, renders, errors, dispatch,
    navigate: hash => { location.hash = hash; dispatch('hashchange'); } };
}

function assertFailure(app) {
  assert.equal(app.context.ATLAS_STARTUP.status, 'failed');
  assert.match(app.main.innerHTML, /De atlas kon niet worden geladen/);
  assert.match(app.main.innerHTML, /role="alert"/);
  assert.ok(!app.renders.some(html => /<h2>0 bronrecords<\/h2>/.test(html)), 'A failure must never render the empty legacy atlas');
  for (const hash of ['#over', '#beheer', '#dashboard', '#zoeken', '#home']) {
    app.navigate(hash);
    assert.match(app.main.innerHTML, /De atlas kon niet worden geladen/, 'Later routes must preserve the failure');
  }
}

test('Nieuw aanbod keeps the originating card control on the same page and sort', () => {
  const app = boot();
  const saved = new Map();
  app.context.sessionStorage = {getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value)};
  app.context.history = {state: null, replaceState(value) { this.state = value; }};
  const route = '#nieuw?volgorde=published&pagina=2';
  app.navigate(route);
  const link = app.main.querySelectorAll('.offer-secondary-actions a[href^="#item/"]')[6];
  app.context.scrollY = 2400;
  link.onclick();
  const cardId = link.closest('[data-record-id]').dataset.recordId;
  const outgoing = app.context.history.state.atlasResults;
  assert.equal(outgoing.focusId, cardId);
  assert.equal(outgoing.focusControl, 'details');
  assert.equal(outgoing.y, 2400);
  app.context.history.state = null;
  app.navigate(link.getAttribute('href'));
  const back = app.main.querySelector('.back-results');
  assert.match(app.main.innerHTML, /Terug naar Nieuw aanbod/);
  assert.equal(back.getAttribute('href').replaceAll('&amp;', '&'), route);
  back.onclick();
  let scrollTop;
  app.context.scrollTo = options => { scrollTop = options.top; };
  app.navigate(route);
  assert.equal(app.context.history.state.atlasResults.focusId, cardId);
  assert.equal(app.document.activeElement, app.main.querySelector(`[data-record-id="${cardId}"] .offer-secondary-actions a`));
  assert.equal(scrollTop, 2400);
  app.navigate('#nieuw?volgorde=added');
  assert.equal(scrollTop, 0, 'a new sort starts at the page heading');
});

test('skipping navigation keeps the filtered results and the current learner sheet', () => {
  const app = boot({href:'https://example.org/atlas/#zoeken?vak=Biologie&sector=VO&type=materials'});
  for (const content of ['#results-panel', '.learner-sheet']) {
    if (content === '.learner-sheet') app.navigate('#leerlingblad?item=hhmi-introduction-to-systems');
    const displayed = app.main.querySelector(content);
    assert.ok(displayed);
    checkSkipLink(app.document, app.context.location, app.context);
    assert.equal(app.main.querySelector(content), displayed);
  }
  assert.deepEqual(app.errors, []);
});

test('a blocked or broken optional analytics script leaves the real Atlas usable', () => {
  const app = boot({ omitted: ['analytics.js'] });
  app.dispatch('error', { target: { tagName: 'SCRIPT', src: 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/analytics.js?v=test' } });
  app.dispatch('error', { filename: 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/analytics.js', target: app.context });
  assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
  app.navigate('#over'); assert.match(app.main.innerHTML, /Over de atlas/);
  app.navigate('#zoeken'); assert.match(app.main.innerHTML, /class="atlas-search"/);
});

test('papers open directly and from home or research; an optional feed failure can be retried without affecting the catalogue', async () => {
  const requests = [];
  const fetch = (url, options) => new Promise(resolve => requests.push({url, options, resolve}));
  const app = boot({fetch});
  assert.equal(requests.length, 0);
  assert.ok(app.document.querySelector('#nav').querySelectorAll('a').some(link => link.attributes.href === '#papers'));
  assert.ok(app.document.querySelector('.practice-start').querySelectorAll('a').some(link => link.attributes.href === '#papers'));
  app.navigate('#onderzoek');
  assert.ok(app.document.querySelector('.research-page').querySelectorAll('a').some(link => link.attributes.href === '#papers'));
  app.navigate('#papers');
  const panel = app.document.querySelector('[data-papers]');
  assert.match(panel.innerHTML, /Papers worden geladen/);
  assert.equal(requests[0].url, 'data/papers.json');
  requests[0].resolve({ok:false});
  await new Promise(setImmediate);
  assert.match(panel.innerHTML, /paperlijst kon niet worden geladen/);
  panel.querySelector('button').onclick();
  requests[1].resolve({ok:true,json:async () => ({checkedAt:'2026-11-22', sources:[], papers:[]})});
  await new Promise(setImmediate);
  assert.match(panel.innerHTML, /geen papers voor deze selectie/);
  app.navigate('#zoeken');
  assert.ok(app.document.querySelector('#catalog-search'));
  app.navigate('#papers');
  requests[2].resolve({ok:false});
  await new Promise(setImmediate);
  assert.match(app.document.querySelector('[data-papers]').innerHTML, /eerder geladen editie[\s\S]+2026-11-22/);
  assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
  assert.deepEqual(app.errors, []);

  const direct = boot({href:'https://example.org/atlas/#papers', fetch});
  assert.ok(direct.document.querySelector('#papers-heading'));
  const old = direct.document.querySelector('[data-papers]');
  direct.navigate('#onderzoek');
  requests[3].resolve({ok:true, json:async () => ({papers:[]})});
  await new Promise(setImmediate);
  assert.match(old.innerHTML, /Papers worden geladen/);
  assert.ok(direct.document.querySelector('#research-heading'));
  assert.deepEqual(direct.errors, []);
});

test('open access changes the visible papers and RIS together, including an older edition and an empty selection', async () => {
  const base = {title:'One', published:'2026-05-22', url:'https://doi.org/10.1000/open', access:'open'};
  const other = {...base, title:'Two', url:'https://doi.org/10.1000/other', access:'unknown'};
  let data = {papers:[other, base, {...base, title:'Invalid', published:'unknown'}]};
  const app = boot({href:'https://example.org/atlas/#papers', fetch:async () => ({ok:Boolean(data), json:async () => data})});
  await new Promise(setImmediate);
  const blobs = [], clicked = [], revoked = [], scheduled = [];
  app.context.URL = class extends URL {
    static createObjectURL(blob) { blobs.push(blob); return 'blob:test/' + blobs.length; }
    static revokeObjectURL(url) { revoked.push(url); }
  };
  app.context.Blob = Blob;
  app.context.setTimeout = fn => { scheduled.push(fn); };
  app.document.body.appendChild = () => {};
  app.document.createElement = () => ({click() { clicked.push([this.href,this.download]); }, remove() {}});
  const panel = () => app.document.querySelector('[data-papers]');
  const toggle = checked => {
    const field = panel().querySelector('[data-open-papers]');
    field.checked = checked;
    field.onchange();
  };
  const download = () => panel().querySelector('[data-download-ris]');
  const count = () => panel().querySelector('[data-paper-count]').textContent;
  const visibleCards = () => panel().querySelectorAll('.papers-list li').filter(card => !card.hidden);
  download().onclick();
  assert.equal(visibleCards().length, 2);
  toggle(true);
  assert.equal(count(), '1 van 2 papers');
  assert.equal(visibleCards().length, 1);
  download().onclick();
  assert.equal((await blobs[0].text()).split('TY  -').length - 1, 2);
  assert.match(await blobs[1].text(), /10\.1000\/open/);
  assert.doesNotMatch(await blobs[1].text(), /10\.1000\/other|Invalid/);
  assert.deepEqual(clicked, [['blob:test/1','ai-onderwijs-atlas-papers.ris'],['blob:test/2','ai-onderwijs-atlas-papers.ris']]);
  scheduled.splice(0).forEach(fn => fn());
  assert.deepEqual(revoked, ['blob:test/1','blob:test/2']);
  toggle(false);
  assert.equal(visibleCards().length, 2);

  const reload = async () => { app.navigate('#onderzoek'); app.navigate('#papers'); await new Promise(setImmediate); };
  data = null;
  await reload();
  assert.match(panel().innerHTML, /eerder geladen editie/);
  toggle(true);
  assert.equal(visibleCards().length, 1);
  download().onclick();
  assert.equal(await blobs[2].text(), await blobs[1].text());

  data = {papers:[other]};
  await reload();
  toggle(true);
  assert.equal(visibleCards().length, 0);
  assert.equal(panel().querySelector('[data-no-open-papers]').hidden, false);
  assert.equal(download().disabled, true);
  download().onclick();
  assert.equal(blobs.length, 3);
  panel().querySelector('[data-show-all-papers]').onclick();
  assert.equal(count(), '1 paper');
  assert.equal(visibleCards().length, 1);
  assert.equal(download().disabled, false);
  assert.equal(panel().querySelector('[data-open-papers]').checked, false);
});

test('each paper copies its own citation and selects only its own field when clipboard access is denied', async () => {
  const papers = [
    {authors:['Clara Smit','Jo Li'], title:'Learning with AI', source:'Journal A', url:'https://doi.org/10.1234/first', published:'2026-01-01'},
    {authors:['Yun Kim'], title:'Teaching about AI', source:'Journal B', url:'https://doi.org/10.1234/second', published:'2025-09-20'}
  ].map(paper => ({...paper, summary:'Summary omitted from citation.', publicationType:'journal-article'}));
  const app = boot({href:'https://example.org/atlas/#papers', fetch:async () => ({ok:true, json:async () => ({papers})})});
  await new Promise(setImmediate);
  const panel = app.document.querySelector('[data-papers]');
  const buttons = panel.querySelectorAll('[data-copy-paper]');
  assert.equal(buttons.length, 2);
  const writes = [];
  const expected = [
    'Clara Smit, Jo Li (2026).\nLearning with AI\nJournal A\nhttps://doi.org/10.1234/first',
    'Yun Kim (2025).\nTeaching about AI\nJournal B\nhttps://doi.org/10.1234/second'
  ];
  app.context.navigator = {clipboard:{writeText:async text => { writes.push(text); }}};
  const controls = buttons.map(button => button.closest('.paper-citation'));
  const fields = controls.map(group => group.querySelector('textarea'));
  const focusAndSelection = [];
  for (const [index, button] of buttons.entries()) {
    button.isConnected = true;
    assert.equal(button.attributes['aria-label'], 'Kopieer bronvermelding: ' + papers[index].title);
    assert.ok('readonly' in fields[index].attributes && 'hidden' in fields[index].attributes);
    fields[index].focus = () => focusAndSelection.push(['focus', index]);
    fields[index].select = () => focusAndSelection.push(['select', index]);
    await panel.onclick({target:button});
    assert.equal(controls[index].querySelector('[role="status"]').textContent, 'Bronvermelding gekopieerd.');
  }
  assert.deepEqual(writes, expected);
  app.context.navigator.clipboard.writeText = async () => { throw new Error('Clipboard denied'); };
  await panel.onclick({target:buttons[1]});
  assert.equal(fields[1].value, expected[1]);
  assert.equal(fields[1].hidden, false);
  assert.equal(fields[0].hidden, true);
  assert.equal(controls[1].querySelector('[role="status"]').textContent, 'Kopieer de geselecteerde bronvermelding.');
  assert.deepEqual(focusAndSelection, [['focus',1],['select',1]]);
});

test('home uses the full catalogue and the same query, sector, cost and offer filters as search', () => {
  const app=boot();
  assert.deepEqual(app.errors,[]);
  assert.ok(app.document.querySelector('#home-search'));
  for(const key of ['sector','type','cost','audience','organization']) {
    assert.ok(app.document.querySelector(`[data-facet="${key}"]`),key);
  }
  assert.match(app.main.innerHTML,/388|resultaten/);
  assert.ok(!app.main.innerHTML.includes('guide-start'));
  assert.ok(!app.main.innerHTML.includes('geselecteerde vermeldingen'));
  app.navigate('#zoeken');
  assert.ok(app.document.querySelector('#catalog-search'));
  assert.ok(app.document.querySelector('[data-facet="cost"]'));
});

test('the free subject form applies only the current input and preserves the other filters', () => {
  const app = boot({href: 'https://example.org/atlas/#zoeken?q=les&sector=VO&type=materials'});
  const history = [];
  app.context.history = {pushState(_state, _title, href) { app.context.location.hash = href; history.push(href); }};
  const form = app.document.querySelector('.subject-filter');
  const field = form.querySelector('input');
  const submit = () => form.onsubmit({preventDefault() {}});
  field.value = '  biologie ';
  assert.equal(history.length,0);
  submit(); submit();
  assert.equal(history.length,1);
  assert.equal(field.value,'Biologie');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(history[0].split('?')[1])), {q:'les', sector:'VO', vak:'Biologie', type:'materials'});
  field.value='onbekend keuzevak';
  submit();
  assert.match(app.document.querySelector('#results-panel').innerHTML,/Geen exacte match/);
  assert.equal(new URLSearchParams(history[1].split('?')[1]).get('vak'),'onbekend keuzevak');
  field.value='  '; submit();
  assert.deepEqual(Object.fromEntries(new URLSearchParams(history[2].split('?')[1])), {q:'les', sector:'VO', type:'materials'});
});

test('empty search can edit the query or remove just the term, preserving filters, sort and keyboard focus', t => {
  const app = boot({href:'https://example.org/atlas/#zoeken?q=zonsverduistering&sector=VO&type=materials&sort=az'});
  app.context.history = {pushState(_state, _title, href) { app.context.location.hash = href; }};
  let focused;
  t.mock.method(Element.prototype, 'focus', function () { focused = this; });
  const doc = app.document;
  const query = doc.querySelector('.atlas-search input');
  let selected = false;
  query.select = () => { selected = true; };
  const initial = app.context.location.hash;
  doc.querySelector('.empty [data-edit-query]').onclick();
  assert.equal(focused,query);
  assert.ok(selected);
  assert.equal(app.context.location.hash, initial);
  const panel = doc.querySelector('#results-panel');
  const count = Number(app.main.innerHTML.match(/Toon (\d+) resultaten? zonder zoekterm/)[1]);
  assert.ok(count > 0);
  doc.querySelector('.empty [data-clear-query]').onclick();
  assert.deepEqual(Object.fromEntries(new URLSearchParams(app.context.location.hash.split('?')[1])),
    {sort:'az',sector:'VO',type:'materials'});
  assert.match(panel.innerHTML, new RegExp('>' + count + ' resultaten?</h2>'));
  assert.equal(focused,doc.querySelector('.result-head h2'));
  doc.querySelector('[data-remove]').onclick();
  assert.equal(focused,doc.querySelector('.result-head h2'));
  doc.querySelector('.clear-link').onclick();
  assert.equal(focused,query);
  assert.equal(query.value,'');
  assert.equal(app.context.location.hash,'#zoeken');
});

test('empty results offer a query edit without promising matches when filters alone also have none', () => {
  for (const selection of ['vak=onbekend-keuzevak', 'type=Subsidie&vak=onbekend-keuzevak']) {
    const app = boot({href:'https://example.org/atlas/#zoeken?q=zonsverduistering&' + selection});
    assert.ok(app.document.querySelector('.empty [data-edit-query]'));
    assert.equal(app.document.querySelector('.empty [data-clear-query]'), null);
  }
  const filtersOnly = boot({href:'https://example.org/atlas/#zoeken?vak=onbekend-keuzevak'});
  assert.equal(filtersOnly.document.querySelector('.empty [data-edit-query]'), null);
  assert.match(filtersOnly.main.innerHTML,/geen aanbod met deze combinatie van filters/);
});

test('the actual homepage opens both funding statuses and keeps the full funding catalogue reachable', () => {
  const app = boot({href:'https://example.org/atlas/'});
  const home = app.main.innerHTML.match(/<a class="practice-link" href="([^"]+)"><strong>Subsidies en calls<\/strong>/);
  assert.ok(home);
  assert.equal(new URLSearchParams(home[1].replaceAll('&amp;', '&').split('?')[1]).get('status'), 'Open voor aanvragen,Gepland,In ontwikkeling');
  app.navigate(home[1].replaceAll('&amp;', '&'));
  assert.ok(app.document.querySelector('#funding-heading'));
  assert.ok(app.document.querySelector('[aria-label="Aanvraagstatus"]'));
  const all = app.main.innerHTML.match(/<a href="([^"]+)">Alle \(\d+\)<\/a>/);
  assert.ok(all);
  app.navigate(all[1].replaceAll('&amp;', '&'));
  assert.ok(app.document.querySelector('[data-record-id="nwo-calls-rond-ai-en-onderwijs"]'));
  assert.deepEqual(app.errors, []);
});

test('home features an actionable tool while the normal search results keep their space', () => {
  const catalog = fs.readFileSync(path.join(root, 'catalog.js'), 'utf8');
  const withSpotlight = value => boot({href:'https://example.org/atlas/', replacements:{
    'catalog.js':catalog.replace(/const HOME_SPOTLIGHT = [\s\S]*?;\r?\n/, 'const HOME_SPOTLIGHT = ' + JSON.stringify(value) + ';\n')
  }});
  const app = withSpotlight({title:'Werkvorm', description:'Bekijk de opdracht.', action:'Open', href:'#praktijkgids'});
  const spotlight = app.main.querySelector('.home-spotlight');
  assert.ok(spotlight);
  assert.equal(spotlight.querySelector('a').getAttribute('href'), '#praktijkgids');
  app.navigate('#zoeken?q=les');
  assert.equal(app.main.querySelector('.home-spotlight'), null);
  app.navigate('#home');
  assert.equal(app.main.querySelectorAll('.home-spotlight').length, 1);
  assert.equal(withSpotlight(null).main.querySelector('.home-spotlight'), null);
});

test('the sixth homepage task and direct research links open all three goals and preserve the return context', () => {
  const app = boot({href:'https://example.org/atlas/'});
  assert.equal(app.document.querySelectorAll('.practice-links .practice-link').length, 6);
  assert.match(app.main.innerHTML, /<a class="practice-link" href="#onderzoek"><strong>Onderzoek doen of promoveren/);
  app.navigate('#onderzoek');
  assert.ok(app.document.querySelector('#research-heading'));
  assert.match(app.main.innerHTML, /Ik zoek een promotieplaats[\s\S]*Ik doe al onderzoek[\s\S]*Met mijn onderwijsinstelling praktijkonderzoek doen/);
  assert.match(app.main.innerHTML, /www\.kennisrotonde\.nl\/vraag-en-antwoord/);
  app.navigate('#zoeken?sector=HBO&vak=Wiskunde&type=Subsidie&status=Gepland');
  const target = app.main.innerHTML.match(/href="([^"]+)">Ik zoek een promotieplaats/)[1].replaceAll('&amp;', '&');
  assert.ok(target.startsWith('#onderzoek?'));
  app.navigate(target);
  const back = app.main.innerHTML.match(/href="([^"]+)">← Terug naar subsidies en calls/)[1].replaceAll('&amp;', '&');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(back.split('?')[1])), {sector:'HBO', vak:'Wiskunde', type:'Subsidie', status:'Gepland'});
  assert.deepEqual(app.errors, []);
});

test('home and filtered results keep the count and selected filters together above the cards', () => {
  const app = boot();
  for (const route of ['#home', '#zoeken?sector=VO&vak=Biologie&type=materials']) {
    app.navigate(route);
    const head = app.document.querySelector('.result-head');
    assert.ok(head.querySelector('h2'));
    const options = head.querySelector('details.result-options');
    assert.ok(options.querySelector('summary'));
    assert.ok(!('open' in options.attributes));
    assert.ok(options.querySelector('#sort'));
    assert.ok(options.querySelector('[data-share-selection]'));
    assert.ok(options.querySelector('[data-compare-guide]'));
    assert.ok(options.querySelector('[data-meeting-sheet]'));
    assert.ok(options.querySelectorAll('a').some(link => link.attributes.href === '#nieuw'));
    if (route.includes('Biologie')) {
      assert.equal(head.querySelectorAll('[data-remove]').length, 3);
      assert.equal(options.querySelectorAll('[data-remove]').length, 0);
    }
    assert.ok(app.document.querySelector('.results-content .result-card'));
  }
  assert.deepEqual(app.errors, []);
});

test('home and search expose one filter opener beside the search form, before the practice routes', () => {
  const app = boot({href: 'https://example.org/atlas/'});
  for (const route of ['', '#home', '#zoeken']) {
    if (route) app.navigate(route);
    const sidebar = app.document.querySelector('.catalog-sidebar');
    const opener = sidebar.querySelector('.mobile-filter');
    const panel = sidebar.querySelector('#filters');
    assert.ok(sidebar.querySelector('.atlas-search input'));
    assert.equal(app.document.querySelectorAll('.mobile-filter').length, 1);
    assert.equal(app.document.querySelectorAll('#filters').length, 1);
    assert.equal(opener.attributes['aria-controls'], panel.attributes.id);
    assert.ok(!('open' in panel.querySelector('[data-facet-block="sector"]').attributes));
    assert.ok(panel.querySelector('.subject-filter input'));
    assert.ok(app.main.innerHTML.indexOf('class="mobile-filter') < app.main.innerHTML.indexOf('class="practice-start'));
    opener.onclick();
    assert.equal(opener.attributes['aria-expanded'], 'true');
    assert.equal(panel.attributes['aria-modal'], 'true');
    assert.ok(app.document.body.classList.contains('locked'));
    panel.querySelector('.close').onclick();
    assert.equal(opener.attributes['aria-expanded'], 'false');
    assert.ok(!app.document.body.classList.contains('locked'));
  }
  app.navigate('#zoeken?sector=VO');
  assert.ok('open' in app.document.querySelector('[data-facet-block="sector"]').attributes);
});

test('root and every return home start with 24 cards from the complete catalogue, newest first', () => {
  const app = boot({href:'https://example.org/atlas/'});
  const expected = app.context.ATLAS_RECORDS.records.slice().sort((a,b) => {
    const first = r => (r.changeHistory || []).filter(c => c.type === 'added' && /^\d{4}-\d{2}-\d{2}$/.test(c.date)).map(c => c.date).sort()[0] || '';
    const ad = first(a), bd = first(b);
    return bd.localeCompare(ad) || a.title.localeCompare(b.title, 'nl') || a.id.localeCompare(b.id);
  }).map(r => r.id);
  const check = () => {
    assert.match(app.main.innerHTML, /value="added" selected/);
    const actual = [...app.main.innerHTML.matchAll(/data-record-id="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(actual, Array.from(expected.slice(0, 24)));
    assert.ok(app.main.innerHTML.includes(`24 van ${expected.length} resultaten getoond`));
  };
  check();
  app.navigate('#zoeken?sort=az');
  assert.match(app.main.innerHTML, /value="az" selected/);
  app.navigate('#home'); check();
  app.navigate('#zoeken?sort=published-oldest');
  app.navigate(''); check();
});

test('home rerenders notify optional widgets when a saved role is cleared', () => {
  const app = boot();
  let stored = JSON.stringify(['Docenten']);
  app.context.localStorage.getItem = () => stored;
  app.context.localStorage.setItem = (key, value) => { stored = value; };
  app.context.localStorage.removeItem = () => { stored = null; };
  app.navigate('#home');
  assert.match(app.main.innerHTML, /value="added" selected/);
  const clear = app.document.querySelector('.persona-clear');
  assert.ok(clear, 'Saved roles expose the clear control');
  let rendered = 0;
  app.context.addEventListener('atlas:home-rendered', () => { rendered++; });
  clear.onclick();
  assert.equal(rendered, 1);
  assert.equal(app.document.querySelector('[data-atlas-visit-count]'), null);
  assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
});

test('every dashboard type opens exactly the records counted under its label', () => {
  const app = boot({href: 'https://example.org/atlas/#dashboard'});
  const records = Array.from(app.context.ATLAS_RECORDS.records).filter(app.context.ATLAS_STARTUP.published);
  const entries = [...app.main.innerHTML.matchAll(/<a class="stat" href="([^"]+)"><strong>(\d+)<\/strong><span>([^<]+)<\/span>/g)];
  assert.deepEqual(entries.map(entry => entry[3]).sort(), [...new Set(records.map(record => record.legacyType))].sort());

  for (const [, href, count, label] of entries) {
    const expected = records.filter(record => record.legacyType === label).map(record => record.id).sort();
    assert.equal(Number(count), expected.length, label);
    const oldHref = '#zoeken?type=' + encodeURIComponent(label);
    for (const route of new Set([href, oldHref])) {
      app.navigate(route);
      const list = app.main.querySelector('[data-result-list]');
      assert.ok(list, route);
      list.insertAdjacentHTML = (position, html) => {
        assert.equal(position, 'beforeend');
        const fragment = new Element();
        fragment.innerHTML = html;
        for (const card of fragment.children) { card.parent = list; list.children.push(card); }
      };
      const more = app.main.querySelector('[data-more-results]');
      while (more && !more.hidden) more.onclick();
      assert.deepEqual(list.children.map(card => card.dataset.recordId).sort(), expected, route);
    }
  }
});

test('the real script order starts the catalogue and retains the mobile menu and informational routes', () => {
  const app = boot();
  assert.deepEqual(app.errors, []);
  assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
  assert.match(app.main.innerHTML, /class="atlas-search"/);
  assert.ok(app.renders.every(html => !html.includes('0 bronrecords')));
  const menu = app.document.querySelector('.menu');
  menu.onclick(); assert.equal(menu.attributes['aria-expanded'], 'true');
  assert.equal(app.document.querySelector('.site-header').classList.contains('open'), true);
  for (const [hash, title] of [['#boeken', 'Boeken'], ['#dashboard', 'Inzichten en actualiteit'], ['#ecosysteem', 'Het AI-onderwijsecosysteem'], ['#over', 'Over de atlas']]) {
    app.navigate(hash); assert.match(app.main.innerHTML, new RegExp(title));
    assert.equal(menu.attributes['aria-expanded'], 'false');
    assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
  }
  assert.match(app.main.innerHTML, new RegExp(`<dd>${app.context.ATLAS_RECORDS.records.length}</dd>`));
  app.navigate('#oude-link');
  assert.match(app.main.innerHTML, /class="atlas-search"/);
});

test('missing data is reported as a load failure instead of a zero-record atlas', () => {
  for (const hash of ['home', 'over', 'dashboard', 'zoeken']) {
    assertFailure(boot({ omitted: ['data/data-v2.js'], href: `https://example.org/atlas/#${hash}` }));
  }
});

test('a cached older index without the startup guard still renders healthy catalogue and informational routes', () => {
  const app = boot({ omitGuard: true });
  assert.deepEqual(app.errors, []);
  assert.equal(app.context.ATLAS_STARTUP, undefined);
  assert.match(app.main.innerHTML, /class="atlas-search"/);
  app.document.querySelector('.menu').onclick();
  assert.equal(app.document.querySelector('.menu').attributes['aria-expanded'], 'true');
  for (const [hash, title] of [['#dashboard', 'Inzichten en actualiteit'], ['#ecosysteem', 'Het AI-onderwijsecosysteem'], ['#over', 'Over de atlas'], ['#beheer', 'Datakwaliteit en beheer']]) {
    app.navigate(hash); assert.match(app.main.innerHTML, new RegExp(title));
  }
  assert.ok(app.renders.every(html => !html.includes('0 bronrecords')));
});

test('empty and malformed data are rejected before any catalogue renders', () => {
  for (const records of [[], {}, [null], [{ id: 'broken', title: 'Broken', sourceUrls: 'invalid' }],
    [{ id: 'broken-subjects', title: 'Broken subjects', sourceUrls: [], subjects: 'Biologie' }]]) {
    assertFailure(boot({ replacements: { 'data/data-v2.js': `window.ATLAS_RECORDS=${JSON.stringify({ metadata: {}, records })};` } }));
  }
});

test('data and catalogue syntax errors and catalogue runtime errors show a retryable failure', () => {
  for (const [filename, code] of [['data/data-v2.js', 'window.ATLAS_RECORDS = {'], ['catalog.js', '(() => {'], ['catalog.js', 'throw new Error("startup failure")']]) {
    const app = boot({ replacements: { [filename]: code } });
    assert.equal(app.errors.length, 1); assertFailure(app);
  }
});

test('a silently missing catalogue cannot leave the page loading or fall back to legacy zeros', () => {
  assertFailure(boot({ omitted: ['catalog.js'] }));
});

test('retry preserves the requested page and search filters while refreshing the entry document', () => {
  const app = boot({ omitted: ['data/data-v2.js'], href: 'https://example.org/atlas/?view=public#zoeken?sector=HBO&q=privacy' });
  const retry = new URL(app.document.querySelector('[data-atlas-retry]').href);
  assert.equal(retry.hash, '#zoeken?sector=HBO&q=privacy');
  assert.equal(retry.searchParams.get('view'), 'public');
  assert.match(retry.searchParams.get('atlas-reload'), /^\d+$/);
});

test('a resource load error after startup keeps the Dutch failure visible during navigation', () => {
  const app = boot();
  app.dispatch('error', { target: { tagName: 'SCRIPT' } });
  assertFailure(app);
});

test('the mobile menu returns focus on Escape and closes when focus leaves the header', t => {
  const handlers = {};
  t.mock.method(Element.prototype, 'addEventListener', function (type, handler) {
    if (this.classList.contains('site-header')) handlers[type] = handler;
  });
  const { document, main, errors } = boot();
  assert.deepEqual(errors, []);
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.menu');
  const firstLink = header.querySelector('nav a');
  header.contains = target => target?.closest('.site-header') === header;
  let focused = firstLink;
  menu.focus = () => { focused = menu; };
  menu.onclick();
  handlers.focusout({ relatedTarget: firstLink });
  assert.equal(menu.getAttribute('aria-expanded'), 'true');
  let prevented = false;
  handlers.keydown({ key: 'Escape', preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.equal(focused, menu);
  assert.equal(menu.getAttribute('aria-expanded'), 'false');
  assert.equal(header.classList.contains('open'), false);

  menu.onclick();
  focused = main;
  handlers.focusout({ relatedTarget: main });
  assert.equal(focused, main);
  assert.equal(menu.getAttribute('aria-expanded'), 'false');
  assert.equal(header.classList.contains('open'), false);
});
