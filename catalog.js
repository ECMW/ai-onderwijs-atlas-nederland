(() => {
  'use strict';

  const source = window.ATLAS_RECORDS;
  const main = document.querySelector('main');
  if (window.ATLAS_STARTUP && (window.ATLAS_STARTUP.status === 'failed' || !window.ATLAS_STARTUP.validData())) {
    window.ATLAS_STARTUP.fail();
    return;
  }
  if (!source || !main) return;

  // The fragment already identifies the visitor's current page and filters.
  const skipLink = document.querySelector('a.skip');
  if (skipLink) skipLink.onclick = event => {
    event.preventDefault();
    main.focus({preventScroll:true});
    window.scrollTo({top:0, behavior:'instant'});
  };

  const allRecords = source.records || [];
  const records = allRecords.filter(record =>
    !Object.hasOwn(record, 'publicationExclusion') &&
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
  // These existing editorial labels describe the same catalogue categories.
  // Other specific topics remain distinct and stay selectable in the filters.
  const THEME_ALIASES = {
    'ai act': 'AI Act en wetgeving', governance: 'Beleid en governance',
    implementatie: 'Implementatie en adoptie', curriculum: 'Curriculumontwikkeling',
    'ai infrastructuur': 'Data en infrastructuur', ethiek: 'Publieke waarden en ethiek'
  };
  const SYNONYMS = [
    ['ecosysteem', 'ecosystemen'],
    ['ai literacy', 'ai geletterdheid'], ['toetsen', 'toetsing', 'examinering'],
    ['lesontwerp', 'lesvoorbereiding', 'lesplanning', 'lesplan', 'lesplannen'],
    ['privacy', 'avg', 'persoonsgegevens'], ['ai wet', 'ai act', 'ai verordening'],
    ['veilige ai', 'ai werkplek', 'veilige omgeving'], ['subsidie', 'subsidies', 'financiering', 'call', 'calls', 'regeling'],
    ['beleid', 'beleidskader', 'richtlijn', 'voorbeeldbeleid'], ['training', 'trainingen', 'scholing', 'professionalisering', 'workshop', 'workshops', 'cursus', 'trainer', 'trainers'],
    ['tool', 'hulpmiddel', 'product', 'voorziening'], ['prompting', 'prompten', 'prompt'], ['boek', 'boeken', 'leesboek', 'studieboek', 'handboek']
  ];
  const STATUS_LABELS = {
    available: 'Direct beschikbaar', open_call: 'Open voor aanvragen', closed_call: 'Aanvraag gesloten', pilot: 'Pilot',
    in_development: 'In ontwikkeling', planned: 'Gepland', needs_verification: 'Te verifiëren',
    archived: 'Niet meer actueel'
  };
  const TYPE_LABELS = {
    Organisatie: 'Organisatie', Product: 'Hulpmiddel', Handreiking: 'Handreiking',
    Voorziening: 'Voorziening', Training: 'Training', Boek: 'Boek', Praktijkvoorbeeld: 'Praktijkvoorbeeld',
    Pilot: 'Pilot', Subsidie: 'Subsidie', Call: 'Subsidie of call', Programma: 'Programma',
    Wetgeving: 'Wetgeving', Standaard: 'Standaard', Behoefte: 'Geïdentificeerde behoefte',
    'Witte vlek': 'Geïdentificeerde behoefte'
  };
  const OFFER_CATEGORIES = {
    software: 'AI-software', materials: 'Les- en werkmaterialen',
    knowledge: 'Handreikingen, kennisbanken en ondersteuning',
    unclassified: 'Aanbodvorm nog niet ingedeeld'
  };
  const PRIMARY_AUDIENCES = ['Docenten', 'Bestuurders', 'IT-professionals', 'Onderzoekers'];
  const PROFILE_ROLES = ['Docenten', 'Onderwijsontwikkelaars', 'Toetsmakers', 'Schoolleiders', 'Bestuurders',
    'Beleidsmakers', 'IT-professionals', 'Privacyprofessionals', 'Ondersteunend personeel', 'Onderzoekers', 'Studenten', 'Leerlingen'];
  const SECTORS = ['PO', 'VO', 'MBO', 'HBO', 'WO', 'Onderzoek', 'Overheid'];
  const ACCESS_LABELS = {
    public: 'Publiek toegankelijk', registration_required: 'Registratie nodig',
    paid: 'Betaalde toegang', restricted: 'Beperkte toegang', unknown: 'Toegang niet vastgesteld'
  };
  const LANGUAGE_LABELS = {
    nl: 'Nederlands', en: 'Engels', de: 'Duits', fr: 'Frans', es: 'Spaans',
    Meertalig: 'Meertalig (talen niet gespecificeerd)', unknown: 'Taal niet vastgesteld'
  };
  const PERSONA_KEY = 'atlas.persona';
  const FILTER_KEYS = ['theme', 'audience', 'sector', 'vak', 'status', 'type', 'geography', 'organization', 'cost', 'language', 'access', 'source'];
  const SORT_OPTIONS = {
    relevant: 'Meest relevant',
    added: 'Nieuwste in de Atlas eerst',
    published: 'Nieuwste publicatie eerst',
    'published-oldest': 'Oudste publicatie eerst',
    az: 'Titel A–Z'
  };
  const ROLE_ALIASES = {
    docent: 'Docenten', leraar: 'Docenten', leerkracht: 'Docenten',
    bestuurder: 'Bestuurders', schoolleider: 'Bestuurders', manager: 'Bestuurders',
    onderzoeker: 'Onderzoekers', wetenschapper: 'Onderzoekers', lector: 'Onderzoekers',
    'it professional': 'IT-professionals', ict: 'IT-professionals', it: 'IT-professionals'
  };
  const TYPE_QUERY_RULES = {
    materials: ['lesmateriaal', 'lesmaterialen', 'werkmateriaal', 'werkmaterialen', 'kaartenset'],
    knowledge: ['kennisbank', 'kennisbanken', 'ondersteuning'],
    Handreiking: ['handreiking', 'handleiding'], Training: ['training', 'trainingen', 'cursus', 'workshop', 'workshops', 'trainer', 'trainers'],
    Boek: ['boek', 'boeken', 'leesboek', 'studieboek', 'praktijkboek', 'handboek'],
    Praktijkvoorbeeld: ['praktijkvoorbeeld', 'voorbeeld uit de praktijk'],
    Hulpmiddel: ['hulpmiddel'], Organisatie: ['organisatie', 'kennisorganisatie', 'instelling'],
    'Subsidie of call,Subsidie': ['subsidie', 'subsidies', 'call', 'calls']
  };
  const QUERY_STOPWORDS = new Set(['ik', 'ben', 'wij', 'zijn', 'zoek', 'zoeken', 'iets', 'over', 'voor', 'de', 'het', 'een', 'en', 'of', 'naar', 'graag', 'wil', 'willen', 'nodig', 'informatie']);
  const SECTOR_QUERY_NAMES = {
    PO: ['primair onderwijs', 'basisonderwijs', 'basisschool', 'basisscholen'],
    VO: ['voortgezet onderwijs', 'middelbare school', 'middelbare scholen'],
    MBO: ['middelbaar beroepsonderwijs'],
    HBO: ['hoger beroepsonderwijs', 'hogeschool', 'hogescholen'],
    WO: ['wetenschappelijk onderwijs', 'universitair onderwijs', 'universiteit', 'universiteiten'],
    'HBO,WO': ['hoger onderwijs']
  };
  const PRACTICE_QUERIES = [
    { terms: ['les over ai', 'lessen over ai', 'lesgeven over ai', 'les over generatieve ai', 'lessen over generatieve ai'], type: 'materials', theme: 'AI-geletterdheid', fallback: 'les' },
    { terms: ['met ai een les voorbereiden', 'met ai lessen voorbereiden', 'les voorbereiden met ai', 'les met ai voorbereiden', 'les ontwerpen met ai'], type: 'materials,knowledge', theme: 'Lesgeven en leren met AI', keyword: 'lesontwerp' },
    { terms: ['les met ai', 'lessen met ai', 'lesgeven met ai', 'met ai een les'], theme: 'Lesgeven en leren met AI' },
    { terms: ['lesmateriaal', 'lesmaterialen', 'lespakket', 'werkblad'], type: 'materials', fallback: 'les' },
    { terms: ['toets', 'toetsen', 'tentamen', 'examen'], action: /\b(?:herontwerp|herontwerpen|ontwerp|ontwerpen|herzie|herzien|aanpassen|pas)\b/, type: 'materials,knowledge', theme: 'Toetsing en examinering', keyword: 'toets' },
    { terms: ['teamafspraken', 'schoolafspraken', 'afspraken maken', 'afspraken over ai'], theme: 'Beleid en governance', keyword: 'afspraken' },
    { terms: ['teamscholing', 'teamtraining', 'team scholen', 'training voor mijn team', 'scholing voor mijn team', 'scholing voor ons team'], type: 'Training' }
  ];
  const REQUEST_WORDS = new Set([
    'we', 'hoe', 'waar', 'wat', 'welk', 'welke', 'vind', 'vinden', 'kan', 'kunnen', 'geef', 'geven',
    'maak', 'maken', 'met', 'op', 'in', 'aan', 'bij', 'mijn', 'ons', 'onze', 'herontwerp', 'herontwerpen',
    'ontwerp', 'ontwerpen', 'herzie', 'herzien', 'pas', 'aanpassen', 'voorbereiden'
  ]);
  const PRACTICAL_PRIORITY = {
    software: 50, materials: 50, knowledge: 70,
    Handreiking: 70, Voorziening: 65, Training: 60, Boek: 58, Praktijkvoorbeeld: 55,
    Hulpmiddel: 50, 'Subsidie of call': 45, Subsidie: 45, Pilot: 40,
    Wetgeving: 35, Standaard: 30, Programma: 25, Organisatie: 5,
    'Geïdentificeerde behoefte': 0
  };
  const TASKS = [
    { label: 'Hulp bij toetsing', detail: 'Toetsontwerp, examinering en nakijken', query: { theme: 'Toetsing en examinering' } },
    { label: 'AI Act begrijpen', detail: 'Regels, rollen en risicoclassificatie', query: { theme: 'AI Act en wetgeving' } },
    { label: 'Subsidie vinden', detail: 'Nederlandse én internationale calls', query: { type: 'Subsidie of call,Subsidie' } },
    { label: 'AI-geletterdheid', detail: 'Raamwerken en professionalisering', query: { theme: 'AI-geletterdheid' } },
    { label: 'Een AI-toepassing kiezen', detail: 'Criteria, bronnen en voorwaarden afwegen', query: { theme: 'Veilige AI-omgeving' } },
    { label: 'Beleid en afspraken maken', detail: 'Afspraken, governance en implementatie', query: { theme: 'Beleid en governance' } },
    { label: 'Praktijkvoorbeelden', detail: 'Ervaringen uit instellingen en scholen', query: { type: 'Praktijkvoorbeeld' } },
    { label: 'Workshops en trainers', detail: 'Trainingen, begeleiders en leren met uw team', query: { type: 'Training' } },
    { label: 'Boeken en materialen', detail: 'Nederlandstalige boeken over AI, onderwijs, data en publieke waarden', href: '#boeken' },
    { label: 'Organisatie vinden', detail: 'Vind een organisatie per sector of onderwerp', query: { type: 'Organisatie' } }
  ];
  const BOOKS_MATERIAL_IDS = new Set([
    'vu-handboek-ai-geletterdheid-studenten',
    'open-inspiratielessen-over-ai',
    'mbo-mediawijs-open-ai-leermaterialen',
    'eerlijk-over-ai-ai-coach-opleiding-open-source',
    'ai-waaier-voor-toetsen',
    'han-toolkit-ai-bestendig-toetsen',
    'ai-voor-docenten-gesprekskaarten-ai-onderwijs',
    'ai-voor-docenten-kies-handleidingen-kaarten',
    'techyourfuture-les-basiskennis-ai',
    'mediawijs-edubox-artificiele-intelligentie',
    'data-maatschappij-ai-omgeving-posters',
    'hu-care-werkvormen-ai-geletterdheid'
  ]);

  let state = {};
  let resultRecords = [];
  let resultCountLabel = '0 resultaten';
  let compactResults = sessionGet('atlas.resultLayout') === 'list';
  const RESULT_BATCH = 24;

  function resultView() {
    const view = window.history?.state?.atlasResults;
    return view?.route === (location.hash || '#home') ? view : {};
  }
  function isResultRoute(route) {
    return /^#(?:home|zoeken|organisaties)(?:\?|$)/.test(route);
  }
  function resultFocusTarget(container, focusId, focusControl) {
    if (!focusId) return null;
    const control = focusControl === 'pick' ? '[data-sheet-pick]'
      : focusControl === 'details' ? '.offer-secondary-actions a[href^="#item/"]' : 'h2 a';
    return container.querySelector(`[data-record-id="${CSS.escape(focusId)}"] ${control}`);
  }
  function saveResultView(view) {
    window.history?.replaceState?.({ ...window.history.state, atlasResults: { ...view, route: location.hash || '#home' } }, '');
  }
  function restoreCardFocus(target, y) {
    target?.focus({preventScroll: true});
    requestAnimationFrame(() => {
      if (target && !main.contains(target)) return;
      if (target && document.activeElement !== target) {
        if (document.activeElement !== main && document.activeElement !== document.body) return;
        target.focus({preventScroll: true});
      }
      scrollTo({top: y || 0, behavior: 'instant'});
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
      if (rect.top < headerBottom || rect.bottom > window.innerHeight) {
        const freeSpace = Math.max(0, window.innerHeight - headerBottom - rect.height);
        scrollBy({top: rect.top - headerBottom - freeSpace / 2, behavior: 'instant'});
      }
    });
  }
  function saveReturnView(view, route = location.hash || '#home') {
    saveResultView(view);
    sessionSet('atlas.returnView', JSON.stringify({...view, route}));
    sessionSet('atlas.lastSearch', route);
  }
  function restoreReturnView() {
    const route = sessionGet('atlas.restoreResults');
    if (!route || route !== (location.hash || '#home')) return false;
    sessionSet('atlas.restoreResults', '');
    try {
      const view = JSON.parse(sessionGet('atlas.returnView'));
      if (view?.route === route) saveResultView(view);
    } catch { /* Older visits can have a scroll position without a card. */ }
    return true;
  }
  function resultListMarkup() {
    const shown = Math.min(resultRecords.length, Math.max(RESULT_BATCH, Number(resultView().shown) || 0));
    const footer = resultRecords.length > RESULT_BATCH ? `<div class="result-batches">
      <span data-result-progress role="status">${shown} van ${resultRecords.length} resultaten getoond</span>
      <button type="button" class="btn secondary" data-more-results ${shown === resultRecords.length ? 'hidden' : ''}>Toon meer resultaten</button></div>` : '';
    return `<div class="result-layout" role="group" aria-label="Resultaatweergave"><span>Weergave</span>
      <label><input type="radio" name="result-layout" value="cards"${compactResults ? '' : ' checked'}> Kaarten</label>
      <label><input type="radio" name="result-layout" value="list"${compactResults ? ' checked' : ''}> Lijst</label></div>
      <div class="result-list${compactResults ? ' compact-results' : ''}" data-result-list>${resultRecords.slice(0, shown).map(catalogueResult).join('')}</div>${footer}`;
  }
  let debounceTimer;
  let todayCache = { value: '', checkedAt: 0 };
  const dutchCalendar = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit'
  });

  let temporaryProfile;
  function profileCriteria(value) {
    // Older browsers may hold a single role or a list of roles under the same key.
    const roles = Array.isArray(value) ? value : typeof value === 'string' ? [value] : typeof value?.audience === 'string' ? value.audience.split(',') : [];
    return {
      audience: PROFILE_ROLES.filter(role => roles.includes(role)).join(','),
      sector: SECTORS.includes(value?.sector) ? value.sector : '',
      vak: typeof value?.vak === 'string' ? filterValues('vak', value.vak.slice(0, 160)).join(',') : ''
    };
  }
  function readProfile() {
    if (temporaryProfile) return temporaryProfile;
    let value;
    try { value = localStorage.getItem(PERSONA_KEY); } catch { /* Browser storage is optional. */ }
    try { return profileCriteria(JSON.parse(value)); } catch { return profileCriteria(value); }
  }
  function saveProfile(profile) {
    try {
      if (Object.values(profile).some(Boolean)) localStorage.setItem(PERSONA_KEY, JSON.stringify(profile));
      else localStorage.removeItem(PERSONA_KEY);
      temporaryProfile = undefined;
    } catch { temporaryProfile = profile; }
  }
  function sessionGet(key) { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } }
  function sessionSet(key, value) { try { sessionStorage.setItem(key, String(value)); } catch { /* sessieopslag kan geblokkeerd zijn */ } }
  const publicRecordsById = new Map(records.map(record => [record.id, record]));
  function selectedPublicIds(ids) {
    return [...new Set(ids.map(id => publicRecordsById.has(id) ? id : source.metadata?.recordRedirects?.[id])
      .filter(id => publicRecordsById.has(id)))];
  }
  const sheetPicks = new Set(selectedPublicIds(new URLSearchParams(sessionGet('atlas.sheetPicks')).getAll('item')));
  function selectedHref(page, ids = sheetPicks, differences = false) {
    const params = new URLSearchParams();
    for (const id of ids) params.append('item', id);
    if (differences) params.set('verschillen', '1');
    return '#' + page + (params.size ? '?' + params : '');
  }
  function persistSheetPicks() {
    sessionSet('atlas.sheetPicks', selectedHref('overlegblad').split('?')[1] || '');
  }
  const personaLabel = value => ({ Docenten: 'Docent', Onderwijsontwikkelaars: 'Onderwijsontwikkelaar', Toetsmakers: 'Toetsmaker',
    Schoolleiders: 'Schoolleider', Bestuurders: 'Bestuurder', Beleidsmakers: 'Beleidsmaker', 'IT-professionals': 'IT-professional',
    Privacyprofessionals: 'Privacyprofessional', Onderzoekers: 'Onderzoeker', Studenten: 'Student', Leerlingen: 'Leerling' }[value] || value);

  const recordText = record => normalize([
    record.title, record.description, record.purpose, record.providerName,
    record.lessonStart ? 'les lesstart lesstarts' : '', record.lessonStart?.question, record.lessonStart?.level,
    record.lessonStart?.task, record.lessonStart?.learningGoal, record.lessonStart?.activityType,
    ...(record.authors || []), record.isbn, record.bookCategory, record.legacyType, record.subtype, record.status, ...(record.audiences || []), ...(record.sectors || []),
    ...(record.subjects || []), ...(record.themes || []), ...(record.keywords || [])
  ].join(' '));
  const recordThemes = record => {
    const explicit = record.themes || [];
    if (explicit.length) return [...new Set(explicit.map(canonicalTheme))];
    const text = recordText(record);
    return Object.entries(THEME_RULES)
      .filter(([, terms]) => terms.some(term => text.includes(normalize(term))))
      .map(([theme]) => theme);
  };
  function canonicalTheme(value) {
    const key = normalize(value);
    return Object.hasOwn(THEME_ALIASES, key) ? THEME_ALIASES[key] : value;
  }
  function themeOptions() {
    return [...new Set([...Object.keys(THEME_RULES), ...records.flatMap(recordThemes)])];
  }
  const typeLabel = record => TYPE_LABELS[record.legacyType] || record.legacyType || record.recordType;
  const offerType = record => {
    if (Object.hasOwn(OFFER_CATEGORIES, record.offerCategory) && record.offerCategory !== 'unclassified') return record.offerCategory;
    if (typeLabel(record) === 'Handreiking') return 'knowledge';
    if (['Hulpmiddel', 'Voorziening'].includes(typeLabel(record))) return 'unclassified';
    return typeLabel(record);
  };
  const offerLabel = record => filterOptionLabel('type', offerType(record));
  function todayInNetherlands() {
    const now = Date.now();
    if (!todayCache.value || now - todayCache.checkedAt >= 60_000) {
      todayCache = { checkedAt: now, value: dutchCalendar.format(now) };
    }
    return todayCache.value;
  }
  const isFunding = record => ['funding_call', 'subsidy'].includes(record.recordType) || ['Call', 'Subsidie'].includes(record.legacyType);
  function deadlineInstant(record) {
    const value = record.applicationDeadlineAt;
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
      validDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value)) ? value : '';
  }
  function effectiveStatus(record, today = todayInNetherlands(), now = Date.now()) {
    if (validDate(today)) {
      if (record.status === 'open_call' && isFunding(record)) {
        const instant = deadlineInstant(record);
        const deadline = validDate(record.applicationDeadline) || validDate(record.fundingDeadline);
        if (instant ? now >= Date.parse(instant) : deadline && deadline < today) return 'closed_call';
        if (validDate(record.applicationOpenDate) > today) return 'planned';
      }
      const end = validDate(record.endDate);
      if ((record.recordType === 'training' || record.legacyType === 'Training') &&
          ['available', 'planned'].includes(record.status) && end && end < today) return 'archived';
    }
    return record.status;
  }
  const statusLabel = (record, today) => {
    if (['Behoefte', 'Witte vlek'].includes(record.legacyType)) return 'Geïdentificeerde behoefte';
    return STATUS_LABELS[effectiveStatus(record, today)] || 'Te verifiëren';
  };
  const displayStatus = record => isFunding(record) && record.status === 'available' ? 'Regeling of informatiebron' : statusLabel(record);
  const worksheets = Object.entries(source.worksheets || {});
  const catalogueSubjectNames = new Map(records.flatMap(record =>
    (record.subjects || []).map(name => [normalize(name), name])));
  const subjectNames = new Map([...catalogueSubjectNames, ...worksheets.flatMap(([, sheet]) =>
    sheet.subjects.map(name => [normalize(name), name]))]);
  const subjectOptions = [...subjectNames.values()].sort((a, b) => a.localeCompare(b, 'nl'))
    .map(name => `<option value="${escapeHtml(name)}"></option>`).join('');
  const subjectWords = new WeakMap();
  function subjectMatches(record, value) {
    const term = normalize(value);
    if (!term) return false;
    const name = catalogueSubjectNames.get(term);
    if (name) return (record.subjects || []).includes(name);
    if (!subjectWords.has(record)) {
      const content = [record.title, record.description, record.purpose, ...(record.subjects || []),
        ...(record.keywords || []), ...(record.themes || []), record.lessonStart?.level,
        record.lessonStart?.question, record.lessonStart?.task].filter(Boolean);
      subjectWords.set(record, new Set(normalize(content.join(' ')).split(' ')));
    }
    const words = subjectWords.get(record);
    return term.split(' ').every(word => words.has(word));
  }
  const organizationNames = [...new Set(records.map(record => record.providerName).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
  function filterValues(key, value) {
    const raw = String(value || '');
    if (key === 'vak') {
      const text = raw.trim().replace(/\s+/g, ' ');
      if (!text) return [];
      // Previously shared links could select several catalogue subjects.
      const parts = text.split(',').map(item => item.trim());
      if (parts.every(item => subjectNames.has(normalize(item)))) {
        return [...new Set(parts.map(item => subjectNames.get(normalize(item))))];
      }
      return [text];
    }
    if (key === 'organization') {
      // New comma-containing selections use a JSON array; old shared URLs keep
      // working by matching the longest complete known provider name first.
      if (raw.startsWith('[')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) return [...new Set(parsed.filter(Boolean))];
        } catch { /* Preserve unrecognised legacy text as an exact selection. */ }
      }
      const selected = [];
      let remaining = raw;
      while (remaining) {
        const name = organizationNames.find(item => remaining === item || remaining.startsWith(item + ','));
        const next = name || remaining.split(',')[0];
        if (next) selected.push(next);
        remaining = remaining.slice(next.length + 1);
      }
      return [...new Set(selected)];
    }
    return [...new Set(raw.split(',').filter(Boolean).map(item => key === 'theme' ? canonicalTheme(item)
      : key === 'access' && item === 'Toegang nog niet bevestigd' ? ACCESS_LABELS.unknown : item))];
  }
  function serializeFilterValues(key, selected) {
    const unique = [...new Set(selected)];
    return key === 'organization' && (unique.length > 1 || unique.some(item => item.includes(','))) ? JSON.stringify(unique) : unique.join(',');
  }
  const values = key => filterValues(key, state[key]);
  const queryTerms = query => {
    const normalized = normalize(query);
    const terms = normalized ? [normalized] : [];
    SYNONYMS.forEach(group => {
      if (group.some(term => phrasePresent(normalized, term))) terms.push(...group.map(normalize));
    });
    return [...new Set(terms)];
  };
  const facetValues = {
    theme: recordThemes,
    sector: record => record.sectors || [],
    status: record => [statusLabel(record)],
    type: record => [offerType(record), typeLabel(record)],
    audience: record => record.audiences || [],
    organization: record => [record.providerName],
    geography: record => [record.geographicScope || 'Reikwijdte niet ingevuld'],
    cost: record => [costLabel(record)],
    language: recordLanguages,
    access: record => [accessLabel(record)],
    source: record => [(record.sourceUrls || []).length ? 'Met officiële bron' : 'Bron nog niet vastgelegd']
  };
  function activeFilters(criteria) {
    return FILTER_KEYS.map(key => [key, filterValues(key, criteria[key])])
      .filter(([, selected]) => selected.length);
  }

  function parseState() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const sort = params.get('sort');
    state = { q: params.get('q') || '', sort: Object.hasOwn(SORT_OPTIONS, sort) ? sort : 'relevant' };
    FILTER_KEYS
      .forEach(key => state[key] = params.get(key) || '');
    state.vak = filterValues('vak', state.vak).join(',');
    if (!state.audience && params.get('aud')) state.audience = params.get('aud');
    // Earlier dashboard links used the record type under either parameter name.
    const types = params.get('cat') || state.type;
    state.type = types.split(',').map(value => Object.hasOwn(TYPE_LABELS, value) ? TYPE_LABELS[value] : value).join(',');
    // Retired freshness links still open the catalogue, without a misleading filter.
    if (params.get('all') === '1' || (params.has('freshness') && !hasIntent())) state.all = '1';
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
  const searchDocuments = new WeakMap();
  const searchPlans = new Map();
  function searchPlan(query) {
    const normalized = normalize(query);
    if (searchPlans.has(normalized)) return searchPlans.get(normalized);
    const tokens = normalized.split(' ').filter(Boolean), groups = [];
    const synonyms = SYNONYMS.flatMap(group => group.map(term => ({tokens: normalize(term).split(' '), group})))
      .sort((a, b) => b.tokens.length - a.tokens.length);
    for (let i = 0; i < tokens.length;) {
      const synonym = synonyms.find(item => item.tokens.every((token, offset) => tokens[i + offset] === token));
      if (synonym) { groups.push(synonym.group.map(term => normalize(term).split(' '))); i += synonym.tokens.length; }
      else { if (!QUERY_STOPWORDS.has(tokens[i])) groups.push([[tokens[i]]]); i++; }
    }
    if (!groups.length && normalized) groups.push([tokens]);
    // An unqualified sector name is also searchable through the sector metadata.
    // Keep an institution's complete name available for a literal provider search.
    const sector = Object.entries(SECTOR_QUERY_NAMES).find(([, names]) => names.includes(normalized));
    const plan = {normalized, groups, sectors: sector ? sector[0].split(',') : [], scores: new WeakMap()};
    if (searchPlans.size >= 50) searchPlans.delete(searchPlans.keys().next().value);
    searchPlans.set(normalized, plan);
    return plan;
  }
  function queryMatchQuality(record, query) {
    const plan = searchPlan(query);
    if (!plan.normalized) return 3;
    if (plan.scores.has(record)) return plan.scores.get(record);
    if (!searchDocuments.has(record)) {
      const text = recordText(record);
      searchDocuments.set(record, {text, words: [...new Set(text.split(' '))]});
    }
    const {text, words} = searchDocuments.get(record);
    const tokenMatches = (token, fuzzy) => words.some(word => {
      if (word === token || (token.length >= 3 && word.startsWith(token))) return true;
      if (!fuzzy || token.length < 4 || word.length < 4 || token[0] !== word[0] || /[0-9]/.test(token + word)) return false;
      const limit = Math.min(token.length, word.length) >= 10 ? 2 : 1;
      return Math.abs(token.length - word.length) <= limit && levenshtein(token, word) <= limit;
    });
    const allGroupsMatch = fuzzy => plan.groups.every(group =>
      group.some(alternative => alternative.every(token => tokenMatches(token, fuzzy))));
    const sectorMatch = plan.sectors.some(sector => (record.sectors || []).includes(sector));
    const score = phrasePresent(text, plan.normalized) ? 3 : sectorMatch || allGroupsMatch(false) ? 2 : allGroupsMatch(true) ? 1 : 0;
    plan.scores.set(record, score);
    return score;
  }
  function queryMatches(record, query) { return queryMatchQuality(record, query) > 0; }
  function relevance(record, criteria = state) {
    const practical = PRACTICAL_PRIORITY[typeLabel(record)] || 10;
    const trusted = record.verificationStatus === 'verified' && (record.sourceUrls || []).length ? 5 : 0;
    if (!criteria.q) return practical + (statusLabel(record) === 'Direct beschikbaar' ? 4 : 0) + trusted;
    const query = normalize(criteria.q);
    const title = normalize(record.title);
    let score = queryMatchQuality(record, criteria.q) * 100 + (title === query ? 100 : phrasePresent(title, query) ? 60 : 0);
    queryTerms(criteria.q).forEach(term => {
      if (normalize(recordThemes(record).join(' ')).includes(term)) score += 25;
      if (normalize((record.keywords || []).join(' ')).includes(term)) score += 20;
      if (normalize(record.description).includes(term)) score += 8;
    });
    query.split(' ').filter(Boolean).forEach(token => {
      if (title.split(' ').some(word => levenshtein(token, word) <= (token.length >= 8 ? 2 : 1))) score += 12;
    });
    score += filterValues('theme', criteria.theme).filter(value => recordThemes(record).includes(value)).length * 6;
    score += String(criteria.sector || '').split(',').filter(value => (record.sectors || []).includes(value)).length * 4;
    score += String(criteria.audience || '').split(',').filter(value => (record.audiences || []).includes(value)).length * 4;
    return score + practical / 10 + (statusLabel(record) === 'Direct beschikbaar' ? 3 : 0) + trusted;
  }
  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : '';
  }
  function publicationDate(record) { return validDate(record.publicationDate); }
  const isPublicationSort = () => ['published', 'published-oldest'].includes(state.sort);

  function addedDate(record) {
    // The first documented addition is distinct from later checks or edits.
    return (record.changeHistory || []).filter(change => change.type === 'added')
      .map(change => validDate(change.date)).filter(Boolean).sort()[0] || '';
  }
  function datedOffers(mode) {
    const dateOf = mode === 'published' ? publicationDate : addedDate;
    return records.map(record => ({record, date: dateOf(record)}))
      .filter(entry => entry.date)
      .sort((a, b) => b.date.localeCompare(a.date) || a.record.title.localeCompare(b.record.title, 'nl') ||
        a.record.id.localeCompare(b.record.id));
  }
  function newOffersMarkup(mode = 'added', requestedPage = 1) {
    mode = mode === 'published' ? 'published' : 'added';
    const published = mode === 'published';
    const sorted = datedOffers(mode), batches = [];
    // Keep a day's additions together, including large imports. An arbitrary
    // card limit must not hide part of the latest batch behind the next page.
    for (let start = 0; start < sorted.length;) {
      let end = Math.min(start + 24, sorted.length);
      while (end < sorted.length && sorted[end].date === sorted[end - 1].date) end++;
      batches.push(sorted.slice(start, end));
      start = end;
    }
    const pages = Math.max(1, batches.length);
    const page = Math.min(pages, Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1));
    const shown = batches[page - 1] || [], unknown = records.length - sorted.length;
    const href = number => `#nieuw?volgorde=${mode}&pagina=${number}`;
    const label = published ? 'Gepubliceerd op' : 'Toegevoegd';
    const modeChoice = (value, title) => value === mode
      ? `<span aria-current="page">${title}</span>`
      : `<a href="#nieuw?volgorde=${value}">${title}</a>`;
    return `<section class="new-offers new-offers-page"><header class="page-intro"><h1>Nieuw aanbod</h1><p class="listing-notice">${LISTING_NOTICE}</p></header>
      <nav class="new-offers-modes" aria-label="Sorteer op datum">
        ${modeChoice('added', 'Nieuw in de Atlas')}
        ${modeChoice('published', 'Recent gepubliceerd')}
      </nav>
      <details class="new-offers-explanation"><summary>Hoe werkt deze sortering?</summary>
        <p>${published ? 'De nieuwste publicatie bij de aanbieder staat bovenaan.' : 'De nieuwste toevoeging aan de Atlas staat bovenaan. Het aanbod zelf kan al langer bestaan.'} Een latere broncontrole verandert deze volgorde niet. Vermeldingen met dezelfde datum blijven op één pagina.</p>
        <p>${sorted.length} ${sorted.length === 1 ? 'vermelding heeft' : 'vermeldingen hebben'} een bekende ${published ? 'publicatiedatum' : 'toevoegdatum'}.${unknown ? ` Bij ${unknown === 1 ? 'één vermelding' : `${unknown} vermeldingen`} ontbreekt deze datum. U vindt ${unknown === 1 ? 'die vermelding' : 'deze vermeldingen'} bij <a href="#zoeken?all=1">al het aanbod</a>.` : ''}</p>
      </details>
      <div class="result-list">${shown.length ? shown.map(({record, date}) => simpleCard(record, false, {date, label})).join('') : '<div class="empty"><p>Er zijn nog geen vermeldingen met deze datum vastgelegd.</p><a href="#zoeken?all=1">Bekijk al het aanbod</a></div>'}</div>
      ${pages > 1 ? `<nav class="new-offers-pagination" aria-label="Meer nieuwe bijdragen">${page > 1 ? `<a class="btn secondary" href="${href(page - 1)}">Vorige</a>` : ''}<span>Pagina ${page} van ${pages}</span>${page < pages ? `<a class="btn secondary" href="${href(page + 1)}">Volgende</a>` : ''}</nav>` : ''}</section>`;
  }
  function renderNewOffers() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    sessionSet('atlas.lastSearch', location.hash);
    main.innerHTML = newOffersMarkup(params.get('volgorde'), Number(params.get('pagina') || 1));
    main.querySelectorAll('.result-card a[href^="#item/"]').forEach(link => {
      link.onclick = () => saveReturnView({
        focusId: link.closest('[data-record-id]').dataset.recordId,
        focusControl: link.closest('h2') ? 'title' : 'details',
        y: scrollY
      });
    });
    restoreReturnView();
    const view = resultView();
    const target = resultFocusTarget(main, view.focusId, view.focusControl);
    if (!target) return false;
    restoreCardFocus(target, view.y);
    return true;
  }

  function paperUrl(value) {
    if (typeof value !== 'string') return '';
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function paperDate(value) {
    return `<time datetime="${value}">${escapeHtml(dateLabel(value))}</time>`;
  }
  function listedPapers(data) {
    if (!Array.isArray(data?.papers)) throw new Error('Paperlijst ontbreekt');
    return data.papers.filter(paper => typeof paper?.title === 'string' && paper.title.trim() &&
      validDate(paper.published) && paperUrl(paper.url))
      .sort((a, b) => b.published.localeCompare(a.published) || a.title.localeCompare(b.title, 'nl') ||
      String(a.id || a.url).localeCompare(String(b.id || b.url), 'en'));
  }
  function paperAuthors(paper) {
    return Array.isArray(paper.authors) ? paper.authors.filter(name => typeof name === 'string' && name.trim()) : [];
  }
  function paperRis(papers) {
    const types = {preprint:'UNPB', 'peer-reviewed':'JOUR', 'journal-article':'JOUR'};
    return papers.map(paper => {
      const url = new URL(paper.url);
      const doiPath = /^(dx\.)?doi\.org$/.test(url.hostname) ? url.pathname.slice(1) : '';
      const doi = [paper.id, doiPath].find(value => typeof value === 'string' && /^10\.\d{4,9}\/[^\s\x00-\x1f\x7f]+$/i.test(value));
      const type = Object.hasOwn(types, paper.publicationType) ? types[paper.publicationType] : 'GEN';
      const names = paperAuthors(paper);
      const authors = Array.isArray(paper.risAuthors) && paper.risAuthors.length === paper.authors?.length &&
        paper.risAuthors.every(name => typeof name === 'string' && name.trim()) ? paper.risAuthors : names;
      const fields = [['TY', type], ...authors.map(name => ['AU', name]), ['TI', paper.title],
        ['PY', paper.published.slice(0, 4)], ['DA', paper.published.replaceAll('-', '/')],
        ['T2', paper.source], ['DO', doi], ['UR', url.href]];
      return fields.filter(([,value]) => typeof value === 'string' && value.trim())
        .map(([tag,value]) => `${tag}  - ${value.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]+/g, ' ').trim()}`)
        .concat('ER  -', '').join('\r\n');
    }).join('\r\n');
  }
  function downloadPaperRis(papers) {
    const file = new Blob([paperRis(papers)], {type:'application/x-research-info-systems;charset=utf-8'});
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-onderwijs-atlas-papers.ris';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function papersMarkup(data, papers = listedPapers(data)) {
    const types = {preprint:'Preprint', 'journal-article':'Gepubliceerd tijdschriftartikel', 'peer-reviewed':'Peer-reviewed artikel'};
    const sources = Array.isArray(data.sources) ? data.sources.filter(item => typeof item?.name === 'string' && item.name.trim()) : [];
    const sourceList = sources.map(item => {
      const href = paperUrl(item.url);
      const name = href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.name)} ↗</a>` : escapeHtml(item.name);
      return `<li>${name} · ${validDate(item.checkedAt) ? `laatst gecontroleerd op ${paperDate(item.checkedAt)}` : 'controledatum onbekend'}</li>`;
    }).join('');
    const entries = papers.map(paper => {
      const authors = paperAuthors(paper).join(', ');
      const publicationType = Object.hasOwn(types, paper.publicationType) ? types[paper.publicationType] : 'Publicatietype niet vastgesteld';
      const url = paperUrl(paper.url);
      const citation = [`${authors || 'Auteurs niet vermeld'} (${paper.published.slice(0, 4)}).`, paper.title, paper.source, url].filter(Boolean).join('\n');
      return `<li><article><p class="paper-meta">${paperDate(paper.published)} <span>· ${publicationType}</span>${paper.access === 'open' ? ' <span>· Open access</span>' : ''}</p>
        <h2><a href="${escapeHtml(url)}"${/^https?:\/\/(?:dx\.)?doi\.org\/10\.\d{4,9}\//i.test(url) ? ' data-atlas-usage="paper-doi-open"' : ''} target="_blank" rel="noopener noreferrer">${escapeHtml(paper.title)} <span aria-hidden="true">↗</span></a></h2>
        <p class="paper-byline">${escapeHtml(authors || 'Auteurs niet vermeld')}${paper.source ? ` · <cite>${escapeHtml(paper.source)}</cite>` : ''}</p>
        ${typeof paper.summary === 'string' && paper.summary.trim() ? `<p class="paper-summary">${escapeHtml(paper.summary)}</p>` : ''}
        <div class="paper-citation"><button class="btn secondary" type="button" data-copy-paper="${escapeHtml(citation)}" aria-label="Kopieer bronvermelding: ${escapeHtml(paper.title)}">Kopieer bronvermelding</button>
          <span role="status"></span><textarea rows="4" readonly hidden aria-label="Bronvermelding van ${escapeHtml(paper.title)}"></textarea></div></article></li>`;
    }).join('');
    const checked = validDate(data.checkedAt) ? `Laatste geslaagde controle op ${paperDate(data.checkedAt)}.` : 'Datum van de laatste geslaagde controle onbekend.';
    const partial = sources.some(item => !validDate(item.checkedAt) || item.checkedAt < data.checkedAt);
    const controls = papers.length ? `<div class="paper-actions"><label><input type="checkbox" data-open-papers> Alleen open access (${papers.filter(paper => paper.access === 'open').length})</label>
        <button type="button" class="btn secondary" data-download-ris>Download voor Zotero / EndNote (.ris)</button></div>
        <p class="paper-count" role="status" data-paper-count>${papers.length} ${papers.length === 1 ? 'paper' : 'papers'}</p>
        <div data-no-open-papers hidden><p>Bij geen van deze papers is open access bevestigd.</p><button type="button" class="btn secondary" data-show-all-papers>Toon alle papers</button></div>` : '';
    return `${controls}<p class="papers-checked">${checked}${partial ? ' De laatste geslaagde controle verschilt per bron.' : ''} Publicaties na de laatste broncontrole kunnen ontbreken.</p>
      ${sourceList ? `<details class="papers-sources"><summary>Gevolgde bronnen en controledatums</summary><ul>${sourceList}</ul></details>` : '<p>De gevolgde bronnen zijn voor deze lijst niet vermeld.</p>'}
      ${papers.length < data.papers.length ? '<p role="status">Enkele vermeldingen missen een bruikbare titel, publicatiedatum of bronlink.</p>' : ''}
      ${entries ? `<ol class="papers-list">${entries}</ol>` : `<p role="status">${data.papers.length ? 'Er zijn geen complete vermeldingen om te tonen.' : 'De laatste broncontrole bevatte geen papers voor deze selectie.'}</p>`}`;
  }
  function showPaperEdition(panel, data, notice = '') {
    const papers = listedPapers(data);
    panel.innerHTML = notice + papersMarkup(data, papers);
    if (!papers.length) return;
    const toggle = panel.querySelector('[data-open-papers]');
    const download = panel.querySelector('[data-download-ris]');
    const cards = panel.querySelectorAll('.papers-list li');
    let shown = papers;
    function update() {
      shown = toggle.checked ? papers.filter(paper => paper.access === 'open') : papers;
      cards.forEach((card, index) => { card.hidden = toggle.checked && papers[index].access !== 'open'; });
      const total = `${papers.length} ${papers.length === 1 ? 'paper' : 'papers'}`;
      panel.querySelector('[data-paper-count]').textContent = toggle.checked ? `${shown.length} van ${total}` : total;
      panel.querySelector('[data-no-open-papers]').hidden = shown.length > 0;
      download.disabled = !shown.length;
    }
    toggle.onchange = update;
    panel.querySelector('[data-show-all-papers]').onclick = () => { toggle.checked = false; update(); toggle.focus(); };
    download.onclick = event => {
      if (!shown.length) return;
      downloadPaperRis(shown);
      if (event?.isTrusted) window.dispatchEvent(new Event('atlas-ris-downloaded'));
    };
  }
  let lastPaperEdition;
  async function loadPapers(panel) {
    panel.innerHTML = '<p role="status">Papers worden geladen…</p>';
    try {
      const response = await fetch('data/papers.json', {cache:'no-cache'});
      if (!response.ok) throw new Error('Paperlijst niet beschikbaar');
      const data = await response.json();
      if (main.querySelector('[data-papers]') === panel) {
        showPaperEdition(panel, data);
        lastPaperEdition = data;
      }
    } catch {
      if (main.querySelector('[data-papers]') !== panel) return;
      const notice = `<p role="status">${lastPaperEdition ? 'Verversen is niet gelukt. Hieronder staat de eerder geladen editie.' : 'De paperlijst kon niet worden geladen.'}</p><button class="btn secondary" type="button">Probeer opnieuw</button>`;
      if (lastPaperEdition) showPaperEdition(panel, lastPaperEdition, notice);
      else panel.innerHTML = notice;
      panel.querySelector('button').onclick = () => { document.querySelector('#papers-heading')?.focus(); loadPapers(panel); };
    }
  }
  function renderPapers() {
    main.innerHTML = `<section class="new-offers papers-page"><header class="page-intro"><h1 id="papers-heading" tabindex="-1">Papers over AI en onderwijs</h1>
      <p>De Atlas controleert de gevolgde tijdschriften dagelijks op oorspronkelijk onderzoek, overzichtsartikelen en overige tijdschriftartikelen met een expliciete AI-term in de titel.</p>
      <p>Elke geslaagde broncontrole bestrijkt de afgelopen 60 dagen. U ziet maximaal 6 papers per tijdschrift en 20 in totaal. Ze staan van nieuw naar oud op eerste publicatiedatum, waar bekend die van de online publicatie.</p>
      <p><a href="#wat-werkt">Wat werkt? Onderzoek over schrijven, wiskunde en brongebruik in de les</a></p></header><div data-papers></div></section>`;
    const panel = main.querySelector('[data-papers]');
    panel.onclick = event => {
      const button = event.target.closest('[data-copy-paper]');
      if (!button) return;
      const controls = button.closest('.paper-citation');
      return copyTextWithFallback(button, button.dataset.copyPaper, controls.querySelector('[role="status"]'), controls.querySelector('textarea'),
        'Bronvermelding gekopieerd.', 'Kopieer de geselecteerde bronvermelding.');
    };
    loadPapers(panel);
  }

  function renderLearningEvidence() {
    const cards = [
      {
        id: 'schrijven-feedback',
        question: 'Helpt AI-feedback een leerling om een betoog te verbeteren?',
        finding: 'Met AI-feedback verbeterden leerlingen hun eerste tekst iets meer dan bij zelfstandig herschrijven zonder feedback (d = 0,19). Bij een nieuw betoog vonden de onderzoekers geen aantoonbaar verschil.',
        comparison: '459 Duitse bovenbouwleerlingen schreven een betoog in het Engels als vreemde taal. Via loting binnen elke klas kreeg een deel feedback van GPT-3.5. De andere leerlingen kregen alleen de opdracht hun betoog te herzien.',
        limit: 'De teksten werden automatisch beoordeeld. De studie vergeleek één feedbackronde met geen feedback. Hoe AI-feedback zich verhoudt tot feedback van een docent of medeleerling blijft open.',
        independent: 'Laat de leerling zelf een standpunt formuleren, een argument kiezen en de alinea herschrijven. Vraag welke suggestie de leerling overneemt of verwerpt en waarom.',
        check: 'Geef morgen een andere stelling. Laat elke leerling zonder AI een alinea schrijven en beoordeel met hetzelfde criterium of het argument het standpunt ondersteunt.',
        doi: '10.1016/j.caeai.2023.100199', citation: 'Meyer e.a. · Computers and Education: Artificial Intelligence',
        date: '2023-12-29', dateLabel: '29 december 2023 online (jaargang 2024)'
      },
      {
        id: 'wiskunde-hints',
        question: 'Wat kan een leerling nog zelf na wiskunde oefenen met een chatbot?',
        finding: 'Tijdens het oefenen scoorden beide chatgroepen hoger. Op de toets direct erna scoorde de groep met de gewone chat gemiddeld 17% lager dan de groep zonder AI. Bij de hinttutor was het verschil met de groep zonder AI statistisch niet aantoonbaar.',
        comparison: 'Bijna 1.000 leerlingen van één Turkse middelbare school oefenden in vier wiskundelessen. Klassen werden door loting ingedeeld bij gewone GPT-4-chat, een tutor met door docenten voorbereide hints of oefenen met boek en aantekeningen. Iedereen maakte daarna een toets zonder hulpmiddelen.',
        limit: 'De 17% is een relatief verschil in toetsscore. Dit onderzoek volgde één school, één vak en één model. Of het effect later aanhield, is onbekend.',
        independent: 'Laat leerlingen zelf de eerste rekenstap zetten. Geef zo nodig één hint en laat ze uitleggen waarom de volgende stap uit hun eigen berekening volgt.',
        check: 'Geef morgen een vergelijkbare opgave met andere getallen, zonder chat of hints. Kijk afzonderlijk naar de gekozen aanpak en het antwoord.',
        doi: '10.1073/pnas.2422633122', citation: 'Bastani e.a. · PNAS',
        date: '2025-06-25', dateLabel: '25 juni 2025'
      },
      {
        id: 'ecologie-bronteksten',
        question: 'Kunnen studenten bij ecologie de bronteksten vervangen door een chatbot?',
        finding: 'Op de kennistoets zonder hulpmiddelen scoorde de groep met alleen tekst gemiddeld 50,54 punten. De groep met alleen de chatbot behaalde 47,48 punten, een aantoonbaar verschil. Tekst plus chatbot (49,51 punten) leverde geen aantoonbaar voordeel op boven alleen tekst.',
        comparison: '185 studenten van één Duitse universiteit werkten aan vragen over voedselverrijking en herstel van meren. Loting bepaalde welk materiaal zij kregen: twee bronteksten, een chatbot die alleen die teksten mocht gebruiken, of beide.',
        limit: 'Dit was één korte ecologietaak. Verdiepende vragen in de chats hingen samen met hogere toetsscores. De onderzoekers hebben het stellen van zulke vragen niet door loting toegewezen.',
        independent: 'Laat een student een verklaring van de chatbot naast de brontekst leggen. Vraag welke passage de verklaring ondersteunt en welke stap nog onderbouwing vraagt.',
        check: 'Leg morgen een ander voorbeeld van een meer voor. Laat studenten eerst zonder hulpmiddelen uitleggen wat er gebeurt en daarna in de tekst aanwijzen waarop hun uitleg steunt.',
        doi: '10.1007/s10956-026-10374-w', citation: 'Dietrich e.a. · Journal of Science Education and Technology',
        date: '2026-11-12', dateLabel: '12 november 2026'
      }
    ];
    main.innerHTML = `<section class="new-offers papers-page" aria-labelledby="evidence-heading">
      <header class="page-intro"><h1 id="evidence-heading" tabindex="-1">Wat werkt?</h1>
        <p>Wat blijft er over als de AI-hulp wegvalt? Drie lesvragen verbinden uitkomsten uit de klas met iets dat u morgen zelf kunt bekijken.</p></header>
      <ul class="papers-list">${cards.map(card => `<li><article aria-labelledby="${card.id}">
        <h2 id="${card.id}">${escapeHtml(card.question)}</h2><p class="paper-summary">${escapeHtml(card.finding)}</p>
        <details class="papers-sources"><summary>Wie deden mee en wat is vergeleken?</summary>
          <p class="paper-summary">${escapeHtml(card.comparison)}</p><p class="paper-summary">${escapeHtml(card.limit)}</p></details>
        <p class="paper-summary"><strong>Zelf doen</strong> · ${escapeHtml(card.independent)}</p>
        <p class="paper-summary"><strong>Check voor morgen</strong> · ${escapeHtml(card.check)}</p>
        <p class="paper-meta"><a href="https://doi.org/${card.doi}">${escapeHtml(card.citation)}</a> · <time datetime="${card.date}">${escapeHtml(card.dateLabel)}</time></p>
      </article></li>`).join('')}</ul>
      <aside class="source-policy"><h2>Hoe breed gelden deze resultaten?</h2>
        <p>Stanford SCALE bundelde op 10 november 2026 in totaal 52 gerandomiseerde en quasi-experimentele onderzoeken. Hulp bij oefenen en feedback gaf wisselende resultaten. Veel onderzoek betrof het hoger onderwijs. Of leerwinst op lange termijn aanhoudt, is nog onzeker. <a href="https://scale.stanford.edu/ai/evidence-base-review/evidence-base-ai-k12-november-review">Lees het overzicht van Stanford SCALE</a>.</p>
        <p>De lesvoorstellen en checks zijn redactionele uitwerkingen van de Atlas. U kunt ermee zien wat uw leerlingen of studenten zelfstandig laten zien.</p>
      </aside></section>`;
  }

  function practiceCasesMarkup() {
    return `<section class="guide-block" aria-labelledby="praktijkvoorbeelden-heading">
      <h2 id="praktijkvoorbeelden-heading">Hoe ging het op een school en een universiteit?</h2>
      <div class="guide-examples">
        <article><h3>Fortior · Een les voor het ontdeklab</h3>
          <p>Voor de leerlijn wetenschap en technologie van groep 1 tot en met 8 maakte Fortior al lessen met experts. Het team gaf een eigen chatbot stapsgewijs informatie om nieuwe lesideeën in hetzelfde format te ontwerpen.</p>
          <p><strong>Wat kwam eruit?</strong> Volgens Fortior waren de ideeën bruikbaar als opstap voor leerlingen die al zelfstandiger werkten. De lessen waren korter en minder gedetailleerd. Ook de afbeeldingen vroegen nog aandacht. Het praktijkverhaal rapporteert geen meting van leerwinst of bespaarde tijd.</p>
          <p><strong>Vraag voor uw team</strong> · Welke instructiestap of afbeelding moet een collega eerst met een beginnende leerling doorlopen?</p>
          <p><a href="#item/open-leermateriaal-ai-in-de-klas-pilotscholen">Bekijk de Atlas-kaart van de pilotscholen</a> · <a href="https://www.openleermateriaal.nl/ai-in-de-klas-zo-doen-pilots-het/">Praktijkverhaal bij Impuls Open Leermateriaal</a> (4 oktober 2025)</p>
        </article>
        <article><h3>Universiteit van Amsterdam · Feedback op de eerste onderzoeksvraag</h3>
          <p>Studenten in de bachelor Future Planet Studies legden hun onderzoeksvraag voor aan een speciaal ingestelde chatbot. Die reageerde met vragen en feedback op onderdelen. De student moest de onderzoeksvraag zelf aanscherpen.</p>
          <p><strong>Wat viel op?</strong> De projectbegeleider meldde dat studenten met die eerste stap verder konden en dat begeleiders tijd wonnen. Deelname aan de pilots was vrijwillig. De bron geeft voor dit vak geen tijdmeting of vergelijking van de kwaliteit van onderzoeksvragen.</p>
          <p><strong>Vraag voor uw team</strong> · Kan de student na de feedback zelf uitleggen waarom de vraag uitvoerbaar is en welke afbakening nodig was?</p>
          <p><a href="#item/uva-pilots-generatieve-ai-beveiligde-omgeving">Bekijk de Atlas-kaart van de UvA-pilots</a> · <a href="https://communities.surf.nl/vraagbaak-online-onderwijs/artikel/uva-doet-ai-onderwijspilots-in-eigen-beveiligde-omgeving-het">Interview met de UvA-projectbegeleiders bij SURF</a> (15 november 2024)</p>
        </article>
      </div></section>
      <section class="guide-block" aria-labelledby="toekomstgesprek-heading">
        <h2 id="toekomstgesprek-heading">Wat willen we dat iemand straks zelf kan beslissen?</h2>
        <p>Stel dat een beginnend professional morgen een overtuigend AI-advies krijgt dat niet past bij de persoon tegenover hem of haar. Welke ervaring heeft die professional vandaag nodig om dat te herkennen, bij te sturen en de keuze uit te leggen?</p>
        <p><strong>Maak één keuze voor de volgende les</strong> · Laat studenten eerst zelf een afweging maken en daarna AI om een tegenargument vragen. Of geef een AI-advies als vertrekpunt en laat studenten eerst de ontbrekende informatie zoeken bij de mensen om wie het gaat. Bespreek welke aanpak de vaardigheid oefent die u wilt behouden.</p>
        <p><strong>Kom erop terug</strong> · Geef de volgende les een nieuwe situatie zonder AI. Laat elke student benoemen wiens perspectief telt, wat onzeker blijft en wie de beslissing kan herzien.</p>
        <p>Dit is een gespreksvoorstel van de Atlas. TNO gebruikt vier mogelijke toekomstbeelden voor werk en verschillende betrokkenen om keuzes van nu te bespreken. UNESCO benoemt mensgericht en kritisch oordelen als leerdoel. <a href="#item/tno-scenariospel-werkzekerheid">TNO-scenariospel werkzekerheid</a> · <a href="#item/unesco-ai-competency-framework-students">UNESCO-kader voor leerlingen</a></p>
      </section>`;
  }

  function sortRecords(list) {
    if (state.sort === 'az') return list.sort((a, b) => a.title.localeCompare(b.title, 'nl'));
    if (state.sort === 'added' || isPublicationSort()) {
      const dateOf = state.sort === 'added' ? addedDate : publicationDate;
      const dates = new Map(list.map(record => [record, dateOf(record)]));
      return list.sort((a, b) => {
        const aDate = dates.get(a), bDate = dates.get(b);
        // Gebruik uitsluitend de gekozen datumsoort; onbekende datums blijven onderaan.
        if (Boolean(aDate) !== Boolean(bDate)) return aDate ? -1 : 1;
        const order = state.sort === 'published-oldest' ? aDate.localeCompare(bDate) : bDate.localeCompare(aDate);
        return order || a.title.localeCompare(b.title, 'nl') || a.id.localeCompare(b.id);
      });
    }
    const ranked = sortByRelevance(list, state);
    if (!isFundingSelection()) return ranked;
    const priority = {open_call:0, planned:1, in_development:1, closed_call:3, archived:3};
    const ranks = new Map(ranked.map(record => [record, priority[effectiveStatus(record)] ?? 2]));
    const deadlineDay = record => validDate(record.applicationDeadline) || validDate(record.fundingDeadline) || deadlineInstant(record).slice(0, 10) || '9999-12-31';
    return ranked.sort((a, b) => {
      const byStatus = ranks.get(a) - ranks.get(b);
      if (byStatus || ranks.get(a) !== 0) return byStatus;
      const byDay = deadlineDay(a).localeCompare(deadlineDay(b));
      if (byDay) return byDay;
      const first = deadlineInstant(a), second = deadlineInstant(b);
      if (first && second) return Date.parse(first) - Date.parse(second);
      return Number(Boolean(second)) - Number(Boolean(first));
    });
  }
  function sortByRelevance(list, criteria) {
    const scores = new Map(list.map(record => [record, relevance(record, criteria)]));
    return list.sort((a, b) => scores.get(b) - scores.get(a));
  }
  function facetCounts() {
    const keys = Object.keys(facetValues);
    const counts = Object.fromEntries(keys.map(key => [key, new Map()]));
    const selected = activeFilters(state).filter(([key]) => key !== 'vak');
    const subjects = values('vak');
    for (const record of records) {
      const options = Object.fromEntries(keys.map(key => [key, new Set(facetValues[key](record))]));
      const failed = selected.filter(([key, choices]) => !choices.some(value => options[key].has(value)));
      const queryMatchesRecord = (!subjects.length || subjects.some(value => subjectMatches(record, value))) && queryMatches(record, state.q);
      for (const key of keys) {
        // A choice counts matches with the other filters still applied.
        const matchesOthers = !failed.length || (failed.length === 1 && failed[0][0] === key);
        const increment = Number(queryMatchesRecord && matchesOthers);
        for (const option of options[key]) {
          counts[key].set(option, (counts[key].get(option) || 0) + increment);
        }
      }
    }
    return counts;
  }
  function hasIntent() {
    return Boolean(state.all === '1' || state.q || FILTER_KEYS.some(key => values(key).length) || state.sort !== 'relevant');
  }

  function phrasePresent(text, phrase) {
    return (` ${text} `).includes(` ${normalize(phrase)} `);
  }
  function interpretNaturalQuery(rawQuery, normalized, practice) {
    let residual = ` ${normalized} `;
    const found = { audience: [], theme: [], sector: [], type: [], cost: [] };
    const consume = phrase => { residual = residual.replaceAll(` ${normalize(phrase)} `, ' '); };
    if (practice) {
      if (practice.type) found.type.push(practice.type);
      if (practice.theme) found.theme.push(practice.theme);
      practice.terms.forEach(consume);
      if (practice.keyword === 'afspraken') ['met mijn team', 'met ons team', 'met het team'].forEach(consume);
    }
    if (phrasePresent(residual, 'gratis')) { found.cost.push('Gratis'); consume('gratis'); }
    Object.entries(SECTOR_QUERY_NAMES).forEach(([sector, names]) => {
      for (const name of names) {
        if (phrasePresent(residual, name)) { found.sector.push(...sector.split(',')); consume(name); }
      }
    });
    const remaining = residual;
    Object.entries(ROLE_ALIASES).forEach(([alias, role]) => {
      if (phrasePresent(remaining, alias)) { found.audience.push(role); consume(alias); }
    });
    Object.entries(THEME_RULES).forEach(([theme, terms]) => {
      const matches = terms.filter(term => phrasePresent(remaining, term));
      if (matches.length) { found.theme.push(theme); matches.forEach(consume); }
    });
    SECTORS.forEach(sector => { if (phrasePresent(normalized, sector)) { found.sector.push(sector); consume(sector); } });
    Object.entries(TYPE_QUERY_RULES).forEach(([type, terms]) => {
      const matches = terms.filter(term => phrasePresent(remaining, term));
      if (matches.length) { found.type.push(type); matches.forEach(consume); }
    });
    if (found.type.includes('Subsidie of call,Subsidie')) {
      found.theme = found.theme.filter(theme => theme !== 'Subsidies en financiering');
    }
    const rest = residual.trim().split(/\s+/).filter(token => token && !QUERY_STOPWORDS.has(token) &&
      !REQUEST_WORDS.has(token) && !(practice && token === 'ai'));
    if (practice?.keyword) rest.push(practice.keyword);
    if (!rest.length && practice?.fallback) rest.push(practice.fallback);
    const structured = Object.values(found).some(items => items.length);
    return { q: structured ? rest.join(' ') : rawQuery.trim(), ...Object.fromEntries(Object.entries(found).map(([key, items]) => [key, [...new Set(items)].join(',')])) };
  }
  function criteriaForQuery(rawQuery, base = state) {
    // Keep ordinary searches visible and combine them with explicit filters.
    const query = rawQuery.trim();
    const normalized = normalize(query);
    const practice = PRACTICE_QUERIES.find(rule => (!rule.action || rule.action.test(normalized)) &&
      rule.terms.some(term => phrasePresent(normalized, term)));
    const isQuestion = /^(?:ik|wij|we|hoe|waar|welke?|kan ik|kunnen we)\b/.test(normalized);
    const taskFragment = practice && (practice.action || /\b(?:vinden|zoeken|geven|maken|voorbereiden)\b/.test(normalized) ||
      /^(?:een )?(?:les(?:sen|geven)? (?:over|met) ai|teamafspraken|teamscholing|teamtraining)\b/.test(normalized));
    const task = teacherQuestion(normalized);
    if (!isQuestion && !taskFragment && !task) return {...base, q:query};
    const interpreted = interpretNaturalQuery(query, normalized, practice);
    const criteria = { ...base, q: task ? query : interpreted.q };
    if (task === 'ecology' && !base.vak && /\b(?:biologie|biologieles)\b/.test(normalized) && subjectNames.has('biologie')) {
      criteria.vak = subjectNames.get('biologie');
    }
    ['audience', 'theme', 'sector', 'type', 'cost'].forEach(key => {
      if (interpreted[key] && !base[key]) criteria[key] = interpreted[key];
    });
    return criteria;
  }
  function applyNaturalQuery(rawQuery) { state = criteriaForQuery(rawQuery); }

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
    const selected = activeFilters(criteria);
    return records.filter(record => queryMatches(record, criteria.q) &&
      selected.every(([key, choices]) => key === 'vak'
        ? choices.some(value => subjectMatches(record, value))
        : facetValues[key](record).some(value => choices.includes(value))));
  }
  function criteriaHref(criteria = {}) {
    const params = new URLSearchParams();
    Object.entries(criteria).forEach(([key, value]) => value && params.set(key, value));
    return `#zoeken${params.size ? `?${params}` : ''}`;
  }
  function taskTile(task, personas = []) {
    const criteria = { ...task.query, audience: personas.join(',') };
    const count = task.href === '#boeken' ? booksPageRecords().length : recordsForCriteria(criteria).length;
    return `<a class="task-tile" href="${escapeHtml(task.href || criteriaHref(criteria))}"><strong>${escapeHtml(task.label)}</strong><span>${escapeHtml(task.detail)}</span><small>${count} resultaten</small></a>`;
  }
  function trustTone(record) {
    const status = effectiveStatus(record);
    if (['needs_verification', 'unknown'].includes(status) || !['verified', 'recently_checked'].includes(record.verificationStatus)) return 'is-uncertain';
    if (['available', 'open_call'].includes(status)) return 'is-confirmed';
    return 'is-neutral';
  }
  function officialSources(record) {
    return (record.sourceUrls || []).filter(item => item.sourceType === 'official' && /^https?:\/\//i.test(item.url || ''));
  }
  function primarySource(record) { return officialSources(record)[0] || null; }
  function sourceUsage(record) {
    if (isFunding(record)) return ' data-atlas-usage="funding-open"';
    return record.offerCategory === 'materials' ? ` data-atlas-usage="lesson-open" data-atlas-item-id="${escapeHtml(record.id)}"` : '';
  }
  function sourceActionLabel(record) {
    if (isFunding(record)) return record.recordType === 'funding_call' ? 'Officiële oproep en voorwaarden' : 'Officiële regeling en voorwaarden';
    if (record.offerCategory === 'materials') return 'Bekijk materiaal';
    if (record.legacyType === 'Raamwerk') return 'Bekijk raamwerk';
    if (record.recordType === 'guidance' && record.subtype) {
      return ({ Kennissite: 'Bekijk kennisbank', Kennisartikel: 'Lees artikel', Whitepaper: 'Lees whitepaper',
        Kader: 'Bekijk kader', Toetsingskader: 'Bekijk kader', Checklist: 'Bekijk checklist',
        Toolkit: 'Bekijk toolkit', Stappenplan: 'Bekijk stappenplan',
        'PDF-handreiking': 'Bekijk handreiking', 'Methodologische handreiking': 'Bekijk handreiking'
      })[record.subtype] || 'Bekijk informatie';
    }
    return ({ organization: 'Naar organisatie', training: 'Bekijk training', funding_call: 'Bekijk call',
      subsidy: 'Bekijk subsidie', guidance: 'Bekijk handreiking', legislation: 'Lees wetgeving',
      standard: 'Bekijk standaard', practice_example: 'Bekijk voorbeeld', research_project: 'Bekijk onderzoek',
      pilot: 'Bekijk pilot', programme: 'Bekijk programma', community: 'Naar community',
      policy_document: 'Bekijk beleid', product: 'Bekijk aanbod', service: 'Bekijk aanbod'
    })[record.recordType] || 'Bekijk bron';
  }
  const PUBLIC_ATLAS = 'https://aionderwijsatlas.nl/';
  function publicItemUrl(record) {
    return `${PUBLIC_ATLAS}#item/${encodeURIComponent(record.id)}`;
  }
  function sourceCitation(record) {
    return [record.title,
      ...(record.providerName ? [`Aanbieder: ${record.providerName}`] : []),
      ...(publicationDate(record) ? [`Publicatiedatum: ${dateLabel(publicationDate(record))}`] : []),
      ...officialSources(record).map(item => `${item.label || 'Officiële bron'}: ${item.url}`),
      `AI & Onderwijs Atlas Nederland: ${PUBLIC_ATLAS}aanbod/${encodeURIComponent(record.id)}/`
    ].join('\n');
  }
  async function copySourceCitation(record) {
    const feedback = document.querySelector('#detail-feedback');
    const fallback = document.querySelector('#citation-fallback');
    const text = sourceCitation(record);
    try {
      await navigator.clipboard.writeText(text);
      if (document.querySelector('#citation-fallback') !== fallback) return;
      fallback.hidden = true;
      feedback.textContent = 'Bronvermelding gekopieerd.';
    } catch {
      if (document.querySelector('#citation-fallback') !== fallback) return;
      fallback.hidden = false;
      const field = document.querySelector('#source-citation');
      field.value = text;
      field.focus();
      field.select();
      feedback.textContent = 'Kopieer de geselecteerde bronvermelding.';
    }
  }
  const LISTING_NOTICE = 'Opname in de Atlas betekent geen goedkeuring, kwaliteitsbeoordeling of aanbeveling van het aanbod of de aanbieder.';
  function factValue(value) {
    return value && value !== 'Nog niet ingevuld' ? value : 'Niet vastgesteld';
  }
  function costLabel(record) {
    return ({ free: 'Gratis', paid: 'Betaald', freemium: 'Gratis en betaald' })[record.costType] || 'Kosten onbekend';
  }
  function accessLabel(record) {
    return ACCESS_LABELS[record.accessType] || ACCESS_LABELS.unknown;
  }
  function recordLanguages(record) {
    return record.language?.length ? [...new Set(record.language)] : ['unknown'];
  }
  function languageLabel(code) {
    return Object.hasOwn(LANGUAGE_LABELS, code) ? LANGUAGE_LABELS[code] : code;
  }
  function languageList(record) {
    return recordLanguages(record).map(languageLabel).join(', ');
  }
  function commercialLabel(record) {
    const evidence = record.commercialEvidence;
    const supported = evidence && /^https:\/\//.test(evidence.url || '') && evidence.note && validDate(evidence.checkedOn);
    if (supported && record.commercialStatus === 'commercial') return 'Commercieel aanbod';
    return '';
  }
  function commercialBadge(record) {
    const label = commercialLabel(record);
    if (!label) return '';
    return `<span class="commercial-label${label === 'Commercieel aanbod' ? ' is-commercial' : ''}">${escapeHtml(label)}</span>`;
  }
  function commercialDetails(record) {
    if (!commercialLabel(record)) return '';
    const evidence = record.commercialEvidence;
    return `<h2>Commercieel aanbod</h2><p>${escapeHtml(evidence.note)} <a href="${escapeHtml(evidence.url)}" target="_blank" rel="noopener noreferrer">Bron voor deze vermelding ↗</a> · Broncontrole ${escapeHtml(dateLabel(evidence.checkedOn))}.</p>`;
  }
  function offerFacts(record) {
    const funding = isFunding(record);
    const bookFacts = record.recordType === 'book' ? [
      ['Auteur(s)', factValue((record.authors || []).join(', '))],
      ['Boeksoort', bookCategoryLabel(record.bookCategory)],
      ['ISBN', factValue(record.isbn)],
      ['Omvang', record.pageCount ? `${record.pageCount} pagina's` : 'Niet vastgesteld']
    ] : [];
    return [
      ['Aanbieder', factValue(record.providerName)],
      ['Soort aanbod', offerLabel(record)],
      ...bookFacts,
      ['Vorm', factValue(record.subtype)],
      ['Voor wie', factValue((record.audiences || []).join(', '))],
      ['Sector', factValue((record.sectors || []).filter(sector => sector !== 'VSO').join(', '))],
      ...(record.subjects?.length ? [['Vakgebied', record.subjects.join(', ')]] : []),
      ['Beschikbaarheid', displayStatus(record)],
      ['Kosten', costLabel(record)],
      ['Toegang', accessLabel(record)],
      ['Taal', languageList(record)],
      ['Geografische reikwijdte', factValue(record.geographicScope)],
      ['Verschenen op', publicationDate(record) ? dateLabel(publicationDate(record)) : 'Publicatiedatum onbekend'],
      ['Nieuw in de Atlas sinds', addedDate(record) ? dateLabel(addedDate(record)) : 'Datum niet vastgelegd'],
      ['Broncontrole', validDate(record.lastVerified) ? dateLabel(record.lastVerified) : 'Datum niet vastgelegd'],
      ...(!funding ? [['Deadline', factValue(record.applicationDeadline || record.fundingDeadline)]] : [])
    ];
  }

  function searchForm(id) {
    return `<form class="atlas-search" role="search" autocomplete="off">
      <label for="${id}">Uw vraag of zoekterm</label>
      <div class="search-row"><input id="${id}" type="search" role="combobox" value="${escapeHtml(state.q)}" placeholder="Bijv. les over AI" aria-controls="search-suggestions" aria-autocomplete="list" aria-expanded="false"><button class="btn" aria-label="Zoeken">Zoeken</button></div>
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
  function teaserCard(record, label = '') {
    const sourceItem = primarySource(record);
    return `<article class="teaser-card"><div class="teaser-top"><span class="type-label">${escapeHtml(label || offerLabel(record))}</span></div>
      <h3><a href="#item/${escapeHtml(record.id)}">${escapeHtml(record.title)}</a></h3>
      <p class="provider">${escapeHtml(record.providerName || 'Aanbieder niet vastgesteld')}</p>${commercialBadge(record)}
      <div class="teaser-meta"><span class="status-text ${trustTone(record)}">${escapeHtml(statusLabel(record))}</span>${sourceItem ? '<span>Officiële bron</span>' : ''}</div>
      <a class="teaser-link" href="#item/${escapeHtml(record.id)}">Bekijk aanbod <span aria-hidden="true">→</span></a></article>`;
  }
  function emailShareHref(record) {
    const itemUrl = publicItemUrl(record);
    const subject = `AI & Onderwijs Atlas: ${record.title}`.replace(/[\r\n]+/g, ' ');
    const body = [
      'Bekijk dit aanbod in de AI & Onderwijs Atlas Nederland:', '',
      record.title,
      ...(record.providerName ? [`Aanbieder: ${record.providerName}`] : []),
      '', itemUrl
    ].join('\r\n');
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  function fundingApplicants(record) {
    return (record.applicantTypes || []).join(', ') || record.eligibility || 'Zie de officiële voorwaarden';
  }
  function fundingAmount(record) {
    const amount = typeof record.fundingAmount === 'string' ? record.fundingAmount.trim() : '';
    return amount === 'Nog niet ingevuld' ? '' : amount;
  }
  function practicalDateRows(record, markup = true) {
    const deadline = validDate(record.applicationDeadline) || validDate(record.fundingDeadline);
    if (isFunding(record)) {
      const instant = deadlineInstant(record);
      if (instant) {
        const label = new Intl.DateTimeFormat('nl-NL', {dateStyle:'medium', timeStyle:'short', timeZone:'Europe/Amsterdam'}).format(new Date(instant));
        return [['Aanvraagdeadline', `${markup ? `<time datetime="${escapeHtml(instant)}">${escapeHtml(label)}</time>` : label} (Nederlandse tijd)`]];
      }
      if (!deadline) {
        const period = record.availabilityText?.trim();
        const text = period && /doorlopend|per call|subsidieplafond|ophaalmoment/i.test(period) ? period : 'Geen uiterste datum bevestigd';
        return [['', markup ? escapeHtml(text) : text]];
      }
    }
    const parts = [];
    const time = date => markup ? `<time datetime="${date}">${escapeHtml(dateLabel(date))}</time>` : dateLabel(date);
    const training = record.recordType === 'training' || record.legacyType === 'Training';
    if (deadline) parts.push([training ? 'Aanmelddeadline' : 'Aanvraagdeadline', time(deadline)]);
    if (training) {
      const start = validDate(record.startDate);
      const end = validDate(record.endDate);
      if (start && end && start < end) parts.push(['Periode', `${time(start)} – ${time(end)}`]);
      else if (start && start === end) parts.push(['Datum', time(start)]);
      else if (start && !end) parts.push(['Startdatum', time(start)]);
      else if (end && !start) parts.push(['Einddatum', time(end)]);
    }
    return parts;
  }
  function practicalDates(record, markup = true) {
    return practicalDateRows(record, markup).map(parts => parts.filter(Boolean).join(' ')).join(' · ');
  }
  function cardFact(label, valueHtml) {
    return `<div><dt>${escapeHtml(label)}</dt><dd>${valueHtml}</dd></div>`;
  }
  let factDialog;
  let factOpener;
  function readFact(button) {
    const value = button.parentElement, label = value.previousElementSibling.textContent;
    if (!factDialog) {
      factDialog = document.createElement('dialog');
      factDialog.className = 'fact-dialog';
      factDialog.setAttribute('aria-labelledby', 'full-fact-label');
      factDialog.setAttribute('aria-describedby', 'full-fact-value');
      factDialog.innerHTML = '<h2 id="full-fact-label"></h2><p id="full-fact-value"></p><form method="dialog"><button class="btn secondary" autofocus>Sluiten</button></form>';
      document.body.append(factDialog);
      factDialog.onclick = event => {
        if (event.target !== factDialog) return;
        const {top, bottom, left, right} = factDialog.getBoundingClientRect();
        if (event.clientY < top || event.clientY > bottom || event.clientX < left || event.clientX > right) factDialog.close();
      };
      factDialog.onclose = () => {
        const opener = factOpener;
        factOpener = null;
        if (opener?.isConnected) {
          opener.focus({preventScroll:true});
          syncFactDisclosure(opener.parentElement.parentElement);
        }
      };
    }
    const sectors = [...value.querySelectorAll('.sector-chips span')];
    factDialog.querySelector('h2').textContent = label;
    factDialog.querySelector('p').textContent = sectors.length ? sectors.map(chip => chip.textContent).join(', ') : value.textContent;
    factOpener = button;
    factDialog.showModal();
  }
  function syncFactDisclosure(group) {
    const [label, value] = group.children;
    const button = value.querySelector('.fact-disclosure');
    const clipped = label.scrollWidth > label.clientWidth || value.scrollWidth > value.clientWidth;
    if (clipped && !button) {
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'fact-disclosure';
      open.setAttribute('aria-label', `Lees het volledige kenmerk: ${label.textContent}`);
      open.setAttribute('aria-haspopup', 'dialog');
      open.onclick = () => readFact(open);
      value.append(open);
    } else if (!clipped && button && button !== factOpener) {
      if (button === document.activeElement) group.closest('.result-card')?.querySelector('h2 a')?.focus({preventScroll:true});
      button.remove();
    }
  }
  const factResize = window.ResizeObserver && window.HTMLDialogElement?.prototype.showModal
    ? new window.ResizeObserver(entries => entries.forEach(({target}) => [...target.children].forEach(syncFactDisclosure))) : null;
  function observeCardFacts() {
    if (!factResize) return;
    factResize.disconnect();
    main.querySelectorAll('.offer-facts').forEach(list => {
      list.classList.add('single-line-facts');
      factResize.observe(list);
    });
  }
  document.fonts?.addEventListener('loadingdone', observeCardFacts);
  function sheetPickMarkup(record, label = 'Kies voor vergelijking of overleg') {
    return `<label class="sheet-pick"><input type="checkbox" data-sheet-pick="${escapeHtml(record.id)}" aria-label="${label}: ${escapeHtml(record.title)}" ${sheetPicks.has(record.id) ? 'checked' : ''}> ${label}</label>`;
  }
  function catalogueResult(record) {
    if (!compactResults) return simpleCard(record, true);
    const sectors = (record.sectors || []).filter(sector => sector !== 'VSO').join(', ');
    const context = [record.providerName, sectors];
    if (state.sort === 'added' || isPublicationSort()) {
      const added = state.sort === 'added';
      const date = added ? addedDate(record) : publicationDate(record);
      context.push(date ? (added ? 'Toegevoegd ' : 'Verschenen op ') + dateLabel(date)
        : (added ? 'Toevoegdatum onbekend' : 'Publicatiedatum onbekend'));
    }
    const summary = context.filter(Boolean).map(escapeHtml).join(' · ');
    const funding = isFunding(record) ? `<p class="listing-funding"><strong>${escapeHtml(displayStatus(record))}</strong>
      · ${practicalDates(record)}</p>` : '';
    return `<article class="listing-row" data-record-id="${escapeHtml(record.id)}" data-offer-card>
      <div><h2><a href="#item/${escapeHtml(record.id)}">${escapeHtml(record.title)}</a></h2>
        ${summary ? `<p class="listing-context">${summary}</p>` : ''}${funding}</div>
      <div class="offer-links">${sheetPickMarkup(record, 'Vergelijken')}</div></article>`;
  }
  function simpleCard(record, showPublicationDate = false, recency = null) {
    const sectors = (record.sectors || []).filter(sector => sector !== 'VSO');
    const sourceItem = primarySource(record);
    const detailLabel = lessonForSectors(record, values('sector')) ? `Lesstart · ${record.lessonStart.level}` : 'Bekijk details';
    const commercial = commercialBadge(record);
    const funding = isFunding(record);
    const checkedFunding = funding && ['verified', 'recently_checked'].includes(record.verificationStatus);
    const opening = checkedFunding && validDate(record.applicationOpenDate);
    const amount = checkedFunding && fundingAmount(record);
    let dateFact = '';
    if (recency || (showPublicationDate && (state.sort === 'added' || isPublicationSort()))) {
      const added = state.sort === 'added';
      const label = recency?.label || (added ? 'Toegevoegd' : 'Verschenen op');
      const date = recency?.date || (added ? addedDate(record) : publicationDate(record));
      dateFact = cardFact(label, date ? `<time datetime="${escapeHtml(date)}">${escapeHtml(dateLabel(date))}</time>` :
        (added ? 'Toevoegdatum onbekend' : 'Publicatiedatum onbekend'));
    }
    return `<article class="result-card" data-record-id="${escapeHtml(record.id)}" data-offer-card>
      <div class="card-body"><span class="type-label">${escapeHtml(offerLabel(record))}</span>
        <h2><a href="#item/${escapeHtml(record.id)}">${escapeHtml(record.title)}</a></h2>
        <dl class="offer-facts">${dateFact}
          ${cardFact('Aanbieder', escapeHtml(factValue(record.providerName)))}
          ${cardFact('Status', `<span class="status-text ${trustTone(record)}">${escapeHtml(displayStatus(record))}</span>`)}
          ${opening ? cardFact('Aanvragen vanaf', `<time datetime="${opening}">${escapeHtml(dateLabel(opening))}</time>`) : ''}
          ${practicalDateRows(record).map(([label, value]) => cardFact(label || 'Aanvraagperiode', value)).join('')}
          ${commercial ? cardFact('Commercieel karakter', commercial) : ''}
          ${funding ? cardFact('Aanvragers', escapeHtml(fundingApplicants(record))) :
            cardFact('Kosten', escapeHtml(costLabel(record))) + cardFact('Toegang', escapeHtml(accessLabel(record))) + cardFact('Taal', escapeHtml(languageList(record)))}
          ${amount && amount !== 'Varieert' ? cardFact('Bedrag', escapeHtml(amount)) : ''}
          ${cardFact('Voor wie', escapeHtml(factValue((record.audiences || []).join(', '))))}
          ${sectors.length ? cardFact('Sectoren', `<div class="sector-chips">${sectors.map(sector => `<span>${escapeHtml(sector)}</span>`).join('')}</div>`) : ''}
        </dl>
        <p class="description">${escapeHtml(factValue(record.description))}</p>
      </div>
      <div class="card-actions offer-links">
        <div class="offer-main-actions">
          ${sourceItem ? `<a class="card-cta primary" href="${escapeHtml(sourceItem.url)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(sourceActionLabel(record))}: ${escapeHtml(record.title)}">${escapeHtml(sourceActionLabel(record))}&nbsp;↗</a>` : ''}
          <div class="offer-secondary-actions">
            <a class="card-cta" href="#item/${escapeHtml(record.id)}" aria-label="${escapeHtml(detailLabel)}: ${escapeHtml(record.title)}">${escapeHtml(detailLabel)}</a>
            <a class="card-cta share-email" href="${escapeHtml(emailShareHref(record))}" aria-label="Delen via e-mail: ${escapeHtml(record.title)}">Delen via e-mail</a>
          </div>
        </div>
        ${showPublicationDate ? sheetPickMarkup(record) : ''}
      </div>
    </article>`;
  }

  function homeShelf(title, href, items, label = '') {
    if (!items.length) return '';
    return `<section class="home-shelf"><div class="section-title"><div><h2>${escapeHtml(title)}</h2><p>${items.length} ${items.length === 1 ? 'item' : 'items'} beschikbaar</p></div><a href="${escapeHtml(href)}">Bekijk alles →</a></div><div class="content-rail">${items.slice(0, 4).map(record => teaserCard(record, label)).join('')}</div></section>`;
  }
  const filterOptionLabel = (key, value) => key === 'type' ? ({
    ...OFFER_CATEGORIES, Training: 'Trainingen en workshops'
  }[value] || value) : key === 'theme' ? ({
    'Veilige AI-omgeving': 'Een AI-toepassing kiezen',
    'Lesgeven en leren met AI': 'AI gebruiken in mijn onderwijs',
    'Beleid en governance': 'Beleid en afspraken maken'
  }[value] || value) : key === 'language' ? languageLabel(value) : value;
  function homeFilterGroup(key, title, options, selected = [], open = false, extraOptions = []) {
    const present = [...options.map(value => ({ key, value, label: filterOptionLabel(key, value) })), ...extraOptions]
      .filter(option => recordsForCriteria({ [option.key]: option.value }).length);
    return `<details class="home-filter-group" ${open ? 'open' : ''}><summary>${escapeHtml(title)}</summary><div>${present.map(option => `<label><input type="checkbox" name="${escapeHtml(option.key)}" value="${escapeHtml(option.value)}" ${selected.includes(option.value) ? 'checked' : ''}><span>${escapeHtml(option.label)}</span><small>${recordsForCriteria({ [option.key]: option.value }).length}</small></label>`).join('')}</div></details>`;
  }
  function homeFilterPanel(personas) {
    const themes = ['Veilige AI-omgeving', 'Lesgeven en leren met AI', 'Beleid en governance', 'Toetsing en examinering', 'AI Act en wetgeving', 'Privacy en AVG', 'AI-geletterdheid', 'Professionalisering', 'Praktijkvoorbeelden'];
    const types = ['materials', 'Training', 'Boek', 'knowledge', 'Praktijkvoorbeeld', 'Pilot', 'Subsidie of call', 'Subsidie', 'Wetgeving', 'Organisatie', 'Programma', 'Community', 'Standaard', 'Raamwerk', 'Beleidsdocument', 'unclassified'];
    return `<details class="home-filter-sidebar"><summary>Filter het aanbod</summary><form class="home-filter-form"><header><span class="eyebrow">Snel verfijnen</span><h2>Filter het aanbod</h2><p>Kies eerst uw sector en daarna wat u zoekt. Verfijn vervolgens met de andere opties.</p></header>
      ${homeFilterGroup('sector', 'Voor welke sector?', SECTORS)}
      ${subjectInput('home-subject-search')}
      ${homeFilterGroup('type', 'Wat zoekt u?', types)}
      ${homeFilterGroup('theme', 'Waar zoekt u hulp bij?', themes, [], false, [{ key: 'type', value: 'Training', label: 'Mijn team scholen — workshops en trainers' }, { key: 'type', value: 'Subsidie of call,Subsidie', label: 'Subsidies en calls vinden' }])}
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
        if (selected.length) criteria[key] = [...new Set(selected.flatMap(value => value.split(',')))].join(',');
      });
      const subject = form.querySelector('[name="vak"]').value;
      if (subject.trim()) criteria.vak = filterValues('vak', subject).join(',');
      return criteria;
    };
    const update = () => {
      const count = recordsForCriteria(selection()).length;
      form.querySelector('.home-filter-submit').textContent = `Bekijk ${count} ${count === 1 ? 'resultaat' : 'resultaten'}`;
    };
    const selectedTypes = new Set((selection().type || '').split(',').filter(Boolean));
    form.querySelectorAll('input').forEach(input => input.onchange = () => {
      if (input.name === 'type') {
        input.value.split(',').forEach(value => input.checked ? selectedTypes.add(value) : selectedTypes.delete(value));
        // The task shortcut and existing offer-type choices control the same filters.
        form.querySelectorAll('input[name="type"]').forEach(option => {
          const types = option.value.split(',');
          const count = types.filter(value => selectedTypes.has(value)).length;
          option.checked = count === types.length;
          option.indeterminate = count > 0 && count < types.length;
        });
      }
      update();
    });
    form.onsubmit = event => { event.preventDefault(); location.hash = criteriaHref(selection()).slice(1); };
    update();
  }
  function renderHome() {
    state = { q: '', sort: 'added', ...readProfile() };
    renderSearch(true);
    refreshHomeSpotlight();
    window.dispatchEvent?.(new Event('atlas:home-rendered'));
  }

  function bookCategoryLabel(value) {
    return ({ study: 'Studieboeken', practice: 'Praktijk- en handboeken', reading: 'Leesboeken en essays' })[value] || 'Overige boeken';
  }
  function booksPageRecords() {
    return records.filter(record => (record.language || []).includes('nl') && (
      record.recordType === 'book' ||
      (record.offerCategory === 'materials' && BOOKS_MATERIAL_IDS.has(record.id))
    ));
  }
  function bookCard(record) {
    const sourceItem = primarySource(record);
    const details = [
      ['Auteur(s)', (record.authors || []).join(', ')],
      ['Jaar', record.publicationYear || (publicationDate(record) || '').slice(0, 4)],
      ['ISBN', record.isbn], ['Omvang', record.pageCount ? `${record.pageCount} pagina's` : ''],
      ['Uitgever', factValue(record.providerName)], ['Voor wie', factValue((record.audiences || []).join(', '))],
      ['Kosten', costLabel(record)]
    ];
    return `<article class="result-card book-card" data-record-id="${escapeHtml(record.id)}"><div class="card-body">
      <div class="card-top"><span class="type-label">${escapeHtml(bookCategoryLabel(record.bookCategory))}</span></div>
      <h2><a href="#item/${escapeHtml(record.id)}">${escapeHtml(record.title)}</a></h2>
      <dl class="offer-facts">${details.filter(([, value]) => value).map(([label, value]) => cardFact(label, escapeHtml(value))).join('')}</dl>
      <p class="description">${escapeHtml(factValue(record.description))}</p>
    </div><div class="card-actions offer-links"><a class="card-cta primary" href="#item/${escapeHtml(record.id)}">Bekijk details</a>${sourceItem ? `<a class="card-cta" href="${escapeHtml(sourceItem.url)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer">Uitgevers- of auteursbron ↗</a>` : ''}</div></article>`;
  }
  function bookContextMarkup(record) {
    if (record.recordType !== 'book') return '';
    return recordContextMarkup(record);
  }
  function recordContextMarkup(record) {
    const availability = record.availabilityText;
    return `${availability && (!isFunding(record) || availability !== practicalDates(record, false)) ? `<h2>Praktisch en beschikbaarheid</h2><p>${escapeHtml(availability)}</p>` : ''}
      ${record.notes ? `<h2>Duiding en bewijsgrens</h2><p>${escapeHtml(record.notes)}</p>` : ''}
      ${record.verificationNote ? `<details class="source-review"><summary>Wat is bij de broncontrole vastgesteld?</summary><p>${escapeHtml(record.verificationNote)}</p></details>` : ''}`;
  }

  function booksMarkup() {
    const selection = booksPageRecords();
    const books = selection.filter(record => record.recordType === 'book');
    const materials = selection.filter(record => record.recordType !== 'book').sort((a, b) => a.title.localeCompare(b.title, 'nl'));
    const categories = ['reading', 'study', 'practice'];
    return `<section class="new-offers books"><header class="page-intro"><span class="eyebrow">Nederlandstalige verdieping en toepassing</span><h1>Boeken en materialen</h1><p>Leesboeken en essays over AI, data, macht, publieke waarden en menselijke oordeelsvorming; studieboeken om mee te leren; en praktische handboeken voor toepassing in het onderwijs. Daarnaast vindt u een selectie lessen, handvatten en werkmaterialen om zelf of met uw team te gebruiken.</p><p class="listing-notice">${LISTING_NOTICE} Een boekvermelding is geen aanbeveling of effectbewijs. Prijzen, toegang en leverbaarheid kunnen wijzigen; controleer die altijd bij de officiële bron.</p></header>
      <nav class="book-kinds" aria-label="Ga naar boeken of materialen">${categories.filter(category => books.some(book => book.bookCategory === category)).map(category => `<a href="#boeken?groep=${category}">${escapeHtml(bookCategoryLabel(category))}</a>`).join('')}${materials.length ? '<a href="#boeken?groep=materials">Les- en werkmaterialen</a>' : ''}</nav>
      ${categories.map(category => {
        const items = books.filter(book => book.bookCategory === category).sort((a, b) => a.title.localeCompare(b.title, 'nl'));
        return items.length ? `<section id="boeken-${category}" class="book-group"><div class="section-title"><div><h2 tabindex="-1">${escapeHtml(bookCategoryLabel(category))}</h2><p>${items.length} ${items.length === 1 ? 'titel' : 'titels'}</p></div></div><div class="result-list">${items.map(bookCard).join('')}</div></section>` : '';
      }).join('')}
      ${materials.length ? `<section id="boeken-materialen" class="book-group"><div class="section-title"><div><h2 tabindex="-1">Les- en werkmaterialen</h2><p>${materials.length} Nederlandstalige materialen voor lessen, AI-geletterdheid en toetsing.</p></div><a href="#zoeken?type=materials">Bekijk alle les- en werkmaterialen →</a></div><div class="result-list">${materials.map(record => simpleCard(record)).join('')}</div></section>` : ''}</section>`;
  }
  function renderPracticeGuide() {
    const routes = [
      ['lesmateriaal/', 'Een les voorbereiden', 'Vind een leerlingvraag, lesopdracht en werkblad bij uw vak.'],
      ['#toetsafspraak', 'Een toets aanpassen', 'Kies welke AI-hulp past en wat de leerling zelf moet laten zien.'],
      ['#toolkeuze', 'Een AI-toepassing kiezen', 'Vergelijk de functie, voorwaarden en open vragen voor uw klas.'],
      ['#pilotbesluit', 'Besluiten over een AI-proef', 'Leg met schoolleiding en ICT vast wie beslist, wat u toetst en wanneer u stopt.'],
      ['#regels-in-de-praktijk', 'Leerlingwerk of lesmateriaal gebruiken', 'Controleer gegevens, licentie en afspraken op uw school.'],
      ['#wat-werkt', 'Beoordelen wat werkt', 'Bekijk wat leerlingen met hulp presteerden en wat ze daarna zelf konden.'],
      [criteriaHref(FUNDING_CRITERIA), 'Subsidies en calls vinden', 'Controleer wie kan aanvragen en wanneer de ronde sluit.']
    ];
    const practices = [
      ['PO · digitale geletterdheid', 'digiduck-ai-lespakket-groep-7-8', 'Leg uit hoe voorbeelden de voorspelling van een model beïnvloeden.',
        'Sorteer met de klas kaartjes op een zelfgekozen kenmerk. Laat een ander een nieuw kaartje indelen. Welke extra voorbeelden zouden de regel duidelijker maken?',
        'Het kind geeft een eigen voorbeeld en legt uit waarom de regel daar wel of niet werkt.'],
      ['VO · biologie', 'stanford-craft-ai-ecosystemen', 'Beoordeel een AI-toepassing voor natuurbehoud aan de hand van een biologisch doel.',
        'Vergelijk twee toepassingen uit de CRAFT-les. Kies eerst zelfstandig welke helpt bij een bedreiging voor een ecosysteem. Bespreek daarna welke gegevens die keuze zouden kunnen weerleggen.',
        'De leerling noemt een ecologisch gevolg, een benodigde meting en een situatie waarin de toepassing tekortschiet.'],
      ['MBO · mediavormgeving', 'mbo-mediawijs-open-ai-leermaterialen', 'Verantwoord welke ontwerpkeuze van de maker is.',
        'Leg een eerste beeld en een bewerking naast dezelfde ontwerpbriefing. Laat een medestudent aanwijzen wat er is veranderd. De maker licht één keuze toe.',
        'De student koppelt een concrete bewerking aan het doel van de opdrachtgever en wijst aan welk deel met AI tot stand is gekomen.'],
      ['HBO en WO · informatievaardigheden', 'vu-ai-wijs-informatie-zoeken-beoordelen-2026', 'Beoordeel of een aangehaalde bron een bewering daadwerkelijk ondersteunt.',
        'Zoek bij één bewering uit een AI-antwoord de oorspronkelijke publicatie op. Vergelijk de passage met de bewering en formuleer een conclusie die de bron wel kan dragen.',
        'De student vermeldt een vindplaats, legt een beperking uit en verantwoordt een wijziging in de eigen conclusie.']
    ];
    const cards = practices.map(([level, id, goal, task, check]) => {
      const record = publicRecordsById.get(id);
      return `<details class="guide-block"><summary>${escapeHtml(level)}</summary><h3>${escapeHtml(goal)}</h3>
        <p>${escapeHtml(task)}</p><p><strong>Waar let u op?</strong> ${escapeHtml(check)}</p>
        ${record ? `<p><a href="#item/${encodeURIComponent(id)}">Lesmateriaal: ${escapeHtml(record.title)}</a></p>` : ''}</details>`;
    }).join('');
    main.innerHTML = `<article class="new-offers practice-guide"><header class="page-intro">
      <h1 tabindex="-1">Praktijkgids voor AI in het onderwijs</h1><p>Waar werkt u aan?</p></header>
      <nav class="practice-links guide-routes" aria-label="Kies een werkvraag">${routes.map(([href, title, description]) =>
        `<a class="practice-link" href="${escapeHtml(href)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></a>`).join('')}</nav>
      <section class="guide-section"><h2>AI-geletterdheid in mijn les</h2>
        <p>Kies een onderwijssector voor een leerdoel, opdracht en voorbeeld van wat u kunt beoordelen. De Atlas werkte deze voorbeelden uit bij bestaand lesmateriaal.</p>
        ${cards}
        <p>Kies voor uw leerlijn een leerdoel uit het <a href="#item/unesco-ai-competency-framework-students">UNESCO-kader voor leerlingen</a>. Bepaal met het <a href="#item/unesco-ai-competency-framework-teachers">docentenkader</a> of <a href="#item/ai-go-in-actie">AI-GO in Actie voor mbo, hbo en wo</a> wat docenten zelf moeten kunnen om het oefenen te begeleiden.</p>
        <p>Vergelijkt uw team kaders? UNESCO IITE onderzocht 36 kaders voor leraren die op 10 april 2025 beschikbaar waren. Gebruik de vergelijking om na te gaan wie de vaardigheid onderwijst, waar deze terugkomt in het curriculum en welk werk laat zien dat iemand haar beheerst. De analyse beschrijft inhoud en invoering. Of leerlingen hierdoor meer leren, is niet onderzocht. <a href="https://iite.unesco.org/publications/analytical-report-teacher-ai-competency-frameworks/">Vergelijking en checklist van UNESCO IITE</a>.</p></section>
      ${practiceCasesMarkup()}</article>`;
    main.querySelectorAll('a[href^="#item/"]').forEach(link => link.onclick = () => sessionSet('atlas.lastSearch', '#praktijkgids'));
  }

  function renderBooks() {
    sessionSet('atlas.lastSearch', '#boeken');
    main.innerHTML = booksMarkup();
    const group = new URLSearchParams(location.hash.split('?')[1] || '').get('groep');
    if (!['reading', 'study', 'practice', 'materials'].includes(group)) return false;
    const section = document.querySelector(`#boeken-${group === 'materials' ? 'materialen' : group}`);
    const heading = section?.querySelector('h2');
    if (!heading) return false;
    const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 0;
    section.style.scrollMarginTop = `${headerHeight + 16}px`;
    section.scrollIntoView({ block: 'start', behavior: 'instant' });
    heading.focus({ preventScroll: true });
    return true;
  }
  function renderStart() {
    main.innerHTML = `<section class="catalog start">${searchForm('catalog-search')}<div class="start-content">
      <span class="eyebrow">Zoek in de volledige atlas</span><h1>Waarmee wilt u aan de slag?</h1><p>Typ uw vraag of kies een herkenbare ingang. Resultaten verschijnen pas nadat u een keuze maakt.</p>
      <div class="task-grid compact">${TASKS.map(task => taskTile(task)).join('')}</div>
      <h2>Veel gezocht</h2>${popularLinks()}
      <a href="#mijn-atlas">Afstemmen op mijn profiel</a>
    </div></section>`;
    bindSearchForm();
  }
  function facetSelectionLabel(key) {
    const defaults = {
      theme: 'Alle onderwerpen', sector: 'Alle sectoren', vak: 'Alle vakgebieden', type: 'Alle soorten aanbod',
      geography: 'Alle regio’s', audience: 'Alle doelgroepen', status: 'Alle statussen',
      organization: 'Alle aanbieders', cost: 'Alle kosten', language: 'Alle talen', access: 'Alle toegangsopties',
      source: 'Alle bronnen'
    };
    return values(key).map(value => filterOptionLabel(key, value)).join(', ') || defaults[key] || 'Alle opties';
  }
  function facetCountLabel(count, worksheets) {
    if (!worksheets) return String(count);
    return (count ? count + ' + ' : '') + worksheets + (worksheets === 1 ? ' werkblad' : ' werkbladen');
  }
  function facetOption(key, option, count, worksheets, selected) {
    const checked = selected.includes(option);
    const unavailable = !count && !worksheets && !checked;
    return `<label data-facet-option="${escapeHtml(option)}" ${unavailable ? 'hidden' : ''}><input type="checkbox" data-facet="${key}" value="${escapeHtml(option)}" ${checked ? 'checked' : ''} ${unavailable ? 'disabled' : ''}><span>${escapeHtml(filterOptionLabel(key, option))}</span><small>${facetCountLabel(count, worksheets)}</small></label>`;
  }
  function subjectInput(id, value = values('vak').join(', '), profile = false) {
    return `<label for="${id}">Vakgebied${profile ? ' (optioneel)' : ''}</label>
      <input id="${id}" name="vak" type="text" autocomplete="off" list="${id}-options" aria-describedby="${id}-hint"
        ${profile ? 'maxlength="160"' : ''} placeholder="Bijv. biologie" value="${escapeHtml(value)}" data-applied="${escapeHtml(value)}">
      <datalist id="${id}-options">${subjectOptions}</datalist>
      <small id="${id}-hint">De Atlas zoekt op vaklabels. Voor vakken zonder label in de catalogus zoekt u ook in de tekst.${profile ? ' Laat leeg voor alle vakken.' : ''}</small>`;
  }
  function applySubject(input) {
    const choices = filterValues('vak', input.value);
    input.value = choices.join(', ');
    const subject = serializeFilterValues('vak', choices);
    if (subject !== (state.vak || '')) {
      state.vak = subject;
      setUrl();
    }
  }
  function facet(key, title, options, counts = facetCounts()[key], worksheetCounts = new Map()) {
    const selected = values(key);
    const present = [...new Set([...options.filter(option => counts.has(option)), ...worksheetCounts.keys(), ...selected])];
    const available = present.filter(option => counts.get(option) || worksheetCounts.get(option) || selected.includes(option));
    const canExpand = available.slice(8).some(option => !selected.includes(option));
    const supportsMultiple = ['sector', 'audience'].includes(key);
    const startsOpen = supportsMultiple && (key !== 'sector' || selected.length > 0);
    return `<details class="facet${supportsMultiple ? ' facet-multi' : ''}" data-facet-block="${escapeHtml(key)}"${startsOpen ? ' open' : ''}><summary><span class="facet-heading">${escapeHtml(title)}<b aria-label="${values(key).length} geselecteerd" ${values(key).length ? '' : 'hidden'}>${values(key).length}</b></span><span class="facet-value">${escapeHtml(facetSelectionLabel(key))}</span></summary><div>
      ${supportsMultiple ? '<p class="facet-note">Kies één of meer opties tegelijk.</p>' : ''}
      ${key === 'organization' && present.length > 12 ? '<input class="facet-search" type="search" placeholder="Zoek aanbieder…" aria-label="Zoek binnen aanbieders">' : ''}
      <div class="facet-options ${present.length > 8 ? 'limited' : ''}">${present.map(option => facetOption(key, option, counts.get(option) || 0, worksheetCounts.get(option) || 0, selected)).join('')}</div>
      ${present.length > 8 ? `<button class="facet-more" type="button" aria-expanded="false" ${canExpand ? '' : 'hidden'}>Toon meer</button>` : ''}
      <p class="facet-empty" role="status"${available.length ? ' hidden' : ''}>Geen opties bij deze selectie.</p>
    </div></details>`;
  }
  function relatedThemes(activeTheme) {
    const matching = recordsForCriteria({ ...state, theme: activeTheme });
    const counts = new Map();
    matching.forEach(record => recordThemes(record).filter(theme => theme !== activeTheme)
      .forEach(theme => counts.set(theme, (counts.get(theme) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([theme]) => [theme, recordsForCriteria({ ...state, theme }).length]);
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
  function teacherQuestion(normalized) {
    if (/\bai (?:tools?|toepassing(?:en)?|software|hulpmiddel(?:en)?)\b/.test(normalized) &&
        /\b(?:vergelijk\w*|kiezen|kies|past|passen|verantwoord)\b/.test(normalized)) return 'tools';
    if (/\b(?:ecosysteem|ecosystemen)\b/.test(normalized) &&
        /\b(?:biologieles|lessen?|les|lesmateriaal|lesidee|werkblad|onderbouw|bovenbouw)\b/.test(normalized)) return 'ecology';
    if (/\b(?:leerlingwerk|leerlingenwerk|leerlinggegevens|studentgegevens|studentenwerk|werk van (?:een |mijn |de )?(?:leerling(?:en)?|student(?:en)?))\b/.test(normalized) &&
        (/\b(?:upload\w*|invoer\w*|delen|privacy|avg|schoolafspraken|persoonsgegevens|regels)\b/.test(normalized) ||
        (/\b(?:mag|mogen|toegestaan)\b/.test(normalized) && /\b(?:ai|chatgpt|chatbot)\b/.test(normalized)) ||
        /^(?:leerlingwerk|leerlingenwerk|leerlinggegevens|studentgegevens|studentenwerk)$/.test(normalized))) return 'privacy';
    if (/\bfeedback\b/.test(normalized) && /\b(?:ai|chatgpt|chatbot|kunstmatige intelligentie)\b/.test(normalized) &&
        (/\b(?:leerwinst|leereffect\w*|leerresulta\w*|leereffectiviteit|leren|effect\w*|helpt|werkt|onderzoek)\b/.test(normalized) ||
        normalized === 'ai feedback')) return 'evidence';
    return '';
  }
  const SCHOOL_PRIVACY_ID = 'generatieve-ai-en-privacy-hier-moeten-scholen-op-letten';
  const WORKSHEET_FILTERS = {
    type:['materials'], audience:['Docenten', 'Onderwijsontwikkelaars'], language:['nl'], cost:['Gratis'],
    status:[STATUS_LABELS.available], access:[ACCESS_LABELS.public], theme:['Lesgeven en leren met AI']
  };
  function worksheetRoutes(query, criteria, lessonRoute = false) {
    const topic = normalize(query);
    const filters = activeFilters(criteria);
    if (!topic && !filters.length) return [];
    if (filters.some(([key, selected]) => !['vak', 'sector'].includes(key) &&
        !selected.some(value => WORKSHEET_FILTERS[key]?.includes(value)))) return [];
    const saveTime = /\btijd (?:besparen|winnen)\b/.test(topic) && (/\b(?:les|lessen|klas)\b/.test(topic) ||
      topic.split(' ').every(word => QUERY_STOPWORDS.has(word) || REQUEST_WORDS.has(word) ||
        ['tijd', 'besparen', 'winnen', 'ai', 'als', 'docent', 'je', 'kun'].includes(word)));
    const exercises = saveTime || /\b(?:oefenvra(?:ag|gen)|oefenopgaven?|quizvragen|lesvoorbereiding|lesontwerp|les(?:sen)? voorbereiden)\b/.test(topic);
    const practicum = /\b(?:practicum|practica|biologiepracticum|kiemproe(?:f|ven))\b/.test(topic);
    const customerMail = /\b(?:klant(?:en)?mails?|zakelijke (?:e ?)?mail|(?:antwoord|(?:e ?)?mail) aan (?:een |de )?klant)\b/.test(topic) &&
      !/\b(?:mailbox|postvak|inbox|verzend\w*|verstuur\w*|versturen|automatiseer\w*|automatiseren|automatisch|software|apps?|tools?|programma)\b/.test(topic);
    if (Object.entries(TYPE_QUERY_RULES).some(([type, names]) => type !== 'materials' &&
        names.some(name => phrasePresent(topic, name)))) return [];
    const sectors = filterValues('sector', criteria.sector);
    const subjects = filterValues('vak', criteria.vak).map(normalize);
    const namedSectors = Object.entries(SECTOR_QUERY_NAMES).filter(([sector, names]) =>
      phrasePresent(topic, sector) || names.some(name => phrasePresent(topic, name))).flatMap(([key]) => key.split(','));
    if (/\b(?:vmbo|havo|vwo)\b/.test(topic)) namedSectors.push('VO');
    const intents = {
      'werkblad-oefenvragen': exercises && !practicum,
      'werkblad-biologiepracticum': practicum && (/\b(?:biologie|biologiepracticum|biologieles|kiemproe(?:f|ven))\b/.test(topic) || subjects.includes('biologie')),
      'werkblad-klantmail': customerMail
    };
    const terms = topic.split(' ').filter(word => word && !QUERY_STOPWORDS.has(word) && !REQUEST_WORDS.has(word));
    return worksheets.filter(([id, sheet]) => {
      if (subjects.length && !sheet.subjects.some(name => subjects.includes(normalize(name)))) return false;
      if (sectors.length && !sheet.sectors.some(sector => sectors.includes(sector))) return false;
      if (namedSectors.length && !sheet.sectors.some(sector => namedSectors.includes(sector))) return false;
      if (!topic || lessonRoute || intents[id]) return true;
      const words = new Set(normalize([id, sheet.title, sheet.activity, sheet.goal, ...sheet.subjects, ...sheet.sectors].join(' ')).split(' '));
      return terms.length > 0 && terms.every(word => words.has(word));
    }).map(([id, sheet]) => ({href:'#' + id, label:sheet.title, meta:sheet.level + ' · ' + sheet.activity}));
  }
  function isLessonSelection(criteria) {
    return (criteria.q === 'les' && criteria.type === 'materials') || ['lesstart', 'lesstarts'].includes(normalize(criteria.q));
  }
  function matchingWorksheetRoutes(criteria) {
    return worksheetRoutes(criteria.q, criteria, isLessonSelection(criteria));
  }
  function worksheetFacetCounts() {
    if (!matchingWorksheetRoutes({q: state.q, vak: state.vak, type: 'materials'}).length) return {};
    const counts = {};
    for (const [key, options] of Object.entries({...WORKSHEET_FILTERS, sector: SECTORS})) {
      counts[key] = new Map();
      for (const option of options) {
        const matches = matchingWorksheetRoutes({...state, [key]: option}).length;
        if (matches) counts[key].set(option, matches);
      }
    }
    return counts;
  }
  function teacherRoutes(query, criteria) {
    switch (teacherQuestion(normalize(query))) {
      case 'tools':
        return [{label:'Welke AI-toepassing past bij mijn les?', meta:'Vergelijk dicteren en transcriberen en controleer de voorwaarden voor uw klas.', href:'#toolkeuze'}];
      case 'privacy': {
        const guide = publicRecordsById.get(SCHOOL_PRIVACY_ID);
        const items = [{label:'Kan ik dit leerlingwerk met AI delen?', meta:'Controleer gegevens, toepassing en schoolafspraken.', href:'#regels-in-de-praktijk'}];
        if (guide && primarySource(guide)) items.push({label:guide.title, meta:`Kennisnet · algemene uitleg voor ${guide.sectors?.join(', ') || 'scholen'}`, href:'#item/' + encodeURIComponent(guide.id)});
        return items;
      }
      case 'evidence':
        return [{label:'Wat weten we over AI-feedback en leren?', meta:'Bekijk wat onderzocht is, bij welke leerlingen en met welk resultaat.', href:'#wat-werkt'}];
      case 'ecology': {
        const types = filterValues('type', criteria.type);
        if (types.length && !types.includes('materials')) return [];
        const next = {...criteria, q:'ecosystemen', type:'materials'};
        const count = recordsForCriteria(next).length;
        if (!count) return [];
        return [{label:'Bekijk lesmateriaal over ecosystemen', meta:'Controleer in de les of het niveau bij uw klas past.', href:criteriaHref(next), count}];
      }
      default: return matchingWorksheetRoutes({...criteria, q:query});
    }
  }
  function alternativeSuggestion() {
    if (!state.q || resultRecords.length) return null;
    const question = normalize(state.q);
    if (/^(?:waar|hoe|wat|welke?|heeft de atlas|hebben jullie|is er|zijn er|bestaat er|ik zoek)\b/.test(question)) {
      const framing = new Set(['er', 'te', 'van', 'vinden', 'vind', 'bestaat', 'is', 'heeft', 'hebben', 'jullie', 'atlas', 'meer', 'materiaal', 'materiaalvoorbeelden', 'beschikbaar']);
      const topic = question.split(' ').filter(word => !REQUEST_WORDS.has(word) && !QUERY_STOPWORDS.has(word) && !framing.has(word)).join(' ');
      if (topic && topic !== question) {
        const count = recordsForCriteria({...state, q:topic}).length;
        if (count) return {candidate:topic, count};
      }
    }
    const rawCandidates = [
      ...themeOptions(), ...SYNONYMS.flat(),
      ...records.map(record => record.providerName).filter(Boolean)
    ];
    const candidates = [...new Set(rawCandidates)].filter(candidate => normalize(candidate) !== normalize(state.q));
    const ranked = candidates.map(candidate => {
      const left = normalize(state.q), right = normalize(candidate);
      const distance = levenshtein(left, right);
      const overlap = phrasePresent(left, right) || phrasePresent(right, left);
      return {candidate, quality: overlap ? 0 : distance / Math.max(left.length, right.length, 1)};
    }).filter(item => item.quality <= 0.42)
      .map(item => ({...item, count: recordsForCriteria({...state, q:item.candidate}).length}))
      .filter(item => item.count > 0)
      .sort((a, b) => a.quality - b.quality || b.count - a.count);
    return ranked[0] || null;
  }
  function relaxationSuggestions() {
    return FILTER_KEYS.filter(key => values(key).length).map(key => {
      const count = recordsForCriteria({ ...state, [key]: '' }).length;
      return { key, values: values(key), count };
    }).filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
  }
  const ASSESSMENT_CRITERIA = { q: 'toets', theme: 'Toetsing en examinering', type: 'materials,knowledge' };
  const AGREEMENT_CRITERIA = { q: 'afspraken', type: 'materials,knowledge' };
  const FUNDING_TYPES = ['Subsidie of call', 'Subsidie'];
  const ANNOUNCED_FUNDING_STATUSES = [STATUS_LABELS.planned, STATUS_LABELS.in_development];
  const CURRENT_FUNDING_STATUSES = [STATUS_LABELS.open_call, ...ANNOUNCED_FUNDING_STATUSES];
  const FUNDING_CRITERIA = { type: FUNDING_TYPES.join(','), status: CURRENT_FUNDING_STATUSES.join(',') };
  const PRACTICE_ROUTES = [
    { label: 'Een les voorbereiden', detail: 'Opdrachten voor de klas en lesmateriaal', criteria: { q: 'les', type: 'materials' } },
    { label: 'Een toets herontwerpen', detail: 'Een toetsafspraak maken en toetsmateriaal vinden', criteria: ASSESSMENT_CRITERIA },
    { label: 'AI-afspraken maken', detail: 'Een teamproef opzetten en afspraken vinden', criteria: AGREEMENT_CRITERIA },
    { label: 'Scholing vinden', detail: 'Cursussen, workshops en trainerskits', criteria: { type: 'Training', status: 'Direct beschikbaar' } },
    { label: 'Subsidies en calls', detail: 'Open en aangekondigde rondes, voorwaarden en deadlines', criteria: FUNDING_CRITERIA }
  ];
  const SECTOR_NAMES = {
    PO: 'Primair onderwijs', VO: 'Voortgezet onderwijs', MBO: 'Middelbaar beroepsonderwijs',
    HBO: 'Hoger beroepsonderwijs', WO: 'Wetenschappelijk onderwijs'
  };

  function renderPracticeRules() {
    const previous = sessionGet('atlas.lastSearch');
    const back = /^#zoeken(?:\?|$)/.test(previous) ? previous : '#zoeken';
    main.innerHTML = `<article class="personal-page research-page practice-rules">
      <nav class="practice-back"><a href="${escapeHtml(back)}">← Terug naar zoeken</a></nav>
      <header class="page-intro"><h1 id="rules-heading" tabindex="-1">Regels in de praktijk</h1><p>Loop de vragen langs voordat u leerlingwerk deelt of lesmateriaal van iemand anders bewerkt.</p></header>
      <section><h2>Mag ik leerlingwerk uploaden naar ChatGPT?</h2>
        <ol><li><strong>Kan iemand de leerling herkennen?</strong> Bekijk de tekst, de bestandsnaam, opmerkingen en details over de klas. Ook zonder naam kan een leerling herkenbaar zijn. Kunt u hetzelfde oefenen met een zelfgeschreven voorbeeld? Gebruik dat dan.</li>
        <li><strong>Welke gegevens zijn nodig?</strong> Leg vast waarvoor u de toepassing wilt gebruiken. Voor persoonsgegevens is een grondslag nodig. Beperk de gegevens tot wat voor dit doel noodzakelijk is. <a href="https://eur-lex.europa.eu/eli/reg/2016/679/2016-05-04?locale=nl">AVG, artikelen 4, 5 en 6</a>.</li>
        <li><strong>Welke afspraak geldt bij uw instelling?</strong> Vraag de verantwoordelijke voor privacy of informatiebeveiliging of deze toepassing, dit account en dit gebruik onder de afspraken met de leverancier vallen. Zolang dat onduidelijk is, houd het echte bestand buiten de toepassing. De docent controleert zelf de feedback voordat de leerling die krijgt.</li></ol>
        <p><a href="https://www.kennisnet.nl/artificial-intelligence/privacy-en-ai-hier-moeten-scholen-op-letten/">Kennisnet over persoonsgegevens in prompts en uploads</a> geeft voorbeelden voor scholen. Gebruik de <a href="https://www.kennisnet.nl/artificial-intelligence/schoolafspraken-over-het-gebruik-van-generatieve-ai/">werkbladen voor schoolafspraken</a> om met het team een eigen werkwijze vast te leggen.</p></section>
      <section><h2>Welke AI-hulp mag bij deze mbo-toets of dit examen?</h2>
        <p>Pak de schooleigen afspraken en de instructie bij het examen erbij. Leg vóór de start vast voor welk onderdeel AI-hulp is toegestaan, wat de student zelf moet aantonen en hoe die het gebruik vermeldt. Als de instructie hierover zwijgt, laat de examencommissie of de verantwoordelijke op school dit verduidelijken.</p>
        <p>De landelijke richtlijn uit 2025 bevat een gedragscode voor studenten en een voor medewerkers. Scholen vertalen die naar hun eigen situatie. <a href="https://www.onderwijsenexaminering.nl/publicaties/gebruik-van-ai-bij-toetsing-en-examinering-in-het-mbo-landelijke-richtlijn-als-vertrekpunt/">Lees de mbo-richtlijn van Kennispunt, Npuls en partners</a> · <a href="#toetsafspraak">Werk een toetsafspraak uit</a>.</p></section>
      <section><h2>Kan ik een werkblad met CC BY 4.0 aanpassen en delen?</h2>
        <p>Stel dat u een opdracht wilt vertalen. Controleer eerst op het origineel of de rechthebbende CC BY 4.0 vermeldt en of die licentie ook geldt voor de afbeeldingen die u wilt gebruiken.</p>
        <p>Voor het materiaal onder CC BY 4.0 zijn bewerken en delen toegestaan onder de licentievoorwaarden. Vermeld de maker, verwijs naar het origineel en de licentie en geef aan wat u hebt veranderd. Behoud eerdere wijzigingsvermeldingen en de meegeleverde auteursrechtvermelding en verwijzing naar de uitsluiting van garanties. Voor een onderdeel met een andere licentie bekijkt u de afzonderlijke voorwaarden.</p>
        <p><a href="https://creativecommons.org/licenses/by/4.0/legalcode.nl">Creative Commons, officiële licentie CC BY 4.0, artikelen 2 en 3</a>.</p></section>
      <footer><p>Bronnen gecontroleerd op <time datetime="2026-11-22">22 november 2026</time>. Controleer voor uw concrete geval ook de actuele afspraken van uw instelling.</p></footer></article>`;
  }
  const ASSESSMENT_MODES = {
    zelfstandig: {
      label: 'Zelfstandig uitwerken',
      rule: 'Werk dit onderdeel zelf uit, zonder generatieve AI. Gebruik de overige hulpmiddelen die vooraf met je docent zijn afgesproken.',
      evidence: 'Lever je uitwerking in. Leg tijdens het toetsmoment één keuze uit en laat zien hoe je die keuze aanpast als een gegeven verandert.',
      criterion: 'Je kunt uitleggen welke informatie je keuze ondersteunt en wat er verandert bij de nieuwe situatie.',
      teacher: 'Bereid een kleine variant op de opdracht voor en reserveer tijd voor ieders toelichting. Leg vooraf vast waar u bij die uitleg op let.',
      interpretation: 'De toelichting laat zien of de leerling de redenering zelf kan toepassen wanneer één gegeven verandert. Hoe de leerling feedback gebruikt, blijft buiten beeld.'
    },
    feedback: {
      label: 'AI mag feedback geven',
      rule: 'Maak eerst zelf een concept. Daarna mag je AI om feedback vragen. Schrijf de uiteindelijke uitwerking zelf.',
      evidence: 'Lever je concept en eindversie in. Licht één wijziging toe. Gebruikte je AI, leg dan uit wat je met één advies hebt gedaan. Werkte je zonder AI, leg dan uit waarom je zelf de wijziging aanbracht.',
      criterion: 'Je laat aan een concreet verschil tussen de versies zien hoe je wijziging bijdraagt aan het leerdoel.',
      teacher: 'Plan twee inlevermomenten. Leg concept en eindversie naast elkaar en gebruik voor iedereen hetzelfde criterium, ook bij herziening zonder AI.',
      interpretation: 'De versies en de toelichting laten zien hoe de leerling een advies weegt. Uit een goed eindproduct alleen kunt u geen zelfstandige beheersing afleiden.'
    },
    controleren: {
      label: 'Een AI-antwoord onderzoeken',
      rule: 'Je krijgt een AI-antwoord van je docent. Zoek zelf bewijs in de oorspronkelijke bron en schrijf je eigen oordeel zonder verdere AI-hulp.',
      evidence: 'Kies één controleerbare bewering uit het antwoord. Geef de vindplaats in de bron en leg uit in hoeverre de passage de bewering ondersteunt. Verbeter de bewering waar dat nodig is.',
      criterion: 'De passage is terug te vinden en je legt precies uit welk deel van de bewering het bewijs ondersteunt.',
      teacher: 'Geef iedereen hetzelfde AI-antwoord en toegang tot de bron. Kijk of de aangehaalde passage het oordeel draagt, ook als iemand tot een andere conclusie komt.'
    }
  };
  function comparisonToolLink() {
    const params = new URLSearchParams({vergelijk: '1'});
    for (const key of FILTER_KEYS) {
      if (state[key]) params.set(key, state[key]);
    }
    return {comparison: true, label: 'Vergelijk twee toetsaanpakken', meta: 'Zelfstandig uitwerken of AI-feedback gebruiken', href: '#toetsafspraak?' + params};
  }
  function assessmentToolLink(query) {
    const term = normalize(query);
    const task = term.replace(/^(?:hoe kan ik|hoe kunnen we|kan ik|ik wil|we willen) /, '')
      .replace(/ voor (?:dit|een|mijn|ons) leerdoel$/, '');
    if (/^(?:(?:hoe )?vergelijk(?: ik| je| u| we| wij)? (?:twee |verschillende )?toets(?:vormen|aanpakken)|(?:twee |verschillende )?toets(?:vormen|aanpakken) vergelijken)$/.test(task)) {
      return comparisonToolLink();
    }
    if (['toetsafspraak', 'toetsafspraken', 'toetsafspraak maken'].includes(term)) {
      return {label:'Maak een toetsafspraak', meta:'Opdrachttekst voor uw klas', href:'#toetsafspraak'};
    }
    if (['ai bestendige toets', 'ai bestendige toetsvraag', 'toets ai bestendig maken',
      'ai resilient toetsen', 'ai resilient toets', 'toets ai resilient', 'maak uw toetsvraag ai bestendiger'].includes(term)) {
      return {label:'Maak uw toetsvraag AI-bestendiger', meta:'Werk met uw eigen toetsvraag', href:'#toetsafspraak?start=eigen'};
    }
    return null;
  }
  const ASSESSMENT_EXAMPLES = {
    voedselweb: {
      title: 'VO-biologie · Een voedselweb verklaren',
      original: 'Wat gebeurt er met koolmezen als er minder rupsen zijn?',
      answer: '“Er zijn minder rupsen, dus er komen zeker minder koolmezen.”',
      feedback: 'Je benoemt één voedselroute. Teken ook de route via vliegen en spinnen. Welke telling mis je om het woord “zeker” te kunnen verdedigen?',
      goal: 'Met twee voedselroutes uitleggen wat je wel en niet kunt voorspellen over het aantal koolmezen.',
      mode: 'controleren',
      task: 'In dit vereenvoudigde voedselweb eten rupsen eikenblad, spinnen eten vliegen en koolmezen eten zowel rupsen als spinnen. Er zijn dit voorjaar minder rupsen. Beoordeel de uitspraak “Dan komen er zeker minder koolmezen.” Teken twee routes met pijlen van voedsel naar eter. Leg in drie zinnen uit welke verandering mogelijk is en wat je nog moet weten.',
      evidence: 'Lever je eigen tekening en uitleg in. Onderstreep het woord uit de uitspraak dat je zou aanpassen en licht je keuze toe met beide routes.',
      criterion: 'Criterium: je onderbouwt de voorspelling met het voedselweb.\nIn opbouw — Je noemt een mogelijk gevolg, maar laat de bijbehorende voedselroute nog niet zien.\nVoldoende — Je tekent beide routes correct en legt uit waarom minder rupsen geen zekere daling van het aantal koolmezen betekent.\nSterk — Je benoemt bovendien een ontbrekend gegeven en legt uit hoe dat je voorspelling kan veranderen.',
      alternative: 'Gebruik de afgedrukte uitspraak uit de opdracht als stelling van de docent. Je werkt op papier met hetzelfde voedselweb en dezelfde beoordelingscriteria.'
    },
    adviesmail: {
      title: 'Mbo-Nederlands · Een adviesmail onderbouwen',
      original: 'Schrijf een overtuigende mail over langere openingstijden van de schoolkantine.',
      answer: '“Iedereen wil dat de kantine dinsdag vroeger opengaat. Dat is beter voor de hele school.”',
      feedback: 'Je voorkeur is duidelijk. “Iedereen” past niet bij 18 van de 30 reacties. Gebruik het getal en schrijf één zin waarin je de andere groep serieus neemt.',
      goal: 'Een advies aan een beheerder onderbouwen met gegevens en een afgewogen tegenargument.',
      mode: 'feedback',
      task: 'De schoolkantine kan één extra uur open: dinsdag vanaf 8.00 uur of donderdag tot 17.00 uur. In deze fictieve peiling kiezen 18 van de 30 studenten dinsdag en 12 donderdag. Schrijf de beheerder een adviesmail van 80–120 woorden. Adviseer één optie, onderbouw je keuze met de verdeling en bespreek een nadeel voor de andere groep. Eindig met een concrete vraag aan de beheerder.',
      evidence: 'Schrijf zelf je eerste versie. Vraag feedback op één bewering en beslis zelf wat je wijzigt. Lever beide versies in en licht in één zin toe welk advies je gebruikte of verwierp en waarom.',
      criterion: 'Criterium: je weegt de peiling in je advies.\nIn opbouw — Je kiest een openingstijd, maar gebruikt de verdeling nog niet juist als argument.\nVoldoende — Je gebruikt de cijfers correct en benoemt een concreet nadeel voor de andere groep.\nSterk — Je legt bovendien uit waarom je keuze ondanks dat nadeel passend is en stelt de beheerder een uitvoerbare vervolgvraag.',
      alternative: 'Herlees je eigen concept met de vraag “Klopt mijn bewering voor alle 30 studenten?” of vraag een klasgenoot dezelfde feedback. Lever dezelfde twee versies en toelichting in.'
    }
  };
  const assessmentDrafts = new Map();
  let assessmentChoice;

  function assessmentEntry(tool = null) {
    const sectors = values('sector');
    const comparing = tool?.comparison;
    if (!comparing && sectors.length && !sectors.some(sector => ['VO', 'MBO', 'HBO', 'WO'].includes(sector))) return '';
    return `<section class="assessment-entry" aria-labelledby="assessment-entry-heading"><div>
      <h2 id="assessment-entry-heading" tabindex="-1">${comparing ? 'Welke toetsaanpak past bij uw leerdoel?' : 'Wat mag AI bij deze opdracht?'}</h2>
      <p>${comparing ? 'Bekijk per aanpak wat een student laat zien en wat u daarvoor organiseert.' : 'Maak een tekst voor uw klas over de toegestane hulp, het eigen werk en de beoordeling.'}</p>
      ${comparing ? '' : `<p><a href="${escapeHtml(comparisonToolLink().href)}">Vergelijk twee toetsaanpakken</a></p>`}</div>
      <a class="btn" href="${escapeHtml(tool?.href || '#toetsafspraak')}">${escapeHtml(tool?.label || 'Maak een toetsafspraak')}</a></section>`;
  }

  function assessmentStorageKey(choice) {
    return choice ? 'atlas.toetsafspraak.' + choice : 'atlas.toetsafspraak';
  }
  function readAssessmentDraft(choice = '') {
    if (assessmentDrafts.has(choice)) return assessmentDrafts.get(choice);
    let saved;
    try { saved = JSON.parse(sessionGet(assessmentStorageKey(choice))); } catch { /* Eerste bezoek of een ouder concept. */ }
    if (!saved && Object.hasOwn(ASSESSMENT_EXAMPLES, choice)) saved = ASSESSMENT_EXAMPLES[choice];
    return {
      goal: typeof saved?.goal === 'string' ? saved.goal.slice(0, 500) : '',
      mode: typeof saved?.mode === 'string' && Object.hasOwn(ASSESSMENT_MODES, saved.mode) ? saved.mode : '',
      task: typeof saved?.task === 'string' ? saved.task : '',
      alternative: typeof saved?.alternative === 'string' ? saved.alternative.slice(0, 500) : '',
      evidence: typeof saved?.evidence === 'string' ? saved.evidence.slice(0, 500) : '',
      criterion: typeof saved?.criterion === 'string' ? saved.criterion.slice(0, 500) : '',
      reviewRequired: saved?.reviewRequired === true
    };
  }

  function assessmentParts(draft) {
    if (!draft.goal.trim() || !Object.hasOwn(ASSESSMENT_MODES, draft.mode)) return [];
    const mode = ASSESSMENT_MODES[draft.mode];
    return [['Leerdoel', draft.goal.trim()], ...(draft.task?.trim() ? [['Opdracht', draft.task.trim()]] : []),
      ['Gebruik van AI', mode.rule], ...(draft.alternative?.trim() ? [['Zonder AI', draft.alternative.trim()]] : []),
      ['Wat je laat zien', draft.evidence.trim() || mode.evidence], ['Hierop word je beoordeeld', draft.criterion.trim() || mode.criterion]];
  }

  function renderAssessment() {
    if (assessmentChoice === undefined) {
      const saved = sessionGet('atlas.toetsafspraak.start');
      assessmentChoice = Object.hasOwn(ASSESSMENT_EXAMPLES, saved) ? saved : '';
    }
    const params = new URLSearchParams(location.hash.split('?')[1]);
    const startPoint = params.get('start');
    const comparing = params.get('vergelijk') === '1';
    const originFilters = Object.fromEntries(FILTER_KEYS.filter(key => params.get(key)).map(key => [key, params.get(key)]));
    const filteredReturn = comparing && Object.keys(originFilters).length > 0;
    const ownTest = startPoint === 'eigen';
    const explicitExample = Object.hasOwn(ASSESSMENT_EXAMPLES, startPoint);
    const choice = explicitExample ? startPoint : (ownTest || comparing ? '' : assessmentChoice);
    const example = ASSESSMENT_EXAMPLES[choice];
    const draft = readAssessmentDraft(choice);
    const taskField = `<label for="assessment-task">${example ? 'Wat is de opdracht?' : 'Uw bestaande toetsvraag of opdracht'}</label>
      <textarea id="assessment-task" rows="4" ${ownTest ? 'required' : ''}>${escapeHtml(draft.task)}</textarea>`;
    const evidenceField = `<label for="assessment-evidence">${ownTest ? 'Wat moet de leerling bij deze vraag zelf laten zien?' : 'Wat wilt u terugzien?'}</label>
      <textarea id="assessment-evidence" rows="2" maxlength="500" placeholder="${ownTest ? 'Bijv. licht je bronkeuze toe en leg uit welke nieuwe informatie je oordeel zou veranderen.' : 'Bijv. een schets met een korte mondelinge toelichting.'}">${escapeHtml(draft.evidence)}</textarea>`;
    const sources = [
      ['toetsing-en-generatieve-ai-in-het-voortgezet-onderwijs', 'Kennisnet over toetsing in het vo'],
      ['visie-op-toetsing-examinering-en-ai-en-handreikingen', 'Npuls over toetsing in het mbo, hbo en wo']
    ].flatMap(([id, label]) => {
      const record = publicRecordsById.get(id);
      const official = record && effectiveStatus(record) === 'available' && primarySource(record);
      return official ? [`<li><a href="${escapeHtml(official.url)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer">${label} ↗</a></li>`] : [];
    });
    main.innerHTML = `<section class="assessment-page">
      <a href="${escapeHtml(criteriaHref(filteredReturn ? originFilters : ASSESSMENT_CRITERIA))}">← ${filteredReturn ? 'Naar uw zoekselectie' : 'Naar toetsmateriaal'}</a>
      <header><h1>${ownTest ? 'Maak eigen werk zichtbaar in uw toets' : 'Maak een toetsafspraak'}</h1>
        <p>${ownTest ? 'Neem één bestaande toetsvraag. Kies wat de leerling zelf moet kunnen aantonen. U krijgt een opdrachttekst met een bewijsstap en een beoordelingscriterium.' : 'Werk met uw eigen leerdoel of pas een uitgewerkt toetsvoorbeeld aan voor uw klas.'}</p></header>
      <div class="assessment-start"><label for="assessment-start">Kies een startpunt</label>
        <select id="assessment-start"><option value="">Mijn eigen opdracht</option>
          ${Object.entries(ASSESSMENT_EXAMPLES).map(([key, item]) => `<option value="${key}" ${key === choice ? 'selected' : ''}>${escapeHtml(item.title)}</option>`).join('')}</select>
        <p class="assessment-note">Uw eigen opdracht en aanpassingen aan elk voorbeeld blijven apart bewaard in dit tabblad.</p>
        ${example ? `<button class="assessment-example" type="button" data-assessment-jump>Ga naar de kopieerbare opdracht</button>
          <details class="assessment-custom"><summary>Oorspronkelijke vraag en voorbeeldfeedback</summary>
          <dl><dt>Oorspronkelijke vraag</dt><dd>${escapeHtml(example.original)}</dd>
          <dt>Voorbeeldantwoord van een leerling</dt><dd>${escapeHtml(example.answer)}</dd>
          <dt>Feedback bij dit antwoord</dt><dd>${escapeHtml(example.feedback)}</dd></dl></details>` : ''}</div>
      <form class="assessment-form">
        ${example ? '' : taskField}
        <label for="assessment-goal">Wat moet de leerling of student zelf kunnen?</label>
        <textarea id="assessment-goal" rows="2" maxlength="500" required placeholder="Bijv. twee bronnen vergelijken en een conclusie onderbouwen.">${escapeHtml(draft.goal)}</textarea>
        <details class="assessment-custom assessment-compare"${comparing ? ' open' : ''}><summary>Vergelijk twee toetsaanpakken voor dit leerdoel</summary>
          <p data-assessment-compare-goal></p><div class="assessment-compare-grid">
          ${Object.entries(ASSESSMENT_MODES).filter(([, mode]) => mode.interpretation).map(([key, mode]) => `<section>
            <h2>${mode.label}</h2><dl>
              <dt>Wat levert de leerling in of laat die zien?</dt><dd>${mode.evidence}</dd>
              <dt>Wat kunt u daaruit afleiden?</dt><dd>${mode.interpretation}</dd>
              <dt>Wat organiseert u?</dt><dd>${mode.teacher}</dd></dl>
            <button class="btn secondary" type="button" data-assessment-apply="${key}" aria-label="Gebruik deze aanpak: ${mode.label}">Gebruik deze aanpak</button></section>`).join('')}
          </div><p class="assessment-note">De Atlas werkte de twee aanpakken uit. <a href="https://npuls.nl/_assets/9235efab-b04a-4c63-aeb9-ccd71518a0cf/Npuls-Handreiking-2-AI-B5.pdf" target="_blank" rel="noopener noreferrer">Npuls over leerdoelen, bewijs van beheersing en de uitvoerbaarheid van toetsing (pdf, p. 24–25) ↗</a></p>
        </details>
        <div class="assessment-layout"><div>
        <fieldset><legend>Welke rol krijgt AI bij deze opdracht?</legend>
          ${Object.entries(ASSESSMENT_MODES).map(([key, mode]) => `<label class="assessment-choice"><input required type="radio" name="mode" value="${key}" ${key === draft.mode ? 'checked' : ''}>${mode.label}</label>`).join('')}
        </fieldset>
        ${ownTest ? `${evidenceField}<p class="assessment-note">Laat dit veld leeg om de bewijsstap van de gekozen aanpak te gebruiken.</p>` : ''}
        <details class="assessment-custom" ${!example && (draft.evidence || draft.criterion || draft.alternative) ? 'open' : ''}>
          <summary>${example ? 'Pas opdracht, inlevervorm en beoordeling aan' : 'Pas inlevervorm en beoordeling aan'}</summary>
          ${example ? taskField : ''}
          <label for="assessment-alternative">Hoe kan de leerling zonder AI meedoen?</label>
          <textarea id="assessment-alternative" rows="2" maxlength="500">${escapeHtml(draft.alternative)}</textarea>
          ${ownTest ? '' : evidenceField}
          <label for="assessment-criterion">Waar let u op bij de beoordeling?</label>
          <textarea id="assessment-criterion" rows="2" maxlength="500" placeholder="Bijv. elke ontwerpkeuze is onderbouwd met een gegeven uit de opdracht.">${escapeHtml(draft.criterion)}</textarea>
          <p class="assessment-note">Een lege inlevervorm of beoordeling gebruikt het voorstel bij de gekozen rol van AI.</p>
        </details>
        <div class="assessment-actions"><button class="btn" type="submit">Bekijk opdrachttekst</button>
          <button class="assessment-clear" type="button" data-assessment-clear>${example ? 'Herstel dit voorbeeld' : 'Wis concept'}</button></div>
        <p class="assessment-note">Uw concept blijft in dit tabblad. Kopieer de opdrachttekst om die te bewaren.</p>
      </div>
      <section class="assessment-preview" aria-labelledby="assessment-preview-title">
        <h2 id="assessment-preview-title" tabindex="-1">Opdrachttekst voor uw klas</h2>
        <p class="assessment-note" id="assessment-apply-note" data-assessment-apply-note role="status"></p>
        <div data-assessment-result></div>
      </section></div></form>
      <details class="assessment-sources"><summary>Over de voorbeelden en bronnen</summary>
        <p>De Atlas schreef de opdrachten, fictieve leerlingantwoorden, feedback en beoordelingscriteria. Stem ze af op uw leerdoel en de afspraken op uw school.</p>
        ${sources.length ? `<p>Achtergrond bij het toetsontwerp</p><ul>${sources.join('')}</ul>` : ''}</details>
      <p><a href="#wat-werkt">Wat zegt onderzoek over AI-feedback?</a></p></section>`;
    const form = main.querySelector('.assessment-form');
    const goal = form.querySelector('#assessment-goal');
    const mode = form.elements.namedItem('mode');
    const evidence = form.querySelector('#assessment-evidence');
    const criterion = form.querySelector('#assessment-criterion');
    const task = form.querySelector('#assessment-task');
    const alternative = form.querySelector('#assessment-alternative');
    const result = main.querySelector('[data-assessment-result]');
    const start = main.querySelector('#assessment-start');
    const clear = form.querySelector('[data-assessment-clear]');
    const comparison = form.querySelector('.assessment-compare');
    const comparisonGoal = comparison.querySelector('[data-assessment-compare-goal]');
    const applied = form.querySelector('[data-assessment-apply-note]');
    let previousMode = draft.mode;
    let reviewRequired = draft.reviewRequired;
    const current = () => ({goal:goal.value, mode:mode.value, task:task.value, alternative:alternative.value, evidence:evidence.value, criterion:criterion.value});
    function updatePreview() {
      const value = current();
      const missingTask = ownTest && !value.task.trim();
      const parts = missingTask ? [] : assessmentParts(value);
      comparisonGoal.textContent = value.goal.trim() ? 'Uw leerdoel: ' + value.goal.trim() : 'Vul hierboven uw eigen leerdoel in om een aanpak te gebruiken.';
      const reviewNote = reviewRequired && ASSESSMENT_MODES[value.mode]
        ? `U koos ‘${ASSESSMENT_MODES[value.mode].label}’. Controleer of de ingevulde opdracht, het werk dat leerlingen laten zien, de beoordeling en de afspraken zonder AI bij deze aanpak passen. Pas de tekst waar nodig aan en bevestig uw controle onder de opdrachttekst.`
        : '';
      if (applied.textContent !== reviewNote) applied.textContent = reviewNote;
      clear.hidden = !reviewRequired && (example ? Object.entries(value).every(([key, text]) => text === example[key]) : !Object.values(value).some(Boolean));
      goal.setCustomValidity(value.goal && !value.goal.trim() ? 'Vul een leerdoel in.' : '');
      if (ownTest) task.setCustomValidity(missingTask ? 'Vul uw bestaande toetsvraag of opdracht in.' : '');
      if (!parts.length) {
        result.innerHTML = `<p class="assessment-prompt">${ownTest ? 'Vul uw toetsvraag en leerdoel in en kies de rol van AI.' : 'Vul een leerdoel in en kies de rol van AI.'} Hier verschijnt de tekst voor uw klas.</p>`;
        return;
      }
      const selected = ASSESSMENT_MODES[value.mode];
      result.innerHTML = `<dl>${parts.map(([label, text]) => `<div><dt>${label}</dt><dd>${escapeHtml(text)}</dd></div>`).join('')}</dl>
        ${reviewRequired
          ? '<button class="btn" type="button" data-assessment-review aria-describedby="assessment-apply-note">Ik heb de opdracht en beoordeling gecontroleerd</button>'
          : '<button class="btn" type="button" data-assessment-copy>Kopieer opdrachttekst</button>'}
        <p class="assessment-feedback" role="status"></p>
        <textarea class="lesson-copy" aria-label="Opdrachttekst om te kopiëren" readonly hidden></textarea>
        <aside><h3>Suggestie voor de beoordeling</h3><p>${selected.teacher}</p></aside>`;
      if (reviewRequired) {
        result.querySelector('[data-assessment-review]').onclick = () => {
          reviewRequired = false;
          saveAndPreview();
          result.querySelector('[data-assessment-copy]').focus();
        };
        return;
      }
      const copy = result.querySelector('[data-assessment-copy]');
      copy.onclick = () => copyTextWithFallback(copy, parts.map(pair => pair.join('\n')).join('\n\n'),
        result.querySelector('[role="status"]'), result.querySelector('textarea'),
        'Opdrachttekst gekopieerd.', 'De opdrachttekst is geselecteerd. Kopieer deze naar uw leeromgeving.');
    }
    function saveAndPreview() {
      const value = current();
      const hasCustomTerms = [value.evidence, value.criterion, value.alternative].some(text => text.trim());
      if (!hasCustomTerms || !value.mode) reviewRequired = false;
      else if (previousMode && previousMode !== value.mode) reviewRequired = true;
      previousMode = value.mode;
      const saved = {...value, reviewRequired};
      assessmentDrafts.set(choice, saved);
      sessionSet(assessmentStorageKey(choice), JSON.stringify(saved));
      updatePreview();
    }
    form.oninput = saveAndPreview;
    for (const button of comparison.querySelectorAll('[data-assessment-apply]')) {
      button.onclick = () => {
        if (ownTest && !task.value.trim()) { task.focus(); task.reportValidity(); return; }
        if (!goal.value.trim()) { goal.focus(); goal.reportValidity(); return; }
        mode.value = button.dataset.assessmentApply;
        saveAndPreview();
        comparison.open = false;
        if (!reviewRequired) applied.textContent = 'Gekozen aanpak: ' + ASSESSMENT_MODES[mode.value].label + '.';
        main.querySelector('#assessment-preview-title').focus();
      };
    }
    form.onsubmit = event => { event.preventDefault(); main.querySelector('#assessment-preview-title').focus(); };
    start.onchange = () => {
      assessmentChoice = Object.hasOwn(ASSESSMENT_EXAMPLES, start.value) ? start.value : '';
      sessionSet('atlas.toetsafspraak.start', assessmentChoice);
      if (ownTest || explicitExample || comparing) {
        params.set('start', assessmentChoice || 'eigen');
        history.replaceState(history.state, '', '#toetsafspraak?' + params);
      }
      renderAssessment();
      main.querySelector('#assessment-start').focus();
    };
    if (example) main.querySelector('[data-assessment-jump]').onclick = () => main.querySelector('#assessment-preview-title').focus();
    clear.onclick = () => {
      goal.value = example?.goal || ''; evidence.value = example?.evidence || ''; criterion.value = example?.criterion || '';
      task.value = example?.task || ''; alternative.value = example?.alternative || '';
      for (const radio of form.querySelectorAll('[name="mode"]')) radio.checked = radio.value === example?.mode;
      reviewRequired = false;
      previousMode = mode.value;
      saveAndPreview();
      (ownTest ? task : goal).focus();
    };
    updatePreview();
  }

  const TEAM_TRIALS = {
    feedback: {
      title: 'Feedback op schrijfwerk',
      goal: 'Kunnen leerlingen of studenten na de feedback zelf een tekst verbeteren en hun keuze uitleggen?',
      activity: 'Schrijf één korte voorbeeldtekst zonder persoonsgegevens. Geef zelf één tip en laat AI voor hetzelfde criterium ook een tip maken. Controleer de AI-tip. Vertel de klas hoe de twee tips tot stand kwamen.',
      comparison: 'Verdeel de tips willekeurig over de klas. Iedereen verbetert dezelfde tekst met één tip. Noteer per groep hoeveel deelnemers hun verbetering kunnen uitleggen, bijvoorbeeld 8 van de 12. Bespreek daarna beide tips.',
      voice: 'Wat heb je met jouw tip veranderd? Welke woorden hielpen je en waar had je nog uitleg nodig?',
      rule: 'We proberen de AI-tip nog een les als leerlingen of studenten hun verbetering daarmee minstens zo vaak kunnen uitleggen als met onze eigen tip. Bij een inhoudelijke fout houden we de tip tegen en bespreken we wat er misging.'
    },
    lesvoorbereiding: {
      title: 'Oefenmateriaal voorbereiden',
      goal: 'Kunnen we voorbereidingstijd winnen terwijl de klas even goed zelfstandig oefent?',
      activity: 'Maak één oefenopgave zoals u gewend bent. Laat AI een tweede opgave voor hetzelfde leerdoel voorstellen. Houd per opgave de tijd bij, inclusief nakijken, verbeteren en toegankelijk maken. Controleer ook het antwoord.',
      comparison: 'Laat de klas beide opgaven maken en wissel de volgorde af. Turf bij elke opgave wie zelfstandig de beoogde denkstap laat zien. Leg deze uitkomst naast de totale voorbereidingstijd.',
      voice: 'Bij welke opgave wist je wat je zelf moest uitzoeken? Waar zat je vast door de formulering?',
      rule: 'We gaan nog een les door als de totale voorbereiding korter is én minstens evenveel deelnemers de denkstap zelfstandig laten zien. Bij een onjuist antwoord of een onduidelijke opdracht passen we het materiaal eerst aan.'
    }
  };
  const TRIAL_DECISIONS = ['Opnieuw proberen', 'Aanpassen en opnieuw proberen', 'Stoppen'];
  const trialDrafts = new Map();
  const teamTrialQuery = query => ['teamproef', 'teamproef met ai', 'proefkaart', 'proefkaart voor het team'].includes(normalize(query));

  function teamTrialEntry() {
    return `<section class="assessment-entry" aria-labelledby="trial-entry-heading"><div>
      <h2 id="trial-entry-heading" tabindex="-1">Is dit AI-gebruik de moeite waard in onze les?</h2>
      <p>Probeer één aanpak uit. Spreek met uw team af wat u wilt zien in het werk en horen van de klas.</p></div>
      <a class="btn" href="#teamproef">Open de teamproef</a></section>`;
  }

  function readTrialDraft(raw) {
    try {
      const value = JSON.parse(raw);
      if (typeof value?.rule !== 'string') return null;
      const clean = {};
      for (const key of ['group', 'owner', 'date', 'rule', 'observation', 'decision']) {
        clean[key] = typeof value[key] === 'string' ? value[key].slice(0, 800) : '';
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(clean.date)) clean.date = '';
      if (!TRIAL_DECISIONS.includes(clean.decision)) clean.decision = '';
      return clean;
    } catch { return null; }
  }

  function savedTrial(id) {
    try { return readTrialDraft(localStorage.getItem(`atlas.teamproef.${id}`)); }
    catch { return null; }
  }

  function trialFields(id, draft) {
    const scenario = TEAM_TRIALS[id];
    return [
      ['Vraag voor deze les', scenario.goal], ['Aanpak', scenario.activity],
      ['Wat vergelijken we?', scenario.comparison], ['Vraag aan de klas', scenario.voice],
      ['Les of groep', draft.group], ['Wie koppelt terug?', draft.owner],
      ['Datum van het teamoverleg', draft.date ? dateLabel(draft.date) : ''],
      ['Wanneer gaan we door, passen we iets aan of stoppen we?', draft.rule],
      ['Wat zagen we in het werk en wat zei de klas?', draft.observation], ['Besluit', draft.decision]
    ];
  }

  function renderTeamTrial() {
    const requested = new URLSearchParams(location.hash.split('?')[1]).get('casus');
    const id = Object.hasOwn(TEAM_TRIALS, requested) ? requested :
      (!savedTrial('feedback') && savedTrial('lesvoorbereiding') ? 'lesvoorbereiding' : 'feedback');
    const scenario = TEAM_TRIALS[id];
    const storageKey = `atlas.teamproef.${id}`;
    const saved = savedTrial(id);
    const draft = trialDrafts.get(id) || readTrialDraft(sessionGet(storageKey)) || saved ||
      {group: '', owner: '', date: '', rule: scenario.rule, observation: '', decision: ''};
    const href = key => `#teamproef?casus=${key}`;
    const back = criteriaHref({...AGREEMENT_CRITERIA, sector: state.sector, vak: state.vak, audience: state.audience, language: state.language});
    const sources = [
      ['schoolafspraken-over-het-gebruik-van-generatieve-ai', 'Kennisnet over AI-afspraken op school'],
      ['ai-go-in-actie', 'Npuls over klein beginnen en bijstellen in het mbo, hbo en wo']
    ].flatMap(([recordId, label]) => {
      const record = publicRecordsById.get(recordId);
      const link = record && effectiveStatus(record) === 'available' && primarySource(record);
      return link ? [`<li><a href="${escapeHtml(link.url)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer">${label} ↗</a></li>`] : [];
    });
    main.innerHTML = `<article class="trial-page">
      <div class="trial-screen"><a href="${escapeHtml(back)}">← Naar AI-afspraken</a>
        <header><h1>Teamproef met AI</h1><p>Probeer één verandering uit in één les. Spreek eerst af wat die moet opleveren. Neem het werk en de reacties van de klas mee naar het volgende overleg.</p></header>
        <nav class="trial-choices" aria-label="Kies een praktijksituatie">${Object.entries(TEAM_TRIALS).map(([key, item]) =>
          `<a href="${href(key)}"${key === id ? ' aria-current="page"' : ''}>${item.title}<small data-trial-badge="${key}"${savedTrial(key) ? '' : ' hidden'}>Bewaard</small></a>`).join('')}</nav>
        <button type="button" class="trial-jump">Naar onze proefkaart ↓</button>
        <div class="trial-layout"><section class="trial-guide" aria-labelledby="trial-goal"><h2 id="trial-goal">${scenario.goal}</h2>
          <dl><div><dt>Aanpak</dt><dd>${scenario.activity}</dd></div><div><dt>Wat vergelijken we?</dt><dd>${scenario.comparison}</dd></div>
          <div class="trial-voice"><dt>Vraag aan de klas</dt><dd>${scenario.voice}</dd></div></dl>
          <p class="trial-note">Gebruik een hulpmiddel dat uw instelling toestaat. De klas werkt zonder AI-account. Eén les helpt u kiezen wat u hierna probeert.</p>
        </section>
        <section class="trial-form" aria-labelledby="trial-form-title"><h2 id="trial-form-title" tabindex="-1">Onze proefkaart</h2>
          <p>Vul dit samen in. Noteer alleen informatie over de groep.</p>
          <form autocomplete="off">
            <label for="trial-group">In welke les of groep?</label><input id="trial-group" name="group" maxlength="140" placeholder="Bijv. Nederlands, klas 2" value="${escapeHtml(draft.group)}">
            <div class="trial-pair"><div><label for="trial-owner">Wie koppelt terug?</label><input id="trial-owner" name="owner" maxlength="140" placeholder="Bijv. de vakdocent" value="${escapeHtml(draft.owner)}"></div>
              <div><label for="trial-date">Datum van het teamoverleg</label><input type="date" id="trial-date" name="date" value="${escapeHtml(draft.date)}"></div></div>
            <label for="trial-rule">Wanneer gaan we door, passen we iets aan of stoppen we?</label>
            <textarea id="trial-rule" name="rule" rows="4" maxlength="800" aria-describedby="trial-rule-note">${escapeHtml(draft.rule)}</textarea>
            <small id="trial-rule-note">Pas deze voorbeeldafspraak aan vóór de les.</small>
            <details class="trial-review"${draft.observation || draft.decision ? ' open' : ''}><summary>Na de les · Vul de terugblik in</summary>
              <label for="trial-observation">Wat zagen we in het werk en wat zei de klas?</label>
              <textarea id="trial-observation" name="observation" rows="3" maxlength="800" placeholder="Wat lukte, wie had extra hulp nodig en wat doen we de volgende keer?">${escapeHtml(draft.observation)}</textarea>
              <label for="trial-decision">Besluit van het team</label>
              <select id="trial-decision" name="decision"><option value="">Nog te bespreken</option>${TRIAL_DECISIONS.map(choice => `<option${choice === draft.decision ? ' selected' : ''}>${choice}</option>`).join('')}</select>
            </details></form>
          <div class="trial-actions"><button type="button" class="btn" data-trial-copy>Kopieer proefkaart</button>
            <button type="button" class="btn secondary" data-trial-print>Druk proefkaart af</button></div>
          <textarea class="lesson-copy" aria-label="Proefkaart om te kopiëren" readonly hidden></textarea>
          <div class="trial-storage"><button type="button" data-trial-save>Bewaar op dit apparaat</button>
            <button type="button" data-trial-remove${saved ? '' : ' hidden'}>Verwijder bewaarde versie</button></div>
          <p class="trial-note">Uw invulling blijft in dit tabblad. Kies ‘Bewaar op dit apparaat’ om de kaart in deze browser later terug te vinden.</p>
          <p class="trial-feedback" role="status"></p>
        </section></div>
        <details class="assessment-sources"><summary>Herkomst van de proefkaarten</summary>
          <p>De voorbeelden en beslisregels zijn geschreven door de AI &amp; Onderwijs Atlas Nederland. Ze helpen een team een eigen keuze te maken.</p>
          ${sources.length ? `<ul>${sources.join('')}</ul>` : ''}</details>
      </div><section class="trial-print" aria-label="Afdrukbare proefkaart"></section></article>`;
    const form = main.querySelector('.trial-form form');
    const copy = main.querySelector('[data-trial-copy]');
    const remove = main.querySelector('[data-trial-remove]');
    const feedback = main.querySelector('.trial-feedback');
    const manual = main.querySelector('.lesson-copy');
    const badge = main.querySelector(`[data-trial-badge="${id}"]`);
    function current() {
      return Object.fromEntries([...form.elements].filter(field => field.name).map(field => [field.name, field.value]));
    }
    function keepInTab() {
      const value = current();
      trialDrafts.set(id, value);
      sessionSet(storageKey, JSON.stringify(value));
    }
    function refreshCard() {
      const value = current();
      main.querySelector('.trial-print').innerHTML = `<h1>Teamproef met AI</h1><h2>${scenario.title}</h2>
        <dl>${trialFields(id, value).map(([label, answer]) => `<div><dt>${escapeHtml(label)}</dt><dd${answer.trim() ? '' : ' class="trial-write"'}>${escapeHtml(answer.trim())}</dd></div>`).join('')}</dl>
        <p>AI &amp; Onderwijs Atlas Nederland · <a href="${PUBLIC_ATLAS}${href(id)}">Open deze proefkaart in de Atlas</a></p>`;
    }
    form.onsubmit = event => { event.preventDefault(); };
    main.querySelector('.trial-jump').onclick = () => main.querySelector('#trial-form-title').focus();
    form.oninput = () => {
      keepInTab();
      const notice = remove.hidden ? '' : 'Uw wijzigingen blijven in dit tabblad tot u de kaart opnieuw bewaart.';
      if (feedback.textContent !== notice) feedback.textContent = notice;
      manual.hidden = true;
      refreshCard();
    };
    copy.onclick = () => {
      const text = ['Teamproef met AI · ' + scenario.title, ...trialFields(id, current()).map(([label, answer]) => `${label}\n${answer.trim() || 'Nog in te vullen'}`),
        `AI & Onderwijs Atlas Nederland\n${PUBLIC_ATLAS}${href(id)}`].join('\n\n');
      return copyTextWithFallback(copy, text, feedback, manual, 'Proefkaart gekopieerd.', 'De proefkaart is geselecteerd. Kopieer de tekst voor uw team.');
    };
    main.querySelector('[data-trial-print]').onclick = () => { refreshCard(); window.print(); };
    main.querySelector('[data-trial-save]').onclick = () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(current()));
        remove.hidden = false;
        badge.hidden = false;
        feedback.textContent = 'Proefkaart bewaard. Open deze situatie in dezelfde browser voor uw volgende overleg.';
      } catch { feedback.textContent = 'Bewaren op dit apparaat lukt niet. Kopieer de kaart of druk deze af.'; }
    };
    remove.onclick = () => {
      try {
        localStorage.removeItem(storageKey);
        keepInTab();
        remove.hidden = true;
        badge.hidden = true;
        feedback.textContent = 'De bewaarde versie is verwijderd. Uw huidige invulling blijft in dit tabblad.';
        main.querySelector('[data-trial-save]').focus();
      } catch { feedback.textContent = 'De bewaarde versie kon niet worden verwijderd.'; }
    };
    refreshCard();
  }

  function hasAvailableLesson(record) {
    const lesson = record?.lessonStart;
    return lesson && effectiveStatus(record) === 'available' &&
      officialSources(record).some(item => item.url === lesson.sourceUrl);
  }

  function lessonForSectors(record, selected) {
    return hasAvailableLesson(record) && (!selected.length || record.lessonStart.sectors.some(sector => selected.includes(sector)));
  }

  function learnerSheetHref(record) {
    return '#leerlingblad?' + new URLSearchParams({item: record.id});
  }

  function lessonStartBody(record) {
    const lesson = record.lessonStart;
    return `<div class="lesson-body" data-lesson-id="${escapeHtml(record.id)}">
      <dl class="lesson-plan">
        ${lesson.learningGoal ? `<div><dt>Leerdoel</dt><dd>${escapeHtml(lesson.learningGoal)}</dd></div>` : ''}
        ${lesson.activityType ? `<div><dt>Activiteit</dt><dd>${escapeHtml(lesson.activityType)}</dd></div>` : ''}
        ${lesson.sourceMinutes ? `<div><dt>Duur van de bronles</dt><dd>${escapeHtml(lesson.sourceMinutes)} minuten volgens de aanbieder</dd></div>` : ''}
        <div><dt>Voorbereiding</dt><dd>${escapeHtml(lesson.preparation)}</dd></div>
        <div class="lesson-assignment"><dt>Opdracht voor de klas</dt><dd>${escapeHtml(lesson.task)}</dd></div>
        <div><dt>Nabespreking</dt><dd>${escapeHtml(lesson.reflection)}</dd></div>
      </dl>
      <div class="lesson-actions">
        <button type="button" class="btn" data-copy-lesson>Kopieer klasopdracht</button>
        <a class="btn secondary" href="${escapeHtml(learnerSheetHref(record))}">Open leerlingblad</a>
        <a class="lesson-material" href="${escapeHtml(lesson.sourceUrl)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer">Open lesmateriaal ↗</a>
      </div>
      <p class="lesson-credit">Lesstart van de Atlas bij materiaal van ${escapeHtml(record.providerName)}.</p>
      <p class="lesson-feedback" role="status"></p>
      <textarea class="lesson-copy" aria-label="Klasopdracht om te kopiëren" readonly hidden></textarea>
    </div>`;
  }

  function lessonStartSection() {
    const selected = values('sector');
    const choices = resultRecords.filter(record => lessonForSectors(record, selected))
      .sort((a, b) => SECTORS.indexOf(a.lessonStart.sectors[0]) - SECTORS.indexOf(b.lessonStart.sectors[0]));
    const panels = choices.map(record => `<details class="lesson-choice" name="atlas-lesson-starts"${choices.length === 1 ? ' open' : ''}>
        <summary><span class="lesson-level">${escapeHtml(record.lessonStart.level)}</span><strong>${escapeHtml(record.lessonStart.question)}</strong></summary>
        ${lessonStartBody(record)}
      </details>`).join('');
    return panels ? `<section class="lesson-starts" aria-labelledby="lesson-heading">
      <h2 id="lesson-heading" tabindex="-1">Lesstarts voor de klas</h2>${panels}</section>` : '';
  }

  async function copyTextWithFallback(button, text, feedback, field, successMessage, manualMessage) {
    try {
      await navigator.clipboard.writeText(text);
      if (!button.isConnected) return;
      field.hidden = true;
      feedback.textContent = successMessage;
    } catch {
      if (!button.isConnected) return;
      field.value = text;
      field.hidden = false;
      field.focus();
      field.select();
      feedback.textContent = manualMessage;
    }
  }

  function bindLessonCopy(container) {
    container.querySelectorAll('[data-copy-lesson]').forEach(button => {
      button.onclick = async () => {
        const panel = button.closest('[data-lesson-id]');
        const record = publicRecordsById.get(panel.dataset.lessonId);
        const lesson = record.lessonStart;
        const text = [lesson.question, lesson.learningGoal && 'Leerdoel: ' + lesson.learningGoal, lesson.task, lesson.reflection,
          `Lesstart van de AI & Onderwijs Atlas Nederland: ${publicItemUrl(record)}`,
          `Lesmateriaal van ${record.providerName}: ${lesson.sourceUrl}`].filter(Boolean).join('\n\n');
        await copyTextWithFallback(button, text, panel.querySelector('.lesson-feedback'), panel.querySelector('.lesson-copy'),
          'Klasopdracht en bronlinks gekopieerd.', 'De opdracht is geselecteerd. Kopieer de tekst om deze te delen.');
      };
    });
  }

  function isFundingSelection() {
    const types = values('type');
    return types.length > 0 && types.every(type => FUNDING_TYPES.includes(type));
  }
  function focusAfterNavigation(link, selector) {
    if (!link) return;
    link.onclick = event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      addEventListener('hashchange', () => document.querySelector(selector)?.focus(), {once: true});
    };
  }
  function researchQuery(query) {
    return ['phd', 'promoveren', 'promovendus', 'promovenda', 'promovendi', 'promotieonderzoek',
      'promotieplek', 'promotieplaats', 'phd vacature', 'phd vacatures'].includes(normalize(query));
  }
  function papersQuery(query) {
    return /^(?:(?:recente |nieuwe )?(?:papers?|wetenschappelijk artikel|wetenschappelijke artikelen)(?: over ai (?:en|in het) onderwijs)?|artikelen over ai (?:en|in het) onderwijs)$/.test(normalize(query));
  }
  function researchPage() {
    const backHref = location.hash.replace(/^#onderzoek/, '#zoeken');
    const params = new URLSearchParams(backHref.split('?')[1]);
    const fromFunding = filterValues('type', params.get('type')).some(type => FUNDING_TYPES.includes(type));
    const fundingHref = criteriaHref({sector:params.get('sector'), vak:params.get('vak'), ...FUNDING_CRITERIA, status:STATUS_LABELS.open_call});
    function resource(id, label, description, showStatus = false) {
      const record = publicRecordsById.get(id);
      if (!record) return '';
      const status = showStatus ? ` · ${escapeHtml(displayStatus(record))}` : '';
      return `<li><a href="#item/${encodeURIComponent(id)}">${escapeHtml(label)}</a>${status}<p>${escapeHtml(description)}</p></li>`;
    }
    const methods = [
      resource('eur-generative-ai-in-research-emodule', 'E-module Generative AI in Research', 'Oefen met verantwoord AI-gebruik bij literatuur zoeken en schrijven in deze Engelstalige zelfstudiemodule van de Erasmus Universiteit Rotterdam.'),
      resource('oecd-talis-2024-database-ai-onderwijs', 'Onderzoeksdata van TALIS 2024', 'Welke docenten geven aan dat zij AI gebruiken om lessen of activiteiten voor te bereiden? Dit is zelfrapportage. De vragenlijst is openbaar. Voor microdata vraagt de OESO om een formulier en akkoord met de gebruiksvoorwaarden.')
    ].join('');
    const practice = [
      resource('npuls-aido-praktijkgericht-ai-en-dataonderzoek-2026', 'Npuls AIDO voor mbo, hbo en wo', 'Verken met uw instelling een onderzoeksvraag over AI of data in uw eigen onderwijspraktijk.', true),
      resource('professional-doctorate-technologie-digitalisering-2026', 'Professional Doctorate in het hbo', 'Bij deze praktijkgerichte pilot vraagt een bekostigde hogeschool financiering aan voor een kandidaat. Bekijk de voorwaarden voor het voorstel en de vereiste praktijkervaring.', true)
    ].join('');
    main.innerHTML = `<article class="personal-page research-page"><nav class="practice-back"><a href="${escapeHtml(backHref)}">← ${fromFunding ? 'Terug naar subsidies en calls' : 'Terug naar praktijktaken'}</a></nav>
      <header class="page-intro"><h1 id="research-heading" tabindex="-1">Onderzoek doen of promoveren</h1></header>
      <section><h2>Ik zoek een promotieplaats</h2><p>U solliciteert bij het project of de werkgever die de PhD-vacature publiceert. Bij MSCA Doctoral Networks vraagt het consortium de financiering aan.</p>
        <ul><li><a href="https://www.academictransfer.com/nl/functietype/phd/" target="_blank" rel="noopener noreferrer">PhD-vacatures in Nederland op AcademicTransfer ↗</a></li>
          <li><a href="https://euraxess.ec.europa.eu/jobs/search" target="_blank" rel="noopener noreferrer">Onderzoeksvacatures in Europa op EURAXESS ↗</a><p>Kies bij ‘Academic Level’ voor ‘PhD Positions’. Voor Nederland kiest u bij ‘Country’ voor ‘Netherlands’.</p></li></ul></section>
      <section><h2>Ik doe al onderzoek</h2><p><a href="#papers">Recente papers over AI en onderwijs</a></p>${methods ? `<ul>${methods}</ul>` : '<p>Leg uw onderzoeksvraag, databron en keuzes rond AI-gebruik vast in uw onderzoeksplan.</p>'}</section>
      <section><h2>Met mijn onderwijsinstelling praktijkonderzoek doen</h2>
        <p>Bespreek een vraag uit uw onderwijspraktijk met de onderzoekscoördinator van uw instelling. Bekijk per regeling wie kan indienen.</p>
        <ul><li><a href="https://www.kennisrotonde.nl/vraag-en-antwoord" target="_blank" rel="noopener noreferrer">Zoek een antwoord op uw onderwijsvraag bij de Kennisrotonde ↗</a></li>${practice}</ul>
        <p><a data-open-funding href="${escapeHtml(fundingHref)}">Bekijk open subsidies en calls</a></p></section></article>`;
    main.querySelectorAll('a[href^="#item/"]').forEach(link => link.onclick = () => sessionSet('atlas.lastSearch', location.hash));
    focusAfterNavigation(main.querySelector('.practice-back a'), fromFunding ? '#funding-heading' : '#practice-title, .result-head h2');
    focusAfterNavigation(main.querySelector('[data-open-funding]'), '#funding-heading');
  }
  function fundingNavigation(context) {
    const pool = recordsForCriteria({ ...state, status: '' });
    const counts = new Map();
    for (const record of pool) {
      const status = statusLabel(record);
      counts.set(status, (counts.get(status) || 0) + 1);
    }
    const closed = [STATUS_LABELS.closed_call, STATUS_LABELS.archived];
    const other = [...counts.keys()].filter(status => !CURRENT_FUNDING_STATUSES.includes(status) && !closed.includes(status));
    const categories = [
      ['Open en aangekondigd', CURRENT_FUNDING_STATUSES], ['Open', [STATUS_LABELS.open_call]],
      ['Aangekondigd', ANNOUNCED_FUNDING_STATUSES], ['Regelingen en overige oproepen', other], ['Gesloten', closed]
    ];
    const current = values('status');
    const links = categories.map(([label, statuses]) => {
      const count = statuses.reduce((sum, status) => sum + (counts.get(status) || 0), 0);
      const selected = current.length > 0 && current.every(status => statuses.includes(status)) &&
        (statuses !== CURRENT_FUNDING_STATUSES || current.length === statuses.length);
      const content = `${label} (${count})`;
      if (!count && !selected) return `<span>${content}</span>`;
      return `<a href="${escapeHtml(stateHref({ status: statuses.join(',') }))}"${selected ? ' aria-current="page"' : ''}>${content}</a>`;
    });
    links.push(`<a href="${escapeHtml(stateHref({ status: '' }))}"${!current.length ? ' aria-current="page"' : ''}>Alle (${pool.length})</a>`);
    return `<nav class="practice-back" aria-label="Praktijkvragen"><a href="${escapeHtml(criteriaHref(context))}">← Andere taak</a></nav>
      <section class="funding-nav"><h2 id="funding-heading" tabindex="-1">Subsidies en calls</h2>
      <nav aria-label="Aanvraagstatus">${links.join('')}</nav><p><a href="${escapeHtml(stateHref().replace('#zoeken', '#onderzoek'))}">Ik zoek een promotieplaats</a></p></section>`;
  }
  function lessonDirectoryLink() {
    const sectors = values('sector'), subjects = values('vak');
    const params = new URLSearchParams();
    if (sectors.length) params.set('sector', sectors.join(','));
    if (subjects.length) params.set('vak', subjects.join(','));
    const label = params.size ? 'Open de lesgids voor ' + [sectors.join(' of '), subjects.join(' of ')].filter(Boolean).join(' · ') : 'Open de lesgids';
    return `<a href="lesmateriaal/${params.size ? '#selectie?' + escapeHtml(params.toString()) : ''}">${escapeHtml(label)}</a>`;
  }
  function practiceNavigation() {
    const context = { sector: state.sector, vak: state.vak, audience: state.audience, language: state.language };
    if (state.sort !== 'relevant' && new URLSearchParams(location.hash.split('?')[1]).has('sort')) context.sort = state.sort;
    if (isFundingSelection()) return fundingNavigation(context);
    if (state.q || FILTER_KEYS.some(key => !['sector', 'vak', 'audience', 'language'].includes(key) && values(key).length)) {
      const task = PRACTICE_ROUTES.find(route => Object.entries(route.criteria).every(([key, value]) => state[key] === value));
      let work = '';
      if (isLessonSelection(state)) {
        const materials = stateHref({ q: '', type: 'materials', language: 'nl', cost: 'Gratis' });
        work = `<p class="lesson-shortcut"><a class="btn secondary" href="${escapeHtml(materials)}">Gratis Nederlandstalig lesmateriaal</a> ${lessonDirectoryLink()}</p>` + lessonStartSection();
      }
      else if (researchQuery(state.q)) {
        work = `<p><a class="btn secondary" href="${escapeHtml(stateHref().replace('#zoeken', '#onderzoek'))}">Onderzoek doen of promoveren</a></p>`;
      }
      else if (papersQuery(state.q)) work = '<p><a class="btn secondary" href="#papers">Papers over AI en onderwijs</a></p>';
      else if (normalize(state.q) === 'afspraken') work = teamTrialEntry() + assessmentEntry();
      else if (teamTrialQuery(state.q)) work = teamTrialEntry();
      else {
        const tool = assessmentToolLink(state.q);
        if (tool || values('theme').includes(ASSESSMENT_CRITERIA.theme) ||
            ['toets', 'toetsontwerp'].includes(normalize(state.q))) work = assessmentEntry(tool);
      }
      if (task) return `<nav class="practice-back" aria-label="Praktijkvragen"><a href="${escapeHtml(criteriaHref(context))}">← Andere taak</a><strong>${escapeHtml(task.label)}</strong></nav>${work}`;
      return work;
    }
    const selected = values('sector');
    const links = PRACTICE_ROUTES.map(route => {
      const criteria = { ...context, ...route.criteria };
      const matches = recordsForCriteria(criteria);
      const content = `<strong>${escapeHtml(route.label)}</strong><span>${escapeHtml(route.detail)}</span>`;
      if (route.criteria === FUNDING_CRITERIA) {
        const open = matches.filter(record => statusLabel(record) === STATUS_LABELS.open_call).length;
        return `<a class="practice-link" href="${escapeHtml(criteriaHref(criteria))}">${content}<small>${open} open · ${matches.length - open} aangekondigd <span aria-hidden="true">→</span></small></a>`;
      }
      const count = matches.length;
      const worksheets = isLessonSelection(criteria) ? matchingWorksheetRoutes(criteria).length : 0;
      if (!count && route.criteria === AGREEMENT_CRITERIA) return `<a class="practice-link" href="${escapeHtml(criteriaHref(criteria))}">${content}<small>Teamproef <span aria-hidden="true">→</span></small></a>`;
      if (!count && !worksheets) return `<span class="practice-link unavailable">${content}<small>Geen resultaten</small></span>`;
      return `<a class="practice-link" href="${escapeHtml(criteriaHref(criteria))}">${content}<small>${matchesLabel(count, worksheets)} <span aria-hidden="true">→</span></small></a>`;
    });
    const researchHref = criteriaHref(context).replace('#zoeken', '#onderzoek');
    links.push(`<a class="practice-link" href="${escapeHtml(researchHref)}"><strong>Onderzoek doen of promoveren</strong><span>Promotieplaatsen, onderzoeksdata en praktijkonderzoek</span><small>Bekijk routes <span aria-hidden="true">→</span></small></a>`);
    return `<section class="practice-start" aria-labelledby="practice-title"><div class="practice-heading"><h2 id="practice-title" tabindex="-1">Waar wilt u mee aan de slag?</h2>
      <label for="practice-sector">Sector<select id="practice-sector">
        <option value="">Alle sectoren</option>${selected.length > 1 ? '<option selected disabled>Meerdere sectoren</option>' : ''}
        ${SECTORS.map(sector => `<option value="${escapeHtml(sector)}" ${selected.length === 1 && selected[0] === sector ? 'selected' : ''}>${escapeHtml(SECTOR_NAMES[sector] ? `${sector} · ${SECTOR_NAMES[sector]}` : sector)}</option>`).join('')}
      </select></label></div><div class="practice-links">${links.join('')}</div>
      <p class="home-papers"><a href="#wat-werkt">Wat werkt bij leren met AI?</a> · <a href="#papers">Recente papers over AI en onderwijs</a></p></section>`;
  }
  const SPOTLIGHT_TOPICS = [
    {
      id: 'toets', title: 'Maak uw toetsvraag AI-bestendiger',
      description: 'Neem één vraag uit uw toets. Kies wat de leerling of student zelf moet laten zien en kopieer de aangepaste opdracht met beoordelingscriteria.',
      action: 'Pas mijn toetsvraag aan', href: '#toetsafspraak?start=eigen'
    },
    {
      id: 'toolkeuze', title: 'Dicteren of een opname uitschrijven?',
      description: 'Vergelijk twee toepassingen. Bekijk welke gegevens ze verwerken en welke afspraken u vooraf met uw school moet controleren.',
      action: 'Vergelijk de toepassingen', href: '#toolkeuze'
    },
    {
      id: 'lesgids', title: 'Vind een les voor uw vak',
      description: 'Kies een vak en onderwijssector. Bekijk de opdracht en open het leerlingblad dat u met de klas kunt delen.',
      action: 'Open de lesgids', href: 'lesmateriaal/'
    },
    {
      id: 'leerlingwerk', title: 'Mag ik leerlingwerk delen met AI?',
      description: 'Loop drie vragen langs voordat u werk van een leerling in een AI-tool invoert. Bekijk welke afspraak u op school moet nagaan.',
      action: 'Bekijk de drie vragen', href: '#regels-in-de-praktijk'
    },
    {
      id: 'subsidies', title: 'Welke subsidieronde kunt u voorbereiden?',
      description: 'Bekijk de open en aangekondigde rondes. Controleer bij de verstrekker wie kan aanvragen en welke datum voor uw team telt.',
      action: 'Bekijk subsidies en calls', href: criteriaHref(FUNDING_CRITERIA)
    },
    {
      id: 'pilot', title: 'Maak afspraken over een AI-proef',
      description: 'Leg met uw team vast wat u wilt uitproberen, wie mag besluiten en wanneer u stopt of bijstuurt. Kopieer het besluitblad voor uw overleg.',
      action: 'Vul het besluitblad in', href: '#pilotbesluit'
    }
  ];
  // The edition date is local to the Netherlands. Record the evidence for a dated choice in the maintenance log.
  const SPOTLIGHT_SELECTIONS = {'2026-12-07': 'lesgids', '2026-12-21': 'toolkeuze'};
  const SPOTLIGHT_START = Date.UTC(2026, 10, 23);
  const DAY_MS = 86_400_000;
  const FORTNIGHT_MS = 14 * DAY_MS;
  let spotlightTimer;

  function spotlightEdition(day, topics = SPOTLIGHT_TOPICS, selections = SPOTLIGHT_SELECTIONS) {
    if (!topics.length) return null;
    // Use UTC for arithmetic on calendar dates, so a clock change never shortens an edition.
    const period = Math.max(0, Math.floor((Date.parse(day) - SPOTLIGHT_START) / FORTNIGHT_MS));
    const dateAt = offset => new Date(SPOTLIGHT_START + offset).toISOString().slice(0, 10);
    const topicAt = index => topics.find(topic => topic.id === selections[dateAt(index * FORTNIGHT_MS)]) || topics[index % topics.length];
    return {current: topicAt(period), previous: period ? topicAt(period - 1) : null,
      start: dateAt(period * FORTNIGHT_MS), end: dateAt((period + 1) * FORTNIGHT_MS - DAY_MS)};
  }
  function spotlightContent({current, previous, end}) {
    const endLabel = new Intl.DateTimeFormat('nl-NL', {day:'numeric', month:'long', timeZone:'UTC'}).format(Date.parse(end));
    return `<div class="spotlight-intro"><span class="spotlight-label">Uitgelicht</span>
      <span class="spotlight-date">t/m <time datetime="${end}">${endLabel}</time></span>
      <h2 id="spotlight-heading">${escapeHtml(current.title)}</h2><p>${escapeHtml(current.description)}</p></div>
      <div class="spotlight-actions"><a class="btn" href="${escapeHtml(current.href)}">${escapeHtml(current.action)} <span aria-hidden="true">→</span></a>
      ${previous ? `<a class="spotlight-previous" href="${escapeHtml(previous.href)}">Vorige keer: ${escapeHtml(previous.title)}</a>` : ''}</div>`;
  }
  function homeSpotlightMarkup() {
    const edition = spotlightEdition(dutchCalendar.format(Date.now()));
    return edition ? `<section class="home-spotlight" data-edition="${edition.start}" aria-labelledby="spotlight-heading">${spotlightContent(edition)}</section>` : '';
  }
  function refreshHomeSpotlight() {
    window.clearTimeout?.(spotlightTimer);
    if (location.hash && location.hash.split('?')[0] !== '#home') return;
    const block = main.querySelector('.home-spotlight');
    if (!block) return;
    const now = Date.now();
    const edition = spotlightEdition(dutchCalendar.format(now));
    if (block.dataset.edition !== edition.start) {
      const focused = block.contains(document.activeElement) && document.activeElement;
      block.innerHTML = spotlightContent(edition);
      block.dataset.edition = edition.start;
      if (focused) block.querySelector(focused.classList.contains('spotlight-previous') ? '.spotlight-previous' : '.btn')?.focus({preventScroll:true});
    }
    // At 00:00 UTC Amsterdam is already one or two hours into the new day.
    const nextDay = Date.parse(edition.end) + DAY_MS;
    const localHour = new Intl.DateTimeFormat('nl-NL', {hour: '2-digit', hourCycle: 'h23', timeZone: 'Europe/Amsterdam'}).format(nextDay);
    const wait = nextDay - Number(localHour) * 3_600_000 - now;
    spotlightTimer = window.setTimeout?.(refreshHomeSpotlight, Math.max(1, Math.min(wait, FORTNIGHT_MS)));
  }
  function emptyQueryActions() {
    if (!state.q?.trim()) return '';
    const withoutQuery = {...state, q: ''};
    const count = activeFilters(state).length ? recordsForCriteria(withoutQuery).length : 0;
    const sheets = matchingWorksheetRoutes(withoutQuery).length;
    return `<p><button class="btn secondary" type="button" data-edit-query>Zoekterm aanpassen</button>
      ${count || sheets ? `<button class="btn secondary" type="button" data-clear-query>Toon ${matchesLabel(count, sheets)} zonder zoekterm</button>` : ''}</p>`;
  }
  function emptyResultsMarkup(routes, worksheetCount) {
    const actions = emptyQueryActions();
    if (isFundingSelection()) {
      return `<div class="empty"><h2>${state.status === STATUS_LABELS.open_call ? 'Geen open oproepen bij deze selectie' : 'Geen subsidies of calls bij deze selectie'}</h2>
        <p>Kijk bij een andere aanvraagstatus of verruim uw filters.</p>${actions}
        ${state.status ? `<a href="${escapeHtml(stateHref({ status: '' }))}">Bekijk alle aanvraagstatussen binnen deze selectie</a>` : `<a href="${escapeHtml(criteriaHref({ sector: state.sector }))}">Bekijk ander aanbod${state.sector ? ' in deze sectorselectie' : ''}</a>`}</div>`;
    }
    const alternative = routes.length ? null : alternativeSuggestion();
    const relaxations = relaxationSuggestions();
    const notice = worksheetCount ? '<p>Geen andere treffers in de catalogus.</p>' :
      `<span class="eyebrow">Geen exacte match</span><h2>We helpen u verder</h2>${alternative ?
        `<a class="alternative" href="${escapeHtml(stateHref({ q: alternative.candidate }))}">Bedoelde u <strong>${escapeHtml(alternative.candidate)}</strong>? <span>${alternative.count} ${alternative.count === 1 ? 'resultaat' : 'resultaten'}</span></a>` :
        `<p>${state.q ? 'Uw zoekopdracht levert binnen deze selectie geen resultaten op.' : 'Er is geen aanbod met deze combinatie van filters.'}</p>`}`;
    return `<div class="empty">${notice}
      ${actions}
      ${relaxations.length ? `<div class="relaxations"><h3>Meer resultaat door één keuze los te laten</h3>${relaxations.map(item => `<a href="${escapeHtml(stateHref({ [item.key]: '' }))}">Zonder ${escapeHtml(item.values.join(' of '))} <strong>${item.count}</strong></a>`).join('')}</div>` : ''}
      <button class="clear-link" type="button">Begin opnieuw</button><p><a href="#bijdragen">Ontbreekt er aanbod? Laat het weten.</a></p></div>`;
  }
  function pickedActionLinks(scope) {
    return `<a class="btn" data-${scope}-compare href="${escapeHtml(selectedHref('vergelijken'))}" ${sheetPicks.size >= 2 ? '' : 'hidden'}>Vergelijk mijn keuzes (${sheetPicks.size})</a>
      <a class="btn secondary" data-${scope}-sheet href="${escapeHtml(selectedHref('overlegblad'))}" ${sheetPicks.size ? '' : 'hidden'}>Open mijn overlegblad (${sheetPicks.size})</a>
      <span ${sheetPicks.size === 1 ? '' : 'hidden'}>Kies nog een vermelding om te vergelijken.</span>`;
  }
  function matchesLabel(offers, sheets) {
    const labels = [];
    if (offers || !sheets) labels.push(offers + (offers === 1 ? ' resultaat' : ' resultaten'));
    if (sheets) labels.push(sheets + (sheets === 1 ? ' werkblad' : ' werkbladen'));
    return labels.join(' en ');
  }
  function resultsMarkup() {
    resultRecords = sortRecords(recordsForCriteria(state));
    const chips = [
      ...(state.q ? [`<button class="chip" data-clear-query>Zoekterm: ${escapeHtml(state.q)} ×</button>`] : []),
      ...FILTER_KEYS.flatMap(key => values(key).map(value => `<button class="chip" data-remove="${key}|${escapeHtml(value)}">${escapeHtml(filterOptionLabel(key, value))} ×</button>`))
    ].join('');
    const related = values('theme').length ? relatedThemes(values('theme')[0]) : [];
    const routes = teacherRoutes(state.q, state);
    const worksheetCount = routes.filter(route => route.href.startsWith('#werkblad-')).length;
    const onlyWorksheets = !resultRecords.length && worksheetCount > 0;
    const routeGuide = routes.length ? `<section class="selection-guidance teacher-routes" aria-label="Verder met uw vraag">${onlyWorksheets ? '' : '<h2>Verder met uw vraag</h2>'}
      <ul>${routes.map(item => `<li><a data-question-route href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a><span>${escapeHtml(item.meta)}</span></li>`).join('')}</ul></section>` : '';
    resultCountLabel = matchesLabel(resultRecords.length, worksheetCount);
    const heading = resultCountLabel + (state.q ? ` voor ‘${state.q}’` : '');
    const knownDates = isPublicationSort() && resultRecords.filter(record => publicationDate(record)).length;
    const sortSummary = state.sort === 'added'
      ? 'Nieuwste toevoegingen aan de Atlas eerst; onbekende toevoegdatums staan onderaan. Een broncontrole verandert de toevoegdatum niet.'
      : isPublicationSort()
      ? `${state.sort === 'published' ? 'Nieuwste' : 'Oudste'} publicaties eerst. Publicatiedatum bekend bij ${knownDates} van ${resultRecords.length} resultaten; onbekende datums staan onderaan.`
      : state.sort === 'az' ? 'Gesorteerd op titel, van A tot Z.' : isFundingSelection()
      ? 'Open oproepen eerst, op volgorde van bekende deadline. Daarna volgen aangekondigde rondes, overige regelingen en gesloten oproepen.' : 'Gesorteerd op relevantie en directe bruikbaarheid.';
    const selectedSearch = location.hash.split('?')[0] === '#zoeken' && (state.q?.trim() || FILTER_KEYS.some(key => values(key).length));
    const outcome = selectedSearch ? (resultRecords.length || worksheetCount ? ' data-atlas-search-hits' : ' data-atlas-empty-search') : '';
    const home = !location.hash || location.hash.split('?')[0] === '#home';
    const spotlight = home ? homeSpotlightMarkup() : '';
    return `${spotlight}${practiceNavigation()}${profileNavigation(home)}<header class="result-head"${outcome}><h2 tabindex="-1">${escapeHtml(heading)}</h2>
      <details class="result-options"><summary>Sorteer, vergelijk of deel</summary>
        <div class="result-options-body"><label for="sort">Sorteren</label><select id="sort" aria-describedby="sort-summary">${Object.entries(SORT_OPTIONS).map(([key, label]) => `<option value="${key}" ${state.sort === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>
        <p class="result-summary" id="sort-summary" aria-live="polite">${escapeHtml(sortSummary)}</p>
        <div class="selection-actions"><a href="#vergelijken" data-compare-guide>Aanbod vergelijken</a><button type="button" data-share-selection>Deel selectie</button>${resultRecords.length ? `<a data-meeting-sheet href="${escapeHtml(stateHref().replace(/^#zoeken/, '#overlegblad'))}">Overlegblad bekijken of afdrukken (${resultRecords.length})</a>` : ''}
          <a href="#zoeken">Al het aanbod</a><a href="#nieuw">Nieuw aanbod</a><a href="#bijdragen">Aanbod toevoegen of feedback geven</a></div></div>
      </details>
      ${chips ? `<div class="chips">${chips}<button class="clear-link">Wis alles</button></div>` : ''}</header>
      ${routeGuide}
      ${values('type').length === 1 && values('type')[0] === 'Training' ? '<section class="training-intro"><h2>Workshops en trainers</h2><p>Vind een workshop, cursus of training en de aanbieder die deze verzorgt. Verfijn op onderwerp, doelgroep of aanbieder. Trainer, locatie, kosten en beschikbaarheid staan bij het aanbod voor zover bevestigd. Bespreek maatwerk via de officiële aanbodpagina.</p></section>' : ''}
      ${values('theme').includes('Veilige AI-omgeving') ? '<section class="selection-guidance"><h2>Beoordeel de toepassing in uw eigen situatie</h2><p>Gebruik de officiële bronnen om gegevensgebruik, beheer, menselijke controle, toegankelijkheid en overstapmogelijkheden te beoordelen. Wat passend is, hangt af van uw doel, gegevens, instellingen en afspraken. Deze selectie is geen keurmerk voor veilige of verantwoorde AI.</p></section>' : ''}
      <div class="picked-actions" data-picked-actions ${sheetPicks.size ? '' : 'hidden'}>${pickedActionLinks('picked')}</div>
      <div id="action-feedback" class="action-feedback" aria-live="polite"></div>
      <div class="results-content">${resultRecords.length ? resultListMarkup() : emptyResultsMarkup(routes, worksheetCount)}</div>
      ${related.length ? `<nav class="related" aria-label="Verwante thema's"><strong>Verwante thema's</strong>${related.map(([theme, count]) => `<a href="${escapeHtml(stateHref({ theme }))}">${escapeHtml(theme)} <span>${count} ${count === 1 ? 'resultaat' : 'resultaten'}</span></a>`).join('')}</nav>` : ''}`;
  }
  function filterButtonText() {
    const count = FILTER_KEYS.reduce((sum, key) => sum + values(key).length, 0);
    return count ? `Filters openen (${count} gekozen)` : 'Filters openen';
  }
  function refreshFacetControls() {
    const counts = facetCounts();
    const worksheetCounts = worksheetFacetCounts();
    const focusedFacet = document.activeElement?.closest?.('[data-facet]');
    const subject = document.querySelector('#subject-search');
    const applied = values('vak').join(', ');
    if (subject && subject.dataset.applied !== applied) {
      subject.value = applied;
      subject.dataset.applied = applied;
    }
    const selections = Object.fromEntries(FILTER_KEYS.map(key => [key, values(key)]));
    document.querySelectorAll('[data-facet]').forEach(input => {
      const key = input.dataset.facet;
      const checked = selections[key].includes(input.value);
      const count = counts[key].get(input.value) || 0;
      const worksheets = worksheetCounts[key]?.get(input.value) || 0;
      input.checked = checked;
      input.disabled = !count && !worksheets && !checked;
      const counter = input.closest('label')?.querySelector('small');
      if (counter) counter.textContent = facetCountLabel(count, worksheets);
    });
    document.querySelectorAll('[data-facet-block]').forEach(block => {
      const count = values(block.dataset.facetBlock).length;
      const badge = block.querySelector(':scope > summary b');
      if (badge) { badge.textContent = count; badge.hidden = !count; badge.setAttribute('aria-label', `${count} geselecteerd`); }
      const selected = block.querySelector('.facet-value');
      if (selected) selected.textContent = facetSelectionLabel(block.dataset.facetBlock);
      updateFacetOptions(block);
    });
    if (focusedFacet?.closest('label').hidden) focusedFacet.closest('details').querySelector('summary').focus();
    const hiddenCount = ['access', 'source'].reduce((sum, key) => sum + values(key).length, 0);
    const moreCount = document.querySelector('[data-more-count]');
    if (moreCount) moreCount.textContent = hiddenCount ? ` (${hiddenCount})` : '';
    const opener = document.querySelector('.mobile-filter');
    if (opener) opener.textContent = filterButtonText();
    const apply = document.querySelector('.apply');
    if (apply) apply.textContent = 'Toon ' + resultCountLabel;
  }
  function updateSearchResults() {
    const panel = document.querySelector('#results-panel');
    if (!panel) return renderSearch();
    const optionsOpen = panel.querySelector('.result-options')?.open;
    panel.innerHTML = resultsMarkup();
    if (optionsOpen) panel.querySelector('.result-options').open = true;
    const input = document.querySelector('.atlas-search input');
    if (input && document.activeElement !== input) input.value = state.q || '';
    refreshFacetControls();
    bindResultsControls();
  }
  function catalogFilterPanel(typeOptions, audienceOptions, organizationOptions) {
    const counts = facetCounts();
    const worksheetCounts = worksheetFacetCounts();
    const filter = (key, title, options) => facet(key, title, options, counts[key], worksheetCounts[key]);
    const languages = [...new Set([...Object.keys(LANGUAGE_LABELS), ...counts.language.keys()])];
    const hiddenCount = ['access', 'source'].reduce((sum, key) => sum + values(key).length, 0);
    return `<aside class="filters" id="filters" aria-label="Zoekfilters"><header><h2>Filters</h2><button class="close" aria-label="Sluit filters">×</button></header>
      <p class="filter-help">Combineer uw zoekterm met een vakgebied of andere filters.</p>
      ${filter('sector', 'Voor welke sector?', SECTORS)}<form class="subject-filter">${subjectInput('subject-search')}<button class="btn secondary" type="submit">Toepassen</button></form>${filter('type', 'Wat zoekt u?', typeOptions)}${filter('language', 'Taal', languages)}${filter('cost', 'Kosten', ['Gratis', 'Betaald', 'Gratis en betaald', 'Kosten onbekend'])}${filter('theme', 'Onderwerp', themeOptions())}${filter('geography', 'Regio', ['Nederland', 'Europa', 'Internationaal'])}${filter('audience', 'Doelgroep', audienceOptions)}${filter('status', 'Beschikbaarheid', Object.values(STATUS_LABELS))}${filter('organization', 'Aanbieder', organizationOptions)}
      <details class="more-filters"><summary>Meer filters<span data-more-count>${hiddenCount ? ` (${hiddenCount})` : ''}</span> <span aria-hidden="true">▼</span></summary>
        ${filter('access', 'Toegang', Object.values(ACCESS_LABELS))}${filter('source', 'Bron', ['Met officiële bron', 'Bron nog niet vastgelegd'])}
      </details><button class="clear btn secondary">Wis alle filters</button><footer><button class="apply btn">Toon ${escapeHtml(resultCountLabel)}</button></footer>
    </aside>`;
  }
  function renderSearch(isHome = false) {
    const restoring = restoreReturnView();
    // Opening the catalogue is itself a request to browse all available offers.
    const typeOptions = [...new Set(records.map(offerType))].sort((a, b) => filterOptionLabel('type', a).localeCompare(filterOptionLabel('type', b), 'nl'));
    const organizationOptions = [...new Set(records.map(record => record.providerName).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nl'));
    const audienceOptions = [...new Set(records.flatMap(record => record.audiences || []))].sort((a, b) => {
      const primaryDifference = Number(!PRIMARY_AUDIENCES.includes(a)) - Number(!PRIMARY_AUDIENCES.includes(b));
      return primaryDifference || a.localeCompare(b, 'nl');
    });
    const results = resultsMarkup();
    main.innerHTML = `<section class="catalog"><header class="catalog-intro"><h1>Zoek AI-aanbod voor uw onderwijs</h1><p>Doorzoek ${records.length} handreikingen, trainingen, boeken, lesmaterialen en meer. Combineer uw zoekterm met de filters.</p></header><div class="catalog-grid"><div class="catalog-sidebar" aria-label="Zoeken en filteren"><h2 class="sidebar-title">Zoeken en filteren</h2>${searchForm(isHome ? 'home-search' : 'catalog-search')}<button class="mobile-filter btn secondary" type="button" aria-controls="filters" aria-expanded="false">${filterButtonText()}</button>${catalogFilterPanel(typeOptions, audienceOptions, organizationOptions)}</div><section class="results" id="results-panel">${results}</section></div></section>`;
    bindSearchPage();
    const view = resultView();
    if (restoring || view.focusId) {
      const targetY = view.y ?? Number(sessionGet('atlas.resultsScroll'));
      restoreCardFocus(resultFocusTarget(main, view.focusId, view.focusControl), targetY);
    }
  }

  function comparisonRows(items) {
    const facts = items.map(record => new Map(offerFacts(record)));
    const rows = [];
    const unknown = new Set(['Niet vastgesteld', 'Kosten onbekend', ACCESS_LABELS.unknown,
      LANGUAGE_LABELS.unknown, 'Te verifiëren', 'Datum niet vastgelegd']);
    function row(label, values, keys = values) {
      const equal = values.every(value => !unknown.has(value)) && keys.every(key => key === keys[0]);
      rows.push({ label, values, equal });
    }
    row('Wat biedt het?', items.map(record => factValue(record.description)));
    row('Gebruik in de praktijk', items.map(record => factValue(record.availabilityText)));
    for (const label of ['Kosten', 'Toegang', 'Taal', 'Voor wie', 'Sector', 'Soort aanbod', 'Beschikbaarheid']) {
      const values = facts.map(record => record.get(label));
      // Een andere volgorde van dezelfde talen, doelgroepen of sectoren is geen inhoudelijk verschil.
      const keys = ['Taal', 'Voor wie', 'Sector'].includes(label)
        ? values.map(value => value.split(', ').sort().join(', ')) : values;
      row(label, values, keys);
    }
    const dates = items.map(record => practicalDates(record, false));
    if (dates.some(Boolean)) row('Datum of deadline', dates.map(factValue));
    row('Voorwaarden en benodigdheden', items.map(record => factValue(record.eligibility)));
    row('Bron gecontroleerd op', facts.map(record => record.get('Broncontrole')));
    return rows;
  }

  const PILOT_FIELDS = [
    ['doel', 'Doel en afbakening', 'Wat probeert u, met wie en welk onderwijsprobleem wilt u oplossen?'],
    ['rollen', 'Wie voert uit en wie mag besluiten?', 'Noem de rollen en wat zij mogen beslissen. Laat het mandaat bij twijfel bevestigen.'],
    ['afweging', 'Risico en maatregel', 'Wiens belang kan onder druk komen? Welke maatregel en welk alternatief spreekt u af?'],
    ['bewijs', 'Bewijs voor het besluit', 'Welke bron of observatie hebt u al? Wat moet nog blijken en waaraan ziet u dat?'],
    ['herzien', 'Herbeoordeling en stopafspraak', 'Wanneer kijkt u terug? Wie kan ingrijpen als een leerling of medewerker een probleem meldt?']
  ];
  const PILOT_CHOICES = [
    ['uitvoeren', 'Uitvoeren binnen de afgesproken grenzen', 'Leg vast wie akkoord gaf, wat de grenzen zijn en wie de inzet kan stoppen.'],
    ['proef', 'Eerst een kleine proef', 'Baken de groep, duur en gegevens af. Start bijvoorbeeld met fictieve voorbeelden en beoordeel de uitkomst vóór breder gebruik.'],
    ['uitstellen', 'Uitstellen of afzien', 'Noteer welke vraag openblijft, wie die uitzoekt en welke werkwijze intussen beschikbaar blijft.']
  ];

  function pilotSheetText(entries, choice) {
    const decision = PILOT_CHOICES.find(([key]) => key === choice);
    const fields = PILOT_FIELDS.map(([key, label]) => `${label}\n${entries[key]?.trim() || '[In te vullen]'}`);
    return ['Besluitblad AI-proef · bespreekversie', ...fields,
      `Voorgestelde keuze\n${decision ? decision[1] : '[Nog te kiezen]'}`,
      `Vervolg\n${decision ? decision[2] : 'Bespreek de keuze met degene die volgens de instellingsafspraken mag besluiten.'}`,
      'Werkblad van de AI & Onderwijs Atlas Nederland · https://aionderwijsatlas.nl/#pilotbesluit'].join('\n\n');
  }

  function renderPilotDecision() {
    const fields = PILOT_FIELDS.map(([key, label, prompt]) => `<div class="pilot-field">
      <label for="pilot-${key}">${escapeHtml(label)}</label><p id="pilot-help-${key}">${escapeHtml(prompt)}</p>
      <textarea id="pilot-${key}" data-pilot-field="${key}" rows="2" aria-describedby="pilot-help-${key}" autocomplete="off"></textarea></div>`).join('');
    main.innerHTML = `<article class="assessment-page pilot-page"><nav class="detail-back" aria-label="Terug naar de gids">
      <a href="#praktijkgids">Naar de praktijkgids</a> · <a href="#toolkeuze">Naar de toepassing voor mijn les</a></nav>
      <header><h1 tabindex="-1">Besluiten over een AI-proef</h1>
        <p>Wil een team een AI-toepassing gaan gebruiken? Vul samen met schoolleiding, onderwijs en ICT of privacy één besluitblad in. Benoem wie volgens de afspraken van uw instelling mag besluiten en wie het besluit later kan herzien.</p></header>
      <div class="assessment-layout"><section class="assessment-form" aria-labelledby="pilot-sheet"><h2 id="pilot-sheet">Uw besluitblad</h2>
        <p>Gebruik functienamen en een algemene beschrijving. De Atlas verstuurt of bewaart uw invoer niet. Kopieer het blad als u het wilt meenemen.</p>
        ${fields}<fieldset><legend>Welke keuze legt u voor?</legend>
          ${PILOT_CHOICES.map(([key, label]) => `<label class="assessment-choice"><input type="radio" name="pilot-keuze" value="${key}">${escapeHtml(label)}</label>`).join('')}
        </fieldset><p data-pilot-advice role="status"></p>
        <div class="assessment-actions"><button type="button" class="btn" data-copy-pilot>Kopieer besluitblad</button>
          <span data-pilot-feedback role="status"></span></div>
        <textarea hidden readonly aria-label="Besluitblad om handmatig te kopiëren" data-pilot-copy></textarea>
      </section><aside class="assessment-preview" aria-labelledby="pilot-example"><h2 id="pilot-example">Voorbeeld voor het overleg</h2>
        <p>Een opleiding wil een chatbot feedback op conceptteksten laten geven. Twee docenten beginnen met verzonnen teksten. Ze vergelijken de feedback met het leerdoel en noteren onjuistheden. Een leerling kan dezelfde opdracht zonder chatbot maken.</p>
        <p>De projectleider legt na twee weken de bevindingen voor aan de bevoegde rol. Als de feedback een fout aanleert, stopt de proef tot een docent de werkwijze heeft beoordeeld. Dit is een voorbeeld van de Atlas.</p>
        <h3>Welke handreiking past bij uw instelling?</h3><ul>
          <li><a href="#item/schoolafspraken-over-het-gebruik-van-generatieve-ai" target="_blank" rel="noopener noreferrer">PO en VO · Schoolafspraken van Kennisnet</a>. Bespreek het onderwijsdoel, de grenzen aan gebruik en de afspraken voor leraren en leerlingen.</li>
          <li><a href="#item/npuls-raise-risicobeoordeling-ai" target="_blank" rel="noopener noreferrer">Mbo, hbo en wo · RAISE van Npuls</a>. Loop met de betrokken deskundigen de risico’s, maatregelen en opvolging langs. Npuls presenteert dit als een eerste versie.</li>
          <li><a href="#item/surf-kennisnet-waardenwijzer-2025" target="_blank" rel="noopener noreferrer">Alle sectoren · WaardenWijzer van SURF en Kennisnet</a>. Kies een waarde die geraakt wordt, zoals autonomie of rechtvaardigheid. Betrek iemand die de gevolgen ondervindt.</li>
        </ul><p class="assessment-note">De bronkaarten openen in een nieuw tabblad zodat uw besluitblad openblijft. Deze handreikingen ondersteunen het gesprek. Uw instelling bepaalt of de inzet kan doorgaan.</p>
      </aside></div></article>`;
    const form = main.querySelector('.assessment-form');
    const advice = form.querySelector('[data-pilot-advice]');
    const feedback = form.querySelector('[data-pilot-feedback]');
    const fallback = form.querySelector('[data-pilot-copy]');
    form.oninput = () => {
      fallback.hidden = true;
      feedback.textContent = '';
      const choice = form.querySelector('input:checked')?.value;
      advice.textContent = PILOT_CHOICES.find(([key]) => key === choice)?.[2] || '';
    };
    form.querySelector('[data-copy-pilot]').onclick = event => {
      const entries = Object.fromEntries([...form.querySelectorAll('[data-pilot-field]')].map(field => [field.dataset.pilotField, field.value]));
      return copyTextWithFallback(event.currentTarget, pilotSheetText(entries, form.querySelector('input:checked')?.value), feedback, fallback,
        'Besluitblad gekopieerd.', 'De tekst is geselecteerd. Kopieer uw besluitblad handmatig.');
    };
  }

  function renderToolChoice() {
    const examples = [
      {id:'aigo-transcribe-tool', guide:'https://github.com/AIgovernanceofficer/Transcribe-tool#readme',
        goal:'Een bestaande opname uitschrijven', task:'Open een zelf opgenomen uitleg en vergelijk het transcript met wat u hebt gezegd.',
        privacy:'Volgens de maker verwerkt de browser het gekozen audio- of videobestand lokaal. De app heeft een transcriptiegeschiedenis. Controleer wat op een gedeeld apparaat achterblijft.',
        access:'Een oefenbestand is nodig. Geef ook de uitgeschreven passage, zodat luisteren geen voorwaarde is om mee te doen.'},
      {id:'aigo-dicteermachine', guide:'https://github.com/AIgovernanceofficer/Dicteermachine#readme',
        goal:'Tijdens het spreken een concept schrijven', task:'Dicteer een eigen uitleg, lees de herkende tekst terug en corrigeer een verkeerd overgenomen vakterm.',
        privacy:'De browser vraagt toegang tot de microfoon. Volgens de maker wordt de spraak lokaal verwerkt. Een opgeslagen Word-bestand blijft op de gekozen opslaglocatie.',
        access:'Dicteren vereist een microfoon en kunnen spreken. Bied typen aan als gelijkwaardige manier om dezelfde tekst te maken.'}
    ].flatMap(example => {
      const record = publicRecordsById.get(example.id);
      return record && offerType(record) === 'software' && effectiveStatus(record) === 'available' && primarySource(record)
        ? [{...example, record}] : [];
    });
    const decisions = [
      ['Gebruiken', 'Kies dit als de tekstbewerking uw leerdoel dient, de toepassing past binnen de schoolafspraken en iedereen dezelfde opdracht kan uitvoeren. Laat de leerling de tekst zelf controleren.'],
      ['Eerst zelf proberen', 'Gebruik een eigen, fictieve oefenzin met één vakterm. Vergelijk de herkende tekst met uw origineel. Controleer ook of u de tekst met het toetsenbord kunt verbeteren en weer kunt verwijderen.'],
      ['Afzien', 'Geef de passage als tekst of laat de leerling zelf typen. Beoordeel dezelfde inhoud en onderbouwing.']
    ];
    const previous = sessionGet('atlas.lastSearch');
    const back = /^#zoeken(?:\?|$)/.test(previous) ? `<a href="${escapeHtml(previous)}">Terug naar uw zoekopdracht</a> · ` : '';
    main.innerHTML = `<section class="assessment-page tool-choice"><nav aria-label="Terug naar het aanbod">${back}<a href="#zoeken?type=software">Naar alle AI-software in de Atlas</a></nav>
        <header><h1 tabindex="-1">Welke AI-toepassing past bij mijn les?</h1><p>Wilt u een bestaande opname laten uitschrijven of een tekst dicteren? Kies op basis van wat de leerling zelf moet oefenen.</p>
          <p>Een keuze maken voor meerdere klassen of een opleiding? <a href="#pilotbesluit">Vul samen het besluitblad voor een AI-proef in</a>.</p></header>
      ${examples.length ? `<div class="assessment-layout">${examples.map(({id, record, guide, goal, task, privacy, access}) => `<article class="assessment-preview">
        <h2>${goal}</h2><p><a href="#item/${escapeHtml(id)}">${escapeHtml(record.title)}</a></p><dl>
          <div><dt>Leshandeling</dt><dd>${task}</dd></div>
          <div><dt>Kosten en toegang</dt><dd>${escapeHtml(costLabel(record))} · ${escapeHtml(accessLabel(record))}. Bij het eerste gebruik wordt een taalmodel gedownload.</dd></div>
          <div><dt>Gegevens en privacy</dt><dd>${privacy}</dd></div>
          <div><dt>Toegankelijkheid</dt><dd>${access}</dd></div></dl>
          <a href="${guide}" target="_blank" rel="noopener noreferrer">Handleiding van ${escapeHtml(record.title)} ↗</a></article>`).join('')}</div>
        <p>De Atlas selecteerde deze voorbeelden voor hbo en wo. Ze komen van dezelfde maker, AIGovernanceofficer.nl. De handleidingen zijn geraadpleegd op <time datetime="2026-11-22">22 november 2026</time>. Een minimumleeftijd en ondersteuning van schermlezers zijn daarin niet vastgesteld. De Atlas heeft de privacywerking en de effecten op leren niet onafhankelijk getoetst.</p>
        ${examples.length === 2 ? `<a href="${escapeHtml(selectedHref('vergelijken', examples.map(item => item.id)))}">Vergelijk beide Atlas-vermeldingen</a>` : ''}` :
        '<p>Deze praktijkvoorbeelden zijn momenteel niet beschikbaar. Via het overzicht hierboven kunt u andere software bekijken.</p>'}
      <div class="assessment-form"><fieldset><legend>Wat besluit u voor deze les?</legend>
        ${decisions.map(([label], index) => `<label class="assessment-choice"><input type="radio" name="tool-choice" value="${index}">${label}</label>`).join('')}
      </fieldset><p role="status" data-tool-decision></p></div></section>`;
    const fieldset = main.querySelector('fieldset');
    fieldset.onchange = event => {
      const choice = decisions[event.target.value];
      if (choice) main.querySelector('[data-tool-decision]').textContent = choice[1];
    };
  }

  function renderComparison() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const requested = params.has('item') ? params.getAll('item') : [...sheetPicks];
    const ids = selectedPublicIds(requested);
    const items = ids.map(id => publicRecordsById.get(id));
    const missing = requested.some(id => !selectedPublicIds([id]).length);
    const previous = sessionGet('atlas.compareSearch');
    const backHref = isResultRoute(previous) ? previous : '#zoeken';
    const incomplete = items.length < 2;
    const differences = params.get('verschillen') === '1';
    const example = ['codeerschool-behind-the-chat-nl', 'mediawijs-edubox-artificiele-intelligentie'];
    const hasExample = example.every(id => publicRecordsById.has(id) && effectiveStatus(publicRecordsById.get(id)) === 'available');
    const sourceLink = record => {
      const link = primarySource(record);
      return link ? `<a href="${escapeHtml(link.url)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(sourceActionLabel(record) + ': ' + record.title)}">${escapeHtml(sourceActionLabel(record))}</a>` : 'Geen officiële link beschikbaar';
    };
    main.innerHTML = `<section class="compare-page">
      <a class="back-results" href="${escapeHtml(backHref)}">Terug naar zoekresultaten</a>
      <header><h1>Vergelijk aanbod</h1><p>${incomplete ? 'Vink in de zoekresultaten aan welke lessen, trainingen of andere vermeldingen u naast elkaar wilt bekijken.' : `U vergelijkt ${items.length} vermeldingen. Open de officiële bronnen voor de materialen en de actuele voorwaarden.`}</p></header>
      ${missing ? '<p class="compare-notice" role="status">Een of meer vermeldingen uit deze link staan niet meer in de publieke Atlas.</p>' : ''}
      ${incomplete ? `<div class="compare-empty">${items.length ? `<p>Al gekozen: <strong>${escapeHtml(items[0].title)}</strong></p>` : ''}
        <a class="btn" data-comparison-choose href="${escapeHtml(backHref)}">${items.length ? 'Kies een tweede vermelding' : 'Kies aanbod om te vergelijken'}</a>
        ${hasExample ? `<a href="${escapeHtml(selectedHref('vergelijken', example))}">Bekijk een voorbeeld met twee VO-lessen</a>` : ''}</div>` : `
      <div class="compare-tools"><label><input id="compare-differences" type="checkbox" ${differences ? 'checked' : ''}> Verberg gelijke kenmerken</label>
        <div><button type="button" class="btn" data-share-comparison>Deel vergelijking</button>
        <a class="btn secondary" data-comparison-sheet href="${escapeHtml(selectedHref('overlegblad', ids))}">Open als overlegblad</a></div></div>
      <p id="action-feedback" role="status"></p>
      ${items.length > 2 ? '<p class="compare-scroll-hint">Bij een brede tabel kunt u binnen het overzicht opzij scrollen.</p>' : ''}
      <div class="compare-scroll" ${items.length > 2 ? 'role="region" aria-label="Vergelijkingstabel, horizontaal verschuifbaar" tabindex="0"' : ''}>
      <table class="compare-table ${items.length === 2 ? 'compare-pair' : 'compare-many'}" style="--compare-count:${items.length}">
        <caption>Kenmerken van de gekozen vermeldingen</caption>
        <thead><tr><th scope="col">Kenmerk</th>${items.map(record => `<th scope="col"><a data-comparison-item href="#item/${encodeURIComponent(record.id)}">${escapeHtml(record.title)}</a><small>${escapeHtml(factValue(record.providerName))}</small></th>`).join('')}</tr></thead>
        <tbody>${comparisonRows(items).map(row => `<tr${row.equal ? ' data-compare-equal' : ''}${differences && row.equal ? ' hidden' : ''}><th scope="row">${escapeHtml(row.label)}</th>${row.values.map(value => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}
        <tr><th scope="row">Officiële bron</th>${items.map(record => `<td>${sourceLink(record)}</td>`).join('')}</tr></tbody>
      </table></div>`}</section>`;
    main.querySelector('.back-results').onclick = () => sessionSet('atlas.restoreResults', backHref);
    if (incomplete) {
      main.querySelector('[data-comparison-choose]').onclick = () => {
        ids.forEach(id => sheetPicks.add(id));
        persistSheetPicks();
      };
      return;
    }
    const toggle = main.querySelector('#compare-differences');
    const currentHref = () => selectedHref('vergelijken', ids, toggle.checked);
    if (!params.has('item')) history.replaceState(null, '', currentHref());
    toggle.onchange = () => {
      main.querySelectorAll('[data-compare-equal]').forEach(row => { row.hidden = toggle.checked; });
      history.replaceState(null, '', currentHref());
    };
    main.querySelector('[data-share-comparison]').onclick = () =>
      shareCurrentSelection('Bekijk deze vermeldingen naast elkaar in de Atlas.', PUBLIC_ATLAS + currentHref(), 'de vergelijking');
    main.querySelector('[data-comparison-sheet]').onclick = () => sessionSet('atlas.lastSearch', backHref);
    main.querySelectorAll('[data-comparison-item]').forEach(link => link.onclick = () => sessionSet('atlas.lastSearch', currentHref()));
  }

  function meetingSheetMarkup() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const picked = params.has('item');
    const ids = params.getAll('item');
    const items = picked ? selectedPublicIds(ids).map(id => publicRecordsById.get(id)) : sortRecords(recordsForCriteria(state));
    const previousSearch = sessionGet('atlas.lastSearch');
    const backHref = picked && isResultRoute(previousSearch) ? previousSearch : stateHref();
    const labels = { theme: 'Onderwerp', audience: 'Doelgroep', sector: 'Sector', vak: 'Vakgebied', status: 'Beschikbaarheid',
      type: 'Soort aanbod', geography: 'Regio', organization: 'Aanbieder', cost: 'Kosten', language: 'Taal', access: 'Toegang', source: 'Bron' };
    const criteria = [
      ...(state.q ? [['Zoekterm', state.q]] : []),
      ...FILTER_KEYS.filter(key => values(key).length).map(key => [labels[key], values(key).map(value => filterOptionLabel(key, value)).join(' of ')]),
      ['Sortering', SORT_OPTIONS[state.sort] || SORT_OPTIONS.relevant]
    ];
    return `<section class="meeting-sheet"><nav class="sheet-controls" aria-label="Overlegblad"><a class="back-results" href="${escapeHtml(backHref)}">← Terug naar resultaten</a>${picked && items.length >= 2 ? `<a class="btn secondary" data-sheet-compare href="${escapeHtml(selectedHref('vergelijken', items.map(record => record.id)))}">Vergelijk deze vermeldingen</a>` : ''}${items.length ? '<button class="btn" type="button" data-print-sheet>Afdrukken / opslaan als PDF</button>' : ''}${picked && items.length ? '<button class="btn secondary" type="button" data-share-sheet>Deel overlegblad</button>' : ''}</nav><p id="action-feedback" aria-live="polite"></p>
      <header><span class="eyebrow">AI & Onderwijs Atlas Nederland</span><h1>${picked ? 'Gekozen voor het overleg' : 'Overlegblad'}</h1><p>${items.length} ${items.length === 1 ? 'resultaat' : 'resultaten'} · Samengesteld op ${escapeHtml(dateLabel(todayInNetherlands()))}</p>
      <p class="sheet-help">${picked ? 'Dit blad bevat de gekozen vermeldingen. Deel de link met een collega of sla het blad op als PDF.' : 'Dit overzicht bevat alle resultaten van uw zoekselectie. Verfijn uw zoekopdracht als u een korter overzicht wilt.'}</p>
      ${picked ? '' : `<dl class="meeting-criteria">${criteria.map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`}
      <p class="listing-notice">${LISTING_NOTICE}</p></header>
      ${items.length ? `<ol class="sheet-list">${items.map(record => `<li class="sheet-entry"><article><h2>${escapeHtml(record.title)}</h2>
        <p class="sheet-meta">Aanbieder: ${escapeHtml(factValue(record.providerName))} · ${escapeHtml(offerLabel(record))}</p>
        <p>${escapeHtml(factValue(record.description))}</p>
        <p class="sheet-meta">${[escapeHtml(statusLabel(record)), practicalDates(record)].filter(Boolean).join(' · ')} · ${escapeHtml(costLabel(record))} · ${escapeHtml(accessLabel(record))}${publicationDate(record) ? ` · Verschenen op ${escapeHtml(dateLabel(publicationDate(record)))}` : ''}</p>
        <dl class="sheet-links">${officialSources(record).map(item => `<div><dt>${escapeHtml(item.label || 'Officiële bron')}</dt><dd><a href="${escapeHtml(item.url)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer">${escapeHtml(item.url)}</a></dd></div>`).join('')}<div><dt>In de Atlas</dt><dd><a href="${escapeHtml(publicItemUrl(record))}">${escapeHtml(publicItemUrl(record))}</a></dd></div></dl>
        </article></li>`).join('')}</ol>` : '<p class="empty">Deze zoekselectie heeft geen resultaten. Pas uw zoekopdracht aan.</p>'}
      <p class="sheet-credit">AI & Onderwijs Atlas Nederland · Gemaakt door E.C.M. Willems</p></section>`;
  }
  function renderMeetingSheet() {
    main.innerHTML = meetingSheetMarkup();
    const back = document.querySelector('.back-results');
    back.onclick = () => sessionSet('atlas.restoreResults', back.getAttribute('href'));
    const print = document.querySelector('[data-print-sheet]');
    const share = document.querySelector('[data-share-sheet]');
    const compare = document.querySelector('[data-sheet-compare]');
    if (compare) compare.onclick = () => sessionSet('atlas.compareSearch', back.getAttribute('href'));
    if (share) share.onclick = () => shareCurrentSelection('Bekijk de gekozen materialen en bronnen voor ons overleg.');
    if (print) print.onclick = () => window.print();
  }

  function renderLearnerSheet() {
    const id = new URLSearchParams(location.hash.split('?')[1]).get('item');
    const record = publicRecordsById.get(selectedPublicIds([id])[0]);
    if (!hasAvailableLesson(record)) {
      main.innerHTML = '<section class="detail-missing"><h1>Dit leerlingblad is niet beschikbaar</h1><a class="btn" href="#zoeken?q=les&amp;type=materials">Kies een andere lesstart</a></section>';
      return;
    }
    const lesson = record.lessonStart;
    main.innerHTML = `<article class="learner-sheet" aria-labelledby="learner-question">
      <div class="sheet-controls"><a href="#item/${encodeURIComponent(record.id)}">← Naar de lesstart</a>
        <div class="learner-actions"><button type="button" class="btn secondary" data-share-sheet>Deel leerlingblad</button>
          <button type="button" class="btn" data-print-sheet>Afdrukken of opslaan als pdf</button></div></div>
      <p id="action-feedback" role="status"></p>
      <header><p class="lesson-level">Leerlingblad · ${escapeHtml(lesson.level)}</p><h1 id="learner-question">${escapeHtml(lesson.question)}</h1>
        ${lesson.learningGoal ? `<p class="learner-goal"><strong>Leerdoel</strong> · ${escapeHtml(lesson.learningGoal)}</p>` : ''}</header>
      <section><h2>Opdracht</h2><p>${escapeHtml(lesson.task)}</p></section>
      <section><h2>Bespreek samen</h2><p>${escapeHtml(lesson.reflection)}</p></section>
      <div class="learner-answer">Ruimte voor je antwoord of tekening</div>
      <p class="learner-credit">Werkvorm van de AI &amp; Onderwijs Atlas Nederland. Lesmateriaal van
        <a href="${escapeHtml(lesson.sourceUrl)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer">${escapeHtml(record.providerName)}</a>.</p>
    </article>`;
    document.querySelector('[data-print-sheet]').onclick = () => window.print();
    document.querySelector('[data-share-sheet]').onclick = () => shareCurrentSelection(
      lesson.question, PUBLIC_ATLAS + learnerSheetHref(record), 'het leerlingblad'
    );
  }

  const WORKSHEET_TEACHER_NOTES = {
    'werkblad-picklijst': {
      teacherTitle: 'Picklijst en nabespreking voor de docent',
      notes: [
        '09.00 uur. Start met 12 bruikbare flessen (15 min 3) en 9 broodtrommels. Na order 101 blijven 4 flessen en 6 broodtrommels over. Order 102 vraagt 5 flessen en moet wachten. De voorraad blijft 4 en 6. Order 103 kan volledig worden verzameld. Er blijven 0 flessen en 1 broodtrommel over.',
        'Voorbeeldmelding: “Order 102 wacht. Na order 101 heb ik 4 bruikbare flessen en zijn er 5 nodig. Het tekort is 1 fles. Het AI-voorstel telt de 3 geblokkeerde flessen mee.” Vraag een student die ook order 103 laat wachten hoeveel artikelen er volgens de magazijnafspraak voor order 102 gereserveerd zijn.',
        '09.05 uur. Start opnieuw met 13 bruikbare flessen en 9 broodtrommels. Na order 101 resteren 5 en 6. Na het verzamelen van order 102 resteren 0 flessen en 2 broodtrommels. Order 103 wacht nu en komt op dat moment 4 flessen en 3 broodtrommels tekort.',
        'Let bij het nakijken op drie zichtbare stappen: de student bepaalt de bruikbare beginvoorraad, trekt een complete order één keer af en kan met de tussenstand een besluit verdedigen. In werkproces B1-K2-W1 controleert een logistiek medewerker de hoeveelheid en kwaliteit van verzamelde goederen en meldt afwijkingen aan de leidinggevende. De ordervolgorde en reserveringsafspraak zijn voor deze klasopdracht bedacht.'
      ],
      promptTitle: 'Pas de picklijst aan voor mijn klas',
      adapt: 'Kies twee producten uit uw richting en verzin alle aantallen. Reken met de magazijnafspraak eerst zelf beide rondes door.',
      prompt: 'Maak een fictieve picklijst met twee productsoorten en drie orders voor mijn mbo-klas [richting]. Laat een voorstel voor de picklijst beschadigde voorraad ten onrechte als beschikbaar tellen. Geef de volgorde van de orders en leg uit dat een onvolledige order moet wachten en niets reserveert. Voeg één latere vrijgave toe waardoor een ander besluit nodig is. Toon in een apart docentmodel per order de beginvoorraad, de beslissing en de eindvoorraad.',
      source: {linkText: 'SBB · Logistiek medewerker, orders verzamelen en controleren (pdf, p. 10)', href: 'https://kwalificatie-mijn.s-bb.nl/Details/DownloadDocument/1249133#page=10'}
    },
    'werkblad-klantmail': {
      teacherTitle: 'Antwoorden en feedback voor de docent',
      notes: [
        'De bestelling bevestigt de eerste zin. De tweede zin is onjuist: woensdag staan de acht nog in het magazijn. Voor de derde zin ontbreekt bewijs: de leverancier heeft voor de vier nabestelde ordners geen datum bevestigd.',
        'Mogelijke klantmail: “Goedemiddag, dank voor uw bericht. Ik kan nog niet bevestigen dat u donderdag alle twaalf ordners in huis hebt. Acht staan ingepakt in ons magazijn. Voor de vier nabestelde ordners is de leverdatum nog onbekend. Ik vraag de planning na en laat u weten wat ik hoor.”',
        'Lees de mail als klant. Krijgt u antwoord op uw donderdagvraag? Is duidelijk wat er met de acht en met de vier gebeurt? Kan de medewerker de beloofde vervolgstap zelf uitvoeren?',
        'Na de scan kan de student melden dat de vervoerder acht ordners heeft opgehaald. Wanneer die bij de klant aankomen en wanneer de overige vier beschikbaar zijn, blijft onbekend.',
        'Beroepscontext: bij het interne ordertraject controleert een commercieel medewerker afspraken en overlegt bij afwijkingen. Vraag met welke collega de student de planning zou afstemmen. Het SBB-profiel staat onderaan dit blad.'
      ],
      promptTitle: 'Maak een variant voor mijn klas',
      adapt: 'Vervang het product en de ordergegevens door fictieve gegevens uit uw vak. Controleer zelf of elke uitspraak in de conceptmail met het dossier te beoordelen is.',
      prompt: 'Maak voor mijn mbo-klas [richting] een oefening met een fictieve bestelling, een klantvraag en een kort magazijnbericht. Schrijf een conceptmail van drie zinnen met één juist feit, één fout en één onbevestigde toezegging. Geef een volgende orderstatus waarmee de student één zin kan herzien. Houd het antwoordmodel apart van de leerlingopdracht.',
      source: {linkText: 'SBB · Werkproces intern ordertraject (pdf, p. 21–22)', href: 'https://kwalificatie-mijn.s-bb.nl/Details/DownloadDocument/1967278#page=21'}
    },
    'werkblad-oefenvragen': {
      promptTitle: 'Oefenvragen voor mijn eigen vak maken',
      teacherTitle: 'Antwoorden en controle voor de docent',
      notes: [
        'Fietsen: 12 ÷ 48 × 100 = 25% stijging. Reken terug: 48 × 1,25 = 60.',
        'Boeken: 12 ÷ 60 × 100 = 20% daling. Reken terug: 60 × 0,80 = 48.',
        'Schrijft een leerling tweemaal 20%? Vraag welk aantal aan het begin van elk verhaal staat. Laat de leerling beide nieuwe aantallen narekenen.'
      ],
      adapt: 'Vervang de woorden tussen haken. Gebruik de tekst als schrijfhulp of in een AI-tool die uw school toestaat. Los beide opgaven zelf op voordat u ze uitdeelt.',
      prompt: 'Maak voor [groep en vak] twee korte oefenvragen bij [leerdoel]. Gebruik verschillende situaties waarin leerlingen zelf [denkstap] moeten uitvoeren en uitleggen. Geef eerst alleen de leerlingvragen. Zet daarna per vraag het modelantwoord, een waarschijnlijke denkfout en een controle waarmee ik het antwoord kan toetsen.'
    },
    'werkblad-biologiepracticum': {
      promptTitle: 'Een controlevraag voor mijn klas',
      teacherTitle: 'Voorbereiding en bespreking voor de docent',
      notes: [
        'Leg tuinkerszaad, schaaltjes, watten, water en etiketten klaar. Kies twee plekken met vergelijkbare temperatuur en maak één opstelling donker. Volg de docentinstructie van NIBI voor het volledige practicum.',
        'De NIBI-docentinstructie rekent één lesuur voor de opzet, twee weken voor waarnemingen en één lesuur voor de conclusie en de start van het verslag.',
        'Controleer of leerlingen onder meer aantal en soort zaden, vocht, temperatuur en telmoment gelijk houden. Spreek bijvoorbeeld af dat een zichtbaar worteltje telt. Laat een leerling voor de conclusie eigen getallen aanwijzen, ook als die niet bij de verwachting passen.'
      ],
      adapt: 'Laat leerlingen eerst zelf hun proefopzet maken. U kunt onderstaande vraag aan een collega of een toegestane AI-tool stellen en één bruikbare controlevraag kiezen.',
      prompt: 'Ik bereid een vmbo-practicum voor over de invloed van licht op de kieming van tuinkers. Geef twee korte vragen waarmee leerlingen hun eigen proefopzet kunnen controleren. Geef geen proefopzet, meetwaarden of conclusie. Ik kies welke vraag past bij mijn leerdoel.',
      source: {label: 'NIBI · Tuinkers ontkiemen (PlantKracht vmbo)', href: 'https://www.nibi.nl/nl/plantkracht-vmbo#art_10431'}
    }
  };

  function renderWorksheet(id) {
    const directoryReturn = lessonDirectoryReturn();
    const lastSearch = sessionGet('atlas.lastSearch') || '';
    const back = directoryReturn || (/^#zoeken(?:\?|$)/.test(lastSearch) ? lastSearch : '#zoeken?q=les&type=materials');
    const backLabel = directoryReturn ? '← Terug naar uw lesselectie' : '← Naar het lesaanbod';
    const classPath = 'lesmateriaal/leerling/' + encodeURIComponent(id.slice('werkblad-'.length)) + '/';
    const sheet = source.worksheets?.[id];
    if (!sheet || !Array.isArray(sheet.tasks) || !sheet.tasks.length) {
      main.innerHTML = `<section class="detail-missing"><h1 tabindex="-1">Het werkblad kon niet worden geladen</h1><p><a class="btn" href="${escapeHtml(classPath)}">Open leerlingblad</a></p><a href="${escapeHtml(back)}">${backLabel}</a></section>`;
      return;
    }
    const teacher = WORKSHEET_TEACHER_NOTES[id];
    const sourceCredit = sheet.credit ? ' ' + sheet.credit : '';
    const sourceLink = teacher.source ? ` <a class="work-screen" href="${escapeHtml(teacher.source.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(teacher.source.linkText || 'Open docentmateriaal')} ↗</a>` : '';
    const caseFile = sheet.caseFile || [];
    const caseMarkup = caseFile.length ? `<section class="work-case"><h2>Fictief dossier</h2><dl>${caseFile.map(entry => `<dt>${escapeHtml(entry.label)}</dt><dd>${escapeHtml(entry.text)}</dd>`).join('')}</dl></section>` : '';
    main.innerHTML = `<article class="work-sheet" data-worksheet-id="${escapeHtml(id)}" aria-labelledby="work-title">
      <nav class="practice-back work-screen"><a href="${escapeHtml(back)}">${backLabel}</a></nav>
      <header><p class="lesson-level">${escapeHtml(sheet.level)}</p><h1 id="work-title" tabindex="-1">${escapeHtml(sheet.title)}</h1>
        <p><strong>Leerdoel</strong> · ${escapeHtml(sheet.goal)}</p></header>
      ${caseMarkup}<section class="work-pupil"><h2>Opdracht voor de klas</h2><ol>${sheet.tasks.map(task => `<li>${escapeHtml(task)}</li>`).join('')}</ol>
        <div class="lesson-actions work-screen"><a class="btn" href="${escapeHtml(classPath)}">Open leerlingblad</a>
          <button class="btn secondary" data-work-link type="button">Kopieer klaslink</button>
          <button class="btn secondary" data-work-copy type="button">Kopieer leerlingopdracht</button>
          <button class="btn secondary" data-work-print type="button">Druk leerlingblad af</button></div></section>
      <div class="work-screen"><details class="work-notes"><summary>${escapeHtml(teacher.teacherTitle)}</summary>
        <ul>${teacher.notes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}</ul></details>
        <details class="work-notes"><summary>${escapeHtml(teacher.promptTitle)}</summary>
          <p>${escapeHtml(teacher.adapt)}</p><label for="work-prompt">Bewerk de instructie voor uw les</label>
          <textarea id="work-prompt" rows="5">${escapeHtml(teacher.prompt)}</textarea><button class="btn secondary" data-work-prompt type="button">Kopieer mijn instructie</button>
        </details><p class="lesson-feedback" role="status"></p>
        <textarea class="lesson-copy" aria-label="Tekst om handmatig te kopiëren" readonly hidden></textarea></div>
      <p class="learner-credit">Werkblad van de AI &amp; Onderwijs Atlas Nederland.${escapeHtml(sourceCredit)}${sourceLink}</p></article>`;
    const feedback = main.querySelector('.lesson-feedback');
    const fallback = main.querySelector('.lesson-copy');
    const copy = (button, text) => copyTextWithFallback(button, text, feedback, fallback, 'Gekopieerd.', 'De tekst is geselecteerd. Kopieer deze met uw apparaat.');
    const pupil = main.querySelector('[data-work-copy]');
    const caseText = caseFile.length ? ['Fictief dossier', ...caseFile.map(entry => entry.label + '\n' + entry.text)] : [];
    pupil.onclick = () => copy(pupil, [sheet.title, sheet.goal, ...caseText, ...sheet.tasks.map((task, index) => `${index + 1}. ${task}`),
      'Werkblad van de AI & Onderwijs Atlas Nederland.' + sourceCredit].join('\n\n'));
    const classLink = main.querySelector('[data-work-link]');
    classLink.onclick = () => copyTextWithFallback(classLink, PUBLIC_ATLAS + classPath, feedback, fallback,
      'Klaslink gekopieerd.', 'De klaslink is geselecteerd. Kopieer deze met uw apparaat.');
    main.querySelector('[data-work-print]').onclick = () => window.print();
    const promptButton = main.querySelector('[data-work-prompt]');
    promptButton.onclick = () => copy(promptButton, main.querySelector('#work-prompt').value);
  }

  function lessonDirectoryReturn() {
    const params = new URLSearchParams(location.hash.split('?')[1]);
    if (params.get('van') !== 'lesgids' || params.getAll('van').length !== 1) return '';
    params.delete('van');
    const group = params.get('groep');
    if (group !== null) {
      if (params.getAll('groep').length !== 1 || !['po', 'vo', 'mbo', 'ho', 'overig', 'werkbladen'].includes(group)) return '';
      params.delete('groep');
    }
    for (const [key, value] of params) {
      if (!['sector', 'vak', 'doel', 'activiteit', 'minuten'].includes(key) || params.getAll(key).length !== 1 ||
          !value.trim() || value.length > (key === 'vak' ? 512 : 160) || /[\u0000-\u001f\u007f]/.test(value)) return '';
      if (key === 'minuten' && (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)))) return '';
      if (key === 'sector' && value.split(',').some(sector => !SECTORS.includes(sector) && !records.some(item => item.lessonStart?.sectors?.includes(sector)))) return '';
    }
    if (group) {
      const slug = location.hash.split('?')[0].match(/^#(?:item\/([a-z0-9-]+)|(werkblad-[a-z0-9-]+))$/);
      if (slug && (group === 'werkbladen') === Boolean(slug[2])) {
        params.set('groep', group);
        params.set('kaart', slug[1] || slug[2]);
      }
    }
    return 'lesmateriaal/' + (params.size ? '#selectie?' + params : '');
  }
  function renderDetail(id) {
    const target = source.metadata?.recordRedirects?.[id];
    if (typeof target === 'string' && records.some(item => item.id === target)) {
      location.replace(`#item/${encodeURIComponent(target)}`);
      return;
    }
    const record = records.find(item => item.id === id);
    if (!record) {
      main.innerHTML = `<section class="detail-missing"><h1>Niet gevonden</h1><p>Dit item staat niet in de huidige dataset.</p><a class="btn" href="#zoeken">Terug naar zoeken</a></section>`;
      return;
    }
    const directoryReturn = lessonDirectoryReturn();
    const lastSearch = directoryReturn || sessionGet('atlas.lastSearch') || '#zoeken';
    const fromDirectory = lastSearch.startsWith('lesmateriaal/');
    const fromNewOffers = lastSearch.split('?')[0] === '#nieuw';
    const backLabel = fromDirectory ? '← Terug naar uw lesselectie' : lastSearch.startsWith('#onderzoek') ? '← Terug naar Onderzoek doen of promoveren'
      : fromNewOffers ? '← Terug naar Nieuw aanbod'
      : lastSearch === '#praktijkgids' ? '← Terug naar de praktijkgids'
      : lastSearch.startsWith('#vergelijken?') ? 'Terug naar vergelijking' : '← Terug naar resultaten';
    const related = records.filter(item => item.id !== record.id)
      .map(item => ({ item, score: relationScore(record, item) }))
      .filter(candidate => candidate.score > 0)
      .sort((a, b) => b.score - a.score || relevance(b.item) - relevance(a.item))
      .slice(0, 4).map(candidate => candidate.item);
    const sources = officialSources(record);
    const funding = isFunding(record);
    const materialDetail = record.offerCategory === 'materials' && effectiveStatus(record) === 'available' && sources.length;
    const factRows = offerFacts(record).filter(([label]) => !funding || label !== 'Beschikbaarheid');
    const applicants = funding && fundingApplicants(record);
    const amount = funding && fundingAmount(record);
    const sourceLinks = `<h3>Officiële bronnen</h3>${sources.length ? `<div class="source-actions">${sources.map((sourceItem, index) => `<a class="btn ${index ? 'secondary' : ''}" href="${escapeHtml(sourceItem.url)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer">${escapeHtml(sourceItem.label || 'Officiële bron')} ↗</a>`).join('')}</div>` : '<p class="source-warning">Voor dit record is nog geen officiële bron vastgelegd.</p>'}`;
    const lesson = hasAvailableLesson(record) && lessonStartBody(record);
    let materialAction = '';
    if (lesson) {
      materialAction = `<a class="btn" href="${escapeHtml(learnerSheetHref(record))}" aria-label="Open leerlingblad: ${escapeHtml(record.lessonStart.question)}">Open leerlingblad</a>`;
    } else if (materialDetail) {
      materialAction = `<a class="btn" href="${escapeHtml(sources[0].url)}"${sourceUsage(record)} target="_blank" rel="noopener noreferrer">${escapeHtml(sourceActionLabel(record))} ↗</a>`;
    }
    main.innerHTML = `<div${materialDetail ? ` data-atlas-material-detail="${escapeHtml(record.id)}"` : ''}>
      <header class="detail-hero"><div class="detail-hero-top"><span class="eyebrow">${escapeHtml(offerLabel(record))}</span>${commercialBadge(record)}</div><h1>${escapeHtml(record.title)}</h1>${materialAction}<p class="listing-notice">${LISTING_NOTICE}</p></header>
      <section class="detail-shell"><nav class="detail-nav" aria-label="Terugnavigatie"><a class="back-results" href="${escapeHtml(lastSearch)}">${backLabel}</a><span>Home / ${fromDirectory ? 'Lesgids' : fromNewOffers ? 'Nieuw aanbod' : lastSearch.startsWith('#onderzoek') ? 'Onderzoek' : 'Resultaten'} / ${escapeHtml(record.title)}</span></nav>
      <div class="detail-layout"><article>
        ${funding ? `<section class="funding-conditions"><h2>Aanvraag en voorwaarden</h2><dl>
          <div><dt>Aanvragers</dt><dd>${escapeHtml(applicants)}</dd></div>
          ${record.eligibility && record.eligibility !== applicants ? `<div><dt>Wie komt in aanmerking?</dt><dd>${escapeHtml(record.eligibility)}</dd></div>` : ''}
          <div><dt>Indiening</dt><dd>${escapeHtml(displayStatus(record))} · ${practicalDates(record)}</dd></div>
          ${amount ? `<div><dt>Bedrag</dt><dd>${escapeHtml(amount)}</dd></div>` : ''}
          </dl>${sourceLinks}</section>` : ''}
        ${lesson ? `<section class="lesson-starts lesson-detail"><h2>Lesstart voor de klas</h2>
          <p class="lesson-level">${escapeHtml(record.lessonStart.level)}</p><h3>${escapeHtml(record.lessonStart.question)}</h3>${lesson}</section>` : ''}
        <h2>Feitelijke beschrijving</h2><p>${escapeHtml(factValue(record.description))}</p>
        <h2>Doel en gebruik</h2><p>${escapeHtml(factValue(record.purpose))}</p>
        ${recordContextMarkup(record)}
        <h2>Onderwerpen</h2>${recordThemes(record).length ? `<div class="detail-themes">${recordThemes(record).map(theme => `<a href="#zoeken?theme=${encodeURIComponent(theme)}">${escapeHtml(theme)}</a>`).join('')}</div>` : '<p>Niet vastgesteld</p>'}
        ${!funding ? `<h2>Voorwaarden</h2><p>${escapeHtml(factValue(record.eligibility))}</p>` : ''}
        ${commercialDetails(record)}
        ${related.length ? `<h2>Gerelateerd aanbod</h2><p class="section-intro">Inhoudelijk verbonden via onderwerp, sector, doelgroep, aanbieder of soort aanbod.</p><div class="related-cards">${related.map(item => simpleCard(item)).join('')}</div>` : ''}
      </article><aside class="detail-facts"><h2>In één oogopslag</h2><dl>${factRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
        ${funding ? '' : sourceLinks}
        ${sources.length ? '<button class="btn secondary copy-citation" type="button" data-copy-citation>Kopieer bronvermelding</button><div id="citation-fallback" hidden><label for="source-citation">Bronvermelding om te kopiëren</label><textarea id="source-citation" rows="8" readonly></textarea></div>' : ''}
        <button class="btn secondary share-item" type="button" data-share-item>Deel dit item</button>
        <p id="detail-feedback" class="action-feedback" aria-live="polite"></p>
        <aside class="item-contribution"><h3>Klopt deze informatie nog?</h3><p>Help mee met een correctie of aanvulling.</p><a class="btn secondary" href="#bijdragen?item=${encodeURIComponent(record.id)}">Fout of aanvulling doorgeven</a></aside>
      </aside></div></section></div>`;
    if (lesson) bindLessonCopy(main);
    if (materialDetail) window.dispatchEvent?.(new Event('atlas-material-detail'));
    const back = document.querySelector('.back-results');
    back.onclick = () => { if (!fromDirectory) sessionSet('atlas.restoreResults', lastSearch); };
    if (directoryReturn) main.querySelectorAll('a[href^="#leerlingblad?"]').forEach(link =>
      link.addEventListener('click', () => sessionSet('atlas.lastSearch', directoryReturn)));
    document.querySelectorAll('.related-cards a[href^="#item/"]').forEach(link => link.onclick = () => sessionSet('atlas.lastSearch', lastSearch));
    const copy = document.querySelector('[data-copy-citation]');
    if (copy) copy.onclick = () => copySourceCitation(record);
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
    const criteria = criteriaForQuery(query);
    const matching = sortByRelevance(recordsForCriteria(criteria), criteria);
    const collection = (label, next) => {
      const count = recordsForCriteria(next).length;
      return { label, count, meta: `${count} ${count === 1 ? 'resultaat' : 'resultaten'}`, href: criteriaHref(next) };
    };
    const themes = themeOptions()
      .filter(theme => normalize(theme).includes(normalized) || (THEME_RULES[theme] || []).some(term => normalize(term).includes(normalized) || phrasePresent(normalized, term)))
      .map(theme => collection(theme, { ...criteria, theme }))
      .filter(item => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 3);
    const organizations = [...new Set(matching.map(record => record.providerName).filter(Boolean))]
      .filter(name => normalize(name).includes(normalized) || matching.filter(record => record.providerName === name).length > 1)
      .map(name => collection(name, { ...criteria, organization: name }))
      .filter(item => item.count > 0).slice(0, 4);
    const sections = [];
    const guidance = teacherRoutes(query, criteria);
    if (guidance.length) sections.push({label:'Verder met uw vraag', items:guidance});
    if (papersQuery(query)) sections.push({label:'Onderzoek', items:[{label:'Papers over AI en onderwijs', meta:'Nieuwste publicaties uit de gevolgde bronnen', href:'#papers'}]});
    if (researchQuery(query)) {
      sections.push({ label: 'Praktijkvraag', items: [{label:'Onderzoek doen of promoveren', meta:'Promotieplaatsen en praktijkonderzoek', href:stateHref().replace('#zoeken', '#onderzoek')}] });
    }
    if (teamTrialQuery(query)) sections.push({ label: 'Zelf aan de slag', items: [
      { label: 'Teamproef met AI', meta: 'Proefkaart voor het teamoverleg', href: '#teamproef' }
    ] });
    const assessmentTool = assessmentToolLink(query);
    if (assessmentTool) sections.push({ label: 'Zelf aan de slag', items: [assessmentTool] });
    if (themes.length) sections.push({ label: 'Onderwerpen', items: themes });
    if (organizations.length) sections.push({ label: 'Aanbieders', items: organizations });
    const definitions = [
      ['Praktisch aanbod', ['Handreiking', 'Hulpmiddel', 'Voorziening', 'Training']],
      ['Wetgeving', ['Wetgeving']], ['Subsidies', ['Subsidie', 'Subsidie of call']],
      ['Praktijkvoorbeelden', ['Praktijkvoorbeeld']], ['Pilots', ['Pilot']]
    ];
    definitions.forEach(([label, types]) => {
      const items = matching.filter(record => types.includes(typeLabel(record))).slice(0, label === 'Praktisch aanbod' ? 4 : 3);
      if (items.length) sections.push({ label, items: items.map(record => ({ label: record.title, meta: record.providerName, href: `#item/${encodeURIComponent(record.id)}` })) });
    });
    return sections.slice(0, 6);
  }
  function bindSearchForm() {
    const form = document.querySelector('.atlas-search');
    const input = form.querySelector('input');
    const suggestions = form.querySelector('.suggestions');
    const keepSearchVisible = () => {
      if (document.activeElement !== input) return;
      const top = form.getBoundingClientRect().top;
      const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
      if (top < headerBottom) scrollBy({ top: top - headerBottom, behavior: 'instant' });
    };
    input.onfocus = () => requestAnimationFrame(keepSearchVisible);
    form.onsubmit = event => {
      event.preventDefault();
      closeSuggestions();
      if (teamTrialQuery(input.value)) { location.hash = '#teamproef'; return; }
      const assessmentTool = assessmentToolLink(input.value);
      if (assessmentTool) { location.hash = assessmentTool.href; return; }
      if (input.value.trim() && ['#home', ''].includes(location.hash)) state.sort = 'relevant';
      applyNaturalQuery(input.value);
      setUrl();
      input.value = state.q || '';
      document.querySelector('.result-head h2')?.focus();
    };
    input.oninput = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const sections = suggestionData(input.value);
        suggestions.hidden = !sections.length;
        input.setAttribute('aria-expanded', String(!suggestions.hidden));
        suggestions.innerHTML = sections.map(section => `<section><h2>${escapeHtml(section.label)}</h2>${section.items.map(item => `<a href="${escapeHtml(item.href)}"><span>${escapeHtml(item.label)}</span>${item.meta ? `<small>${escapeHtml(item.meta)}</small>` : ''}</a>`).join('')}</section>`).join('');
        keepSearchVisible();
      }, 150);
    };
    suggestions.onclick = event => {
      if (event.target.closest('a[href^="#item/"], a[href^="#werkblad-"], a[href="#regels-in-de-praktijk"], a[href="#wat-werkt"], a[href="#toolkeuze"]')) {
        sessionSet('atlas.lastSearch', criteriaHref(criteriaForQuery(input.value)));
      }
    };
    const closeSuggestions = () => { clearTimeout(debounceTimer); suggestions.hidden = true; input.setAttribute('aria-expanded', 'false'); };
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
  function profileNavigation(home) {
    const profile = readProfile();
    const selected = Object.entries(profile).filter(([, value]) => value);
    if (!selected.length) return temporaryProfile ? '<p role="status">Uw profiel is voor deze pagina gewist. De browser gaf geen toegang tot de opgeslagen voorkeuren.</p>' : '';
    const active = selected.every(([key, value]) => state[key] === value);
    const label = [...profile.audience.split(',').filter(Boolean).map(personaLabel), profile.sector, profile.vak].filter(Boolean).join(' · ');
    return `<aside class="persona-indicator" aria-label="Mijn profiel">
      ${active ? `<span>Uw profiel <strong>${escapeHtml(label)}</strong></span>` : '<a href="#home">Bekijk mijn aanbod</a>'}
      ${activeFilters(state).length ? `<a href="${escapeHtml(criteriaHref({q: state.q}))}">Doorzoek de hele Atlas</a>` : ''}
      <a href="#mijn-atlas">Profiel wijzigen</a>
      ${home ? '<button class="persona-clear" type="button">Wis mijn profiel</button>' : ''}
      ${temporaryProfile ? '<span role="status">Dit profiel geldt zolang deze pagina open is. De browser kon uw keuzes niet bewaren.</span>' : ''}</aside>`;
  }
  function clearProfile() {
    saveProfile(profileCriteria(null));
    if (location.hash === '#home' || !location.hash) {
      renderHome();
      main.querySelector('.result-head h2')?.focus({preventScroll:true});
    } else location.hash = 'home';
  }
  function renderProfile() {
    const profile = readProfile();
    const roles = profile.audience.split(',');
    main.innerHTML = `<article class="personal-page profile-page"><header class="page-intro"><h1 tabindex="-1">Mijn profiel</h1>
      <p>Kies welk aanbod u op de startpagina wilt zien. U hebt geen account nodig. Deze browser bewaart uw keuzes op dit apparaat.</p></header>
      <form id="profile-form"><fieldset><legend>Voor welke rol zoekt u aanbod?</legend>
      <p>Kies eventueel meerdere rollen. Aanbod voor één van uw rollen telt mee.</p>
      <div class="profile-roles">${PROFILE_ROLES.map(role => `<label><input type="checkbox" name="profile-role" value="${escapeHtml(role)}"${roles.includes(role) ? ' checked' : ''}> ${escapeHtml(personaLabel(role))}</label>`).join('')}</div></fieldset>
      <div class="profile-fields"><div><label for="profile-sector">Onderwijssector</label>
      <select id="profile-sector"><option value="">Alle sectoren</option>${SECTORS.map(sector => `<option value="${escapeHtml(sector)}"${profile.sector === sector ? ' selected' : ''}>${escapeHtml(SECTOR_NAMES[sector] ? sector + ' · ' + SECTOR_NAMES[sector] : sector)}</option>`).join('')}</select></div>
      <div>${subjectInput('profile-subject', profile.vak, true)}</div></div>
      <p class="profile-count" role="status"></p><div class="profile-actions"><button class="btn" type="submit">Bewaar mijn profiel</button>
      <a href="#zoeken">Doorzoek de hele Atlas</a>${Object.values(profile).some(Boolean) ? '<button class="btn secondary" type="button" data-profile-clear>Wis mijn profiel</button>' : ''}</div>
      </form></article>`;
    const form = main.querySelector('#profile-form');
    const choices = () => profileCriteria({
      audience: [...form.querySelectorAll('input[name="profile-role"]')].filter(input => input.checked).map(input => input.value).join(','),
      sector: form.querySelector('#profile-sector').value,
      vak: form.querySelector('#profile-subject').value
    });
    const preview = () => {
      const selected = choices();
      const count = recordsForCriteria(selected).length;
      const sheetCount = matchingWorksheetRoutes(selected).length;
      form.querySelector('.profile-count').textContent = count || sheetCount ? matchesLabel(count, sheetCount) + ' bij uw keuzes.' : 'Geen passend aanbod. Probeer een andere rol, sector of vak.';
      form.querySelector('button[type="submit"]').disabled = !Object.values(selected).some(Boolean);
    };
    form.oninput = preview;
    form.onsubmit = event => {
      event.preventDefault();
      const selected = choices();
      if (!Object.values(selected).some(Boolean)) return;
      saveProfile(selected);
      location.hash = 'home';
    };
    const clear = form.querySelector('[data-profile-clear]');
    if (clear) clear.onclick = clearProfile;
    preview();
  }

  function contributionPrompt() {
    return `<aside class="contribution-prompt" aria-label="Help de atlas verbeteren"><div><h2>Help de Atlas verder</h2><p>Kent u relevant aanbod? Ziet u een fout of kan de website prettiger werken? Geef het door via de vaste bijdrageroute.</p></div><a class="btn" href="#bijdragen">Bijdragen &amp; feedback <span aria-hidden="true">→</span></a></aside>`;
  }
  function contributionIssueUrl(kind, record = null) {
    const templates = { addition: 'atlas-aanvulling.yml', correction: 'feitelijke-correctie.yml', feedback: 'feedback.yml' };
    const params = new URLSearchParams({ template: templates[kind] || templates.feedback });
    if (kind === 'correction' && record) {
      params.set('title', `[Correctie] ${record.title}`);
      params.set('record', `${record.title}\n${PUBLIC_ATLAS}#item/${encodeURIComponent(record.id)}`);
    }
    return `https://github.com/ECMW/ai-onderwijs-atlas-nederland/issues/new?${params}`;
  }
  function renderContribute() {
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const record = records.find(item => item.id === params.get('item'));
    main.innerHTML = `<section class="contribute-page"><header class="page-intro"><span class="eyebrow">Samen actueel en bruikbaar</span><h1>Help de Atlas verder</h1><p>Voeg bestaand aanbod toe, verbeter informatie of vertel wat op de website beter kan. Kies hieronder de passende route.</p><p class="contribution-notice">De formulieren openen op GitHub. U heeft een gratis GitHub-account nodig. Uw inzending is openbaar: deel geen persoonsgegevens of vertrouwelijke informatie.</p>${record ? `<p class="contribution-context">Uw correctie gaat over <a href="#item/${escapeHtml(record.id)}">${escapeHtml(record.title)}</a>. Dit item staat alvast ingevuld in het correctieformulier.</p>` : ''}</header>
      <div class="contribute-options"><article><span aria-hidden="true">＋</span><h2>Aanbod toevoegen</h2><p>Kent u een handreiking, training, organisatie, voorziening, subsidie of praktijkvoorbeeld dat ontbreekt? Voeg de officiële bron en een korte feitelijke beschrijving toe.</p><a class="btn" data-contribution="addition" href="${escapeHtml(contributionIssueUrl('addition'))}" target="_blank" rel="noopener noreferrer">Aanbod toevoegen ↗</a></article><article><span aria-hidden="true">✓</span><h2>Fout of aanvulling doorgeven</h2><p>Klopt een titel, beschrijving, status, deadline of bron niet meer? Vermeld wat er moet veranderen, met een onderbouwende bron.</p><a class="btn secondary" data-contribution="correction" href="${escapeHtml(contributionIssueUrl('correction', record))}" target="_blank" rel="noopener noreferrer">Correctie doorgeven ↗</a></article><article><span aria-hidden="true">↔</span><h2>Feedback op de website</h2><p>Lukt zoeken niet goed, werkt een knop niet of kan iets duidelijker? Beschrijf wat u probeerde en wat u verwachtte. Hiervoor is geen bronlink nodig.</p><a class="btn secondary" data-contribution="feedback" href="${escapeHtml(contributionIssueUrl('feedback'))}" target="_blank" rel="noopener noreferrer">Feedback geven ↗</a></article></div>
      <aside class="source-policy"><h2>Wat gebeurt er met uw bijdrage?</h2><p>Uw melding krijgt een eigen openbare plek op GitHub. Controleer eerst of er al een <a href="https://github.com/ECMW/ai-onderwijs-atlas-nederland/issues" target="_blank" rel="noopener noreferrer">vergelijkbare melding ↗</a> is; u kunt daar een aanvulling plaatsen.</p><p>Nieuwe aanbodmeldingen worden direct gecontroleerd op een officiële bron, relevantie voor AI en onderwijs, onderbouwing en mogelijke duplicaten. Duidelijk onderbouwde aanvullingen worden na alle controles automatisch verwerkt. Bij twijfel of ontbrekende informatie blijft de bijdrage ter beoordeling staan. ${LISTING_NOTICE}</p><p>Correcties en websitefeedback blijven via dezelfde openbare route te volgen. U hoeft Eva niet apart te mailen.</p></aside></section>`;
  }
  function currentSearchLabel() {
    const parts = [state.q && `‘${state.q}’`, ...FILTER_KEYS.flatMap(key => values(key).map(value => filterOptionLabel(key, value)))].filter(Boolean);
    return parts.slice(0, 4).join(' · ') || 'Alle aanbod';
  }
  function setActionFeedback(message) {
    const feedback = document.querySelector('#action-feedback');
    if (feedback) feedback.textContent = message;
  }
  async function shareCurrentSelection(text = `Bekijk deze selectie: ${currentSearchLabel()}`, url = location.href, label = 'deze selectie') {
    const shareData = { title: 'AI & Onderwijs Atlas Nederland', text, url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); setActionFeedback(`Link naar ${label} gekopieerd.`); }
      else setActionFeedback(`Kopieer de URL uit de adresbalk om ${label} te delen.`);
    } catch (error) {
      if (error?.name !== 'AbortError') setActionFeedback('Delen lukte niet. Kopieer de URL uit de adresbalk.');
    }
  }
  function bindResultsControls(announceSearch = true) {
    const panel = document.querySelector('#results-panel');
    if (!panel) return;
    const clearProfileButton = panel.querySelector('.persona-clear');
    if (clearProfileButton) clearProfileButton.onclick = clearProfile;
    observeCardFacts();
    if (announceSearch && panel.querySelector('[data-atlas-empty-search]')) window.dispatchEvent?.(new Event('atlas-empty-search'));
    else if (announceSearch && panel.querySelector('[data-atlas-search-hits]')) window.dispatchEvent?.(new Event('atlas-search-results'));
    bindLessonCopy(panel);
    const list = panel.querySelector('[data-result-list]');
    panel.querySelectorAll('input[name="result-layout"]').forEach(input => input.onchange = () => {
      compactResults = input.value === 'list';
      sessionSet('atlas.resultLayout', input.value);
      list.classList.toggle('compact-results', compactResults);
      list.innerHTML = resultRecords.slice(0, list.children.length).map(catalogueResult).join('');
      bindResultsControls(false);
    });
    const more = panel.querySelector('[data-more-results]');
    if (more) more.onclick = () => {
      const first = list.children.length;
      const batch = resultRecords.slice(first, first + RESULT_BATCH);
      list.insertAdjacentHTML('beforeend', batch.map(catalogueResult).join(''));
      const shown = list.children.length;
      saveResultView({shown});
      panel.querySelector('[data-result-progress]').textContent = `${shown} van ${resultRecords.length} resultaten getoond`;
      more.hidden = shown === resultRecords.length;
      bindResultsControls(false);
      list.children[first]?.querySelector('h2 a')?.focus();
    };
    const pickedActions = panel.querySelector('[data-picked-actions]');
    const guide = panel.querySelector('[data-compare-guide]');
    function rememberResults(focusId = '', focusControl = '', route = location.hash || '#home') {
      const view = {shown: list?.children.length || RESULT_BATCH, y: scrollY, focusId, focusControl};
      saveReturnView(view, route);
      sessionSet('atlas.compareSearch', route);
      sessionSet('atlas.resultsScroll', scrollY);
    }
    if (pickedActions) pickedActions.onclick = event => {
      if (event.target.closest('a')) rememberResults();
    };
    if (guide) guide.onclick = () => rememberResults();
    function showPickedActions(input) {
      panel.querySelector('[data-inline-picks]')?.remove();
      if (!input || !sheetPicks.size) return;
      const links = input.closest('.offer-links');
      links.insertAdjacentHTML('beforeend', `<div class="picked-actions" data-inline-picks>${pickedActionLinks('inline')}</div>`);
      links.querySelector('[data-inline-picks]').onclick = event => {
        if (event.target.closest('a')) rememberResults(input.dataset.sheetPick, 'pick');
      };
    }
    const view = resultView();
    if (view.focusControl === 'pick' && !panel.querySelector('[data-inline-picks]')) {
      showPickedActions(resultFocusTarget(panel, view.focusId, 'pick'));
    }
    panel.querySelectorAll('[data-sheet-pick]').forEach(input => input.onchange = () => {
      const id = input.dataset.sheetPick;
      if (input.checked) sheetPicks.add(id);
      else sheetPicks.delete(id);
      persistSheetPicks();
      pickedActions.hidden = !sheetPicks.size;
      pickedActions.innerHTML = pickedActionLinks('picked');
      showPickedActions(input);
      setActionFeedback(sheetPicks.size === 1 ? 'Eén vermelding gekozen. Kies nog een vermelding om te vergelijken.' : `${sheetPicks.size} vermeldingen gekozen.`);
    });
    const sector = panel.querySelector('#practice-sector');
    panel.querySelectorAll('a.practice-link,.practice-back a').forEach(link => {
      const target = link.classList.contains('practice-link') ? '#lesson-heading, #trial-entry-heading, #assessment-entry-heading, #funding-heading, #research-heading, .result-head h2' : '#practice-title';
      focusAfterNavigation(link, target);
    });
    focusAfterNavigation(panel.querySelector('.lesson-shortcut .btn'), '.result-head h2');
    if (sector) sector.onchange = () => {
      state.sector = sector.value;
      if (['#home', ''].includes(location.hash)) state.sort = 'relevant';
      setUrl();
      document.querySelector('#practice-sector')?.focus({ preventScroll: true });
    };
    panel.querySelectorAll('[data-remove]').forEach(button => button.onclick = () => {
      const raw = button.dataset.remove;
      const separator = raw.indexOf('|');
      const key = raw.slice(0, separator), value = raw.slice(separator + 1);
      state[key] = serializeFilterValues(key, values(key).filter(item => item !== value));
      setUrl();
      panel.querySelector('.result-head h2')?.focus();
    });
    panel.querySelectorAll('[data-clear-query]').forEach(button => button.onclick = () => {
      state.q = '';
      setUrl();
      panel.querySelector('.result-head h2')?.focus();
    });
    const queryInput = document.querySelector('.atlas-search input');
    const editQuery = panel.querySelector('[data-edit-query]');
    if (editQuery) editQuery.onclick = () => {
      queryInput.focus();
      queryInput.select();
    };
    panel.querySelectorAll('.clear-link').forEach(button => button.onclick = () => {
      state = { q: '', sort: 'relevant' };
      setUrl();
      queryInput.focus();
    });
    const sort = panel.querySelector('#sort');
    if (sort) sort.onchange = event => { state.sort = event.target.value; setUrl(); document.querySelector('#sort')?.focus(); };
    const share = panel.querySelector('[data-share-selection]');
    if (share) share.onclick = () => shareCurrentSelection();
    const sheet = panel.querySelector('[data-meeting-sheet]');
    if (sheet) sheet.onclick = () => rememberResults('', '', stateHref());
    panel.querySelectorAll('[data-question-route]').forEach(link => link.onclick = () => sessionSet('atlas.lastSearch', stateHref()));
    panel.querySelectorAll('[data-result-list] [data-record-id] a[href^="#item/"]').forEach(link => link.onclick = () => {
      rememberResults(link.closest('[data-record-id]').dataset.recordId, link.closest('h2') ? 'title' : 'details');
    });
  }
  function updateFacetOptions(block) {
    const options = block.querySelector('.facet-options');
    const query = normalize(block.querySelector('.facet-search')?.value || '');
    options.classList.toggle('searching', Boolean(query));
    let visible = 0;
    let matches = 0;
    let canExpand = false;
    for (const label of options.children) {
      const input = label.querySelector('input');
      const matchesName = !query || normalize(label.dataset.facetOption).includes(query);
      if (!input.disabled && matchesName) matches++;
      label.hidden = input.disabled || (!matchesName && !input.checked);
      if (!label.hidden) {
        visible++;
        if (visible > 8 && !input.checked) canExpand = true;
      }
    }
    const more = block.querySelector('.facet-more');
    if (more) more.hidden = Boolean(query) || !canExpand;
    const empty = block.querySelector('.facet-empty');
    empty.textContent = query ? 'Geen passende aanbieder gevonden.' : 'Geen opties bij deze selectie.';
    empty.hidden = matches > 0;
  }
  function bindFacetLists() {
    document.querySelectorAll('.facet-more').forEach(button => button.onclick = () => {
      const options = button.previousElementSibling;
      const nextOption = !options.classList.contains('expanded') &&
        [...options.querySelectorAll('input:enabled')].find(input => !input.getClientRects().length);
      const expanded = options.classList.toggle('expanded');
      button.textContent = expanded ? 'Toon minder' : 'Toon meer';
      button.setAttribute('aria-expanded', String(expanded));
      if (nextOption) nextOption.focus();
    });
    document.querySelectorAll('[data-facet-block="organization"] .facet-search').forEach(input => input.oninput = () => {
      updateFacetOptions(input.closest('[data-facet-block]'));
    });
  }
  function bindSearchPage() {
    bindSearchForm();
    const panel = document.querySelector('#filters');
    panel.onchange = event => {
      const input = event.target;
      const key = input.dataset.facet;
      if (!key) return;
      const selected = new Set(values(key));
      if (input.checked) selected.add(input.value);
      else selected.delete(input.value);
      state[key] = serializeFilterValues(key, [...selected]); setUrl();
    };
    const subjectForm = panel.querySelector('.subject-filter');
    const subjectInput = subjectForm.querySelector('input');
    subjectForm.onsubmit = event => { event.preventDefault(); applySubject(subjectInput); };
    bindFacetLists();
    panel.querySelector('.clear').onclick = () => { subjectInput.value = ''; state = { q: state.q, sort: state.sort }; setUrl(); };
    bindFilterDrawer(panel, document.querySelector('.mobile-filter'));
    bindResultsControls();
  }
  const narrowCatalogue = matchMedia('(width < 768px)');
  function bindFilterDrawer(panel, opener) {
    const closer = panel.querySelector('.close');
    const closePanel = () => {
      panel.classList.remove('open');
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      document.body.classList.remove('locked');
      opener.setAttribute('aria-expanded', 'false');
    };
    opener.onclick = () => {
      panel.classList.add('open');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      document.body.classList.add('locked');
      opener.setAttribute('aria-expanded', 'true');
      closer.focus();
    };
    closer.onclick = () => { closePanel(); opener.focus(); };
    panel.querySelector('.apply').onclick = () => {
      const subject = panel.querySelector('#subject-search');
      if (subject) applySubject(subject);
      closePanel();
      document.querySelector('.result-head h2')?.focus();
    };
    narrowCatalogue.onchange = event => {
      if (!event.matches && panel.classList.contains('open')) {
        closePanel();
        panel.querySelector('summary')?.focus();
      }
    };
    document.onkeydown = event => {
      if (event.key === 'Escape' && panel.classList.contains('open')) closer.onclick();
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
    // Back/forward can replace an open mobile panel without invoking its close
    // button. Release scrolling and detached keyboard handlers before rendering.
    if (factDialog?.open) factDialog.close();
    document.body?.classList.remove('locked');
    document.querySelector('#filters')?.classList.remove('open');
    document.querySelector('.mobile-filter')?.setAttribute('aria-expanded', 'false');
    document.onkeydown = null;
    narrowCatalogue.onchange = null;
    clearTimeout(debounceTimer);
    if (window.ATLAS_STARTUP?.status === 'failed') { window.ATLAS_STARTUP.fail(); return; }
    const path = (location.hash.slice(1) || 'home').split('?')[0];
    // A fragment link can fire both popstate and hashchange. Keep an open sheet and its keyboard focus.
    if (path === 'pilotbesluit' && main.querySelector('.pilot-page')) return;
    document.querySelector('.site-header')?.classList.remove('open');
    document.querySelector('.menu')?.setAttribute('aria-expanded', 'false');
    const guides = {
      'mijn-atlas': renderProfile,
      'praktijkgids': renderPracticeGuide, 'wat-werkt': renderLearningEvidence,
      'toolkeuze': renderToolChoice, 'pilotbesluit': renderPilotDecision, 'regels-in-de-praktijk': renderPracticeRules
    };
    if (Object.hasOwn(WORKSHEET_TEACHER_NOTES, path)) guides[path] = () => renderWorksheet(path);
    if (path === 'home' || (!Object.hasOwn(guides, path) && !['wegwijzer', 'nieuw', 'boeken', 'papers', 'zoeken', 'onderzoek', 'vergelijken', 'overlegblad', 'leerlingblad', 'toetsafspraak', 'teamproef', 'organisaties', 'mijn-atlas', 'bijdragen', 'over', 'beheer', 'wijzigingen', 'ecosysteem', 'dashboard', 'ik-zoek'].includes(path) && !path.startsWith('item/'))) renderHome();
    if (Object.hasOwn(guides, path)) guides[path]();
    if (path === 'wegwijzer') { location.replace('#zoeken'); return; }
    const focusedNewOffer = path === 'nieuw' && renderNewOffers();
    if (path === 'papers') renderPapers();
    if (path === 'onderzoek') researchPage();
    const focusedBookGroup = path === 'boeken' && renderBooks();
    if (path === 'zoeken' || path === 'organisaties') { parseState(); if (path === 'organisaties') state.type = 'Organisatie'; renderSearch(); }
    if (path === 'overlegblad') { parseState(); renderMeetingSheet(); }
    if (path === 'vergelijken') renderComparison();
    if (path === 'leerlingblad') renderLearnerSheet();
    if (path === 'toetsafspraak') renderAssessment();
    if (path === 'teamproef') renderTeamTrial();
    if (path.startsWith('item/')) renderDetail(decodeURIComponent(path.slice(5)));
    if (path === 'bijdragen') renderContribute();
    if (!['home', 'zoeken', 'organisaties'].includes(path)) observeCardFacts();
    document.querySelectorAll('.site-header nav a').forEach(link => link.removeAttribute('aria-current'));
    document.querySelector(`.site-header nav a[href="#${CSS.escape(path)}"]`)?.setAttribute('aria-current', 'page');
    const updated = document.querySelector('[data-updated]'); if (updated) updated.textContent = source.metadata.updated || '';
    if (!['zoeken', 'organisaties'].includes(path) && !focusedBookGroup && !focusedNewOffer) {
      if (path === 'toetsafspraak' && new URLSearchParams(location.hash.split('?')[1]).get('vergelijk') === '1') {
        const summary = main.querySelector('.assessment-compare > summary');
        summary.scrollIntoView({block: 'center', behavior: 'instant'});
        restoreCardFocus(summary, scrollY);
        return;
      }
      scrollTo({ top: 0, behavior: 'instant' });
      const target = Object.hasOwn(guides, path) ? main.querySelector('h1') : path === 'onderzoek' ? document.querySelector('#research-heading') : path === 'papers' ? document.querySelector('#papers-heading') : main;
      (target || main).focus({ preventScroll: true });
    }
  }
  let hiddenAt = 0;
  window.addEventListener?.('pageshow', refreshHomeSpotlight);
  window.addEventListener?.('beforeprint', () => {
    const list = document.querySelector('[data-result-list]');
    if (!list || list.children.length >= resultRecords.length) return;
    list.dataset.beforePrint = list.children.length;
    list.insertAdjacentHTML('beforeend', resultRecords.slice(list.children.length).map(record => simpleCard(record, true)).join(''));
  });
  window.addEventListener?.('afterprint', () => {
    const list = document.querySelector('[data-result-list]');
    if (!list?.dataset.beforePrint) return;
    while (list.children.length > Number(list.dataset.beforePrint)) list.lastElementChild.remove();
    delete list.dataset.beforePrint;
  });
  document.addEventListener?.('visibilitychange', () => {
    const now = Date.now();
    if (document.hidden) { hiddenAt = now; return; }
    refreshHomeSpotlight();
    const since = hiddenAt;
    hiddenAt = 0;
    if (!since || !records.some(record => {
      const end = record.status === 'open_call' && Date.parse(deadlineInstant(record));
      return end > since && end <= now;
    })) return;
    if (document.querySelector('.catalog-grid')) updateSearchResults();
    else if (document.querySelector('.funding-conditions')) renderDetail(decodeURIComponent(location.hash.slice(6).split('?')[0]));
  });
  addEventListener('hashchange', route); addEventListener('popstate', route); route();
  window.ATLAS_STARTUP?.ready();
})();
