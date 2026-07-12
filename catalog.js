(() => {
  'use strict';

  const source = window.ATLAS_RECORDS;
  const main = document.querySelector('main');
  if (!source || !main) return;

  const records = source.records || [];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const normalize = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const THEME_RULES = {
    'AI-geletterdheid': ['ai geletterdheid', 'ai literacy', 'digitale geletterdheid'],
    'Lesgeven en leren met AI': ['lesgeven', 'didactiek', 'leren met ai', 'onderwijspraktijk'],
    'Toetsing en examinering': ['toetsing', 'toetsen', 'examinering', 'toetsontwerp', 'itemgeneratie'],
    'Privacy en AVG': ['privacy', 'avg', 'persoonsgegevens', 'dpia', 'gegevensbescherming'],
    'AI Act en wetgeving': ['ai act', 'ai verordening', 'wetgeving', 'juridisch', 'compliance'],
    'Beleid en governance': ['beleid', 'governance', 'bestuurbaarheid', 'richtlijn', 'toezicht'],
    'Veilige AI-omgeving': ['veilige ai', 'ai werkplek', 'publieke infrastructuur', 'soeverein'],
    'Implementatie en adoptie': ['implementatie', 'adoptie', 'invoering', 'opschaling'],
    'Professionalisering': ['professionalisering', 'training', 'scholing', 'leergemeenschap'],
    'Curriculumontwikkeling': ['curriculum', 'leerplan'],
    'Onderzoek': ['onderzoek', 'onderwijslab', 'proeftuin'],
    'Data en infrastructuur': ['infrastructuur', 'data', 'rekenkracht', 'federatief', 'identity'],
    'Standaarden en interoperabiliteit': ['standaard', 'interoperabiliteit', 'referentiearchitectuur'],
    'Subsidies en financiering': ['subsidie', 'financiering', 'call', 'bekostiging'],
    'Praktijkvoorbeelden': ['praktijkvoorbeeld', 'pilot', 'casus'],
    'Publieke waarden en ethiek': ['publieke waarden', 'ethiek', 'autonomie', 'menselijke maat']
  };
  const SYNONYMS = [
    ['ai literacy', 'ai geletterdheid'], ['toetsen', 'toetsing', 'examinering'],
    ['privacy', 'avg', 'persoonsgegevens'], ['ai wet', 'ai act', 'ai verordening'],
    ['veilige ai', 'ai werkplek', 'veilige omgeving'], ['subsidie', 'financiering', 'call', 'regeling'],
    ['beleid', 'beleidskader', 'richtlijn', 'voorbeeldbeleid'], ['training', 'scholing', 'professionalisering'],
    ['tool', 'hulpmiddel', 'product', 'voorziening'], ['prompting', 'prompten', 'prompt']
  ];
  const STATUS_LABELS = {
    available: 'Direct beschikbaar', open_call: 'Open voor aanvragen', pilot: 'Pilot',
    in_development: 'In ontwikkeling', planned: 'Gepland', needs_verification: 'Te verifiëren',
    archived: 'Niet meer actueel'
  };
  const TYPE_LABELS = {
    Organisatie: 'Organisatie', Product: 'Hulpmiddel', Handreiking: 'Handreiking',
    Voorziening: 'Voorziening', Training: 'Training', Praktijkvoorbeeld: 'Praktijkvoorbeeld',
    Pilot: 'Pilot', Subsidie: 'Subsidie', Call: 'Subsidie of call', Programma: 'Programma',
    Wetgeving: 'Wetgeving', Standaard: 'Standaard', Behoefte: 'Geïdentificeerde behoefte',
    'Witte vlek': 'Geïdentificeerde behoefte'
  };
  const PRIMARY_AUDIENCES = ['Docenten', 'Bestuurders', 'IT-professionals', 'Onderzoekers'];
  const SECTORS = ['PO', 'VO', 'MBO', 'HBO', 'WO', 'Onderzoek', 'Overheid'];
  const PERSONA_KEY = 'atlas.persona';

  let state = {};
  let resultRecords = [];
  let debounceTimer;

  function savedPersona() {
    try {
      const value = localStorage.getItem(PERSONA_KEY);
      return PRIMARY_AUDIENCES.includes(value) ? value : '';
    } catch { return ''; }
  }
  function savePersona(value) {
    try { value ? localStorage.setItem(PERSONA_KEY, value) : localStorage.removeItem(PERSONA_KEY); } catch { /* lokale opslag kan geblokkeerd zijn */ }
  }
  const personaLabel = value => ({ Docenten: 'Docent', Bestuurders: 'Bestuurder', 'IT-professionals': 'IT-professional', Onderzoekers: 'Onderzoeker' }[value] || value);

  const recordText = record => normalize([
    record.title, record.description, record.purpose, record.providerName,
    ...(record.audiences || []), ...(record.sectors || []), ...(record.keywords || [])
  ].join(' '));
  const recordThemes = record => {
    const explicit = record.themes || [];
    if (explicit.length) return explicit;
    const text = recordText(record);
    return Object.entries(THEME_RULES)
      .filter(([, terms]) => terms.some(term => text.includes(normalize(term))))
      .map(([theme]) => theme);
  };
  const typeLabel = record => TYPE_LABELS[record.legacyType] || record.legacyType || record.recordType;
  const statusLabel = record => {
    if (['Behoefte', 'Witte vlek'].includes(record.legacyType)) return 'Geïdentificeerde behoefte';
    return STATUS_LABELS[record.status] || 'Te verifiëren';
  };
  const values = key => (state[key] || '').split(',').filter(Boolean);
  const queryTerms = query => {
    const normalized = normalize(query);
    const terms = normalized ? [normalized] : [];
    SYNONYMS.forEach(group => {
      if (group.some(term => normalized.includes(normalize(term)))) terms.push(...group.map(normalize));
    });
    return [...new Set(terms)];
  };
  const facetValues = (record, key) => ({
    theme: recordThemes(record), sector: record.sectors || [], status: [statusLabel(record)],
    type: [typeLabel(record)], audience: record.audiences || [], organization: [record.providerName],
    freshness: [record.verificationStatus === 'recently_checked' ? 'Recent gecontroleerd' : 'Controle nodig']
  }[key] || []);

  function parseState() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    state = { q: params.get('q') || '', sort: params.get('sort') || 'relevant' };
    ['theme', 'sector', 'status', 'type', 'audience', 'organization', 'freshness']
      .forEach(key => state[key] = params.get(key) || '');
    if (params.get('cat')) state.type = params.get('cat').split(',').map(value => TYPE_LABELS[value] || value).join(',');
  }
  function setUrl() {
    const params = new URLSearchParams();
    Object.entries(state).forEach(([key, value]) => {
      if (value && !(key === 'sort' && value === 'relevant')) params.set(key, value);
    });
    history.pushState(null, '', `#zoeken${params.size ? `?${params}` : ''}`);
    renderSearch();
  }
  function queryMatches(record, query) {
    const terms = queryTerms(query);
    if (terms.length && !terms.some(term => recordText(record).includes(term))) return false;
    return true;
  }
  function matches(record, omittedFacet = '') {
    if (!queryMatches(record, state.q)) return false;
    return ['theme', 'sector', 'status', 'type', 'audience', 'organization', 'freshness'].every(key =>
      key === omittedFacet || !values(key).length || values(key).some(value => facetValues(record, key).includes(value))
    );
  }
  function relevance(record) {
    if (!state.q) return statusLabel(record) === 'Direct beschikbaar' ? 2 : 0;
    const query = normalize(state.q);
    const title = normalize(record.title);
    let score = title === query ? 100 : title.includes(query) ? 60 : 0;
    queryTerms(state.q).forEach(term => {
      if (normalize(recordThemes(record).join(' ')).includes(term)) score += 25;
      if (normalize((record.keywords || []).join(' ')).includes(term)) score += 20;
      if (normalize(record.description).includes(term)) score += 8;
    });
    return score + (statusLabel(record) === 'Direct beschikbaar' ? 3 : 0);
  }
  function sortRecords(list) {
    if (state.sort === 'az') return list.sort((a, b) => a.title.localeCompare(b.title, 'nl'));
    if (state.sort === 'available') return list.sort((a, b) =>
      (statusLabel(a) === 'Direct beschikbaar' ? -1 : 1) - (statusLabel(b) === 'Direct beschikbaar' ? -1 : 1));
    if (state.sort === 'checked') return list.sort((a, b) => String(b.lastVerified || '').localeCompare(a.lastVerified || ''));
    return list.sort((a, b) => relevance(b) - relevance(a));
  }
  function facetCount(key, option) {
    return records.filter(record => matches(record, key) && facetValues(record, key).includes(option)).length;
  }
  function hasIntent() {
    return Boolean(state.q || ['theme', 'sector', 'status', 'type', 'audience', 'organization', 'freshness']
      .some(key => values(key).length));
  }

  function searchForm(id) {
    return `<form class="atlas-search" role="search" autocomplete="off">
      <label for="${id}">Waar bent u vandaag naar op zoek?</label>
      <div class="search-row"><input id="${id}" value="${escapeHtml(state.q)}" placeholder="Bijvoorbeeld toetsing, AI Act, subsidie of veilige AI…" aria-controls="search-suggestions" aria-expanded="false"><button class="btn">Zoeken</button></div>
      <div class="suggestions" id="search-suggestions" hidden></div>
    </form>`;
  }
  function popularLinks(className = '', persona = '') {
    const candidates = ['Toetsing', 'AI Act', 'Privacy', 'Prompting', 'Subsidies', 'Veilige AI', 'Curriculum', 'AI-geletterdheid'];
    const available = candidates.filter(query => records.some(record => queryTerms(query).some(term => recordText(record).includes(term))));
    return `<div class="popular ${className}">${available.map(query => `<a href="#zoeken?q=${encodeURIComponent(query)}${persona ? `&audience=${encodeURIComponent(persona)}` : ''}">${escapeHtml(query)}</a>`).join('')}</div>`;
  }
  function directUsable() {
    return records.filter(record => statusLabel(record) === 'Direct beschikbaar' && (record.sourceUrls || []).length)
      .sort((a, b) => a.title.localeCompare(b.title, 'nl')).slice(0, 4);
  }
  function simpleCard(record, explain = false) {
    const sectors = (record.sectors || []).slice(0, 3);
    const reasons = relevanceReasons(record);
    return `<article class="result-card">
      <div class="card-body"><span class="type-label">${escapeHtml(typeLabel(record))}</span>
        <h2><a href="#item/${escapeHtml(record.id)}">${escapeHtml(record.title)}</a></h2>
        ${record.providerName ? `<p class="provider">${escapeHtml(record.providerName)}</p>` : ''}
        <p class="description">${escapeHtml(record.description || '')}</p>
        ${sectors.length ? `<div class="sector-chips">${sectors.map(sector => `<span>${escapeHtml(sector)}</span>`).join('')}</div>` : ''}
        ${explain && reasons.length ? `<p class="relevance"><strong>Relevant omdat:</strong> ${reasons.map(reason => `<span>✓ ${escapeHtml(reason)}</span>`).join(' ')}</p>` : ''}
      </div><a class="card-cta" href="#item/${escapeHtml(record.id)}">Bekijk →</a>
    </article>`;
  }
  function relevanceReasons(record) {
    const reasons = [];
    values('sector').forEach(value => facetValues(record, 'sector').includes(value) && reasons.push(`past bij ${value}`));
    values('theme').forEach(value => facetValues(record, 'theme').includes(value) && reasons.push(`gaat over ${value.toLowerCase()}`));
    values('status').forEach(value => facetValues(record, 'status').includes(value) && reasons.push(value.toLowerCase()));
    if (state.q) {
      const matchingTheme = recordThemes(record).find(theme => queryTerms(state.q).some(term => normalize(theme).includes(term) || recordText(record).includes(term)));
      if (matchingTheme) reasons.push(`gaat over ${matchingTheme.toLowerCase()}`);
      else if (normalize(record.title).includes(normalize(state.q))) reasons.push('de titel overeenkomt met uw zoekterm');
    }
    return [...new Set(reasons)].slice(0, 3);
  }

  function renderHome() {
    const persona = savedPersona();
    state = { q: '', sort: 'relevant', audience: persona };
    const roles = PRIMARY_AUDIENCES.filter(role => records.some(record => (record.audiences || []).includes(role)));
    main.innerHTML = `<section class="home-simple">
      <section class="home-search"><h1>Waar bent u vandaag naar op zoek?</h1>${searchForm('home-search')}</section>
      <section><h2>Veel gezocht</h2>${popularLinks('', persona)}</section>
      <section class="persona-block">${persona ? `<div class="persona-indicator"><span>U bekijkt aanbod voor: <strong>${escapeHtml(personaLabel(persona))}</strong></span><button class="persona-change" type="button">Wijzigen</button><button class="persona-clear" type="button">Wissen</button></div><div class="persona-choices" hidden><h2>Kies een andere rol</h2><div class="role-grid">${roles.map(role => `<a data-persona="${escapeHtml(role)}" href="#zoeken?audience=${encodeURIComponent(role)}">${escapeHtml(personaLabel(role))}<span>Bekijk passend aanbod →</span></a>`).join('')}</div></div>` : `<h2>Ik ben…</h2><div class="role-grid">${roles.map(role => `<a data-persona="${escapeHtml(role)}" href="#zoeken?audience=${encodeURIComponent(role)}">${escapeHtml(personaLabel(role))}<span>Bekijk passend aanbod →</span></a>`).join('')}</div>`}</section>
      <section><div class="section-title"><h2>Direct bruikbaar</h2><a href="#zoeken?status=${encodeURIComponent('Direct beschikbaar')}">Bekijk alles →</a></div><div class="direct-grid">${directUsable().map(record => simpleCard(record)).join('')}</div></section>
      <section class="missing"><h2>Nog niets gevonden? Laat het weten</h2><p>Vertel welk aanbod ontbreekt en voeg bij voorkeur een officiële bron toe.</p><a class="btn secondary" href="#bijdragen">Ontbrekend aanbod melden</a></section>
    </section>`;
    bindSearchForm(); bindPersona();
  }
  function renderStart() {
    const roles = PRIMARY_AUDIENCES.filter(role => records.some(record => (record.audiences || []).includes(role)));
    main.innerHTML = `<section class="catalog start">${searchForm('catalog-search')}<div class="start-content">
      <h1>Kies een eenvoudige ingang</h1><p>Typ wat u zoekt, kies een onderwerp of start vanuit uw rol. Daarna ziet u alleen passend aanbod.</p>
      <h2>Veel gezocht</h2>${popularLinks()}
      <h2>Ik ben…</h2><div class="role-grid">${roles.map(role => `<a href="#zoeken?audience=${encodeURIComponent(role)}">${escapeHtml(role.replace(/en$/, ''))}<span>Bekijk passend aanbod →</span></a>`).join('')}</div>
    </div></section>`;
    bindSearchForm();
  }
  function facet(key, title, options, open = false) {
    const present = options.filter(option => records.some(record => facetValues(record, key).includes(option)));
    return `<details class="facet" ${open ? 'open' : ''}><summary>${title}${values(key).length ? `<b>${values(key).length}</b>` : ''}</summary><div>
      ${present.map(option => { const count = facetCount(key, option); const checked = values(key).includes(option); return `<label><input type="checkbox" data-facet="${key}" value="${escapeHtml(option)}" ${checked ? 'checked' : ''} ${!count && !checked ? 'disabled' : ''}><span>${escapeHtml(option)}</span><small>${count}</small></label>`; }).join('')}
    </div></details>`;
  }
  function relatedThemes(activeTheme) {
    const matching = records.filter(record => recordThemes(record).includes(activeTheme));
    const counts = new Map();
    matching.forEach(record => recordThemes(record).filter(theme => theme !== activeTheme)
      .forEach(theme => counts.set(theme, (counts.get(theme) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }
  function groupedResults() {
    const groups = new Map();
    resultRecords.forEach(record => {
      const label = typeLabel(record);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(record);
    });
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length).map(([label, items]) =>
      `<details class="result-group" open><summary><span>${escapeHtml(label)} <b>${items.length}</b></span><span class="group-toggle" aria-hidden="true"></span></summary><div class="result-list">${items.slice(0, 3).map(record => simpleCard(record, true)).join('')}</div>${items.length > 3 ? `<a class="group-all" href="#zoeken?theme=${encodeURIComponent(values('theme')[0])}&type=${encodeURIComponent(label)}">Toon alle ${items.length} →</a>` : ''}</details>`
    ).join('');
  }
  function levenshtein(left, right) {
    const a = normalize(left), b = normalize(right);
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let previous = row[0]; row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const current = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = current;
      }
    }
    return row[b.length];
  }
  function alternativeSuggestion() {
    if (!state.q || resultRecords.length) return null;
    const rawCandidates = [
      ...Object.keys(THEME_RULES), ...SYNONYMS.flat(),
      ...records.map(record => record.providerName).filter(Boolean)
    ];
    const candidates = [...new Set(rawCandidates)].filter(candidate => normalize(candidate) !== normalize(state.q));
    const currentQuery = state.q;
    const ranked = candidates.map(candidate => {
      state.q = candidate;
      const count = records.filter(record => matches(record)).length;
      state.q = currentQuery;
      const left = normalize(currentQuery), right = normalize(candidate);
      const distance = levenshtein(left, right);
      const overlap = left.includes(right) || right.includes(left);
      const quality = overlap ? 0 : distance / Math.max(left.length, right.length, 1);
      return { candidate, count, quality };
    }).filter(item => item.count > 0 && item.quality <= 0.42)
      .sort((a, b) => a.quality - b.quality || b.count - a.count);
    return ranked[0] || null;
  }
  function renderSearch() {
    if (!hasIntent()) return renderStart();
    resultRecords = sortRecords(records.filter(record => matches(record)));
    const hiddenCount = ['type', 'audience', 'organization', 'freshness'].reduce((sum, key) => sum + values(key).length, 0);
    const chips = ['theme', 'sector', 'status', 'type', 'audience', 'organization', 'freshness']
      .flatMap(key => values(key).map(value => `<button class="chip" data-remove="${key}|${escapeHtml(value)}">${escapeHtml(value)} ×</button>`)).join('');
    const oneThemeOnly = values('theme').length === 1 && !state.q && ['sector', 'status', 'type', 'audience', 'organization', 'freshness'].every(key => !values(key).length);
    const related = values('theme').length ? relatedThemes(values('theme')[0]) : [];
    const alternative = alternativeSuggestion();
    const typeOptions = [...new Set(records.map(typeLabel))].sort((a, b) => a.localeCompare(b, 'nl'));
    const organizationOptions = [...new Set(records.map(record => record.providerName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
    const audienceOptions = [...new Set(records.flatMap(record => record.audiences || []))].sort((a, b) => a.localeCompare(b, 'nl'));
    main.innerHTML = `<section class="catalog">${searchForm('catalog-search')}<div class="catalog-grid">
      <aside class="filters" id="filters"><header><h2>Verfijn</h2><button class="close" aria-label="Sluit filters">×</button></header>
        ${facet('theme', 'Thema', Object.keys(THEME_RULES), true)}${facet('sector', 'Sector', SECTORS, true)}${facet('status', 'Beschikbaarheid', Object.values(STATUS_LABELS), true)}
        <details class="more-filters"><summary>Meer filters${hiddenCount ? ` (${hiddenCount})` : ''} <span>▼</span></summary>
          ${facet('type', 'Soort aanbod', typeOptions)}${facet('audience', 'Voor wie', audienceOptions)}${facet('organization', 'Organisatie', organizationOptions)}${facet('freshness', 'Actualiteit', ['Recent gecontroleerd', 'Controle nodig'])}
        </details><button class="clear btn secondary">Wis alle filters</button><footer><button class="apply btn">Toon ${resultRecords.length} resultaten</button></footer>
      </aside><section class="results"><header class="result-head"><h1>${oneThemeOnly ? escapeHtml(values('theme')[0]) : `${resultRecords.length} resultaten${state.q ? ` voor ‘${escapeHtml(state.q)}’` : ''}`}</h1><div><button class="mobile-filter btn secondary">Filters (${['theme', 'sector', 'status', 'type', 'audience', 'organization', 'freshness'].reduce((sum, key) => sum + values(key).length, 0)})</button><label>Sorteren<select id="sort"><option value="relevant">Meest relevant</option><option value="available">Direct beschikbaar eerst</option><option value="checked">Recent gecontroleerd</option><option value="az">Titel A–Z</option></select></label></div></header>
        ${chips ? `<div class="chips">${chips}<button class="clear-link">Wis alles</button></div>` : ''}
        ${related.length ? `<nav class="related" aria-label="Verwante thema's"><strong>Verwante thema's</strong>${related.map(([theme, count]) => `<a href="#zoeken?theme=${encodeURIComponent(theme)}">${escapeHtml(theme)} <span>${count}</span></a>`).join('')}</nav>` : ''}
        <div aria-live="polite">${resultRecords.length ? (oneThemeOnly ? groupedResults() : `<div class="result-list">${resultRecords.map(record => simpleCard(record, true)).join('')}</div>`) : `<div class="empty"><h2>Geen resultaten gevonden</h2>${alternative ? `<a class="alternative" href="#zoeken?q=${encodeURIComponent(alternative.candidate)}">Bedoelde u <strong>${escapeHtml(alternative.candidate)}</strong>? <span>${alternative.count} ${alternative.count === 1 ? 'resultaat' : 'resultaten'}</span></a>` : '<p>Voor deze zoekterm is geen aantoonbaar werkend alternatief gevonden.</p>'}<button class="clear btn">Wis filters</button><p><a href="#bijdragen">Mis u iets in de atlas? Laat het weten.</a></p></div>`}</div>
      </section></div></section>`;
    document.querySelector('#sort').value = state.sort;
    bindSearchPage();
  }

  function suggestionData(query) {
    const terms = queryTerms(query);
    if (!normalize(query) || normalize(query).length < 2) return { groups: [], organizations: [] };
    const matching = records.filter(record => terms.some(term => recordText(record).includes(term)));
    const grouped = new Map();
    matching.forEach(record => grouped.set(typeLabel(record), (grouped.get(typeLabel(record)) || 0) + 1));
    const groups = [...grouped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const organizations = [...new Set(matching.map(record => record.providerName).filter(Boolean))].slice(0, 4);
    return { groups, organizations };
  }
  function bindSearchForm() {
    const form = document.querySelector('.atlas-search');
    const input = form.querySelector('input');
    const suggestions = form.querySelector('.suggestions');
    form.onsubmit = event => { event.preventDefault(); state.q = input.value.trim(); setUrl(); };
    input.oninput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const data = suggestionData(input.value);
        const titleMatch = Object.keys(THEME_RULES).find(theme => normalize(theme).includes(normalize(input.value)));
        suggestions.hidden = !data.groups.length && !data.organizations.length;
        input.setAttribute('aria-expanded', String(!suggestions.hidden));
        suggestions.innerHTML = `${titleMatch ? `<a href="#zoeken?theme=${encodeURIComponent(titleMatch)}" class="suggestion-topic"><small>Onderwerp</small><strong>${escapeHtml(titleMatch)}</strong></a>` : ''}
          ${data.groups.length ? `<section><h2>Soort aanbod</h2>${data.groups.map(([label, count]) => `<a href="#zoeken?q=${encodeURIComponent(input.value)}&type=${encodeURIComponent(label)}"><span>${escapeHtml(label)}</span><strong>${count}</strong></a>`).join('')}</section>` : ''}
          ${data.organizations.length ? `<section><h2>Organisaties</h2>${data.organizations.map(name => `<a href="#zoeken?organization=${encodeURIComponent(name)}">${escapeHtml(name)}</a>`).join('')}</section>` : ''}`;
      }, 150);
    };
    input.onkeydown = event => { if (event.key === 'Escape') { suggestions.hidden = true; input.setAttribute('aria-expanded', 'false'); } };
  }
  function bindPersona() {
    document.querySelectorAll('[data-persona]').forEach(link => link.addEventListener('click', () => savePersona(link.dataset.persona)));
    const change = document.querySelector('.persona-change');
    if (change) change.onclick = () => { const choices = document.querySelector('.persona-choices'); choices.hidden = false; change.setAttribute('aria-expanded', 'true'); choices.querySelector('a').focus(); };
    const clear = document.querySelector('.persona-clear');
    if (clear) clear.onclick = () => { savePersona(''); renderHome(); };
  }
  function bindSearchPage() {
    bindSearchForm();
    document.querySelectorAll('[data-facet]').forEach(input => input.onchange = () => {
      const selected = values(input.dataset.facet);
      input.checked ? selected.push(input.value) : selected.splice(selected.indexOf(input.value), 1);
      state[input.dataset.facet] = [...new Set(selected)].join(','); setUrl();
    });
    document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
      const [key, value] = button.dataset.remove.split('|'); state[key] = values(key).filter(item => item !== value).join(','); setUrl();
    });
    document.querySelectorAll('.clear,.clear-link').forEach(button => button.onclick = () => { state = { q: '', sort: 'relevant' }; setUrl(); });
    document.querySelector('#sort').onchange = event => { state.sort = event.target.value; setUrl(); };
    const panel = document.querySelector('#filters'); const opener = document.querySelector('.mobile-filter'); const closer = document.querySelector('.close');
    const closePanel = () => { panel.classList.remove('open'); document.body.classList.remove('locked'); opener.focus(); };
    opener.onclick = () => { panel.classList.add('open'); document.body.classList.add('locked'); closer.focus(); };
    closer.onclick = document.querySelector('.apply').onclick = closePanel;
    document.onkeydown = event => { if (event.key === 'Escape' && panel.classList.contains('open')) closePanel(); };
  }
  function route() {
    const path = (location.hash.slice(1) || 'home').split('?')[0];
    if (path === 'home') renderHome();
    if (path === 'zoeken' || path === 'organisaties') { parseState(); if (path === 'organisaties') state.type = 'Organisatie'; renderSearch(); }
    const updated = document.querySelector('[data-updated]'); if (updated) updated.textContent = source.metadata.updated || '';
  }
  addEventListener('hashchange', route); addEventListener('popstate', route); route();
})();
