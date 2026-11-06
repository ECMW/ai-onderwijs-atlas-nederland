// Optional daily visit totals. Activate only with the owner's GoatCounter site code.
(() => {
  'use strict';
  const site = document.querySelector('meta[name="atlas-goatcounter-site"]')?.content || '';
  const atlasPath = '/ai-onderwijs-atlas-nederland/';
  if (!/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$/.test(site)) return;
  if (location.origin !== 'https://ecmw.github.io' ||
      ![atlasPath, `${atlasPath}index.html`].includes(location.pathname)) return;

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
