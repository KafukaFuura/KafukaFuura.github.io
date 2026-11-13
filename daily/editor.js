import { validateBank, renderMath } from './core.js?v=20261113-3';

const $ = (selector) => document.querySelector(selector);
const form = $('#question-form');
const fields = ['id', 'releaseDate', 'title', 'topic', 'difficulty', 'minutes', 'statement', 'hint', 'solution'];
const DRAFT_KEY = 'calculus-daily-editor-v1';
const emptyBank = () => ({ version: 1, timeZone: 'Asia/Shanghai', title: '高等数学 · 每日一题', questions: [] });
let bank = emptyBank();
let selectedId = null;
let formChanged = false;
let initialized = false;
let availableDraft = null;

function status(message, error = false) {
  $('#status').textContent = message;
  $('#status').dataset.error = String(error);
}

function dateToday() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function freshQuestion() {
  const releaseDate = dateToday();
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
  return { id: `q-${releaseDate}-${suffix}`, releaseDate };
}

function readForm() {
  return Object.fromEntries(fields.map((name) => [name, name === 'minutes' ? Number(form.elements[name].value) : form.elements[name].value.trim()]));
}

function fillForm(question = {}) {
  for (const name of fields) {
    const value = question[name] ?? (name === 'minutes' ? 10 : name === 'difficulty' ? '基础' : '');
    if (name === 'difficulty' && !Array.from(form.elements[name].options).some((option) => option.value === value)) {
      form.elements[name].add(new Option(value, value));
    }
    form.elements[name].value = value;
  }
  formChanged = false;
  $('#edit-state').textContent = selectedId ? '已保存到本机题库' : '尚未保存';
  $('#editor-heading').textContent = selectedId ? '编辑练习组' : '新建练习组';
  $('#delete-question').disabled = !selectedId;
  $('#validation-errors').hidden = true;
  $('#preview').hidden = true;
}

function newQuestion() {
  if (!allowLeave()) return;
  selectedId = null;
  fillForm(freshQuestion());
  renderList();
  persist();
  form.elements.title.focus();
}

function allowLeave() {
  return !formChanged || window.confirm('这组练习的修改还未保存到题库。要放弃这些修改并继续吗？');
}

function persist() {
  if (!initialized) return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, bank, selectedId, fields: readForm(), formChanged, savedAt: new Date().toISOString() }));
  } catch {
    status('浏览器无法保存草稿。请及时保存题目并下载题库，关闭页面可能丢失本次修改。', true);
  }
}

function renderList() {
  const list = $('#question-list');
  list.replaceChildren();
  $('#bank-count').textContent = `${bank.questions.length} 组`;
  if (!bank.questions.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = '暂无正式练习。点击“新建练习组”添加。';
    list.append(p);
  }
  for (const question of [...bank.questions].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))) {
    const button = document.createElement('button');
    button.className = 'queue-item';
    button.type = 'button';
    button.setAttribute('aria-current', String(question.id === selectedId));
    const date = document.createElement('span');
    date.className = 'item-date';
    date.textContent = question.releaseDate;
    const title = document.createElement('span');
    title.className = 'item-title';
    title.textContent = question.title;
    button.append(date, title);
    button.addEventListener('click', () => {
      if (!allowLeave()) return;
      selectedId = question.id;
      fillForm(question);
      renderList();
      persist();
    });
    list.append(button);
  }
}

function showErrors(errors) {
  const node = $('#validation-errors');
  node.textContent = errors.join('\n');
  node.hidden = !errors.length;
  if (errors.length) status('练习组暂未保存，请修正下方提示。', true);
}

form.addEventListener('input', () => {
  formChanged = true;
  $('#edit-state').textContent = '有修改，等待保存';
  persist();
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const question = readForm();
  const candidate = { ...bank, questions: [...bank.questions.filter((q) => q.id !== selectedId), question].sort((a, b) => a.releaseDate.localeCompare(b.releaseDate)) };
  const errors = validateBank(candidate);
  showErrors(errors);
  if (errors.length) return;
  bank = candidate;
  selectedId = question.id;
  fillForm(question);
  renderList();
  status(`已保存“${question.title}”到本机题库。下载并上传 questions.json 后才会发布。`);
  persist();
});

$('#new-question').addEventListener('click', newQuestion);
$('#delete-question').addEventListener('click', () => {
  if (!selectedId || !window.confirm('从本机题库中删除这组练习？上传更新后的题库才会影响网站。')) return;
  bank.questions = bank.questions.filter((q) => q.id !== selectedId);
  selectedId = null;
  fillForm(freshQuestion());
  renderList();
  status('已从本机题库删除。线上题库尚未改变。');
  persist();
});

