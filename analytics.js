// Optional daily visit totals. Activate only with the owner's GoatCounter site code.
(() => {
  'use strict';
  const site = document.querySelector('meta[name="atlas-goatcounter-site"]')?.content || '';
  const atlasPath = '/ai-onderwijs-atlas-nederland/';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$/.test(site)) return;
  if (location.origin !== 'https://ecmw.github.io' ||
      ![atlasPath, `${atlasPath}index.html`].includes(location.pathname)) return;

  let publicVisits = null;
  const renderPublicVisits = () => {
    if (publicVisits === null) return;
    document.querySelectorAll('[data-atlas-visit-count]').forEach(element => {
      element.textContent = `${new Intl.NumberFormat('nl-NL').format(publicVisits)} ${publicVisits === 1 ? 'bezoek' : 'bezoeken'} sinds 9 september 2026`;
      element.title = 'Gemeten bezoeken, geen unieke personen. Wordt enkele keren per dag bijgewerkt.';
      element.hidden = false;
    });
  };
  const loadPublicVisits = () => {
    // GoatCounter normalizes the stored path by removing the trailing slash.
    // Read only this Atlas total, never totals belonging to other account paths.
    const path = encodeURIComponent(atlasPath.replace(/\/$/, ''));
    window.fetch(`https://${site}.goatcounter.com/counter/${path}.json?start=2026-09-09`, {
      mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer'
    }).then(response => {
      if (!response.ok) throw new Error('Public visit count unavailable');
      return response.json();
    }).then(data => {
      // The public API returns a formatted integer, not a raw number.
      const formatted = String(data.count ?? '').trim();
      if (!/^(?:\d+|\d{1,3}(?:[ ,.'\u00a0\u2009\u202f]\d{3})+)$/.test(formatted)) return;
      const value = Number(formatted.replace(/\D/g, ''));
      if (!Number.isSafeInteger(value) || value < 0) return;
      publicVisits = value;
      renderPublicVisits();
    }).catch(() => { /* Leave the counter hidden instead of inventing a total. */ });
  };
  window.addEventListener('hashchange', renderPublicVisits);
  window.addEventListener('atlas:home-rendered', renderPublicVisits);

  const count = () => {
    // Analytics must never interfere with the Atlas, even if requests are blocked.
    try {
      if (window.ATLAS_STARTUP?.status !== 'ready') return;
      const notice = document.createElement('p');
      notice.textContent = 'Deze Atlas telt bezoeken met GoatCounter, zonder cookies. Zoektermen, filters en verwijzende websites worden niet meegestuurd. GoatCounter verwerkt het IP-adres en browserkenmerken tijdelijk om herhaalde bezoeken te herkennen.';
      const link = document.createElement('a');
      link.href = 'https://www.goatcounter.com/help/privacy';
      link.textContent = ' Privacy bij GoatCounter';
      link.rel = 'noopener noreferrer';
      notice.append(link);
      document.querySelector('body > footer')?.append(notice);

      // Reading an existing public total does not register a visit. This remains
      // available when the visitor opts out of measurement below.
      loadPublicVisits();

      if (navigator.doNotTrack === '1' || window.doNotTrack === '1' ||
          navigator.globalPrivacyControl === true || navigator.webdriver ||
          document.prerendering || window.self !== window.top ||
          new URLSearchParams(location.search).has('atlas-no-count')) return;

      // A fixed path groups the whole Atlas. Never copy location.search/hash,
      // document.referrer, search input, record IDs or personal preferences.
      const endpoint = new URL(`https://${site}.goatcounter.com/count`);
      endpoint.search = new URLSearchParams({
        p: atlasPath, t: 'AI & Onderwijs Atlas Nederland', r: '', rnd: String(Math.random())
      }).toString();
      // Browser GET to the documented pixel endpoint; no external script,
      // cookies, browser storage, response body or credentials are needed.
      window.fetch(endpoint.href, {
        method: 'GET', mode: 'no-cors', credentials: 'omit',
        referrerPolicy: 'no-referrer', cache: 'no-store', keepalive: true
      }).catch(() => {});
    } catch (_) { /* An unavailable counter leaves the Atlas usable. */ }
  };
  if (document.readyState === 'complete') count();
  else window.addEventListener('load', count, { once: true });
})();
