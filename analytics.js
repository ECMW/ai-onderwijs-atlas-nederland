// Optional first-party integration with the owner's GoatCounter account.
(() => {
  'use strict';
  const site = document.querySelector('meta[name="atlas-goatcounter-site"]')?.content || '';
  const atlasPath = '/ai-onderwijs-atlas-nederland/';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$/.test(site)) return;
  const root = location.origin === 'https://aionderwijsatlas.nl' ? '/' :
    location.origin === 'https://ecmw.github.io' ? atlasPath : null;
  const directory = root && [root + 'lesmateriaal/', root + 'lesmateriaal/index.html'].includes(location.pathname);
  if (!root || (!directory && ![root, root + 'index.html'].includes(location.pathname))) return;

  const pilotStart = Date.parse('2026-11-22T00:00:00+01:00');
  const pilotEnd = Date.parse('2026-12-20T00:00:00+01:00');
  const withinPilot = () => Date.now() >= pilotStart && Date.now() < pilotEnd;
  const via = new URLSearchParams(location.search).getAll('via');
  const updateLink = location.origin === 'https://aionderwijsatlas.nl' && location.pathname === '/' &&
    !location.hash && via.length === 1 && via[0] === 'linkedin-update';
  // Fixed categories; the material ranking separately uses verified public catalogue entries.
  const events = {
    'entry-search': ['herkomst-zoekmachine', 'Herkomst · zoekmachine'],
    'entry-social': ['herkomst-sociaal', 'Herkomst · sociaal netwerk'],
    'entry-other': ['herkomst-overig', 'Herkomst · overige externe website'],
    'entry-unknown': ['herkomst-onbekend', 'Herkomst · onbekend'],
    'load-0-2s': ['laadtijd-tot-2s', 'Laadtijd · tot en met 2 seconden'],
    'load-2-5s': ['laadtijd-2-tot-5s', 'Laadtijd · meer dan 2 tot en met 5 seconden'],
    'load-over-5s': ['laadtijd-boven-5s', 'Laadtijd · meer dan 5 seconden'],
    'search-selection': ['route-zoekselectie', 'Route · zoekselectie uitgevoerd'],
    'search-hits': ['route-zoekselectie-met-resultaat', 'Route · zoekselectie met resultaten'],
    'guide-view': ['route-lesgids-bekeken', 'Route · lesgids bekeken'],
    'guide-source': ['route-lesgids-bron-gekozen', 'Route · bron uit de lesgids gekozen'],
    'detail-view': ['route-materiaaldetail-bekeken', 'Route · beschikbaar materiaaldetail bekeken'],
    'detail-source': ['route-materiaaldetail-bron-gekozen', 'Route · eigen bron van materiaaldetail gekozen'],
    'detail-back': ['route-materiaaldetail-terug-zonder-bron', 'Route · terug vanuit materiaaldetail zonder bronkeuze'],
    'lesson-open': ['gebruik-lesmateriaal-open', 'Gebruik · lesmateriaalbron geopend'],
    'funding-open': ['gebruik-subsidie-open', 'Gebruik · subsidie- of callbron geopend'],
    'paper-doi-open': ['gebruik-paper-open', 'Gebruik · DOI van een paper geopend'],
    'ris-download': ['gebruik-literatuurlijst', 'Gebruik · download literatuurlijst gestart'],
    'search-empty': ['gebruik-zoeken-zonder-resultaat', 'Gebruik · zoeken zonder resultaat']
  };
  const ready = () => directory ? Boolean(document.querySelector('main[data-atlas-lesson-directory]')) :
    window.ATLAS_STARTUP?.status === 'ready';
  const allowed = () => ready() && document.visibilityState === 'visible' && !document.prerendering &&
    window.self === window.top && typeof window.fetch === 'function' && !navigator.webdriver &&
    navigator.doNotTrack !== '1' && window.doNotTrack !== '1' && navigator.globalPrivacyControl !== true &&
    !new URLSearchParams(location.search).has('atlas-no-count');

  function send(fixedParams) {
    // URL, search/filter input, referrer and visitor identifiers never enter the payload.
    const endpoint = new URL(`https://${site}.goatcounter.com/count`);
    endpoint.search = new URLSearchParams({...fixedParams, r:'', rnd:String(Math.random())});
    try {
      window.fetch(endpoint.href, {method:'GET', mode:'no-cors', credentials:'omit',
        referrerPolicy:'no-referrer', cache:'no-store', keepalive:true}).catch(() => {});
    } catch (_) { /* Statistics must not interrupt an Atlas action. */ }
  }
  function entryChannel() {
    if (!document.referrer) return 'entry-unknown';
    try {
      const ref = new URL(document.referrer);
      if (!['http:', 'https:'].includes(ref.protocol)) return 'entry-unknown';
      if (['aionderwijsatlas.nl', 'www.aionderwijsatlas.nl', 'ecmw.github.io'].includes(ref.hostname)) return null;
      if (/(^|\.)(google\.(nl|be|de|fr|com|co\.uk)|bing\.com|duckduckgo\.com|search\.yahoo\.com|ecosia\.org|startpage\.com)$/.test(ref.hostname)) return 'entry-search';
      if (/(^|\.)(linkedin\.com|lnkd\.in|facebook\.com|instagram\.com|x\.com|t\.co|twitter\.com|bsky\.app|threads\.net|reddit\.com)$/.test(ref.hostname)) return 'entry-social';
      return 'entry-other';
    } catch { return 'entry-unknown'; }
  }
  function count() {
    if (!ready()) return;
    const notice = document.createElement('p');
    notice.textContent = 'Deze Atlas telt bezoeken met GoatCounter, zonder cookies. ' +
      (updateLink ? 'Bij de gedeelde LinkedIn-updatelink tellen we ook een opening en hoogstens één bronkeuze, bezoek aan de lesgids of gestarte bibliografiedownload binnen dit document. ' : '') +
      (withinPilot() ? 'Tot en met 19 december 2026 tellen we ook de globale herkomst en laadtijd, zoekacties met of zonder resultaat, gebruik van de lesgids, geopende leskaarten en bronnen, terugklikken en gestarte bibliografiedownloads. Bij een klik op een lesmateriaalbron tellen de openbare materiaalcode en titel mee. ' : '') +
      'Zoektermen, filterwaarden, bronadressen en verwijzende websites worden niet meegestuurd. GoatCounter verwerkt het IP-adres en browserkenmerken tijdelijk om herhaalde bezoeken te herkennen.';
    const link = document.createElement('a');
    link.href = 'https://www.goatcounter.com/help/privacy';
    link.textContent = ' Privacy bij GoatCounter';
    link.rel = 'noopener noreferrer';
    notice.append(link);
    document.querySelector('body > footer')?.append(notice);
    if (!allowed()) return;
    send({p:atlasPath, t:'AI & Onderwijs Atlas Nederland'});
    if (!withinPilot() && !updateLink) return;
    const navigation = window.performance?.getEntriesByType?.('navigation')?.[0];
    const freshNavigation = navigation?.type === 'navigate' && !navigation.activationStart;
    let campaign = updateLink && freshNavigation;
    if (campaign) {
      send({p:'linkedin-update-bezoek', t:'LinkedIn-update · link geopend', e:'1'});
      window.addEventListener('pagehide', () => { campaign = false; }, {once:true});
    }
    if (!withinPilot() && !campaign) return;

    const sent = new Set();
    function campaignStep() {
      if (!campaign || sent.has('linkedin-update-vervolgstap') || !allowed()) return;
      sent.add('linkedin-update-vervolgstap');
      send({p:'linkedin-update-vervolgstap', t:'LinkedIn-update · vervolgstap gekozen', e:'1'});
    }
    function sendOnce(path, title) {
      if (sent.has(path) || !withinPilot() || !allowed()) return;
      sent.add(path);
      send({p:path, t:title, e:'1'});
    }
    function once(label) {
      if (Object.hasOwn(events, label)) sendOnce(...events[label]);
    }
    if (freshNavigation && withinPilot()) {
      once(entryChannel());
      const ms = navigation.loadEventStart;
      if (Number.isFinite(ms) && ms > 0) once(ms <= 2000 ? 'load-0-2s' : ms <= 5000 ? 'load-2-5s' : 'load-over-5s');
    }
    function externalAddress(value) {
      try {
        const url = new URL(value);
        if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password &&
          !['aionderwijsatlas.nl', 'www.aionderwijsatlas.nl', 'ecmw.github.io'].includes(url.hostname)) return url.href;
      } catch { /* Unusable source. */ }
      return '';
    }
    // This page is generated from the verified projection, without loading the full catalogue.
    // Pin its existing links when it opens; later DOM text and click attributes are not a title source.
    const directoryLinks = new WeakMap();
    if (directory) {
      document.querySelectorAll('main[data-atlas-lesson-directory] article a[data-atlas-item-id]').forEach(link => {
        const {atlasItemId:id, atlasItemTitle:title} = link.dataset;
        const detail = link.closest('article').querySelector('.directory-card-link')?.getAttribute('href');
        const canonical = '../#item/' + id;
        const query = detail?.startsWith(canonical + '?') ? new URLSearchParams(detail.slice(canonical.length + 1)) : null;
        const directoryContext = query?.get('van') === 'lesgids' && [...query].every(([key, value]) =>
          ['van', 'sector', 'vak', 'doel', 'activiteit', 'minuten'].includes(key) &&
          query.getAll(key).length === 1 && value && value.length <= 160 && !/[\u0000-\u001f\u007f]/.test(value));
        if ((detail === canonical || directoryContext) && title === link.textContent.trim()) directoryLinks.set(link, {id,title,href:link.href});
      });
    }
    function selectedMaterial(link) {
      const href = externalAddress(link.href);
      if (!href) return;
      if (directory) {
        const entry = directoryLinks.get(link);
        return entry?.href === href ? entry : undefined;
      }
      const record = window.ATLAS_RECORDS?.records?.find(item => item.id === link.dataset.atlasItemId);
      if (record?.offerCategory === 'materials' && !Object.hasOwn(record, 'publicationExclusion') &&
          window.ATLAS_STARTUP?.published?.(record) &&
          record.sourceUrls.some(item => item.sourceType === 'official' && externalAddress(item.url) === href)) return record;
    }
    function sourceClick(event) {
      if (!event.isTrusted || event.defaultPrevented || (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return;
      const link = event.target.closest?.('a');
      const kind = link?.dataset.atlasUsage;
      if (['lesson-open', 'funding-open', 'paper-doi-open'].includes(kind)) {
        once(kind);
        if (campaign && externalAddress(link.href)) campaignStep();
      } else if (campaign && link?.href === 'https://aionderwijsatlas.nl/lesmateriaal/') campaignStep();
      if (kind === 'lesson-open' && withinPilot() && allowed()) {
        const item = selectedMaterial(link);
        if (item && typeof item.id === 'string' && /^[a-z0-9][a-z0-9-]{1,99}$/.test(item.id) && typeof item.title === 'string' &&
            item.title.trim().length >= 2 && item.title.length <= 160 && !/[\x00-\x1f\x7f-\x9f\u2028\u2029]|https?:\/\/|www\./i.test(item.title)) {
          sendOnce('materiaal-' + item.id, item.title);
        }
      }
    }
    window.addEventListener('click', sourceClick);
    window.addEventListener('auxclick', sourceClick);
    window.addEventListener('atlas-ris-downloaded', () => { once('ris-download'); campaignStep(); });
    if (!withinPilot()) return;
    let activeDetail = null, choseSource = false;
    function observeRoute() {
      if (!withinPilot() || !allowed()) return;
      if (directory) { once('guide-view'); return; }
      if (document.querySelector('[data-atlas-search-hits]')) {
        once('search-selection');
        once('search-hits');
      } else if (document.querySelector('[data-atlas-empty-search]')) once('search-selection');
      const detail = document.querySelector('[data-atlas-material-detail]');
      if (detail === activeDetail) return;
      activeDetail = null;
      choseSource = false;
      if (detail && [...detail.querySelectorAll('.detail-facts .source-actions a[data-atlas-item-id]')]
        .some(link => selectedMaterial(link)?.id === detail.dataset.atlasMaterialDetail)) {
        activeDetail = detail;
        once('detail-view');
      }
    }
    function routeClick(event) {
      if (!withinPilot() || !allowed() || !event.isTrusted || event.defaultPrevented ||
          (event.type === 'auxclick' ? event.button !== 1 : event.button !== 0)) return;
      const link = event.target.closest?.('a');
      if (!link) return;
      if (directory) {
        if (selectedMaterial(link)) once('guide-source');
      } else if (activeDetail?.contains(link)) {
        if (link.matches('.detail-nav .back-results')) {
          if (!choseSource && event.type === 'click' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) once('detail-back');
        } else if (!link.closest('.related-cards') && selectedMaterial(link)?.id === activeDetail.dataset.atlasMaterialDetail) {
          choseSource = true;
          once('detail-source');
        }
      }
    }
    window.addEventListener('atlas-search-results', observeRoute);
    window.addEventListener('atlas-empty-search', observeRoute);
    window.addEventListener('atlas-material-detail', observeRoute);
    window.addEventListener('click', routeClick);
    window.addEventListener('auxclick', routeClick);
    observeRoute();
    const emptySearch = () => {
      if (document.querySelector('[data-atlas-empty-search]')) once('search-empty');
    };
    window.addEventListener('atlas-empty-search', emptySearch);
    emptySearch();
  }
  if (document.readyState === 'complete') count();
  else window.addEventListener('load', count, {once:true});
})();
