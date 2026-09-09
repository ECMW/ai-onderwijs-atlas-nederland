const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const code = fs.readFileSync(path.join(__dirname, '../analytics.js'), 'utf8');

function run({ site = 'atlas-test', href = 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/',
  navigator = {}, status = 'ready', blocked = false, embedded = false, prerendering = false,
  counterOk = true, counterData = { count: '2' } } = {}) {
  const requests = [], notices = [], listeners = [];
  let widget = { hidden: true, textContent: '' };
  const context = vm.createContext({ URL, URLSearchParams, navigator, location: new URL(href),
    ATLAS_STARTUP: { status },
    document: {
      readyState: 'loading', prerendering,
      referrer: 'https://private.example/?secret=PRIVATE',
      createElement: () => ({ append() {} }),
      querySelectorAll: () => [widget],
      querySelector: selector => selector.startsWith('meta') ? { content: site } : { append: item => notices.push(item) }
    },
    addEventListener: (name, fn, options) => listeners.push({ name, fn, options }),
    fetch: (url, options) => {
      requests.push({ url, options });
      return blocked ? Promise.reject(new Error('network blocked')) :
        Promise.resolve({ ok: counterOk, json: () => Promise.resolve(counterData) });
    }
  });
  context.window = context; context.self = context; context.top = embedded ? {} : context;
  vm.runInContext(code, context);
  assert.equal(requests.length, 0, 'Wait for Atlas startup');
  for (const listener of listeners.filter(item => item.name === 'load')) {
    assert.equal(listener.options.once, true); listener.fn();
  }
  return { requests, notices, context, get widget() { return widget; },
    measurementRequests: () => requests.filter(item => new URL(item.url).pathname === '/count'),
    renderHomeAgain: () => {
      widget = { hidden: true, textContent: '' };
      listeners.filter(item => item.name === 'atlas:home-rendered').forEach(item => item.fn());
    }
  };
}

test('disabled or invalid configuration never sends data', () => {
  for (const site of ['', 'https://wrong.example', 'a/b', 'evil.com', 'A B']) {
    assert.equal(run({ site }).requests.length, 0);
  }
});

test('daily counter sends only a fixed Atlas path and no visitor search state or credentials', () => {
  const app = run({ href: 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/?q=PRIVATE&utm_source=PRIVATE#zoeken?q=PRIVATE&sector=PO' });
  assert.equal(app.measurementRequests().length, 1);
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

test('local copies, other sites, opt-outs, automated visits and failed startups are excluded', () => {
  for (const overrides of [
    { href: 'http://localhost:8000/' },
    { href: 'https://preview.example/ai-onderwijs-atlas-nederland/' },
    { href: 'https://ecmw.github.io/kies-ai/' },
    { href: 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/?atlas-no-count=1' },
    { navigator: { doNotTrack: '1' } }, { navigator: { globalPrivacyControl: true } },
    { navigator: { webdriver: true } }, { status: 'failed' },
    { embedded: true }, { prerendering: true }
  ]) assert.equal(run(overrides).measurementRequests().length, 0, JSON.stringify(overrides));
});

test('a blocked analytics service does not break Atlas startup or navigation', async () => {
  const app = run({ blocked: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
});

test('public counter shows the Atlas total with start date and survives home navigation without recounting', async () => {
  const app = run({ counterData: { count: '1\u202f234' } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.widget.textContent, '1.234 bezoeken sinds 9 september 2026');
  assert.equal(app.widget.hidden, false);
  const total = app.requests.find(item => new URL(item.url).pathname.startsWith('/counter/'));
  assert.equal(total.url, 'https://atlas-test.goatcounter.com/counter/%2Fai-onderwijs-atlas-nederland.json?start=2026-09-09');
  assert.equal(total.options.mode, 'cors');
  assert.equal(total.options.credentials, 'omit');
  assert.equal(total.options.referrerPolicy, 'no-referrer');
  const requests = app.requests.length;
  app.renderHomeAgain();
  assert.equal(app.widget.textContent, '1.234 bezoeken sinds 9 september 2026');
  assert.equal(app.requests.length, requests);
});

test('unavailable or malformed public counts stay hidden; a real zero and singular count are truthful', async () => {
  for (const options of [{ counterOk: false }, { blocked: true },
    ...[null, {}, { count: '-1' }, { count: '<img src=x>' }, { count: '1.5' },
      { count: '9007199254740992' }].map(counterData => ({ counterData }))]) {
    const app = run(options);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.widget.hidden, true, JSON.stringify(options));
    assert.equal(app.widget.textContent, '');
    assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
  }
  for (const [count, label] of [['0', '0 bezoeken'], ['1', '1 bezoek']]) {
    const app = run({ counterData: { count } });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(app.widget.textContent, `${label} sinds 9 september 2026`);
  }
});

test('visitors opting out can read the public total without registering a visit', async () => {
  const app = run({ navigator: { globalPrivacyControl: true } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.measurementRequests().length, 0);
  assert.equal(app.requests.length, 1);
  assert.equal(app.widget.hidden, false);
});
