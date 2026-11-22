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
    for (const [, kind, value] of selector.matchAll(/([.#])([\w-]+)/g)) {
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
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener() {}
  focus() {}
  getBoundingClientRect() { return { top: 0, bottom: 0 }; }
}

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

test('the actual homepage links to open subsidies and calls, with all statuses reachable', () => {
  const app = boot({href:'https://example.org/atlas/'});
  const home = app.main.innerHTML.match(/<a class="practice-link" href="([^"]+)"><strong>Subsidies en calls<\/strong>/);
  assert.ok(home);
  app.navigate(home[1].replaceAll('&amp;', '&'));
  assert.ok(app.document.querySelector('#funding-heading'));
  assert.ok(app.document.querySelector('[aria-label="Aanvraagstatus"]'));
  const all = app.main.innerHTML.match(/<a href="([^"]+)">Alle \(\d+\)<\/a>/);
  assert.ok(all);
  app.navigate(all[1].replaceAll('&amp;', '&'));
  assert.ok(app.document.querySelector('[data-record-id="nwo-calls-rond-ai-en-onderwijs"]'));
  assert.deepEqual(app.errors, []);
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

test('root and every return home open the entire catalogue newest first', () => {
  const app = boot({href:'https://example.org/atlas/'});
  const expected = app.context.ATLAS_RECORDS.records.slice().sort((a,b) => {
    const first = r => (r.changeHistory || []).filter(c => c.type === 'added' && /^\d{4}-\d{2}-\d{2}$/.test(c.date)).map(c => c.date).sort()[0] || '';
    const ad = first(a), bd = first(b);
    return bd.localeCompare(ad) || a.title.localeCompare(b.title, 'nl') || a.id.localeCompare(b.id);
  }).map(r => r.id);
  const check = () => {
    assert.match(app.main.innerHTML, /value="added" selected/);
    const actual = [...app.main.innerHTML.matchAll(/data-record-id="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(actual, Array.from(expected));
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
