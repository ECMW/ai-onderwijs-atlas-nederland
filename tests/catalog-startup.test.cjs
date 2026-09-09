// Browser-like smoke tests: execute the actual scripts in index.html order.
// The small DOM below supplies only the selectors used by the tested routes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
  .filter(match => !match[1].includes('application/ld+json'))
  .map(match => ({ src: /\bsrc="([^"]+)"/.exec(match[1])?.[1], code: match[2] }));

class Element {
  constructor(tagName = 'div', attributes = {}, parent = null) {
    this.tagName = tagName.toUpperCase(); this.attributes = attributes;
    this.parent = parent; this.children = []; this.dataset = {};
    this.textContent = ''; this.value = attributes.value || ''; this.checked = 'checked' in attributes;
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
  setAttribute(name, value) { this.attributes[name] = String(value); }
  removeAttribute(name) { delete this.attributes[name]; }
  addEventListener() {}
  focus() {}
  getBoundingClientRect() { return { top: 0, bottom: 0 }; }
}

function boot({ replacements = {}, omitted = [], omitGuard = false, href = 'https://example.org/atlas/?view=public#home' } = {}) {
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
  const context = vm.createContext({ document, location, URL, URLSearchParams, Intl,
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

test('the real script order starts the catalogue and retains the mobile menu and informational routes', () => {
  const app = boot();
  assert.deepEqual(app.errors, []);
  assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
  assert.match(app.main.innerHTML, /class="atlas-search"/);
  assert.ok(app.renders.every(html => !html.includes('0 bronrecords')));
  const menu = app.document.querySelector('.menu');
  menu.onclick(); assert.equal(menu.attributes['aria-expanded'], 'true');
  assert.equal(app.document.querySelector('.site-header').classList.contains('open'), true);
  for (const [hash, title] of [['#dashboard', 'Inzichten en actualiteit'], ['#ecosysteem', 'Het AI-onderwijsecosysteem'], ['#over', 'Over de atlas']]) {
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
  for (const records of [[], {}, [null], [{ id: 'broken', title: 'Broken', sourceUrls: 'invalid' }]]) {
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
