(() => {
  'use strict';
  const directory = document.querySelector('main[data-atlas-lesson-directory]');
  const form = directory?.querySelector('[data-directory-filter]');
  if (!form) return;
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const subjects = form.querySelector('[data-filter-subject]');
  const goals = form.querySelector('[data-filter-goal]');
  const activities = form.querySelector('[data-filter-activity]');
  const duration = form.querySelector('[data-filter-minutes]');
  const sector = form.querySelector('[data-filter-sector]');
  const fields = {sector, vak:subjects, doel:goals, activiteit:activities, minuten:duration};
  const status = form.querySelector('[role="status"]');
  const jump = form.querySelector('[data-go-lessons]');
  const feedback = form.querySelector('[data-copy-feedback]');
  const fallback = form.querySelector('[data-copy-fallback]');
  const cards = [...directory.querySelectorAll('section article')].map(card => {
    const content = selector => normalize([...card.querySelectorAll(selector)].map(el => el.textContent).join(' '));
    const link = card.querySelector('.directory-card-link');
    return {
      card, section:card.closest('section'), link, id:link.getAttribute('href'),
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
  function update(save = false) {
    const terms = input => normalize(input.value).split(' ').filter(Boolean);
    const subject = terms(subjects), goal = terms(goals), activity = terms(activities);
    const matches = (words, text) => words.every(word => text.includes(word));
    const invalid = !duration.validity.valid;
    const max = invalid || !duration.value ? null : duration.valueAsNumber;
    duration.setAttribute('aria-invalid', String(invalid));
    const params = selection();
    const context = new URLSearchParams([['van', 'lesgids'], ...params]);
    if (save) history.replaceState(history.state, '', location.pathname + location.search + selectionHash(params));
    feedback.textContent = '';
    fallback.hidden = true;
    const visible = new Set(), sections = new Set();
    for (const item of cards) {
      item.link.setAttribute('href', item.id + '?' + context);
      item.card.hidden = !((!sector.value || item.sectors.includes(sector.value)) &&
        matches(subject, item.subject) && matches(goal, item.goal) && matches(activity, item.activity) &&
        (max === null || (item.minutes !== null && item.minutes <= max)));
      if (!item.card.hidden) { visible.add(item.id); sections.add(item.section); }
    }
    for (const {section, link} of groups) {
      section.hidden = !sections.has(section);
      if (link) link.hidden = section.hidden;
    }
    status.textContent = invalid ? 'Vul bij de duur een heel aantal minuten van minimaal 1 in.'
      : visible.size ? visible.size + (visible.size === 1 ? ' lesstart' : ' lesstarts')
      : 'Geen lesstarts bij deze keuzes. Pas uw zoekwoorden aan of wis de filters.';
    jump.disabled = !visible.size;
  }
  function readLocation() {
    const raw = location.hash.startsWith('#selectie?') ? location.hash.slice('#selectie?'.length) : '';
    const params = new URLSearchParams(raw);
    for (const [key, field] of Object.entries(fields)) field.value = (params.get(key) || '').slice(0, 160);
    update();
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
  form.querySelector('[data-share-lessons]').onclick = async () => {
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
  readLocation();
  form.hidden = false;
})();
