const state = { modules: [], selectedModule: -1, selectedLesson: -1, exactSearchModule: -1 };

const elements = {
  search: document.querySelector('#module-search'),
  list: document.querySelector('#module-list'),
  moduleCount: document.querySelector('#module-count'),
  lessonTotal: document.querySelector('#lesson-total'),
};

const brandPhotoButton = document.querySelector('.brand-photo-button');
let brandPhotoTimeout;
brandPhotoButton.addEventListener('click', () => {
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  window.clearTimeout(brandPhotoTimeout);
  brandPhotoButton.classList.remove('is-tapped');
  void brandPhotoButton.offsetWidth;
  brandPhotoButton.classList.add('is-tapped');
  brandPhotoTimeout = window.setTimeout(() => {
    brandPhotoButton.classList.remove('is-tapped');
  }, 1100);
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function lessonHeading(lesson) {
  return lesson.group
    ? `Урок ${lesson.number} (${lesson.group}): ${lesson.title}`
    : `Урок ${lesson.number}: ${lesson.title}`;
}

function normalizeSearch(value) {
  return value.toLocaleLowerCase('ru-RU').trim().replace(/\s+/g, ' ');
}

function findExactLesson(query) {
  const normalized = normalizeSearch(query);
  for (const [moduleIndex, module] of state.modules.entries()) {
    const prefix = `${normalizeSearch(module.name)} `;
    if (!normalized.startsWith(prefix)) continue;
    const lessonNumber = normalized.slice(prefix.length);
    if (!/^\d+$/.test(lessonNumber)) continue;
    const lessonIndex = module.lessons.findIndex((lesson) => lesson.number === Number(lessonNumber));
    if (lessonIndex !== -1) return { moduleIndex, lessonIndex };
  }
  return null;
}

function renderModules() {
  const query = elements.search.value.trim().toLocaleLowerCase('ru-RU');
  const filtered = state.modules
    .map((module, index) => ({ module, index }))
    .filter(({ module }, index) => state.exactSearchModule >= 0
      ? index === state.exactSearchModule
      : !query || module.name.toLocaleLowerCase('ru-RU').includes(query)
      || module.lessons.some((lesson) => lesson.title.toLocaleLowerCase('ru-RU').includes(query)));

  elements.moduleCount.textContent = filtered.length;
  if (!filtered.length) {
    elements.list.innerHTML = '<div class="empty-list">Ничего не найдено. Попробуйте другое название.</div>';
    return;
  }

  elements.list.innerHTML = filtered.map(({ module, index }) => {
    const selected = index === state.selectedModule;
    const lesson = module.lessons[state.selectedLesson];
    const lessonPicker = selected && module.lessons.length
      ? `<div class="lesson-chips" aria-label="Уроки модуля">${module.lessons.map((item, lessonIndex) => {
        const group = item.group ? `<span class="chip-group">${escapeHtml(item.group.replace(/\s*группа$/i, ''))}</span>` : '';
        return `<button class="lesson-chip${lessonIndex === state.selectedLesson ? ' active' : ''}" type="button" data-lesson="${lessonIndex}" aria-label="Урок ${item.number}${item.group ? `, ${escapeHtml(item.group)}` : ''}" title="${escapeHtml(item.title)}">${item.number}${group}</button>`;
      }).join('')}</div>
      <div class="selected-lesson">${escapeHtml(lessonHeading(lesson))}</div>
      <div class="module-actions">
        <button class="module-action" type="button" data-copy="title" aria-label="Скопировать название урока">
          <span>Урок</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg>
        </button>
        <button class="module-action" type="button" data-copy="report" aria-label="Скопировать отчет">
          <span>Отчет</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg>
        </button>
      </div>
      <div class="copy-feedback" role="status" aria-live="polite"></div>`
      : '';

    return `<div class="module-card${selected ? ' selected' : ''}">
      <button class="module-item" type="button" data-module="${index}" aria-expanded="${selected}">
        <span class="module-name">${escapeHtml(module.name)}</span>
        <span class="module-lessons">${module.lessons.length}</span>
      </button>${lessonPicker}
    </div>`;
  }).join('');
}

async function copy(text, label, card) {
  const feedback = card.querySelector('.copy-feedback');
  try {
    await navigator.clipboard.writeText(text);
    feedback.textContent = `${label} скопирован`;
    feedback.classList.remove('error');
  } catch {
    feedback.textContent = 'Не удалось скопировать';
    feedback.classList.add('error');
  }
}

elements.search.addEventListener('input', () => {
  const exact = findExactLesson(elements.search.value);
  state.exactSearchModule = exact?.moduleIndex ?? -1;
  if (exact) {
    state.selectedModule = exact.moduleIndex;
    state.selectedLesson = exact.lessonIndex;
  }
  renderModules();
});
elements.list.addEventListener('click', (event) => {
  const card = event.target.closest('.module-card');
  if (!card) return;

  const copyButton = event.target.closest('[data-copy]');
  if (copyButton) {
    const module = state.modules[state.selectedModule];
    const lesson = module.lessons[state.selectedLesson];
    const report = lesson.group
      ? `Урок ${lesson.number} (${lesson.group}): ${lesson.title}`
      : `Урок ${lesson.number}: ${lesson.title}`;
    const text = lesson.body ? `${report}\n${lesson.body}` : report;
    const isTitle = copyButton.dataset.copy === 'title';
    copy(isTitle ? `${module.name} ${lesson.number} урок` : text, isTitle ? 'Урок' : 'Отчет', card);
    return;
  }

  const lessonButton = event.target.closest('[data-lesson]');
  if (lessonButton) {
    state.selectedLesson = Number(lessonButton.dataset.lesson);
    renderModules();
    return;
  }

  const moduleButton = event.target.closest('[data-module]');
  if (!moduleButton) return;
  const index = Number(moduleButton.dataset.module);
  if (state.selectedModule !== index) {
    state.selectedModule = index;
    state.selectedLesson = state.modules[index].lessons.length ? 0 : -1;
  } else {
    state.selectedModule = -1;
    state.selectedLesson = -1;
  }
  renderModules();
});

document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
});

fetch('./data/reports.json')
  .then((response) => {
    if (!response.ok) throw new Error('Не удалось загрузить базу отчетов');
    return response.json();
  })
  .then((modules) => {
    state.modules = modules;
    elements.lessonTotal.textContent = modules.reduce((sum, module) => sum + module.lessons.length, 0);
    renderModules();
  })
  .catch(() => {
    elements.list.innerHTML = '<div class="empty-list">Не удалось загрузить список модулей.</div>';
  });
