import {dateKey,formatDate,validateBank,releasedQuestions,setMathText} from './core.js';
const $ = id => document.getElementById(id);
const DEMO = {id:'demo-derivative',title:'连续，就一定可导吗？',topic:'导数的定义',difficulty:'基础辨析',minutes:10,releaseDate:'',statement:'设函数\n\\[f(x)=\\begin{cases}x\\sin\\frac{1}{x},&x\\ne0,\\\\0,&x=0.\\end{cases}\\]\n判断函数在 \\(x=0\\) 处是否连续、是否可导，并说明理由。',hint:'连续性考察函数值的极限；可导性考察差商的极限。试着分别写出这两个极限。',solution:'第一步：判断连续性。\n由 \\(|x\\sin(1/x)|\\le |x|\\)，利用夹逼定理可得\n\\[\\lim_{x\\to0}f(x)=0=f(0).\\]\n因此，函数在 \\(x=0\\) 处连续。\n\n第二步：按定义考察导数。\n\\[\\frac{f(h)-f(0)}{h}=\\sin\\frac{1}{h}\\qquad(h\\ne0).\\]\n取 \\(h_n=1/(\\pi/2+2n\\pi)\\) 与 \\(k_n=1/(3\\pi/2+2n\\pi)\\)，两列均趋于 0，而对应的差商分别恒为 1 和 −1，故差商极限不存在。\n\n结论：函数在 \\(x=0\\) 处连续，但不可导。连续性本身不足以保证可导性。'};
const STORAGE = 'calculus-daily-progress-v1';
let completed = new Set(), bank, today, released = [], current, demo = false;
try {const value = JSON.parse(localStorage.getItem(STORAGE) || '[]'); if (Array.isArray(value)) completed = new Set(value.filter(x => typeof x === 'string'));} catch { $('storage-note').textContent = '当前浏览器无法保存记录，本次仍可正常练习。'; }
function saveProgress() {try {localStorage.setItem(STORAGE,JSON.stringify([...completed]));} catch {$('storage-note').textContent = '记录保存失败，刷新后可能丢失。';}}
function updateProgress() {
  const done = released.filter(q=>completed.has(q.id)).length;
  $('done-count').textContent=done; $('total-count').textContent=released.length;
  $('progress').max=Math.max(1,released.length);$('progress').value=done;
}
function renderArchive() {
  const filter=$('archive-filter').value;
  const previous=released.filter(q=>q.releaseDate<today);
  const shown=previous.filter(q=>filter==='all'||(filter==='done'?completed.has(q.id):!completed.has(q.id)));
  $('archive-count').textContent=`${previous.length} 道`;
  $('archive-list').replaceChildren();
  if(!shown.length){const p=document.createElement('p');p.className='empty-archive';p.textContent=previous.length?'这个分类下暂时没有题目。':'发布后的题目会按日期留在这里，随时可以回来补做。';$('archive-list').append(p);}
  for(const q of shown){
    const b=document.createElement('button');b.className='archive-item';b.setAttribute('aria-current',String(current?.id===q.id));
    const dot=document.createElement('span');dot.className=`archive-dot${completed.has(q.id)?' done':''}`;dot.textContent=completed.has(q.id)?'✓':'';dot.setAttribute('aria-hidden','true');
    const label=document.createElement('span'),title=document.createElement('strong'),sub=document.createElement('small');title.textContent=q.title;sub.textContent=`${q.releaseDate.slice(5).replace('-','月')}日 · ${completed.has(q.id)?'已完成':'未完成'}`;
    label.append(title,sub);b.append(dot,label);b.addEventListener('click',()=>{showQuestion(q);$('question').focus();});$('archive-list').append(b);
  }
}
function showQuestion(q) {
  current=q;
  $('section-label').textContent=q.id.startsWith('demo-')?'体验一下':q.releaseDate===today?'今日题目':'往期回顾';
  $('question-count').textContent=q.id.startsWith('demo-')?'示例 · 不计入正式进度':'';
  $('question-topic').textContent=q.topic;$('question-date').textContent=formatDate(q.releaseDate);$('question-title').textContent=q.title;
  $('metadata').replaceChildren();for(const value of [q.difficulty,`建议 ${q.minutes} 分钟`]){const span=document.createElement('span');span.textContent=value;$('metadata').append(span);}
  setMathText($('statement'),q.statement);setMathText($('hint'),q.hint);
  $('hint-details').hidden=!q.hint;$('hint-details').open=false;
  $('answer-panel').hidden=true;$('answer-button').setAttribute('aria-expanded','false');$('answer-button').textContent='查看解答 ↓';
  setMathText($('solution'),'');
  $('completed').checked=completed.has(q.id);$('question-actions').hidden=false;
  $('completed-text').textContent=q.id.startsWith('demo-')?'示例完成标记不计入正式进度':'按自己的实际完成情况标记';
  $('back-today').hidden=q.releaseDate===today||demo;
  renderArchive();updateProgress();
}
function showLanding() {
  const q=released.find(x=>x.releaseDate===today);
  if(q){showQuestion(q);return;}
  if(demo){showQuestion(DEMO);return;}
  current=null;$('section-label').textContent='今日题目';$('question-count').textContent='';$('question-topic').textContent='稍作休息';$('question-date').textContent=formatDate(today);$('question-title').textContent='今天暂未安排新题';$('metadata').replaceChildren();
  const upcoming=bank.questions.filter(x=>x.releaseDate>today).sort((a,b)=>a.releaseDate.localeCompare(b.releaseDate))[0];
  setMathText($('statement'),upcoming?`下一道题将在 ${formatDate(upcoming.releaseDate)} 显示。也可以先回顾往期题目。`:'这一批题目已全部发布。你可以继续补做往期题，或等待老师安排新题。');
  $('question-actions').hidden=true;$('answer-panel').hidden=true;$('back-today').hidden=true;renderArchive();updateProgress();
}
async function loadBank() {
  const response=await fetch('./questions.json',{cache:'no-store'});if(!response.ok)throw Error('题库暂时无法读取');
  const data=await response.json(),errors=validateBank(data);if(errors.length)throw Error(errors[0]);
  bank=data;today=dateKey(new Date(),bank.timeZone);released=releasedQuestions(bank,today);demo=bank.questions.length===0;
  $('today-date').textContent=formatDate(today);$('notice').hidden=!demo;
  if(demo)$('notice').textContent='当前为试用版：下面是一道示例题，供体验做题与查看解答。正式题库尚未排期。';
  showLanding();
}
$('answer-button').addEventListener('click',()=>{
  const open=$('answer-panel').hidden;$('answer-panel').hidden=!open;$('answer-button').setAttribute('aria-expanded',String(open));$('answer-button').textContent=open?'收起解答 ↑':'查看解答 ↓';if(open&&current)setMathText($('solution'),current.solution);
});
$('completed').addEventListener('change',()=>{if(!current)return;if($('completed').checked)completed.add(current.id);else completed.delete(current.id);saveProgress();renderArchive();updateProgress();});
$('archive-filter').addEventListener('change',renderArchive);$('back-today').addEventListener('click',showLanding);
window.addEventListener('storage',event=>{if(event.key===STORAGE){try{const v=JSON.parse(event.newValue||'[]');if(Array.isArray(v)){completed=new Set(v);if(current)$('completed').checked=completed.has(current.id);renderArchive();updateProgress();}}catch{}}});
async function refreshDate(){if(bank&&dateKey(new Date(),bank.timeZone)!==today){try{await loadBank();}catch{$('notice').hidden=false;$('notice').textContent='日期已经更新，但题库刷新失败。请联网后刷新页面。';}}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDate();});setInterval(refreshDate,30000);
loadBank().catch(()=>{$('question-title').textContent='题目暂时加载失败';$('statement').textContent='请检查网络后刷新页面。若问题持续，请联系老师检查题库。';$('notice').hidden=false;$('notice').textContent='暂时无法读取题库，未显示任何正式题目。';});
