export function dateKey(now = new Date(), timeZone = 'Asia/Shanghai') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {timeZone, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function formatDate(value) {
  if (!value) return '示例题';
  const [y,m,d] = value.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
}
export function validateBank(data) {
  const errors = [];
  if (!data || data.version !== 1 || !Array.isArray(data.questions)) return ['题库格式无效：需要 version: 1 和 questions 数组。'];
  if (typeof data.title !== 'string' || !data.title.trim()) errors.push('请填写课程标题。');
  if (data.timeZone !== 'Asia/Shanghai') errors.push('本课程使用北京时间，timeZone 应为 Asia/Shanghai。');
  const ids = new Set(), dates = new Set();
  data.questions.forEach((q,i) => {
    const name = `第 ${i+1} 组练习`;
    if (!q || typeof q !== 'object') {errors.push(`${name}格式无效。`);return;}
    for (const key of ['id','releaseDate','title','topic','difficulty','statement','solution']) if (typeof q[key] !== 'string' || !q[key].trim()) errors.push(`${name}的 ${key} 不能为空。`);
    if (typeof q.id === 'string' && (!/^[a-zA-Z0-9_-]{1,80}$/.test(q.id) || q.id.startsWith('demo-'))) errors.push(`${name}编号请使用字母、数字、短横线或下划线，且不以 demo- 开头。`);
    if (ids.has(q.id)) errors.push(`${name}编号重复。`); ids.add(q.id);
    if (dates.has(q.releaseDate)) errors.push(`${name}发布日期重复，每天只能安排一组练习。`); dates.add(q.releaseDate);
    const d = new Date(`${q.releaseDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(q.releaseDate) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== q.releaseDate) errors.push(`${name}发布日期无效。`);
    if (!Number.isInteger(q.minutes) || q.minutes < 1 || q.minutes > 180) errors.push(`${name}建议用时应为 1—180 的整数。`);
    if (q.hint != null && typeof q.hint !== 'string') errors.push(`${name}提示应为文字。`);
    for (const key of ['statement','hint','solution']) if (typeof q[key] === 'string' && /\\(?:href|url|style|class|cssId|htmlClass|htmlId|htmlStyle|require|def|gdef|edef|newcommand|renewcommand|let|includegraphics)\b/i.test(q[key])) errors.push(`${name}含不支持的公式命令，请使用常规数学表达。`);
  });
  return errors;
}
export function releasedQuestions(bank, today) {
  return bank.questions.filter(q => q.releaseDate <= today).sort((a,b) => b.releaseDate.localeCompare(a.releaseDate));
}
let mathQueue = Promise.resolve();
export function renderMath(element) {
  mathQueue = mathQueue.catch(() => {}).then(async () => {
    const m = globalThis.MathJax;
    if (m?.startup?.promise) await m.startup.promise;
    if (m?.typesetPromise && element.isConnected) await m.typesetPromise([element]);
  });
  return mathQueue.catch(() => {});
}
export function setMathText(element, text) {
  globalThis.MathJax?.typesetClear?.([element]);
  element.textContent = text || '';
  return renderMath(element);
}
