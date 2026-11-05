const state = { modules: [], filtered: [], selectedModule: 0, selectedLesson: 0 };

const elements = {
  search: document.querySelector('#module-search'),
  list: document.querySelector('#module-list'),
  moduleCount: document.querySelector('#module-count'),
  lessonTotal: document.querySelector('#lesson-total'),
  crumb: document.querySelector('#crumb-module'),
  moduleIndex: document.querySelector('#module-index'),
  moduleIcon: document.querySelector('#module-icon'),
  moduleName: document.querySelector('#selected-module'),
  moduleMeta: document.querySelector('#module-meta'),
  lessonSelect: document.querySelector('#lesson-select'),
  selectedLesson: document.querySelector('#selected-lesson'),
  preview: document.querySelector('#report-preview'),
  copyReport: document.querySelector('#copy-report'),
  copyTitle: document.querySelector('#copy-title'),
  feedback: document.querySelector('#copy-feedback'),
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function slug(value) {
  return value.toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
}

function lessonHeading(lesson) {
  return `Урок ${lesson.number}: ${lesson.title}`;
}

function lessonReport(module, lesson) {
  const heading = lesson.group
    ? `Урок ${lesson.number} (${lesson.group}): ${lesson.title}`
    : lessonHeading(lesson);
  return `${heading}${lesson.body ? `\n${lesson.body}` : ''}`;
}

function renderBody(body) {
  if (!body.trim()) return '<p>Описание этого занятия пока не добавлено.</p>';
  const lines = body.split('\n');
  const output = [];
  let bullets = [];
  const flushBullets = () => {
    if (bullets.length) output.push(`<ul>${bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
    bullets = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flushBullets(); continue; }
    const bullet = line.match(/^[-*•]\s+(.+)/);
    if (bullet) { bullets.push(bullet[1]); continue; }
    flushBullets();
    output.push(`<p>${escapeHtml(line)}</p>`);
  }
  flushBullets();
  return output.join('');
}

function renderModules() {
  const query = elements.search.value.trim().toLocaleLowerCase('ru-RU');
  state.filtered = state.modules
    .map((module, index) => ({ module, index }))
    .filter(({ module }) => !query || module.name.toLocaleLowerCase('ru-RU').includes(query)
      || module.lessons.some((lesson) => lesson.title.toLocaleLowerCase('ru-RU').includes(query)));
  elements.moduleCount.textContent = state.filtered.length;
  if (!state.filtered.length) {
    elements.list.innerHTML = '<div class="empty-list">Ничего не нашлось.<br>Попробуйте другое название.</div>';
    return;
  }
  elements.list.innerHTML = state.filtered.map(({ module, index }) => `
    <button class="module-item${index === state.selectedModule ? ' active' : ''}" type="button" data-module="${index}" aria-current="${index === state.selectedModule ? 'page' : 'false'}">
      <span class="module-symbol">${escapeHtml(module.name.slice(0, 1).toLocaleUpperCase('ru-RU'))}</span>
      <span class="module-name">${escapeHtml(module.name)}</span>
      <span class="module-lessons">${module.lessons.length}</span>
    </button>`).join('');
}

function renderSelection() {
  const module = state.modules[state.selectedModule];
  if (!module) return;
  if (!module.lessons.length) {
    elements.moduleName.textContent = module.name;
    elements.moduleMeta.textContent = 'Отчеты для этого модуля не найдены';
    elements.lessonSelect.innerHTML = '<option>Нет уроков</option>';
    elements.lessonSelect.disabled = true;
    elements.copyReport.disabled = true;
    elements.copyTitle.disabled = true;
    return;
  }
  state.selectedLesson = Math.min(state.selectedLesson, module.lessons.length - 1);
  const lesson = module.lessons[state.selectedLesson];
  elements.crumb.textContent = module.name.toLocaleUpperCase('ru-RU');
  elements.moduleIndex.textContent = String(state.selectedModule + 1).padStart(2, '0');
  elements.moduleIcon.textContent = module.name.slice(0, 1).toLocaleUpperCase('ru-RU');
  elements.moduleName.textContent = module.name;
  elements.moduleMeta.textContent = `${module.lessons.length} ${pluralLessons(module.lessons.length)} в модуле`;
  elements.lessonSelect.disabled = false;
  elements.lessonSelect.innerHTML = module.lessons.map((item, index) => {
    const group = item.group ? ` · ${item.group}` : '';
    return `<option value="${index}" ${index === state.selectedLesson ? 'selected' : ''}>Урок ${item.number} — ${escapeHtml(item.title)}${escapeHtml(group)}</option>`;
  }).join('');
  elements.selectedLesson.innerHTML = `
    <div class="lesson-number"><span>УРОК</span><strong>${lesson.number}</strong></div>
    <div class="selected-copy"><span class="selected-label">ТЕМА ЗАНЯТИЯ${lesson.group ? ` · ${escapeHtml(lesson.group.toLocaleUpperCase('ru-RU'))}` : ''}</span><h3>${escapeHtml(lesson.title)}</h3></div>`;
  elements.preview.innerHTML = `
    <div class="paper-top"><span class="paper-logo">k<span>1</span></span><span class="paper-caption">ОТЧЕТ О ЗАНЯТИИ</span></div>
    <div class="report-content">
      <h4>${escapeHtml(lessonHeading(lesson))}</h4>
      ${lesson.group ? `<span class="group-label">${escapeHtml(lesson.group)}</span>` : ''}
      ${renderBody(lesson.body)}
    </div>
    <div class="paper-bottom"><span>СОЗДАНО ДЛЯ ТЬЮТОРА</span><span class="paper-page">${String(state.selectedLesson + 1).padStart(2, '0')} <i>/</i> ${String(module.lessons.length).padStart(2, '0')}</span></div>`;
  elements.copyReport.disabled = false;
  elements.copyTitle.disabled = false;
}

function pluralLessons(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'урок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'урока';
  return 'уроков';
}

async function copy(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    elements.feedback.textContent = `${label} скопирован в буфер обмена`;
    elements.feedback.classList.remove('error');
  } catch {
    elements.feedback.textContent = 'Не удалось скопировать. Проверьте разрешение браузера.';
    elements.feedback.classList.add('error');
  }
}

elements.search.addEventListener('input', renderModules);
elements.list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-module]');
  if (!button) return;
  state.selectedModule = Number(button.dataset.module);
  state.selectedLesson = 0;
  elements.feedback.textContent = '';
  renderModules();
  renderSelection();
});
elements.lessonSelect.addEventListener('change', () => {
  state.selectedLesson = Number(elements.lessonSelect.value);
  elements.feedback.textContent = '';
  renderSelection();
});
elements.copyReport.addEventListener('click', () => {
  const module = state.modules[state.selectedModule];
  const lesson = module.lessons[state.selectedLesson];
  copy(lessonReport(module, lesson), 'Отчет');
});
elements.copyTitle.addEventListener('click', () => {
  const module = state.modules[state.selectedModule];
  const lesson = module.lessons[state.selectedLesson];
  copy(`${slug(module.name)}_урок_${lesson.number}_${slug(lesson.title)}`, 'Название урока');
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    elements.search.focus();
  }
  if (event.key === 'Enter' && !['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) {
    elements.copyReport.click();
  }
});

fetch('./data/reports.json')
  .then((response) => {
    if (!response.ok) throw new Error('Не удалось загрузить базу отчетов');
    return response.json();
  })
  .then((modules) => {
    state.modules = modules;
    state.selectedModule = modules.findIndex((module) => module.lessons.length > 0);
    if (state.selectedModule < 0) state.selectedModule = 0;
    elements.lessonTotal.textContent = modules.reduce((sum, module) => sum + module.lessons.length, 0);
    renderModules();
    renderSelection();
  })
  .catch(() => {
    elements.moduleName.textContent = 'Не удалось загрузить отчеты';
    elements.moduleMeta.textContent = 'Обновите страницу или проверьте файл data/reports.json';
    elements.list.innerHTML = '<div class="empty-list">База отчетов временно недоступна.</div>';
  });
