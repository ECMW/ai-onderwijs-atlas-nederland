(() => {
  'use strict';

  const source = window.ATLAS_RECORDS;
  const main = document.querySelector('main');
  if (!source || !main) return;

  const allRecords = source.records || [];
  const records = allRecords.filter(record =>
    !['identified_need', 'white_spot'].includes(record.recordType) &&
    !['Behoefte', 'Witte vlek'].includes(record.legacyType) &&
    (record.sourceUrls || []).some(sourceItem => sourceItem.url && sourceItem.sourceType === 'official') &&
    ['verified', 'recently_checked'].includes(record.verificationStatus)
  );
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
  const FAVORITES_KEY = 'atlas.favorites';
  const SAVED_SEARCHES_KEY = 'atlas.savedSearches';
  const RECENT_KEY = 'atlas.recentItems';
  const FILTER_KEYS = ['theme', 'audience', 'sector', 'status', 'type', 'geography', 'organization', 'access', 'source', 'freshness'];
  const ROLE_ALIASES = {
    docent: 'Docenten', leraar: 'Docenten', leerkracht: 'Docenten',
    bestuurder: 'Bestuurders', schoolleider: 'Bestuurders', manager: 'Bestuurders',
    onderzoeker: 'Onderzoekers', wetenschapper: 'Onderzoekers', lector: 'Onderzoekers',
    'it professional': 'IT-professionals', ict: 'IT-professionals', it: 'IT-professionals'
  };
  const TYPE_QUERY_RULES = {
    Handreiking: ['handreiking', 'handleiding'], Training: ['training', 'cursus', 'workshop'],
    Praktijkvoorbeeld: ['praktijkvoorbeeld', 'voorbeeld uit de praktijk'],
    Hulpmiddel: ['hulpmiddel', 'tool'], Organisatie: ['organisatie', 'kennisorganisatie', 'instelling'],
    'Subsidie of call': ['subsidie', 'call']
  };
  const QUERY_STOPWORDS = new Set(['ik', 'ben', 'wij', 'zijn', 'zoek', 'zoeken', 'iets', 'over', 'voor', 'de', 'het', 'een', 'en', 'of', 'naar', 'graag', 'wil', 'willen', 'nodig', 'informatie']);
  const PRACTICAL_PRIORITY = {
    Handreiking: 70, Voorziening: 65, Training: 60, Praktijkvoorbeeld: 55,
    Hulpmiddel: 50, 'Subsidie of call': 45, Subsidie: 45, Pilot: 40,
    Wetgeving: 35, Standaard: 30, Programma: 25, Organisatie: 5,
    'Geïdentificeerde behoefte': 0
  };
  const TASKS = [
    { label: 'Hulp bij toetsing', detail: 'Toetsontwerp, examinering en nakijken', query: { theme: 'Toetsing en examinering' } },
    { label: 'AI Act begrijpen', detail: 'Regels, rollen en risicoclassificatie', query: { theme: 'AI Act en wetgeving' } },
    { label: 'Subsidie vinden', detail: 'Nederlandse én internationale calls', query: { type: 'Subsidie of call,Subsidie' } },
    { label: 'AI-geletterdheid', detail: 'Raamwerken en professionalisering', query: { theme: 'AI-geletterdheid' } },
    { label: 'Veilige AI kiezen', detail: 'Privacy, beveiliging en autonomie', query: { theme: 'Veilige AI-omgeving' } },
    { label: 'Voorbeeldbeleid', detail: 'Afspraken, governance en implementatie', query: { theme: 'Beleid en governance' } },
    { label: 'Praktijkvoorbeelden', detail: 'Ervaringen uit instellingen en scholen', query: { type: 'Praktijkvoorbeeld' } },
    { label: 'Trainingen', detail: 'Workshops en leeractiviteiten', query: { type: 'Training' } },
    { label: 'Organisatie vinden', detail: 'Vind een organisatie per sector of onderwerp', query: { type: 'Organisatie' } }
  ];

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
  function localList(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  function saveLocalList(key, items) {
    try { localStorage.setItem(key, JSON.stringify(items)); } catch { /* lokale opslag kan geblokkeerd zijn */ }
  }
  const favoriteIds = () => localList(FAVORITES_KEY).filter(id => records.some(record => record.id === id));
  const isFavorite = id => favoriteIds().includes(id);
  function toggleFavorite(id) {
    const current = favoriteIds();
    const next = current.includes(id) ? current.filter(item => item !== id) : [id, ...current].slice(0, 100);
    saveLocalList(FAVORITES_KEY, next);
    return next.includes(id);
  }
  function addRecent(id) {
    saveLocalList(RECENT_KEY, [id, ...localList(RECENT_KEY).filter(item => item !== id)].slice(0, 12));
  }
  const personaLabel = value => ({ Docenten: 'Docent', Bestuurders: 'Bestuurder', 'IT-professionals': 'IT-professional', Onderzoekers: 'Onderzoeker' }[value] || value);
  const personaSummary = selected => selected.map(personaLabel).join(' + ');

  const recordText = record => normalize([
    record.title, record.description, record.purpose, record.providerName,
    record.legacyType, record.status, ...(record.audiences || []), ...(record.sectors || []),
    ...(record.themes || []), ...(record.keywords || [])
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
    geography: [record.geographicScope || 'Reikwijdte niet ingevuld'],
    access: [record.accessType === 'public' ? 'Publiek toegankelijk' : 'Toegang nog niet bevestigd'],
    source: [(record.sourceUrls || []).length ? 'Met officiële bron' : 'Bron nog niet vastgelegd'],
    freshness: [['verified', 'recently_checked'].includes(record.verificationStatus) ? 'Recent gecontroleerd' : 'Controle nodig']
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
    const hasSearchShell = Boolean(document.querySelector('.catalog-grid'));
    history.pushState(null, '', `#zoeken${params.size ? `?${params}` : ''}`);
    hasSearchShell ? updateSearchResults() : renderSearch();
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
    if (!terms.length) return true;
    const text = recordText(record);
    const words = text.split(' ').filter(word => word.length > 1);
    return terms.some(term => {
      if (text.includes(term)) return true;
      const tokens = term.split(' ').filter(token => token.length > 1);
      return tokens.length && tokens.every(token => words.some(word => {
        if (word.includes(token) || (word.length >= 3 && token.includes(word))) return true;
        if (token.length < 4 || word.length < 4) return false;
        const limit = Math.max(token.length, word.length) >= 8 ? 2 : 1;
        return Math.abs(token.length - word.length) <= limit && levenshtein(token, word) <= limit;
      }));
    });
  }
  function matches(record, omittedFacet = '') {
    if (!queryMatches(record, state.q)) return false;
    return FILTER_KEYS.every(key =>
      key === omittedFacet || !values(key).length || values(key).some(value => facetValues(record, key).includes(value))
    );
  }
  function relevance(record) {
    const practical = PRACTICAL_PRIORITY[typeLabel(record)] || 10;
    const trusted = record.verificationStatus === 'verified' && (record.sourceUrls || []).length ? 5 : 0;
    if (!state.q) return practical + (statusLabel(record) === 'Direct beschikbaar' ? 4 : 0) + trusted;
    const query = normalize(state.q);
    const title = normalize(record.title);
    let score = title === query ? 100 : title.includes(query) ? 60 : 0;
    queryTerms(state.q).forEach(term => {
      if (normalize(recordThemes(record).join(' ')).includes(term)) score += 25;
      if (normalize((record.keywords || []).join(' ')).includes(term)) score += 20;
      if (normalize(record.description).includes(term)) score += 8;
    });
    query.split(' ').filter(Boolean).forEach(token => {
      if (title.split(' ').some(word => levenshtein(token, word) <= (token.length >= 8 ? 2 : 1))) score += 12;
    });
    score += values('theme').filter(value => recordThemes(record).includes(value)).length * 6;
    score += values('sector').filter(value => (record.sectors || []).includes(value)).length * 4;
    score += values('audience').filter(value => (record.audiences || []).includes(value)).length * 4;
    return score + practical / 10 + (statusLabel(record) === 'Direct beschikbaar' ? 3 : 0) + trusted;
  }
  function sortRecords(list) {
    if (state.sort === 'az') return list.sort((a, b) => a.title.localeCompare(b.title, 'nl'));
    if (state.sort === 'available') return list.sort((a, b) => {
      const availability = Number(statusLabel(b) === 'Direct beschikbaar') - Number(statusLabel(a) === 'Direct beschikbaar');
      return availability || relevance(b) - relevance(a) || a.title.localeCompare(b.title, 'nl');
    });
    if (state.sort === 'checked') return list.sort((a, b) => String(b.lastVerified || '').localeCompare(a.lastVerified || ''));
    if (state.sort === 'new') return list.sort((a, b) => latestChangeDate(b, 'added').localeCompare(latestChangeDate(a, 'added')) || relevance(b) - relevance(a));
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

  function latestChangeDate(record, type = '') {
    const dates = (record.changeHistory || [])
      .filter(change => (!type || change.type === type) && change.type !== 'migrated')
      .map(change => change.date).filter(Boolean).sort();
    return dates.at(-1) || '';
  }
  function dateLabel(value) {
    if (!value) return 'Nog niet gecontroleerd';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
  }
  function recordsForCriteria(criteria = {}) {
    return records.filter(record => Object.entries(criteria).every(([key, value]) => {
      if (!value) return true;
      if (key === 'q') return queryMatches(record, value);
      const selected = String(value).split(',').filter(Boolean);
      return selected.some(option => facetValues(record, key).includes(option));
    }));
  }
  function criteriaHref(criteria = {}) {
    const params = new URLSearchParams();
    Object.entries(criteria).forEach(([key, value]) => value && params.set(key, value));
    return `#zoeken${params.size ? `?${params}` : ''}`;
  }
  function favoriteButton(record) {
    const active = isFavorite(record.id);
    return `<button class="favorite-button" type="button" data-favorite="${escapeHtml(record.id)}" aria-pressed="${active}" aria-label="${active ? 'Verwijder uit favorieten' : 'Bewaar als favoriet'}"><span aria-hidden="true">${active ? '★' : '☆'}</span><span>${active ? 'Bewaard' : 'Bewaar'}</span></button>`;
  }
  function trustTone(record) {
    if (['needs_verification', 'unknown'].includes(record.status) || !['verified', 'recently_checked'].includes(record.verificationStatus)) return 'is-uncertain';
    if (['available', 'open_call'].includes(record.status)) return 'is-confirmed';
    return 'is-neutral';
  }
  function primarySource(record) { return (record.sourceUrls || [])[0] || null; }

  function searchForm(id) {
    return `<form class="atlas-search" role="search" autocomplete="off">
      <label for="${id}">Waar bent u vandaag naar op zoek?</label>
      <div class="search-row"><input id="${id}" type="search" value="${escapeHtml(state.q)}" placeholder="Zoek bijvoorbeeld ‘AI Act voor docenten in het mbo’" aria-controls="search-suggestions" aria-autocomplete="list" aria-expanded="false"><button class="btn">Zoeken</button></div>
      <div class="suggestions" id="search-suggestions" hidden></div>
    </form>`;
  }
  function popularLinks(className = '', persona = '') {
    const candidates = ['Toetsing', 'AI Act', 'Privacy', 'Prompting', 'Subsidies', 'Veilige AI', 'Curriculum', 'AI-geletterdheid'];
    const available = candidates.filter(query => records.some(record => queryTerms(query).some(term => recordText(record).includes(term))));
    return `<div class="popular ${className}">${available.map(query => { const count = recordsForCriteria({ q: query, audience: persona }).length; return `<a href="#zoeken?q=${encodeURIComponent(query)}${persona ? `&audience=${encodeURIComponent(persona)}` : ''}"><span>${escapeHtml(query)}</span><small>${count}</small></a>`; }).join('')}</div>`;
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
  function teaserCard(record, label = '') {
    const sourceItem = primarySource(record);
    return `<article class="teaser-card"><div class="teaser-top"><span class="type-label">${escapeHtml(label || typeLabel(record))}</span>${favoriteButton(record)}</div>
      <h3><a href="#item/${escapeHtml(record.id)}">${escapeHtml(record.title)}</a></h3>
      <p class="provider">${escapeHtml(record.providerName || 'Aanbieder nog niet ingevuld')}</p>
      <div class="teaser-meta"><span class="status-text ${trustTone(record)}">${escapeHtml(statusLabel(record))}</span>${sourceItem ? '<span>Officiële bron</span>' : ''}</div>
      <a class="teaser-link" href="#item/${escapeHtml(record.id)}">Bekijk aanbod <span aria-hidden="true">→</span></a></article>`;
  }
  function simpleCard(record, explain = false) {
    const sectors = (record.sectors || []).slice(0, 3);
    const reasons = relevanceReasons(record);
    const sourceItem = primarySource(record);
    return `<article class="result-card" data-record-id="${escapeHtml(record.id)}">
      <div class="card-body"><div class="card-top"><span class="type-label">${escapeHtml(typeLabel(record))}</span>${favoriteButton(record)}</div>
        <h2><a href="#item/${escapeHtml(record.id)}">${escapeHtml(record.title)}</a></h2>
        ${record.providerName ? `<p class="provider">${escapeHtml(record.providerName)}</p>` : ''}
        <p class="description">${escapeHtml(record.description || '')}</p>
        ${sectors.length ? `<div class="sector-chips">${sectors.map(sector => `<span>${escapeHtml(sector)}</span>`).join('')}</div>` : ''}
        <div class="trust-row"><span class="status-text ${trustTone(record)}">${escapeHtml(statusLabel(record))}</span>${sourceItem ? '<span>Officiële bron</span>' : '<span>Bron nog niet vastgelegd</span>'}<span>Gecontroleerd ${escapeHtml(dateLabel(record.lastVerified))}</span></div>
        ${explain && reasons.length ? `<details class="relevance"><summary>Waarom zie ik dit?</summary><p>${reasons.map(reason => `<span>✓ ${escapeHtml(reason)}</span>`).join(' ')}</p></details>` : ''}
      </div><div class="card-actions"><a class="card-cta primary" href="#item/${escapeHtml(record.id)}">Bekijk details</a>${sourceItem ? `<a class="card-cta" href="${escapeHtml(sourceItem.url)}" target="_blank" rel="noopener noreferrer">Bron ↗</a>` : ''}</div>
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

  function homeShelf(title, href, items, label = '') {
    if (!items.length) return '';
    return `<section class="home-shelf"><div class="section-title"><div><h2>${escapeHtml(title)}</h2><p>${items.length} ${items.length === 1 ? 'item' : 'items'} beschikbaar</p></div><a href="${escapeHtml(href)}">Bekijk alles →</a></div><div class="content-rail">${items.slice(0, 4).map(record => teaserCard(record, label)).join('')}</div></section>`;
  }
  function homeFilterGroup(key, title, options, selected = [], open = false) {
    const present = options.filter(option => records.some(record => facetValues(record, key).includes(option)));
    return `<details class="home-filter-group" ${open ? 'open' : ''}><summary>${escapeHtml(title)}</summary><div>${present.map(option => `<label><input type="checkbox" name="${escapeHtml(key)}" value="${escapeHtml(option)}" ${selected.includes(option) ? 'checked' : ''}><span>${escapeHtml(option)}</span><small>${recordsForCriteria({ [key]: option }).length}</small></label>`).join('')}</div></details>`;
  }
  function homeFilterPanel(personas) {
    const themes = ['Toetsing en examinering', 'AI Act en wetgeving', 'Privacy en AVG', 'AI-geletterdheid', 'Veilige AI-omgeving', 'Beleid en governance', 'Professionalisering', 'Praktijkvoorbeelden'];
    const types = ['Handreiking', 'Hulpmiddel', 'Voorziening', 'Training', 'Praktijkvoorbeeld', 'Pilot', 'Subsidie of call', 'Subsidie', 'Wetgeving', 'Organisatie'];
    return `<details class="home-filter-sidebar"><summary>Filter het aanbod</summary><form class="home-filter-form"><header><span class="eyebrow">Snel verfijnen</span><h2>Filter het aanbod</h2><p>Combineer meerdere keuzes.</p></header>
      ${homeFilterGroup('theme', 'Waar zoekt u hulp bij?', themes, [], true)}
      ${homeFilterGroup('sector', 'Voor welke sector?', SECTORS, [], true)}
      ${homeFilterGroup('type', 'Wat zoekt u?', types)}
      ${homeFilterGroup('geography', 'Waar is het aanbod beschikbaar?', ['Nederland', 'Europa', 'Internationaal'])}
      ${homeFilterGroup('audience', 'Voor wie?', PRIMARY_AUDIENCES, personas)}
      ${homeFilterGroup('status', 'Beschikbaarheid', ['Direct beschikbaar', 'Open voor aanvragen', 'Pilot', 'In ontwikkeling'])}
      <button class="btn home-filter-submit" type="submit">Bekijk aanbod</button><a class="home-all-filters" href="#zoeken">Naar uitgebreid zoeken →</a>
    </form></details>`;
  }
  function bindHomeFilters() {
    const sidebar = document.querySelector('.home-filter-sidebar');
    if (sidebar && matchMedia('(min-width:901px)').matches) sidebar.open = true;
    const form = document.querySelector('.home-filter-form');
    if (!form) return;
    const selection = () => {
      const criteria = {};
      FILTER_KEYS.forEach(key => {
        const selected = [...form.querySelectorAll(`input[name="${key}"]:checked`)].map(input => input.value);
        if (selected.length) criteria[key] = selected.join(',');
      });
      return criteria;
    };
    const update = () => {
      const count = recordsForCriteria(selection()).length;
      form.querySelector('.home-filter-submit').textContent = `Bekijk ${count} ${count === 1 ? 'resultaat' : 'resultaten'}`;
    };
    form.querySelectorAll('input').forEach(input => input.onchange = update);
    form.onsubmit = event => { event.preventDefault(); location.hash = criteriaHref(selection()).slice(1); };
    update();
  }
  function renderHome() {
    const personas = savedPersonas();
    state = { q: '', sort: 'relevant', audience: personas.join(',') };
    const roles = PRIMARY_AUDIENCES.filter(role => records.some(record => (record.audiences || []).includes(role)));
    const openCalls = recordsForCriteria({ status: 'Open voor aanvragen' }).sort((a, b) => String(a.applicationDeadline || a.fundingDeadline || '9999').localeCompare(String(b.applicationDeadline || b.fundingDeadline || '9999')));
    const practices = recordsForCriteria({ type: 'Praktijkvoorbeeld' }).sort((a, b) => relevance(b) - relevance(a));
    const recentlyChecked = [...records].filter(record => record.lastVerified && !['Organisatie'].includes(typeLabel(record))).sort((a, b) => String(b.lastVerified).localeCompare(String(a.lastVerified)) || relevance(b) - relevance(a));
    main.innerHTML = `<section class="home-market">${homeFilterPanel(personas)}<div class="home-simple">
      <section class="home-search"><span class="eyebrow">De publieke wegwijzer voor AI in het onderwijs</span><h1>Vind wat u nodig hebt voor AI in uw onderwijs</h1><p>Doorzoek ${records.length} handreikingen, trainingen, voorzieningen, subsidies, pilots en praktijkvoorbeelden.</p><ul class="trust-summary" aria-label="Kenmerken van de atlas"><li>Alleen bestaand aanbod</li><li>Officiële bron per vermelding</li><li>Geen tracking</li></ul>${searchForm('home-search')}${personas.length ? `<div class="persona-indicator"><span>Afgestemd op: <strong>${escapeHtml(personaSummary(personas))}</strong></span><button class="persona-change" type="button" aria-expanded="false">Wijzigen</button><button class="persona-clear" type="button">Wissen</button></div><div class="persona-choices" hidden>${rolePicker(roles, personas)}</div>` : ''}</section>
      <section><div class="section-title"><div><h2>Waarmee kunnen we u helpen?</h2><p>Begin bij uw vraag, niet bij een organisatie.</p></div></div><div class="task-grid">${TASKS.map(task => { const count = recordsForCriteria(task.query).length; return `<a class="task-tile" href="${criteriaHref({ ...task.query, audience: personas.join(',') })}"><strong>${escapeHtml(task.label)}</strong><span>${escapeHtml(task.detail)}</span><small>${count} resultaten</small></a>`; }).join('')}</div></section>
      <section><div class="section-title"><div><h2>Veel gezocht</h2><p>Vaste snelkoppelingen naar veelvoorkomende onderwijsvragen.</p></div></div>${popularLinks('', personas.join(','))}</section>
      ${homeShelf('Direct beschikbaar', `#zoeken?status=${encodeURIComponent('Direct beschikbaar')}`, directUsable())}
      ${homeShelf('Open subsidies', `#zoeken?status=${encodeURIComponent('Open voor aanvragen')}`, openCalls)}
      ${homeShelf('Praktijkvoorbeelden', `#zoeken?type=${encodeURIComponent('Praktijkvoorbeeld')}`, practices)}
      ${homeShelf('Recent gecontroleerd', '#zoeken?sort=checked', recentlyChecked)}
      <section class="missing"><div><h2>Nog niet gevonden wat u zoekt?</h2><p>Laat ontbrekend aanbod weten en voeg een officiële bron toe.</p></div><a class="btn secondary" href="#bijdragen">Aanbod melden</a></section>
    </div></section>`;
    bindSearchForm(); bindRolePickers(); bindFavoriteButtons(); bindHomeFilters();
  }
  function renderStart() {
    const roles = PRIMARY_AUDIENCES.filter(role => records.some(record => (record.audiences || []).includes(role)));
    main.innerHTML = `<section class="catalog start">${searchForm('catalog-search')}<div class="start-content">
      <span class="eyebrow">Zoek in de volledige atlas</span><h1>Waarmee wilt u aan de slag?</h1><p>Typ uw vraag of kies een herkenbare ingang. Resultaten verschijnen pas nadat u een keuze maakt.</p>
      <div class="task-grid compact">${TASKS.map(task => `<a class="task-tile" href="${criteriaHref(task.query)}"><strong>${escapeHtml(task.label)}</strong><span>${escapeHtml(task.detail)}</span><small>${recordsForCriteria(task.query).length} resultaten</small></a>`).join('')}</div>
      <h2>Veel gezocht</h2>${popularLinks()}
      <details class="role-start"><summary>Afstemmen op uw rol</summary>${rolePicker(roles, savedPersonas())}</details>
    </div></section>`;
    bindSearchForm(); bindRolePickers();
  }
  function facet(key, title, options, open = false) {
    const present = options.filter(option => records.some(record => facetValues(record, key).includes(option)));
    return `<details class="facet" data-facet-block="${escapeHtml(key)}" ${open ? 'open' : ''}><summary>${title}<b ${values(key).length ? '' : 'hidden'}>${values(key).length}</b></summary><div>
      ${key === 'organization' && present.length > 12 ? '<input class="facet-search" type="search" placeholder="Zoek organisatie…" aria-label="Zoek binnen organisaties">' : ''}
      <div class="facet-options ${present.length > 8 ? 'limited' : ''}">${present.map(option => { const count = facetCount(key, option); const checked = values(key).includes(option); return `<label data-facet-option="${escapeHtml(option)}"><input type="checkbox" data-facet="${key}" value="${escapeHtml(option)}" ${checked ? 'checked' : ''} ${!count && !checked ? 'disabled' : ''}><span>${escapeHtml(option)}</span><small>${count}</small></label>`; }).join('')}</div>
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
  function relaxationSuggestions() {
    return FILTER_KEYS.filter(key => values(key).length).map(key => {
      const count = records.filter(record => matches(record, key)).length;
      return { key, values: values(key), count };
    }).filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
  }
  function resultsMarkup() {
    resultRecords = sortRecords(records.filter(record => matches(record)));
    const chips = [
      ...(state.q ? [`<button class="chip" data-clear-query>Zoekterm: ${escapeHtml(state.q)} ×</button>`] : []),
      ...FILTER_KEYS.flatMap(key => values(key).map(value => `<button class="chip" data-remove="${key}|${escapeHtml(value)}">${escapeHtml(value)} ×</button>`))
    ].join('');
    const oneThemeOnly = values('theme').length === 1 && !state.q && FILTER_KEYS.filter(key => key !== 'theme').every(key => !values(key).length);
    const related = values('theme').length ? relatedThemes(values('theme')[0]) : [];
    const alternative = alternativeSuggestion();
    const relaxations = relaxationSuggestions();
    const activeCount = FILTER_KEYS.reduce((sum, key) => sum + values(key).length, 0) + Number(Boolean(state.q));
    const quickFilters = [['status', 'Direct beschikbaar', 'Direct beschikbaar'], ['source', 'Met officiële bron', 'Officiële bron'], ['freshness', 'Recent gecontroleerd', 'Recent gecontroleerd']];
    const heading = oneThemeOnly ? values('theme')[0] : `${resultRecords.length} ${resultRecords.length === 1 ? 'resultaat' : 'resultaten'}${state.q ? ` voor ‘${state.q}’` : ''}`;
    return `<header class="result-head"><div><span class="eyebrow">Gevonden aanbod</span><h1>${escapeHtml(heading)}</h1><p class="result-summary" aria-live="polite">Gesorteerd op relevantie en directe bruikbaarheid.</p></div><div class="result-tools"><button class="mobile-filter btn secondary" aria-controls="filters" aria-expanded="false">Filters (${activeCount})</button><label>Sorteren<select id="sort"><option value="relevant" ${state.sort === 'relevant' ? 'selected' : ''}>Meest relevant</option><option value="available" ${state.sort === 'available' ? 'selected' : ''}>Direct beschikbaar eerst</option><option value="checked" ${state.sort === 'checked' ? 'selected' : ''}>Recent gecontroleerd</option><option value="az" ${state.sort === 'az' ? 'selected' : ''}>Titel A–Z</option></select></label></div></header>
      <div class="selection-bar"><div class="quick-filters" aria-label="Snelfilters"><span>Snel verfijnen:</span>${quickFilters.map(([key, value, label]) => `<button type="button" data-quick="${key}|${value}" aria-pressed="${values(key).includes(value)}">${label}</button>`).join('')}</div><div class="selection-actions"><button type="button" data-save-search>Bewaar zoekopdracht</button><button type="button" data-share-selection>Deel selectie</button></div></div>
      ${chips ? `<div class="chips">${chips}<button class="clear-link">Wis alles</button></div>` : ''}
      ${related.length ? `<nav class="related" aria-label="Verwante thema's"><strong>Verwante thema's</strong>${related.map(([theme, count]) => `<a href="#zoeken?theme=${encodeURIComponent(theme)}">${escapeHtml(theme)} <span>${count}</span></a>`).join('')}</nav>` : ''}
      <div id="action-feedback" class="action-feedback" aria-live="polite"></div>
      <div class="results-content">${resultRecords.length ? (oneThemeOnly ? groupedResults() : `<div class="result-list">${resultRecords.map(record => simpleCard(record, true)).join('')}</div>`) : `<div class="empty"><span class="eyebrow">Geen exacte match</span><h2>We helpen u verder</h2>${alternative ? `<a class="alternative" href="${stateHref({ q: alternative.candidate })}">Bedoelde u <strong>${escapeHtml(alternative.candidate)}</strong>? <span>${alternative.count} ${alternative.count === 1 ? 'resultaat' : 'resultaten'}</span></a>` : '<p>Voor deze zoekterm is geen aantoonbaar werkend alternatief gevonden.</p>'}${relaxations.length ? `<div class="relaxations"><h3>Meer resultaat door één keuze los te laten</h3>${relaxations.map(item => `<a href="${stateHref({ [item.key]: '' })}">Zonder ${escapeHtml(item.values.join(' of '))} <strong>${item.count}</strong></a>`).join('')}</div>` : ''}<button class="clear btn">Begin opnieuw</button><p><a href="#bijdragen">Ontbreekt er aanbod? Laat het weten.</a></p></div>`}</div>`;
  }
  function refreshFacetControls() {
    document.querySelectorAll('[data-facet]').forEach(input => {
      const key = input.dataset.facet;
      const checked = values(key).includes(input.value);
      const count = facetCount(key, input.value);
      input.checked = checked;
      input.disabled = !count && !checked;
      const counter = input.closest('label')?.querySelector('small');
      if (counter) counter.textContent = count;
    });
    document.querySelectorAll('[data-facet-block]').forEach(block => {
      const count = values(block.dataset.facetBlock).length;
      const badge = block.querySelector(':scope > summary b');
      if (badge) { badge.textContent = count; badge.hidden = !count; }
    });
    const hiddenCount = ['access', 'source', 'freshness'].reduce((sum, key) => sum + values(key).length, 0);
    const moreCount = document.querySelector('[data-more-count]');
    if (moreCount) moreCount.textContent = hiddenCount ? ` (${hiddenCount})` : '';
    const apply = document.querySelector('.apply');
    if (apply) apply.textContent = `Toon ${resultRecords.length} ${resultRecords.length === 1 ? 'resultaat' : 'resultaten'}`;
  }
  function updateSearchResults() {
    const panel = document.querySelector('#results-panel');
    if (!panel) return renderSearch();
    panel.innerHTML = resultsMarkup();
    const input = document.querySelector('#catalog-search');
    if (input && document.activeElement !== input) input.value = state.q || '';
    refreshFacetControls();
    bindResultsControls();
  }
  function renderSearch() {
    if (!hasIntent()) return renderStart();
    const typeOptions = [...new Set(records.map(typeLabel))].sort((a, b) => a.localeCompare(b, 'nl'));
    const organizationOptions = [...new Set(records.map(record => record.providerName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
    const audienceOptions = [...new Set(records.flatMap(record => record.audiences || []))].sort((a, b) => {
      const primaryDifference = Number(!PRIMARY_AUDIENCES.includes(a)) - Number(!PRIMARY_AUDIENCES.includes(b));
      return primaryDifference || a.localeCompare(b, 'nl');
    });
    resultRecords = sortRecords(records.filter(record => matches(record)));
    const hiddenCount = ['access', 'source', 'freshness'].reduce((sum, key) => sum + values(key).length, 0);
    main.innerHTML = `<section class="catalog">${searchForm('catalog-search')}<div class="catalog-grid">
      <aside class="filters" id="filters" aria-label="Zoekfilters"><header><h2>Verfijn</h2><button class="close" aria-label="Sluit filters">×</button></header>
        ${facet('theme', '1. Waar zoekt u hulp bij?', Object.keys(THEME_RULES), true)}${facet('sector', '2. Voor welke sector?', SECTORS, true)}${facet('type', '3. Wat zoekt u?', typeOptions, true)}${facet('geography', '4. Geografische reikwijdte', ['Nederland', 'Europa', 'Internationaal'], Boolean(values('geography').length))}${facet('audience', '5. Voor wie?', audienceOptions, Boolean(values('audience').length))}${facet('status', '6. Beschikbaarheid', Object.values(STATUS_LABELS), Boolean(values('status').length))}${facet('organization', '7. Aanbieder', organizationOptions, Boolean(values('organization').length))}
        <details class="more-filters"><summary>8. Meer filters<span data-more-count>${hiddenCount ? ` (${hiddenCount})` : ''}</span> <span aria-hidden="true">▼</span></summary>
          ${facet('access', 'Toegang', ['Publiek toegankelijk', 'Toegang nog niet bevestigd'])}${facet('source', 'Bron', ['Met officiële bron', 'Bron nog niet vastgelegd'])}${facet('freshness', 'Actualiteit', ['Recent gecontroleerd', 'Controle nodig'])}
        </details><button class="clear btn secondary">Wis alle filters</button><footer><button class="apply btn">Toon ${resultRecords.length} resultaten</button></footer>
      </aside><section class="results" id="results-panel">${resultsMarkup()}</section></div></section>`;
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
    addRecent(record.id);
    const lastSearch = sessionGet('atlas.lastSearch') || '#zoeken';
    const related = records.filter(item => item.id !== record.id)
      .map(item => ({ item, score: relationScore(record, item) }))
      .filter(candidate => candidate.score > 0)
      .sort((a, b) => b.score - a.score || relevance(b.item) - relevance(a.item))
      .slice(0, 4).map(candidate => candidate.item);
    const sources = record.sourceUrls || [];
    const factRows = [
      ['Aanbieder', record.providerName],
      ['Sector', (record.sectors || []).join(', ')],
      ['Voor wie', (record.audiences || []).join(', ')],
      ['Beschikbaarheid', statusLabel(record)],
      ['Geografische reikwijdte', record.geographicScope],
      ['Laatst gecontroleerd', record.lastVerified],
      ['Deadline', record.applicationDeadline || record.fundingDeadline]
    ].filter(([, value]) => value && value !== 'Nog niet ingevuld');
    main.innerHTML = `<header class="detail-hero"><div class="detail-hero-top"><span class="eyebrow">${escapeHtml(typeLabel(record))}</span>${favoriteButton(record)}</div><h1>${escapeHtml(record.title)}</h1><p>${escapeHtml(record.description || '')}</p></header>
      <section class="detail-shell"><nav class="detail-nav" aria-label="Terugnavigatie"><a class="back-results" href="${escapeHtml(lastSearch)}">← Terug naar resultaten</a><span>Home / Resultaten / ${escapeHtml(record.title)}</span></nav>
      <div class="detail-layout"><article>
        ${record.purpose ? `<h2>Waarvoor kunt u dit gebruiken?</h2><p>${escapeHtml(record.purpose)}</p>` : ''}
        ${recordThemes(record).length ? `<h2>Onderwerpen</h2><div class="detail-themes">${recordThemes(record).map(theme => `<a href="#zoeken?theme=${encodeURIComponent(theme)}">${escapeHtml(theme)}</a>`).join('')}</div>` : ''}
        ${record.eligibility ? `<h2>Voorwaarden</h2><p>${escapeHtml(record.eligibility)}</p>` : ''}
        ${related.length ? `<h2>Gerelateerd aanbod</h2><p class="section-intro">Inhoudelijk verbonden via onderwerp, sector, doelgroep, aanbieder of soort aanbod.</p><div class="related-cards">${related.map(item => simpleCard(item)).join('')}</div>` : ''}
      </article><aside class="detail-facts"><h2>In één oogopslag</h2><dl>${factRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
        ${sources.length ? `<div class="source-actions">${sources.map((sourceItem, index) => `<a class="btn ${index ? 'secondary' : ''}" href="${escapeHtml(sourceItem.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(sourceItem.label || 'Officiële bron')} ↗</a>`).join('')}</div>` : '<p class="source-warning">Voor dit record is nog geen officiële bron vastgelegd.</p>'}
        <button class="btn secondary share-item" type="button" data-share-item>Deel dit item</button>
        <p id="detail-feedback" class="action-feedback" aria-live="polite"></p>
        <a class="correction-link" href="#bijdragen">Klopt er iets niet? Geef een correctie door.</a>
      </aside></div></section>`;
    const back = document.querySelector('.back-results');
    back.onclick = () => sessionSet('atlas.restoreResults', lastSearch);
    document.querySelectorAll('.related-cards a[href^="#item/"]').forEach(link => link.onclick = () => sessionSet('atlas.lastSearch', lastSearch));
    bindFavoriteButtons();
    document.querySelector('[data-share-item]').onclick = async () => {
      const feedback = document.querySelector('#detail-feedback');
      try {
        if (navigator.share) await navigator.share({ title: record.title, text: record.description || record.title, url: location.href });
        else if (navigator.clipboard) { await navigator.clipboard.writeText(location.href); feedback.textContent = 'Link gekopieerd.'; }
        else feedback.textContent = 'Kopieer de URL uit de adresbalk om dit item te delen.';
      } catch (error) { if (error?.name !== 'AbortError') feedback.textContent = 'Delen lukte niet. Kopieer de URL uit de adresbalk.'; }
    };
  }

  function relationScore(sourceRecord, candidate) {
    let score = 0;
    const relationships = Array.isArray(sourceRecord.relationships) ? sourceRecord.relationships : [];
    const explicit = new Set([...(sourceRecord.relatedIds || []), ...relationships.map(item => item.targetId).filter(Boolean)]);
    if (explicit.has(candidate.id)) score += 20;
    if (sourceRecord.providerName && sourceRecord.providerName === candidate.providerName) score += 6;
    score += recordThemes(sourceRecord).filter(theme => recordThemes(candidate).includes(theme)).length * 5;
    score += (sourceRecord.keywords || []).filter(keyword => (candidate.keywords || []).some(other => normalize(other) === normalize(keyword))).length * 3;
    score += (sourceRecord.sectors || []).filter(sector => (candidate.sectors || []).includes(sector)).length;
    score += (sourceRecord.audiences || []).filter(audience => (candidate.audiences || []).includes(audience)).length;
    if (typeLabel(sourceRecord) === typeLabel(candidate)) score += 1;
    return score;
  }

  function suggestionData(query) {
    const normalized = normalize(query);
    if (normalized.length < 2) return [];
    const exactMatching = records.filter(record => {
      const text = recordText(record);
      return text.includes(normalized) || queryTerms(query).some(term => text.includes(term)) || recordThemes(record).some(theme => normalize(theme).includes(normalized));
    });
    const matching = (exactMatching.length ? exactMatching : records.filter(record => queryMatches(record, query))).sort((a, b) => relevance(b) - relevance(a));
    const themes = Object.keys(THEME_RULES).map(theme => ({
      theme,
      count: recordsForCriteria({ theme }).filter(record => queryMatches(record, query) || normalize(theme).includes(normalized) || queryTerms(query).some(term => normalize(THEME_RULES[theme].join(' ')).includes(term))).length
    })).filter(item => item.count && (normalize(item.theme).includes(normalized) || THEME_RULES[item.theme].some(term => normalize(term).includes(normalized) || normalized.includes(normalize(term)))))
      .sort((a, b) => b.count - a.count).slice(0, 3);
    const organizations = [...new Set(matching.map(record => record.providerName).filter(Boolean))]
      .filter(name => normalize(name).includes(normalized) || matching.filter(record => record.providerName === name).length > 1).slice(0, 4);
    const sections = [];
    if (themes.length) sections.push({ label: 'Onderwerpen', items: themes.map(item => ({ label: item.theme, meta: `${item.count} resultaten`, href: stateHref({ q: '', theme: item.theme }) })) });
    if (organizations.length) sections.push({ label: 'Organisaties', items: organizations.map(name => ({ label: name, meta: `${matching.filter(record => record.providerName === name).length} resultaten`, href: stateHref({ q: '', organization: name }) })) });
    const definitions = [
      ['Hulpmiddelen', ['Handreiking', 'Hulpmiddel', 'Voorziening', 'Training']],
      ['Wetgeving', ['Wetgeving']], ['Subsidies', ['Subsidie', 'Subsidie of call']],
      ['Praktijkvoorbeelden', ['Praktijkvoorbeeld']], ['Pilots', ['Pilot']]
    ];
    definitions.forEach(([label, types]) => {
      const items = matching.filter(record => types.includes(typeLabel(record))).slice(0, label === 'Hulpmiddelen' ? 4 : 3);
      if (items.length) sections.push({ label, items: items.map(record => ({ label: record.title, meta: record.providerName, href: `#item/${encodeURIComponent(record.id)}` })) });
    });
    return sections.slice(0, 6);
  }
  function bindSearchForm() {
    const form = document.querySelector('.atlas-search');
    const input = form.querySelector('input');
    const suggestions = form.querySelector('.suggestions');
    form.onsubmit = event => { event.preventDefault(); applyNaturalQuery(input.value); setUrl(); };
    input.oninput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const sections = suggestionData(input.value);
        suggestions.hidden = !sections.length;
        input.setAttribute('aria-expanded', String(!suggestions.hidden));
        suggestions.innerHTML = sections.map(section => `<section><h2>${escapeHtml(section.label)}</h2>${section.items.map(item => `<a href="${escapeHtml(item.href)}"><span>${escapeHtml(item.label)}</span>${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ''}</a>`).join('')}</section>`).join('');
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

  function renderMyAtlas() {
    const favoriteRecords = favoriteIds().map(id => records.find(record => record.id === id)).filter(Boolean);
    const saved = localList(SAVED_SEARCHES_KEY).filter(item => item && item.hash);
    const recent = localList(RECENT_KEY).map(id => records.find(record => record.id === id)).filter(Boolean);
    main.innerHTML = `<section class="personal-page"><header class="page-intro"><span class="eyebrow">Alleen op dit apparaat</span><h1>Mijn atlas</h1><p>Uw favorieten, bewaarde zoekopdrachten en recent bekeken aanbod blijven lokaal in deze browser. Er wordt niets verzonden of gevolgd.</p></header>
      <section><div class="section-title"><div><h2>Favorieten</h2><p>${favoriteRecords.length ? `${favoriteRecords.length} bewaard` : 'Bewaar aanbod met de sterknop.'}</p></div></div>${favoriteRecords.length ? `<div class="personal-grid">${favoriteRecords.map(record => teaserCard(record)).join('')}</div>` : `<div class="personal-empty"><p>Nog geen favorieten.</p><a class="btn" href="#zoeken">Zoek aanbod</a></div>`}</section>
      <section><div class="section-title"><div><h2>Bewaarde zoekopdrachten</h2><p>Open uw selectie opnieuw met alle filters intact.</p></div></div>${saved.length ? `<div class="saved-list">${saved.map((item, index) => `<article><div><h3><a href="${escapeHtml(item.hash)}">${escapeHtml(item.label || 'Bewaarde selectie')}</a></h3><p>Bewaard ${escapeHtml(dateLabel(String(item.savedAt || '').slice(0, 10)))}</p></div><button type="button" data-remove-saved="${index}">Verwijder</button></article>`).join('')}</div>` : '<div class="personal-empty"><p>Nog geen zoekopdrachten bewaard.</p></div>'}</section>
      <section><div class="section-title"><div><h2>Recent bekeken</h2><p>Uw laatste bekeken items op dit apparaat.</p></div>${recent.length ? '<button type="button" class="text-button" data-clear-recent>Wis geschiedenis</button>' : ''}</div>${recent.length ? `<div class="personal-grid">${recent.slice(0, 8).map(record => teaserCard(record)).join('')}</div>` : '<div class="personal-empty"><p>Nog geen aanbod bekeken.</p></div>'}</section>
    </section>`;
    bindFavoriteButtons();
    document.querySelectorAll('[data-remove-saved]').forEach(button => button.onclick = () => {
      const current = localList(SAVED_SEARCHES_KEY);
      current.splice(Number(button.dataset.removeSaved), 1);
      saveLocalList(SAVED_SEARCHES_KEY, current); renderMyAtlas();
    });
    const clearRecent = document.querySelector('[data-clear-recent]');
    if (clearRecent) clearRecent.onclick = () => { saveLocalList(RECENT_KEY, []); renderMyAtlas(); };
  }

  function renderContribute() {
    const issueUrl = 'https://github.com/ECMW/ai-onderwijs-atlas-nederland/issues/new?title=Aanbod%20of%20correctie%20voor%20de%20atlas&body=Wat%20wilt%20u%20toevoegen%20of%20corrigeren%3F%0A%0AOffici%C3%ABle%20bron%20(verplicht)%3A%0A%0AToelichting%3A';
    main.innerHTML = `<section class="contribute-page"><header class="page-intro"><span class="eyebrow">Samen actueel houden</span><h1>Ontbreekt er iets of klopt er iets niet?</h1><p>Geef een toevoeging of correctie door met een officiële bron. Zo blijft de atlas controleerbaar en hoeft niemand informatie op goed vertrouwen over te nemen.</p></header>
      <div class="contribute-options"><article><span aria-hidden="true">＋</span><h2>Aanbod toevoegen</h2><p>Meld een handreiking, training, voorziening, subsidie, pilot of praktijkvoorbeeld dat nog ontbreekt.</p><a class="btn" href="${issueUrl}" target="_blank" rel="noopener noreferrer">Open bijdrageformulier ↗</a></article><article><span aria-hidden="true">✓</span><h2>Informatie corrigeren</h2><p>Stuur de juiste titel, status, deadline of bron. Vermeld om welk atlasitem het gaat.</p><a class="btn secondary" href="${issueUrl}" target="_blank" rel="noopener noreferrer">Geef correctie door ↗</a></article></div>
      <aside class="source-policy"><h2>Wat hebben we nodig?</h2><ul><li>Een concrete titel en korte toelichting</li><li>Een officiële bron van de aanbieder of overheid</li><li>Bij subsidies: status en deadline uit de officiële aanvraagpagina</li></ul><p>Bijdragen worden openbaar en transparant beoordeeld via GitHub. Marketingclaims worden niet als feiten overgenomen.</p></aside></section>`;
  }
  function bindFavoriteButtons(root = document) {
    root.querySelectorAll('[data-favorite]').forEach(button => button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const active = toggleFavorite(button.dataset.favorite);
      document.querySelectorAll(`[data-favorite="${CSS.escape(button.dataset.favorite)}"]`).forEach(item => {
        item.setAttribute('aria-pressed', String(active));
        item.setAttribute('aria-label', active ? 'Verwijder uit favorieten' : 'Bewaar als favoriet');
        item.innerHTML = `<span aria-hidden="true">${active ? '★' : '☆'}</span><span>${active ? 'Bewaard' : 'Bewaar'}</span>`;
      });
    });
  }
  function currentSearchLabel() {
    const parts = [state.q && `‘${state.q}’`, ...FILTER_KEYS.flatMap(key => values(key))].filter(Boolean);
    return parts.slice(0, 4).join(' · ') || 'Alle aanbod';
  }
  function setActionFeedback(message) {
    const feedback = document.querySelector('#action-feedback');
    if (feedback) feedback.textContent = message;
  }
  function saveCurrentSearch() {
    const item = { hash: location.hash, label: currentSearchLabel(), savedAt: new Date().toISOString() };
    const next = [item, ...localList(SAVED_SEARCHES_KEY).filter(saved => saved.hash !== item.hash)].slice(0, 10);
    saveLocalList(SAVED_SEARCHES_KEY, next);
    setActionFeedback('Zoekopdracht lokaal bewaard in Mijn atlas.');
  }
  async function shareCurrentSelection() {
    const shareData = { title: 'AI & Onderwijs Atlas Nederland', text: `Bekijk deze selectie: ${currentSearchLabel()}`, url: location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) { await navigator.clipboard.writeText(location.href); setActionFeedback('Link naar deze selectie gekopieerd.'); }
      else setActionFeedback('Kopieer de URL uit de adresbalk om deze selectie te delen.');
    } catch (error) {
      if (error?.name !== 'AbortError') setActionFeedback('Delen lukte niet. Kopieer de URL uit de adresbalk.');
    }
  }
  function bindResultsControls() {
    const panel = document.querySelector('#results-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-quick]').forEach(button => button.onclick = () => {
      const [key, value] = button.dataset.quick.split('|');
      const selected = values(key);
      state[key] = selected.includes(value) ? selected.filter(item => item !== value).join(',') : [...selected, value].join(',');
      setUrl();
    });
    panel.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
      const [key, value] = button.dataset.remove.split('|');
      state[key] = values(key).filter(item => item !== value).join(',');
      setUrl();
    });
    const clearQuery = panel.querySelector('[data-clear-query]');
    if (clearQuery) clearQuery.onclick = () => { state.q = ''; setUrl(); };
    panel.querySelectorAll('.clear-link,.empty .clear').forEach(button => button.onclick = () => { state = { q: '', sort: 'relevant' }; setUrl(); });
    const sort = panel.querySelector('#sort');
    if (sort) sort.onchange = event => { state.sort = event.target.value; setUrl(); };
    const saveSearch = panel.querySelector('[data-save-search]');
    if (saveSearch) saveSearch.onclick = saveCurrentSearch;
    const share = panel.querySelector('[data-share-selection]');
    if (share) share.onclick = shareCurrentSelection;
    panel.querySelectorAll('.result-card a[href^="#item/"]').forEach(link => link.onclick = () => {
      sessionSet('atlas.lastSearch', location.hash); sessionSet('atlas.resultsScroll', scrollY);
    });
    bindFavoriteButtons(panel);
    const opener = panel.querySelector('.mobile-filter');
    if (opener) opener.onclick = () => {
      const filters = document.querySelector('#filters');
      filters.classList.add('open'); document.body.classList.add('locked'); opener.setAttribute('aria-expanded', 'true');
      filters.querySelector('.close').focus();
    };
  }
  function bindSearchPage() {
    bindSearchForm();
    document.querySelectorAll('[data-facet]').forEach(input => input.onchange = () => {
      const selected = values(input.dataset.facet);
      input.checked ? selected.push(input.value) : selected.splice(selected.indexOf(input.value), 1);
      state[input.dataset.facet] = [...new Set(selected)].join(','); setUrl();
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
    const panel = document.querySelector('#filters'); const closer = panel.querySelector('.close');
    panel.querySelector('.clear').onclick = () => { state = { q: '', sort: 'relevant' }; setUrl(); };
    const closePanel = () => {
      const opener = document.querySelector('.mobile-filter');
      panel.classList.remove('open'); document.body.classList.remove('locked');
      if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); }
    };
    closer.onclick = panel.querySelector('.apply').onclick = closePanel;
    bindResultsControls();
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
    if (path === 'mijn-atlas') renderMyAtlas();
    if (path === 'bijdragen') renderContribute();
    document.querySelectorAll('.site-header nav a').forEach(link => link.removeAttribute('aria-current'));
    document.querySelector(`.site-header nav a[href="#${CSS.escape(path)}"]`)?.setAttribute('aria-current', 'page');
    const updated = document.querySelector('[data-updated]'); if (updated) updated.textContent = source.metadata.updated || '';
  }
  addEventListener('hashchange', route); addEventListener('popstate', route); route();
})();
