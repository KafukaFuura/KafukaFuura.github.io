import {dateKey,formatDate,validateBank,releasedQuestions,setMathText} from './core.js?v=20261113-3';
const $ = id => document.getElementById(id);
const DEMO = {"id":"demo-mvt-increment","title":"中值定理与增量极限","topic":"拉格朗日中值定理","difficulty":"基础应用","minutes":8,"releaseDate":"","statement":"设函数 \\(f\\) 在 \\((0,+\\infty)\\) 上可导，且\n\\[\\lim_{x\\to+\\infty}f^{\\prime}(x)=3.\\]\n求极限 \\(\\displaystyle\\lim_{x\\to+\\infty}[f(x+2)-f(x)]\\)，并说明理由。\n\n来源：根据第五次习题课第4.5节“固定步长增量”改编。","hint":"在区间 \\([x,x+2]\\) 上使用拉格朗日中值定理，说明定理中间点在 \\(x\\to+\\infty\\) 时的趋向。","solution":"对任意 \\(x>0\\)，函数 \\(f\\) 在 \\([x,x+2]\\) 上连续，在 \\((x,x+2)\\) 内可导。由拉格朗日中值定理，存在 \\(\\xi_x\\in(x,x+2)\\)，使得\n\\[f(x+2)-f(x)=2f^{\\prime}(\\xi_x).\\]\n因为 \\(x<\\xi_x<x+2\\)，当 \\(x\\to+\\infty\\) 时，\\(\\xi_x\\to+\\infty\\)。由题设，\\(f^{\\prime}(\\xi_x)\\to3\\)，因此\n\\[\\lim_{x\\to+\\infty}[f(x+2)-f(x)]=2\\times3=6.\\]\n\n这里直接处理差值。题设没有给出 \\(f(x)\\) 的有限极限，不能把原式拆成两个函数极限相减。"};
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
  $('archive-count').textContent=`${previous.length} 组`;
  $('archive-list').replaceChildren();
  if(!shown.length){const p=document.createElement('p');p.className='empty-archive';p.textContent=previous.length?'该分类暂无练习。':'往期练习按发布日期排列。';$('archive-list').append(p);}
  for(const q of shown){
    const b=document.createElement('button');b.className='archive-item';b.setAttribute('aria-current',String(current?.id===q.id));
    const dot=document.createElement('span');dot.className=`archive-dot${completed.has(q.id)?' done':''}`;dot.textContent=completed.has(q.id)?'✓':'';dot.setAttribute('aria-hidden','true');
    const label=document.createElement('span'),title=document.createElement('strong'),sub=document.createElement('small');title.textContent=q.title;sub.textContent=`${q.releaseDate.slice(5).replace('-','月')}日 · ${completed.has(q.id)?'已完成':'未完成'}`;
    label.append(title,sub);b.append(dot,label);b.addEventListener('click',()=>{showQuestion(q);$('question').focus();});$('archive-list').append(b);
  }
}
function showQuestion(q) {
  current=q;
  $('section-label').textContent=q.id.startsWith('demo-')?'示例练习':q.releaseDate===today?'今日练习':'往期练习';
  $('question-count').textContent=q.id.startsWith('demo-')?'示例 · 不计入正式进度':'';
  $('question-topic').textContent=q.topic;$('question-date').textContent=formatDate(q.releaseDate);$('question-title').textContent=q.title;
  $('metadata').replaceChildren();for(const value of [q.difficulty,`本组建议 ${q.minutes} 分钟`]){const span=document.createElement('span');span.textContent=value;$('metadata').append(span);}
  setMathText($('statement'),q.statement);setMathText($('hint'),q.hint);
  $('hint-details').hidden=!q.hint;$('hint-details').open=false;
  $('answer-panel').hidden=true;$('answer-button').setAttribute('aria-expanded','false');$('answer-button').textContent='查看解答 ↓';
  setMathText($('solution'),'');
  $('completed').checked=completed.has(q.id);$('question-actions').hidden=false;
  $('completed-text').textContent=q.id.startsWith('demo-')?'示例完成标记不计入正式进度':'完成整组练习后勾选';
  $('back-today').hidden=q.releaseDate===today||demo;
  renderArchive();updateProgress();
}
function showLanding() {
  const q=released.find(x=>x.releaseDate===today);
  if(q){showQuestion(q);return;}
  if(demo){showQuestion(DEMO);return;}
  current=null;$('section-label').textContent='今日练习';$('question-count').textContent='';$('question-topic').textContent='发布安排';$('question-date').textContent=formatDate(today);$('question-title').textContent='今天暂未安排练习';$('metadata').replaceChildren();
  const upcoming=bank.questions.filter(x=>x.releaseDate>today).sort((a,b)=>a.releaseDate.localeCompare(b.releaseDate))[0];
  setMathText($('statement'),upcoming?`下一组练习的发布日期：${formatDate(upcoming.releaseDate)}。往期练习仍可查看。`:'当前题库已全部发布，往期练习仍可查看。');
  $('question-actions').hidden=true;$('answer-panel').hidden=true;$('back-today').hidden=true;renderArchive();updateProgress();
}
async function loadBank() {
  const response=await fetch('./questions.json',{cache:'no-store'});if(!response.ok)throw Error('题库暂时无法读取');
  const data=await response.json(),errors=validateBank(data);if(errors.length)throw Error(errors[0]);
  bank=data;today=dateKey(new Date(),bank.timeZone);released=releasedQuestions(bank,today);demo=bank.questions.length===0;
  $('today-date').textContent=formatDate(today);$('notice').hidden=!demo;
  if(demo)$('notice').textContent='当前显示示例练习。正式题库尚未排期。';
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