$('#preview-button').addEventListener('click', async () => {
  if (!form.reportValidity()) return;
  const question = readForm();
  const errors = validateBank({ ...bank, questions: [question] });
  showErrors(errors);
  if (errors.length) return;
  globalThis.MathJax?.typesetClear?.([$('#preview')]);
  $('#preview-title').textContent = question.title || '未填写标题';
  $('#preview-meta').textContent = [question.releaseDate, question.topic, question.difficulty, `${question.minutes || 0} 分钟`].filter(Boolean).join(' · ');
  $('#preview-statement').textContent = question.statement || '请填写题干。';
  $('#preview-hint').textContent = question.hint;
  $('#preview-hint-section').hidden = !question.hint;
  $('#preview-solution').textContent = question.solution || '请填写解答。';
  $('#preview').hidden = false;
  try { await renderMath($('#preview')); } catch { status('公式渲染暂时不可用，预览已保留原始公式文本。', true); }
  $('#preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#download-bank').addEventListener('click', () => {
  if (formChanged) {
    status('请先点击“保存到本机题库”，再下载，避免遗漏当前修改。', true);
    return;
  }
  const errors = validateBank(bank);
  if (errors.length) { showErrors(errors); return; }
  const blob = new Blob([`${JSON.stringify(bank, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'questions.json';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status(`已导出 ${bank.questions.length} 组练习。下一步：前往 GitHub 上传并替换 daily/questions.json。`);
});

$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('题库文件超过 5 MB，请检查文件是否正确。');
    const data = JSON.parse(await file.text());
    const errors = validateBank(data);
    if (data.timeZone !== 'Asia/Shanghai') errors.push('此课程使用北京时间，请将题库的 timeZone 设为 Asia/Shanghai。');
    if (errors.length) throw new Error(errors.join('\n'));
    if (!window.confirm(`文件校验通过，共 ${data.questions.length} 组练习。导入将替换当前本机题库，是否继续？`)) return;
    bank = data;
    selectedId = null;
    fillForm(freshQuestion());
    renderList();
    persist();
    status(`已导入 ${bank.questions.length} 组练习到本机。线上题库尚未改变。`);
  } catch (error) {
    status(`导入失败：${error.message}`, true);
  } finally {
    event.target.value = '';
  }
});

$('#restore-draft').addEventListener('click', () => {
  if (!availableDraft || !allowLeave()) return;
  const errors = validateBank(availableDraft.bank);
  if (errors.length) { status('本机草稿的题库结构有误，无法恢复。', true); return; }
  bank = structuredClone(availableDraft.bank);
  selectedId = bank.questions.some((q) => q.id === availableDraft.selectedId) ? availableDraft.selectedId : null;
  fillForm(availableDraft.fields || {});
  formChanged = Boolean(availableDraft.formChanged);
  $('#edit-state').textContent = formChanged ? '已恢复未保存的修改' : selectedId ? '已恢复本机练习组' : '尚未保存';
  renderList();
  $('#draft-banner').hidden = true;
  persist();
  status('已恢复本机草稿。它可能早于线上题库，导出前请核对日期和题目。');
});
$('#discard-draft').addEventListener('click', () => {
  if (!window.confirm('删除先前保存的本机草稿？当前页面的题库与线上内容不会改变。')) return;
  try { localStorage.removeItem(DRAFT_KEY); } catch { status('无法删除本机草稿。', true); return; }
  availableDraft = null;
  $('#draft-banner').hidden = true;
  status('先前的本机草稿已删除。');
});

window.addEventListener('beforeunload', (event) => {
  if (!formChanged) return;
  event.preventDefault();
  event.returnValue = '';
});

async function start() {
  const loadingControls = [...form.elements, $('#new-question'), $('#import-button'), $('#download-bank')];
  for (const control of loadingControls) control.disabled = true;
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      const draft = JSON.parse(stored);
      if (draft?.version === 1 && draft.bank && !validateBank(draft.bank).length) availableDraft = draft;
    }
  } catch { /* A malformed local draft never replaces the current online bank. */ }
  try {
    const response = await fetch('./questions.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`读取失败（${response.status}）`);
    const data = await response.json();
    const errors = validateBank(data);
    if (errors.length) throw new Error(errors.join('；'));
    bank = data;
    status(`已读取线上题库，共 ${bank.questions.length} 组正式练习。修改仅保存在本机。`);
  } catch (error) {
    status(`无法读取线上题库：${error.message}。当前为全新空题库，可导入文件或恢复本机草稿；上传前请先核对线上内容。`, true);
  }
  initialized = true;
  for (const control of loadingControls) control.disabled = false;
  fillForm(freshQuestion());
  renderList();
  if (availableDraft) {
    const when = new Date(availableDraft.savedAt);
    const label = Number.isNaN(when.getTime()) ? '先前' : when.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
    $('#draft-description').textContent = `发现 ${label}（北京时间）保存的本机草稿。当前显示线上题库，草稿尚未恢复。`;
    $('#draft-banner').hidden = false;
  }
}

start();
