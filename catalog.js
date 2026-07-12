(() => {
  'use strict';

  const source = window.ATLAS_RECORDS;
  const main = document.querySelector('main');
  if (!source || !main) return;

  const allRecords = source.records || [];
  const records = allRecords.filter(record => !['Behoefte', 'Witte vlek'].includes(record.legacyType));
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
    'Beleid en governance': ['beleid', 'voorbeeldbeleid', 'beleidskader', 'governance', 'bestuurbaarheid', 'richtlijn', 'toezicht'],
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
  const FILTER_KEYS = ['theme', 'audience', 'sector', 'status', 'type', 'organization', 'access', 'source', 'freshness'];
  const ROLE_ALIASES = {
    docent: 'Docenten', leraar: 'Docenten', leerkracht: 'Docenten',
    bestuurder: 'Bestuurders', schoolleider: 'Bestuurders', manager: 'Bestuurders',
    onderzoeker: 'Onderzoekers', wetenschapper: 'Onderzoekers', lector: 'Onderzoekers',
    'it professional': 'IT-professionals', ict: 'IT-professionals', it: 'IT-professionals'
  };
  const TYPE_QUERY_RULES = {
    Handreiking: ['handreiking', 'handleiding'], Training: ['training', 'cursus', 'workshop'],
    Praktijkvoorbeeld: ['praktijkvoorbeeld', 'voorbeeld uit de praktijk'],
    Hulpmiddel: ['hulpmiddel', 'tool'], 'Subsidie of call': ['subsidie', 'call']
  };
  const QUERY_STOPWORDS = new Set(['ik', 'ben', 'wij', 'zijn', 'zoek', 'zoeken', 'iets', 'over', 'voor', 'de', 'het', 'een', 'en', 'of', 'naar', 'graag', 'wil', 'willen', 'nodig', 'informatie']);
  const PRACTICAL_PRIORITY = {
    Handreiking: 70, Voorziening: 65, Training: 60, Praktijkvoorbeeld: 55,
    Hulpmiddel: 50, 'Subsidie of call': 45, Subsidie: 45, Pilot: 40,
    Wetgeving: 35, Standaard: 30, Programma: 25, Organisatie: 5,
    'Geïdentificeerde behoefte': 0
  };

  let state = {};
  let resultRecords = [];
  let debounceTimer;

  function savedPersonas() {
    try {
      const value = localStorage.getItem(PERSONA_KEY);
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(item => PRIMARY_AUDIENCES.includes(item)) : [];
      } catch { return PRIMARY_AUDIENCES.includes(value) ? [value] : []; }
    } catch { return []; }
  }
  function savePersonas(selected) {
    try { selected.length ? localStorage.setItem(PERSONA_KEY, JSON.stringify(selected)) : localStorage.removeItem(PERSONA_KEY); } catch { /* lokale opslag kan geblokkeerd zijn */ }
  }
  function sessionGet(key) { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } }
  function sessionSet(key, value) { try { sessionStorage.setItem(key, String(value)); } catch { /* sessieopslag kan geblokkeerd zijn */ } }
  const personaLabel = value => ({ Docenten: 'Docent', Bestuurders: 'Bestuurder', 'IT-professionals': 'IT-professional', Onderzoekers: 'Onderzoeker' }[value] || value);
  const personaSummary = selected => selected.map(personaLabel).join(' + ');

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
    access: [record.accessType === 'public' ? 'Publiek toegankelijk' : 'Toegang nog niet bevestigd'],
    source: [(record.sourceUrls || []).length ? 'Met officiële bron' : 'Bron nog niet vastgelegd'],
    freshness: [record.verificationStatus === 'recently_checked' ? 'Recent gecontroleerd' : 'Controle nodig']
  }[key] || []);

  function parseState() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    state = { q: params.get('q') || '', sort: params.get('sort') || 'relevant' };
    FILTER_KEYS
      .forEach(key => state[key] = params.get(key) || '');
    if (!state.audience && params.get('aud')) state.audience = params.get('aud');
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
  function stateHref(overrides = {}) {
    const next = { ...state, ...overrides };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value && !(key === 'sort' && value === 'relevant')) params.set(key, value);
    });
    return `#zoeken${params.size ? `?${params}` : ''}`;
  }
  function queryMatches(record, query) {
    const terms = queryTerms(query);
    if (terms.length && !terms.some(term => recordText(record).includes(term))) return false;
    return true;
  }
  function matches(record, omittedFacet = '') {
    if (!queryMatches(record, state.q)) return false;
    return FILTER_KEYS.every(key =>
      key === omittedFacet || !values(key).length || values(key).some(value => facetValues(record, key).includes(value))
    );
  }
  function relevance(record) {
    const practical = PRACTICAL_PRIORITY[typeLabel(record)] || 10;
    if (!state.q) return practical + (statusLabel(record) === 'Direct beschikbaar' ? 4 : 0);
    const query = normalize(state.q);
    const title = normalize(record.title);
    let score = title === query ? 100 : title.includes(query) ? 60 : 0;
    queryTerms(state.q).forEach(term => {
      if (normalize(recordThemes(record).join(' ')).includes(term)) score += 25;
      if (normalize((record.keywords || []).join(' ')).includes(term)) score += 20;
      if (normalize(record.description).includes(term)) score += 8;
    });
    return score + practical / 10 + (statusLabel(record) === 'Direct beschikbaar' ? 3 : 0);
  }
  function sortRecords(list) {
    if (state.sort === 'az') return list.sort((a, b) => a.title.localeCompare(b.title, 'nl'));
    if (state.sort === 'available') return list.sort((a, b) => {
      const availability = Number(statusLabel(b) === 'Direct beschikbaar') - Number(statusLabel(a) === 'Direct beschikbaar');
      return availability || relevance(b) - relevance(a) || a.title.localeCompare(b.title, 'nl');
    });
    if (state.sort === 'checked') return list.sort((a, b) => String(b.lastVerified || '').localeCompare(a.lastVerified || ''));
    return list.sort((a, b) => relevance(b) - relevance(a));
  }
  function facetCount(key, option) {
    return records.filter(record => matches(record, key) && facetValues(record, key).includes(option)).length;
  }
  function hasIntent() {
    return Boolean(state.q || FILTER_KEYS.some(key => values(key).length));
  }

  function phrasePresent(text, phrase) {
    return (` ${text} `).includes(` ${normalize(phrase)} `);
  }
  function interpretNaturalQuery(rawQuery) {
    const normalized = normalize(rawQuery);
    let residual = ` ${normalized} `;
    const found = { audience: [], theme: [], sector: [], type: [] };
    const consume = phrase => { residual = residual.replaceAll(` ${normalize(phrase)} `, ' '); };
    Object.entries(ROLE_ALIASES).forEach(([alias, role]) => {
      if (phrasePresent(normalized, alias)) { found.audience.push(role); consume(alias); }
    });
    Object.entries(THEME_RULES).forEach(([theme, terms]) => {
      const matches = terms.filter(term => phrasePresent(normalized, term));
      if (matches.length) { found.theme.push(theme); matches.forEach(consume); }
    });
    SECTORS.forEach(sector => { if (phrasePresent(normalized, sector)) { found.sector.push(sector); consume(sector); } });
    Object.entries(TYPE_QUERY_RULES).forEach(([type, terms]) => {
      const matches = terms.filter(term => phrasePresent(normalized, term));
      if (matches.length) { found.type.push(type); matches.forEach(consume); }
    });
    const rest = residual.trim().split(/\s+/).filter(token => token.length > 1 && !QUERY_STOPWORDS.has(token)).join(' ');
    const structured = Object.values(found).some(items => items.length);
    return { q: structured ? rest : rawQuery.trim(), ...Object.fromEntries(Object.entries(found).map(([key, items]) => [key, [...new Set(items)].join(',')])) };
  }
  function applyNaturalQuery(rawQuery) {
    const interpreted = interpretNaturalQuery(rawQuery);
    state.q = interpreted.q;
    ['audience', 'theme', 'sector', 'type'].forEach(key => {
      if (interpreted[key]) state[key] = interpreted[key];
    });
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
    const pool = records.filter(record => statusLabel(record) === 'Direct beschikbaar' && (record.sourceUrls || []).length && !['Organisatie', 'Geïdentificeerde behoefte'].includes(typeLabel(record)))
      .sort((a, b) => (PRACTICAL_PRIORITY[typeLabel(b)] || 0) - (PRACTICAL_PRIORITY[typeLabel(a)] || 0) || a.title.localeCompare(b.title, 'nl'));
    const selected = [], usedTypes = new Set();
    pool.forEach(record => { if (selected.length < 4 && !usedTypes.has(typeLabel(record))) { selected.push(record); usedTypes.add(typeLabel(record)); } });
    pool.forEach(record => { if (selected.length < 4 && !selected.includes(record)) selected.push(record); });
    return selected;
  }
  function rolePicker(roles, selected = []) {
    return `<form class="role-picker"><p>Kies één of meer rollen. U kunt dit later altijd aanpassen.</p><div class="role-grid">${roles.map(role => `<label class="role-option"><input type="checkbox" value="${escapeHtml(role)}" ${selected.includes(role) ? 'checked' : ''}><span><strong>${escapeHtml(personaLabel(role))}</strong><small>${(records.filter(record => (record.audiences || []).includes(role))).length} passende records</small></span></label>`).join('')}</div><button class="btn role-submit" type="submit">Bekijk passend aanbod</button></form>`;
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
    const personas = savedPersonas();
    state = { q: '', sort: 'relevant', audience: personas.join(',') };
    const roles = PRIMARY_AUDIENCES.filter(role => records.some(record => (record.audiences || []).includes(role)));
    main.innerHTML = `<section class="home-simple">
      <section class="home-search"><h1>Waar bent u vandaag naar op zoek?</h1>${searchForm('home-search')}</section>
      <section><h2>Veel gezocht</h2>${popularLinks('', personas.join(','))}</section>
      <section class="persona-block">${personas.length ? `<div class="persona-indicator"><span>U bekijkt aanbod voor: <strong>${escapeHtml(personaSummary(personas))}</strong></span><button class="persona-change" type="button" aria-expanded="false">Wijzigen</button><button class="persona-clear" type="button">Wissen</button></div><div class="persona-choices" hidden><h2>Voor wie zoekt u?</h2>${rolePicker(roles, personas)}</div>` : `<h2>Ik ben…</h2>${rolePicker(roles)}`}</section>
      <section><div class="section-title"><h2>Direct bruikbaar</h2><a href="#zoeken?status=${encodeURIComponent('Direct beschikbaar')}">Bekijk alles →</a></div><div class="direct-grid">${directUsable().map(record => simpleCard(record)).join('')}</div></section>
      <section class="missing"><h2>Nog niets gevonden? Laat het weten</h2><p>Vertel welk aanbod ontbreekt en voeg bij voorkeur een officiële bron toe.</p><a class="btn secondary" href="#bijdragen">Ontbrekend aanbod melden</a></section>
    </section>`;
    bindSearchForm(); bindRolePickers();
  }
  function renderStart() {
    const roles = PRIMARY_AUDIENCES.filter(role => records.some(record => (record.audiences || []).includes(role)));
    main.innerHTML = `<section class="catalog start">${searchForm('catalog-search')}<div class="start-content">
      <h1>Kies een eenvoudige ingang</h1><p>Typ wat u zoekt, kies een onderwerp of start vanuit uw rol. Daarna ziet u alleen passend aanbod.</p>
      <h2>Veel gezocht</h2>${popularLinks()}
      <h2>Ik ben…</h2>${rolePicker(roles, savedPersonas())}
    </div></section>`;
    bindSearchForm(); bindRolePickers();
  }
  function facet(key, title, options, open = false) {
    const present = options.filter(option => records.some(record => facetValues(record, key).includes(option)));
    return `<details class="facet" ${open ? 'open' : ''}><summary>${title}${values(key).length ? `<b>${values(key).length}</b>` : ''}</summary><div>
      ${key === 'organization' && present.length > 12 ? '<input class="facet-search" type="search" placeholder="Zoek organisatie…" aria-label="Zoek binnen organisaties">' : ''}
      <div class="facet-options ${present.length > 8 ? 'limited' : ''}">${present.map(option => { const count = facetCount(key, option); const checked = values(key).includes(option); return `<label><input type="checkbox" data-facet="${key}" value="${escapeHtml(option)}" ${checked ? 'checked' : ''} ${!count && !checked ? 'disabled' : ''}><span>${escapeHtml(option)}</span><small>${count}</small></label>`; }).join('')}</div>
      ${present.length > 8 ? '<button class="facet-more" type="button">Toon meer</button>' : ''}
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
    const compact = matchMedia('(max-width:560px)').matches;
    return [...groups.entries()].sort((a, b) => (PRACTICAL_PRIORITY[b[0]] || 10) - (PRACTICAL_PRIORITY[a[0]] || 10) || b[1].length - a[1].length).map(([label, items], index) =>
      `<details class="result-group" ${!compact || index === 0 ? 'open' : ''}><summary><span>${escapeHtml(label)} <b>${items.length}</b></span><span class="group-toggle" aria-hidden="true"></span></summary><div class="result-list">${items.slice(0, 3).map(record => simpleCard(record, true)).join('')}</div>${items.length > 3 ? `<a class="group-all" href="#zoeken?theme=${encodeURIComponent(values('theme')[0])}&type=${encodeURIComponent(label)}">Toon alle ${items.length} →</a>` : ''}</details>`
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
    const hiddenKeys = ['type', 'organization', 'access', 'source', 'freshness'];
    const hiddenCount = hiddenKeys.reduce((sum, key) => sum + values(key).length, 0);
    const chips = FILTER_KEYS
      .flatMap(key => values(key).map(value => `<button class="chip" data-remove="${key}|${escapeHtml(value)}">${escapeHtml(value)} ×</button>`)).join('');
    const oneThemeOnly = values('theme').length === 1 && !state.q && FILTER_KEYS.filter(key => key !== 'theme').every(key => !values(key).length);
    const related = values('theme').length ? relatedThemes(values('theme')[0]) : [];
    const alternative = alternativeSuggestion();
    const typeOptions = [...new Set(records.map(typeLabel))].sort((a, b) => a.localeCompare(b, 'nl'));
    const organizationOptions = [...new Set(records.map(record => record.providerName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
    const audienceOptions = [...new Set(records.flatMap(record => record.audiences || []))].sort((a, b) => {
      const primaryDifference = Number(!PRIMARY_AUDIENCES.includes(a)) - Number(!PRIMARY_AUDIENCES.includes(b));
      return primaryDifference || a.localeCompare(b, 'nl');
    });
    const activeCount = FILTER_KEYS.reduce((sum, key) => sum + values(key).length, 0);
    const quickFilters = [['status', 'Direct beschikbaar', 'Direct beschikbaar'], ['access', 'Publiek toegankelijk', 'Publiek toegankelijk'], ['source', 'Met officiële bron', 'Met officiële bron']];
    main.innerHTML = `<section class="catalog">${searchForm('catalog-search')}<div class="catalog-grid">
      <aside class="filters" id="filters" aria-label="Zoekfilters"><header><h2>Verfijn</h2><button class="close" aria-label="Sluit filters">×</button></header>
        ${facet('theme', 'Thema', Object.keys(THEME_RULES), true)}${facet('audience', 'Voor wie? Kies één of meer', audienceOptions, true)}${facet('sector', 'Sector', SECTORS, true)}${facet('status', 'Beschikbaarheid', Object.values(STATUS_LABELS), true)}
        <details class="more-filters"><summary>Meer filters${hiddenCount ? ` (${hiddenCount})` : ''} <span>▼</span></summary>
          ${facet('type', 'Soort aanbod', typeOptions)}${facet('organization', 'Organisatie', organizationOptions)}${facet('access', 'Toegang', ['Publiek toegankelijk', 'Toegang nog niet bevestigd'])}${facet('source', 'Bron', ['Met officiële bron', 'Bron nog niet vastgelegd'])}${facet('freshness', 'Actualiteit', ['Recent gecontroleerd', 'Controle nodig'])}
        </details><button class="clear btn secondary">Wis alle filters</button><footer><button class="apply btn">Toon ${resultRecords.length} resultaten</button></footer>
      </aside><section class="results"><header class="result-head"><h1>${oneThemeOnly ? escapeHtml(values('theme')[0]) : `${resultRecords.length} resultaten${state.q ? ` voor ‘${escapeHtml(state.q)}’` : ''}`}</h1><div><button class="mobile-filter btn secondary" aria-controls="filters" aria-expanded="false">Filters (${activeCount})</button><label>Sorteren<select id="sort"><option value="relevant">Meest relevant</option><option value="available">Direct beschikbaar eerst</option><option value="checked">Recent gecontroleerd</option><option value="az">Titel A–Z</option></select></label></div></header>
        <div class="quick-filters" aria-label="Snelfilters"><span>Snel verfijnen:</span>${quickFilters.map(([key, value, label]) => `<button type="button" data-quick="${key}|${value}" aria-pressed="${values(key).includes(value)}">${label}</button>`).join('')}</div>
        ${chips ? `<div class="chips">${chips}<button class="clear-link">Wis alles</button></div>` : ''}
        ${related.length ? `<nav class="related" aria-label="Verwante thema's"><strong>Verwante thema's</strong>${related.map(([theme, count]) => `<a href="#zoeken?theme=${encodeURIComponent(theme)}">${escapeHtml(theme)} <span>${count}</span></a>`).join('')}</nav>` : ''}
        <div aria-live="polite">${resultRecords.length ? (oneThemeOnly ? groupedResults() : `<div class="result-list">${resultRecords.map(record => simpleCard(record, true)).join('')}</div>`) : `<div class="empty"><h2>Geen resultaten gevonden</h2>${alternative ? `<a class="alternative" href="${stateHref({ q: alternative.candidate })}">Bedoelde u <strong>${escapeHtml(alternative.candidate)}</strong>? <span>${alternative.count} ${alternative.count === 1 ? 'resultaat' : 'resultaten'}</span></a>` : '<p>Voor deze zoekterm is geen aantoonbaar werkend alternatief gevonden.</p>'}<button class="clear btn">Wis filters</button><p><a href="#bijdragen">Mis u iets in de atlas? Laat het weten.</a></p></div>`}</div>
      </section></div></section>`;
    document.querySelector('#sort').value = state.sort;
    bindSearchPage();
    if (sessionGet('atlas.restoreResults') === location.hash) {
      const targetY = Number(sessionGet('atlas.resultsScroll')) || 0;
      sessionSet('atlas.restoreResults', '');
      requestAnimationFrame(() => scrollTo(0, targetY));
    }
  }

  function renderDetail(id) {
    const record = records.find(item => item.id === id);
    if (!record) {
      main.innerHTML = `<section class="detail-missing"><h1>Niet gevonden</h1><p>Dit item staat niet in de huidige dataset.</p><a class="btn" href="#zoeken">Terug naar zoeken</a></section>`;
      return;
    }
    const lastSearch = sessionGet('atlas.lastSearch') || '#zoeken';
    const related = records.filter(item => item.id !== record.id && (
      item.providerName === record.providerName || recordThemes(item).some(theme => recordThemes(record).includes(theme))
    )).sort((a, b) => relevance(b) - relevance(a)).slice(0, 3);
    const sources = record.sourceUrls || [];
    const factRows = [
      ['Aanbieder', record.providerName],
      ['Sector', (record.sectors || []).join(', ')],
      ['Voor wie', (record.audiences || []).join(', ')],
      ['Beschikbaarheid', statusLabel(record)],
      ['Laatst gecontroleerd', record.lastVerified],
      ['Deadline', record.applicationDeadline || record.fundingDeadline]
    ].filter(([, value]) => value && value !== 'Nog niet ingevuld');
    main.innerHTML = `<header class="detail-hero"><span class="eyebrow">${escapeHtml(typeLabel(record))}</span><h1>${escapeHtml(record.title)}</h1><p>${escapeHtml(record.description || '')}</p></header>
      <section class="detail-shell"><nav class="detail-nav" aria-label="Terugnavigatie"><a class="back-results" href="${escapeHtml(lastSearch)}">← Terug naar resultaten</a><span>Home / Resultaten / ${escapeHtml(record.title)}</span></nav>
      <div class="detail-layout"><article>
        ${record.purpose ? `<h2>Waarvoor kunt u dit gebruiken?</h2><p>${escapeHtml(record.purpose)}</p>` : ''}
        ${recordThemes(record).length ? `<h2>Onderwerpen</h2><div class="detail-themes">${recordThemes(record).map(theme => `<a href="#zoeken?theme=${encodeURIComponent(theme)}">${escapeHtml(theme)}</a>`).join('')}</div>` : ''}
        ${record.eligibility ? `<h2>Voorwaarden</h2><p>${escapeHtml(record.eligibility)}</p>` : ''}
        ${related.length ? `<h2>Gerelateerd aanbod</h2><div class="related-cards">${related.map(item => simpleCard(item)).join('')}</div>` : ''}
      </article><aside class="detail-facts"><h2>In één oogopslag</h2><dl>${factRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
        ${sources.length ? `<div class="source-actions">${sources.map((sourceItem, index) => `<a class="btn ${index ? 'secondary' : ''}" href="${escapeHtml(sourceItem.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceItem.label || 'Officiële bron')} ↗</a>`).join('')}</div>` : '<p class="source-warning">Voor dit record is nog geen officiële bron vastgelegd.</p>'}
        <a class="correction-link" href="#bijdragen">Klopt er iets niet? Geef een correctie door.</a>
      </aside></div></section>`;
    const back = document.querySelector('.back-results');
    back.onclick = () => sessionSet('atlas.restoreResults', lastSearch);
    document.querySelectorAll('.related-cards a[href^="#item/"]').forEach(link => link.onclick = () => sessionSet('atlas.lastSearch', lastSearch));
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
    form.onsubmit = event => { event.preventDefault(); applyNaturalQuery(input.value); setUrl(); };
    input.oninput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const data = suggestionData(input.value);
        const titleMatch = Object.keys(THEME_RULES).find(theme => normalize(theme).includes(normalize(input.value)));
        suggestions.hidden = !data.groups.length && !data.organizations.length;
        input.setAttribute('aria-expanded', String(!suggestions.hidden));
        suggestions.innerHTML = `${titleMatch ? `<a href="${stateHref({ q: '', theme: titleMatch })}" class="suggestion-topic"><small>Onderwerp</small><strong>${escapeHtml(titleMatch)}</strong></a>` : ''}
          ${data.groups.length ? `<section><h2>Soort aanbod</h2>${data.groups.map(([label, count]) => `<a href="${stateHref({ q: input.value, type: label })}"><span>${escapeHtml(label)}</span><strong>${count}</strong></a>`).join('')}</section>` : ''}
          ${data.organizations.length ? `<section><h2>Organisaties</h2>${data.organizations.map(name => `<a href="${stateHref({ q: '', organization: name })}">${escapeHtml(name)}</a>`).join('')}</section>` : ''}`;
      }, 150);
    };
    const closeSuggestions = () => { suggestions.hidden = true; input.setAttribute('aria-expanded', 'false'); };
    input.onkeydown = event => {
      if (event.key === 'Escape') closeSuggestions();
      if (event.key === 'ArrowDown' && !suggestions.hidden) {
        const first = suggestions.querySelector('a');
        if (first) { event.preventDefault(); first.focus(); }
      }
    };
    suggestions.onkeydown = event => {
      const links = [...suggestions.querySelectorAll('a')];
      const index = links.indexOf(document.activeElement);
      if (event.key === 'Escape') { closeSuggestions(); input.focus(); }
      if (['ArrowDown', 'ArrowUp'].includes(event.key) && index >= 0) {
        event.preventDefault();
        links[(index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length].focus();
      }
    };
    form.onfocusout = () => setTimeout(() => { if (!form.contains(document.activeElement)) closeSuggestions(); }, 0);
  }
  function bindRolePickers() {
    document.querySelectorAll('.role-picker').forEach(form => {
      const submit = form.querySelector('.role-submit');
      const update = () => {
        const count = form.querySelectorAll('input:checked').length;
        submit.disabled = count === 0;
        submit.textContent = count > 1 ? `Bekijk aanbod voor ${count} rollen` : 'Bekijk passend aanbod';
      };
      form.querySelectorAll('input').forEach(input => input.onchange = update);
      form.onsubmit = event => {
        event.preventDefault();
        const selected = [...form.querySelectorAll('input:checked')].map(input => input.value);
        if (!selected.length) return;
        savePersonas(selected);
        location.hash = `zoeken?audience=${encodeURIComponent(selected.join(','))}`;
      };
      update();
    });
    const change = document.querySelector('.persona-change');
    if (change) change.onclick = () => { const choices = document.querySelector('.persona-choices'); choices.hidden = false; change.setAttribute('aria-expanded', 'true'); choices.querySelector('input').focus(); };
    const clear = document.querySelector('.persona-clear');
    if (clear) clear.onclick = () => { savePersonas([]); renderHome(); };
  }
  function bindSearchPage() {
    bindSearchForm();
    document.querySelectorAll('[data-facet]').forEach(input => input.onchange = () => {
      const selected = values(input.dataset.facet);
      input.checked ? selected.push(input.value) : selected.splice(selected.indexOf(input.value), 1);
      state[input.dataset.facet] = [...new Set(selected)].join(','); setUrl();
    });
    document.querySelectorAll('[data-quick]').forEach(button => button.onclick = () => {
      const [key, value] = button.dataset.quick.split('|');
      const selected = values(key);
      state[key] = selected.includes(value) ? selected.filter(item => item !== value).join(',') : [...selected, value].join(',');
      setUrl();
    });
    document.querySelectorAll('.facet-more').forEach(button => button.onclick = () => {
      const options = button.previousElementSibling;
      options.classList.toggle('expanded');
      button.textContent = options.classList.contains('expanded') ? 'Toon minder' : 'Toon meer';
    });
    document.querySelectorAll('.facet-search').forEach(input => input.oninput = () => {
      const query = normalize(input.value);
      input.nextElementSibling.querySelectorAll('label').forEach(label => { label.hidden = !normalize(label.textContent).includes(query); });
    });
    document.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
      const [key, value] = button.dataset.remove.split('|'); state[key] = values(key).filter(item => item !== value).join(','); setUrl();
    });
    document.querySelectorAll('.clear,.clear-link').forEach(button => button.onclick = () => { state = { q: '', sort: 'relevant' }; setUrl(); });
    document.querySelector('#sort').onchange = event => { state.sort = event.target.value; setUrl(); };
    document.querySelectorAll('.result-card a[href^="#item/"]').forEach(link => link.onclick = () => {
      sessionSet('atlas.lastSearch', location.hash); sessionSet('atlas.resultsScroll', scrollY);
    });
    const panel = document.querySelector('#filters'); const opener = document.querySelector('.mobile-filter'); const closer = document.querySelector('.close');
    const closePanel = () => { panel.classList.remove('open'); document.body.classList.remove('locked'); opener.setAttribute('aria-expanded', 'false'); opener.focus(); };
    opener.onclick = () => { panel.classList.add('open'); document.body.classList.add('locked'); opener.setAttribute('aria-expanded', 'true'); closer.focus(); };
    closer.onclick = document.querySelector('.apply').onclick = closePanel;
    document.onkeydown = event => {
      if (event.key === 'Escape' && panel.classList.contains('open')) closePanel();
      if (event.key === 'Tab' && panel.classList.contains('open')) {
        const focusable = [...panel.querySelectorAll('button:not([disabled]),input:not([disabled]),summary,select,a[href]')].filter(element => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
  }
  function route() {
    const path = (location.hash.slice(1) || 'home').split('?')[0];
    if (path === 'home') renderHome();
    if (path === 'zoeken' || path === 'organisaties') { parseState(); if (path === 'organisaties') state.type = 'Organisatie'; renderSearch(); }
    if (path.startsWith('item/')) renderDetail(decodeURIComponent(path.slice(5)));
    const updated = document.querySelector('[data-updated]'); if (updated) updated.textContent = source.metadata.updated || '';
  }
  addEventListener('hashchange', route); addEventListener('popstate', route); route();
})();
