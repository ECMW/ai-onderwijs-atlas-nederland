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
  const status = form.querySelector('[role="status"]');
  const cards = [...directory.querySelectorAll('section article')].map(card => {
    const content = selector => normalize([...card.querySelectorAll(selector)].map(el => el.textContent).join(' '));
    return {
      card, section:card.closest('section'), id:card.querySelector('.directory-card-link').getAttribute('href'),
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
  function update() {
    const terms = input => normalize(input.value).split(' ').filter(Boolean);
    const subject = terms(subjects), goal = terms(goals), activity = terms(activities);
    const matches = (words, text) => words.every(word => text.includes(word));
    const invalid = !duration.validity.valid;
    const max = invalid || !duration.value ? null : duration.valueAsNumber;
    duration.setAttribute('aria-invalid', String(invalid));
    const visible = new Set(), sections = new Set();
    for (const item of cards) {
      item.card.hidden = !(matches(subject, item.subject) && matches(goal, item.goal) && matches(activity, item.activity) &&
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
  }
  form.addEventListener('input', update);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', () => requestAnimationFrame(update));
  update();
  form.hidden = false;
})();
