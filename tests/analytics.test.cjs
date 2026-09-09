const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const code = fs.readFileSync(path.join(__dirname, '../analytics.js'), 'utf8');

function run({ site = 'atlas-test', href = 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/',
  navigator = {}, status = 'ready', blocked = false, embedded = false, prerendering = false } = {}) {
  const requests = [], notices = [], listeners = [];
  const context = vm.createContext({ URL, URLSearchParams, navigator, location: new URL(href),
    ATLAS_STARTUP: { status },
    document: {
      readyState: 'loading', prerendering,
      referrer: 'https://private.example/?secret=PRIVATE',
      createElement: () => ({ append() {} }),
      querySelector: selector => selector.startsWith('meta') ? { content: site } : { append: item => notices.push(item) }
    },
    addEventListener: (name, fn, options) => listeners.push({ name, fn, options }),
    fetch: (url, options) => {
      requests.push({ url, options });
      return blocked ? Promise.reject(new Error('network blocked')) : Promise.resolve({});
    }
  });
  context.window = context; context.self = context; context.top = embedded ? {} : context;
  vm.runInContext(code, context);
  assert.equal(requests.length, 0, 'Wait for Atlas startup');
  for (const listener of listeners) {
    assert.equal(listener.name, 'load'); assert.equal(listener.options.once, true); listener.fn();
  }
  return { requests, notices, context };
}

test('disabled or invalid configuration never sends data', () => {
  for (const site of ['', 'https://wrong.example', 'a/b', 'evil.com', 'A B']) {
    assert.equal(run({ site }).requests.length, 0);
  }
});

test('daily counter sends only a fixed Atlas path and no visitor search state or credentials', () => {
  const app = run({ href: 'https://ecmw.github.io/ai-onderwijs-atlas-nederland/?q=PRIVATE&utm_source=PRIVATE#zoeken?q=PRIVATE&sector=PO' });
  assert.equal(app.requests.length, 1);
  const { url, options } = app.requests[0];
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
  ]) assert.equal(run(overrides).requests.length, 0, JSON.stringify(overrides));
});

test('a blocked analytics service does not break Atlas startup or navigation', async () => {
  const app = run({ blocked: true });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.context.ATLAS_STARTUP.status, 'ready');
});
