(() => {
  'use strict';
  const directory = document.querySelector('main[data-atlas-lesson-directory]');
  const form = directory?.querySelector('[data-directory-filter]');
  if (!form) return;
  const skipLink = document.querySelector('a.skip');
  if (skipLink) skipLink.onclick = event => {
    event.preventDefault();
    directory.focus({preventScroll:true});
    window.scrollTo({top:0, behavior:'instant'});
  };
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const subjects = form.querySelector('[data-filter-subject]');
  const goals = form.querySelector('[data-filter-goal]');
  const activities = form.querySelector('[data-filter-activity]');
  const duration = form.querySelector('[data-filter-minutes]');
  const sector = form.querySelector('[data-filter-sector]');
  const sectorOptions = new Set([...sector.querySelectorAll('option')].map(option => option.value));
  const knownSectors = new Set([...sectorOptions, 'Onderzoek', 'Overheid']);
  let importedSector, unknownSector = false;
  const fields = {sector, vak:subjects, doel:goals, activiteit:activities, minuten:duration};
  const advanced = form.querySelector('[data-more-filters]');
  const advancedFields = [goals, activities, duration];
  const advancedCount = form.querySelector('[data-more-count]');
  const selectionActions = form.querySelector('[data-selection-actions]');
  const reset = selectionActions.querySelector('[type="reset"]');
  const share = form.querySelector('[data-share-lessons]');
  const jumps = directory.querySelector('.directory-jumps');
  const status = form.querySelector('[role="status"]');
  const jump = form.querySelector('[data-go-lessons]');
  const feedback = form.querySelector('[data-copy-feedback]');
  const fallback = form.querySelector('[data-copy-fallback]');
  const cards = [...directory.querySelectorAll('section article')].map(card => {
    const content = selector => normalize([...card.querySelectorAll(selector)].map(el => el.textContent).join(' '));
    const link = card.querySelector('.directory-card-link');
    const section = card.closest('section');
    link.hidden = false;
    return {
      card, section, group:section.getAttribute('aria-labelledby'), link, id:link.getAttribute('href'), worksheet:card.dataset.worksheet !== undefined,
      sectors:card.querySelector('[data-directory-sectors]').dataset.directorySectors.split(' '),
      subject:content('[data-directory-subject]'), goal:content('[data-directory-goal], h3'),
      activity:content('[data-directory-activity], [data-directory-task]'),
      minutes:Number(card.querySelector('[data-directory-minutes]')?.value) || null
    };
  });
  if (!cards.length) return;
  const groups = [...directory.querySelectorAll('section[aria-labelledby]')].map(section => ({
    section, link: directory.querySelector('nav a[href="#' + section.getAttribute('aria-labelledby') + '"]')
  }));
  if (cards.some(item => item.minutes !== null)) {
    form.querySelector('[data-duration-field]').hidden = false;
    form.querySelector('#source-duration-hint').hidden = false;
  }
  function selection() {
    const params = new URLSearchParams();
    for (const [key, field] of Object.entries(fields)) {
      const value = field.value.trim();
      if (value && field.validity.valid) params.set(key, field === duration ? String(duration.valueAsNumber) : value);
    }
    return params;
  }
  const selectionHash = params => params.size ? '#selectie?' + params : '';
  function readSector(value) {
    importedSector?.remove();
    importedSector = null;
    unknownSector = false;
    if (!sectorOptions.has(value)) {
      const choices = value.split(',');
      if (choices.some(choice => !choice || !knownSectors.has(choice)) || new Set(choices).size !== choices.length) {
        unknownSector = true;
        sector.value = '';
        return;
      }
      importedSector = document.createElement('option');
      importedSector.value = value;
      importedSector.textContent = choices.join(' of ');
      sector.append(importedSector);
    }
    sector.value = value;
  }
  function showActions() {
    selectionActions.hidden = reset.hidden && !advanced.open;
  }
  function update(save = false) {
    const terms = value => normalize(value).split(' ').filter(Boolean);
    const subject = subjects.value.split(',').map(terms).filter(words => words.length);
    const goal = terms(goals.value), activity = terms(activities.value);
    const sectorChoices = sector.value ? sector.value.split(',') : [];
    const matches = (words, text) => words.every(word => text.includes(word));
    const invalid = !duration.validity.valid;
    const max = invalid || !duration.value ? null : duration.valueAsNumber;
    duration.setAttribute('aria-invalid', String(invalid));
    const params = selection();
    const count = advancedFields.filter(field => field.value.trim() || !field.validity.valid).length;
    advancedCount.textContent = count ? ' (' + count + ' actief)' : '';
    if (save) {
      unknownSector = false;
      if (importedSector && importedSector.value !== sector.value) {
        importedSector.remove();
        importedSector = null;
      }
    }
    reset.hidden = !params.size && !invalid && !unknownSector;
    share.disabled = invalid || unknownSector;
    showActions();
    const context = new URLSearchParams([['van', 'lesgids'], ...params]);
    if (save) history.replaceState(history.state, '', location.pathname + location.search + selectionHash(params));
    feedback.textContent = '';
    fallback.hidden = true;
    const visible = new Set(), sections = new Set();
    let worksheetCount = 0;
    for (const item of cards) {
      item.link.setAttribute('href', item.id + '?' + context + '&groep=' + encodeURIComponent(item.group));
      item.card.hidden = !(!unknownSector && (!sectorChoices.length || sectorChoices.some(choice => item.sectors.includes(choice))) &&
        (!subject.length || subject.some(words => matches(words, item.subject))) && matches(goal, item.goal) && matches(activity, item.activity) &&
        (max === null || (item.minutes !== null && item.minutes <= max)));
      if (!item.card.hidden) {
        if (item.worksheet && !visible.has(item.id)) worksheetCount++;
        visible.add(item.id);
        sections.add(item.section);
      }
    }
    for (const {section, link} of groups) {
      section.hidden = !sections.has(section);
      if (link) link.hidden = section.hidden;
    }
    const lessonCount = visible.size - worksheetCount;
    const counts = [];
    if (worksheetCount) counts.push(worksheetCount + (worksheetCount === 1 ? ' werkblad' : ' werkbladen'));
    if (lessonCount) counts.push(lessonCount + (lessonCount === 1 ? ' lesstart' : ' lesstarts'));
    status.textContent = unknownSector ? 'Onbekende onderwijssector in deze link. Kies een sector of wis de filters.'
      : invalid ? 'Vul bij de duur een heel aantal minuten van minimaal 1 in.'
      : counts.join(' en ') || 'Geen lesmateriaal bij deze keuzes. Pas uw zoekwoorden aan of wis de filters.';
    jump.disabled = !visible.size;
    if (jumps) jumps.hidden = !visible.size;
  }
  function readLocation() {
    const raw = location.hash.startsWith('#selectie?') ? location.hash.slice('#selectie?'.length) : '';
    const params = new URLSearchParams(raw);
    readSector(params.get('sector') || '');
    for (const [key, field] of Object.entries(fields)) {
      if (field !== sector) field.value = (params.get(key) || '').slice(0, field === subjects ? 512 : 160);
    }
    if (advancedFields.some(field => field.value.trim())) advanced.open = true;
    update();
    if (params.getAll('groep').length === 1 && params.getAll('kaart').length === 1) {
      const target = cards.find(item => !item.card.hidden && item.group === params.get('groep') &&
        item.id.replace(/^\.\.\/#(?:item\/)?/, '') === params.get('kaart'));
      if (target) focusHeading(target.card.querySelector('h3'));
    }
  }
  function focusHeading(element) {
    element.setAttribute('tabindex', '-1');
    element.focus({preventScroll:true});
    element.scrollIntoView({block:'start', behavior:'instant'});
  }
  jump.onclick = () => {
    const card = cards.find(item => !item.card.hidden);
    if (card) focusHeading(card.card.querySelector('h3'));
  };
  for (const {section, link} of groups) link?.addEventListener('click', event => {
    if (!selection().size || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    focusHeading(section.querySelector('h2'));
  });
  advanced.ontoggle = showActions;
  share.onclick = async () => {
    if (!form.reportValidity()) return;
    const address = location.origin + location.pathname + selectionHash(selection());
    try {
      await navigator.clipboard.writeText(address);
      feedback.textContent = 'Link naar deze lesselectie gekopieerd.';
    } catch {
      fallback.hidden = false;
      const input = fallback.querySelector('input');
      input.value = address;
      input.focus();
      input.select();
    }
  };
  form.addEventListener('input', () => update(true));
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', () => requestAnimationFrame(() => update(true)));
  window.addEventListener('hashchange', readLocation);
  window.addEventListener('pageshow', readLocation);
  form.hidden = false;
  readLocation();
})();
