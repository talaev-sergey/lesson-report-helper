const state = { modules: [], selectedModule: -1, selectedLesson: -1 };

const elements = {
  search: document.querySelector('#module-search'),
  list: document.querySelector('#module-list'),
  moduleCount: document.querySelector('#module-count'),
  lessonTotal: document.querySelector('#lesson-total'),
  selectionInfo: document.querySelector('#selection-info'),
  copyTitle: document.querySelector('#copy-title'),
  copyReport: document.querySelector('#copy-report'),
  feedback: document.querySelector('#copy-feedback'),
};

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

function lessonReport(lesson) {
  const text = lesson.body ? `\n${lesson.body}` : '';
  return `${lessonHeading(lesson)}${text}`;
}

function renderModules() {
  const query = elements.search.value.trim().toLocaleLowerCase('ru-RU');
  const filtered = state.modules
    .map((module, index) => ({ module, index }))
    .filter(({ module }) => !query || module.name.toLocaleLowerCase('ru-RU').includes(query)
      || module.lessons.some((lesson) => lesson.title.toLocaleLowerCase('ru-RU').includes(query)));

  elements.moduleCount.textContent = filtered.length;
  if (!filtered.length) {
    elements.list.innerHTML = '<div class="empty-list">Ничего не найдено. Попробуйте другое название.</div>';
    return;
  }

  elements.list.innerHTML = filtered.map(({ module, index }) => {
    const selected = index === state.selectedModule;
    const chips = selected && module.lessons.length
      ? `<div class="lesson-chips" aria-label="Уроки модуля">${module.lessons.map((lesson, lessonIndex) => {
        const group = lesson.group ? `<span class="chip-group">${escapeHtml(lesson.group.replace(/\s*группа$/i, ''))}</span>` : '';
        return `<button class="lesson-chip${lessonIndex === state.selectedLesson ? ' active' : ''}" type="button" data-lesson="${lessonIndex}" aria-label="Урок ${lesson.number}${lesson.group ? `, ${escapeHtml(lesson.group)}` : ''}" title="${escapeHtml(lesson.title)}">${lesson.number}${group}</button>`;
      }).join('')}</div>`
      : '';

    return `<div class="module-card${selected ? ' selected' : ''}">
      <button class="module-item" type="button" data-module="${index}" aria-expanded="${selected}">
        <span class="module-symbol">${escapeHtml(module.name.slice(0, 1).toLocaleUpperCase('ru-RU'))}</span>
        <span class="module-name">${escapeHtml(module.name)}</span>
        <span class="module-lessons">${module.lessons.length}</span>
      </button>${chips}
    </div>`;
  }).join('');
}

function renderSelection() {
  const module = state.modules[state.selectedModule];
  const lesson = module?.lessons[state.selectedLesson];
  const enabled = Boolean(module && lesson);
  elements.copyTitle.disabled = !enabled;
  elements.copyReport.disabled = !enabled;
  if (!enabled) {
    elements.selectionInfo.textContent = 'Выберите модуль и номер урока';
    return;
  }

  const group = lesson.group ? ` · ${lesson.group}` : '';
  elements.selectionInfo.textContent = `${module.name} · Урок ${lesson.number}${group}: ${lesson.title}`;
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    elements.feedback.textContent = `${label} скопирован`;
    elements.feedback.classList.remove('error');
  } catch {
    elements.feedback.textContent = 'Не удалось скопировать. Проверьте разрешение браузера.';
    elements.feedback.classList.add('error');
  }
}

elements.search.addEventListener('input', renderModules);
elements.list.addEventListener('click', (event) => {
  const lessonButton = event.target.closest('[data-lesson]');
  if (lessonButton) {
    state.selectedLesson = Number(lessonButton.dataset.lesson);
    elements.feedback.textContent = '';
    renderModules();
    renderSelection();
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
  elements.feedback.textContent = '';
  renderModules();
  renderSelection();
});

elements.copyTitle.addEventListener('click', () => {
  const module = state.modules[state.selectedModule];
  const lesson = module.lessons[state.selectedLesson];
  copy(`${module.name} ${lesson.number} урок`, 'Название урока');
});

elements.copyReport.addEventListener('click', () => {
  const module = state.modules[state.selectedModule];
  copy(lessonReport(module.lessons[state.selectedLesson]), 'Текст отчета');
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
    renderSelection();
  })
  .catch(() => {
    elements.list.innerHTML = '<div class="empty-list">Не удалось загрузить список модулей.</div>';
    elements.selectionInfo.textContent = 'База отчетов временно недоступна';
  });
