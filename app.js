import {SUBJECT_IDS,STORAGE_KEY,todayShanghai,validHours,createState,subjectProgress,dayProgress,allProgress,allocationFor,normalizeState} from './model.js';

const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const icons={
 daily:'M5 4h14v16H5z M8 8h8 M8 12h3 M8 16h3 M14 12l1 1 2-2',
 calendar:'M5 5h14v15H5z M8 3v4 M16 3v4 M5 10h14 M9 14h1 M14 14h1 M9 17h1',
 stats:'M4 20h16 M7 16V9 M12 16V4 M17 16v-5',
 methods:'M4 5c3-1 5-1 8 1 3-2 5-2 8-1v14c-3-1-5-1-8 1-3-2-5-2-8-1z M12 6v14',
 pharm:'m8 5 11 11a4 4 0 0 1-6 6L2 11a4 4 0 0 1 6-6 M7 16l6-6',
 analysis:'M9 3h6 M10 3v7L4 20h16l-6-10V3 M7 15h10',
 organic:'m12 3 8 5v8l-8 5-8-5V8z M8 10v4 M12 7l4 2 M12 17l4-2',
 english:'M4 5h16v14H4z M7 15l3-7 3 7 M8 13h4 M16 8v7',
 politics:'M5 4h14v16H5z M8 8h8 M8 12h8 M8 16h5',
 plus:'M12 5v14 M5 12h14',check:'m5 12 4 4L19 6',left:'m14 5-7 7 7 7',right:'m9 5 7 7-7 7',edit:'m5 16-1 4 4-1L19 8l-3-3z M14 7l3 3',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',arrow:'M5 12h14 m-6-6 6 6-6 6',download:'M12 3v12 m-4-4 4 4 4-4 M5 16v5h14v-5'};
const icon=(name,extra='')=>`<span class="icon ${extra}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${icons[name]||icons.daily}"/></svg></span>`;
const subjectsStyle={pharm:{accent:'#5578a4',soft:'#eef3fa'},analysis:{accent:'#438f84',soft:'#eaf6f1'},organic:{accent:'#a38754',soft:'#faf3e5'},english:{accent:'#8872a8',soft:'#f2eef8'},politics:{accent:'#b97f6c',soft:'#fbf0eb'}};
const tabs=[['daily','每日计划'],['calendar','全部日程'],['stats','学习统计'],['methods','复习方法']];
const formatHours=value=>value===null?'—':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(value);
const monthDay=date=>`${Number(date.slice(5,7))}月${Number(date.slice(8,10))}日`;
const shortDate=date=>`${Number(date.slice(5,7))}/${Number(date.slice(8,10))}`;
const weekday=date=>new Intl.DateTimeFormat('zh-CN',{weekday:'long',timeZone:'Asia/Shanghai'}).format(new Date(`${date}T12:00:00+08:00`));
const dayDelta=(a,b)=>Math.round((Date.parse(`${a}T12:00:00+08:00`)-Date.parse(`${b}T12:00:00+08:00`))/86400000);
let data,state,selectedWeek=0,phaseFilter='all',editing=null,pendingImport=null,toastTimer,undoAction=null,storageAvailable=true,recoveryRaw=null;

async function init(){
 try{
  const response=await fetch('./plan-data.json');if(!response.ok)throw new Error('计划数据暂时无法读取，请刷新重试。');
  data=await response.json();state=createState(data);
  let saved=null;
  try{saved=localStorage.getItem(STORAGE_KEY);if(saved)state=normalizeState(JSON.parse(saved),data);}catch(error){storageAvailable=false;recoveryRaw=saved;showToast(saved?'原记录已保留，自动保存已暂停。请打开「备份」下载原始记录。':'浏览器存储不可用，请用导出备份保存进度。');}
  const hash=location.hash.slice(1);if(tabs.some(([id])=>id===hash))state.tab=hash;
  selectedWeek=Math.floor(data.days.findIndex(day=>day.date===state.selectedDate)/7);
  $('#task-subject').innerHTML=data.subjects.map(subject=>`<option value="${subject.id}">${esc(subject.label)}</option>`).join('');
  render();bindEvents();
 }catch(error){$('#main').innerHTML=`<section class="panel"><h1>暂时无法加载</h1><p>${esc(error.message)}</p><button class="btn btn-primary" onclick="location.reload()">重新加载</button></section>`;}
}
function save(){
 state.updatedAt=new Date().toISOString();
 if(recoveryRaw!==null){$('#save-status').textContent='原记录已保护';return false;}
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;$('#save-status').textContent='已自动保存';return true;}
 catch{storageAvailable=false;$('#save-status').textContent='未能保存';showToast('浏览器存储不可用，请先导出备份，关闭页面会丢失未保存记录。');return false;}
}
function render(){
 renderSidebar();renderMain();
 $('#page-title').textContent=tabs.find(([id])=>id===state.tab)?.[1]??'每日计划';
 if(!storageAvailable)$('#save-status').textContent=recoveryRaw!==null?'原记录已保护':'请备份记录';
 $('#storage-warning').hidden=recoveryRaw===null;
 $('#recovery-record').hidden=recoveryRaw===null;
 history.replaceState(null,'',`#${state.tab}`);
}
function renderSidebar(){
 $('#main-nav').innerHTML=tabs.map(([id,label])=>`<button class="nav-item ${state.tab===id?'active':''}" data-action="tab" data-tab="${id}" ${state.tab===id?'aria-current="page"':''}>${icon(id)}<span>${label}</span>${id==='daily'?'<small>58</small>':''}</button>`).join('');
 const totals=allProgress(data,state),daysLeft=dayDelta(data.meta.examDates[0],todayShanghai());
 $('#side-progress').innerHTML=`<div class="side-progress-label">${daysLeft>=0?'距离初试':'初试日期'}</div><div class="side-count">${daysLeft>=0?daysLeft:'12.19'}<span>${daysLeft>=0?'天':'—12.20'}</span></div><p>12月19—20日 · 华科药学</p><div class="mini-progress"><span style="width:${totals.completedDays/58*100}%"></span></div><small>已完成 ${totals.completedDays} / 58 天计划</small>`;
}
function renderMain(){
 const main=$('#main');
 if(state.tab==='daily')main.innerHTML=renderDaily();
 if(state.tab==='calendar')main.innerHTML=renderCalendar();
 if(state.tab==='stats')main.innerHTML=renderStats();
 if(state.tab==='methods')main.innerHTML=renderMethods();
}
function renderDaily(){
 const day=data.days.find(item=>item.date===state.selectedDate),record=state.days[day.date],progress=dayProgress(record),allocation=allocationFor(day);
 const index=day.day-1,phase=data.phases.find(item=>item.id===day.phaseId),start=Math.floor(index/7)*7,week=data.days.slice(start,start+7);
 const professionalMock=day.events.find(event=>event.type==='professional_mock');
 const events=day.events.map(event=>`<span class="pill event-pill">${esc(event.label)}</span>`).join('');
 return `<section class="day-hero"><div class="hero-main"><span class="eyebrow">DAY ${String(day.day).padStart(2,'0')} <span>/ 58 天</span></span><h1>${monthDay(day.date)}<span class="weekday">${weekday(day.date)}</span></h1><p>${esc(phase.name)}<span class="hero-divider">·</span>${shortDate(phase.start)} — ${shortDate(phase.end)}</p><div class="hero-meta"><span class="pill">${icon(clockName())}计划 ${day.plannedHours} 小时</span>${events}<span class="hero-task-count">${progress.done} / ${progress.total} 项任务已完成</span></div></div><div class="hero-progress"><div class="progress-ring" style="--progress:${progress.subjects/5*360}deg"><div><strong>${progress.subjects}<span>/5</span></strong><small>科目已完成</small></div></div></div></section>
 <div class="day-toolbar"><div class="date-nav"><button class="btn-icon" data-action="previous-day" aria-label="前一天" ${index===0?'disabled':''}>${icon('left')}</button><label class="sr-only" for="date-picker">选择日期</label><input type="date" id="date-picker" min="${data.meta.startDate}" max="${data.meta.endDate}" value="${day.date}"><button class="btn-icon" data-action="next-day" aria-label="后一天" ${index===57?'disabled':''}>${icon('right')}</button><button class="btn btn-secondary btn-small" data-action="today">回到今天</button></div><button class="text-button" data-action="tab" data-tab="calendar">查看全部日程 ${icon('arrow')}</button></div>
 <div class="week-strip" aria-label="日期导航">${week.map(item=>{const p=dayProgress(state.days[item.date]);return `<button class="day-chip ${item.date===day.date?'active':''} ${item.date===todayShanghai()?'today':''} ${p.complete?'completed':''}" data-action="select-day" data-date="${item.date}" ${item.date===day.date?'aria-current="date"':''} aria-label="${monthDay(item.date)} ${p.subjects}科完成"><span>${weekday(item.date).replace('星期','周')}</span><strong class="day-number">${Number(item.date.slice(8))}</strong><span class="day-progress">${item.date===todayShanghai()?'今天':p.complete?'已完成':item.events.some(e=>e.type.endsWith('_mock'))?'模拟日':item.events.some(e=>e.type==='catchup')?'补漏日':item.events.length?'阶段验收':`${p.subjects}/5科`}</span></button>`;}).join('')}</div>
 ${professionalMock?`<div class="shared-notice">${icon('clock')}<div><strong>今天三科合卷，共用5.5小时</strong><p>药理＋分析＋有机：连续考试3小时，随后三科合计订正2.5小时。下方三科卡片分列考试与复盘任务，不另加常规题量。</p></div></div>`:''}
 <div class="daily-grid"><section class="tasks-area"><div class="section-heading"><h2>今日任务 <small>${progress.done}/${progress.total}</small></h2><button class="btn btn-primary btn-small" data-action="add">${icon('plus')}添加任务</button></div><div class="task-grid">${data.subjects.map(subject=>renderSubject(day,subject,allocation,!!professionalMock)).join('')}</div></section>
 <aside class="daily-aside"><section class="hours-card"><div class="section-heading"><h3>学习时间</h3>${icon('clock')}</div><div class="hours-display"><strong>${day.plannedHours}</strong><span>小时 / 今日计划</span></div><div class="allocation-list"><div><span>专业课（三科合计）</span><strong>${formatHours(allocation.professional)} h</strong></div><div><span>英语</span><strong>${formatHours(allocation.english)} h</strong></div><div><span>政治</span><strong>${formatHours(allocation.politics)} h</strong></div></div>${allocation.professional===5.5&&!professionalMock?'<p class="field-help">专业课各1.5小时，另1小时补当周弱项。</p>':''}<label class="field-label" for="actual-hours">今天实际学了多久？</label><div class="hours-input-row"><input class="input" type="number" min="0" max="24" step="0.25" inputmode="decimal" id="actual-hours" placeholder="填写时长" value="${record.actualHours===null?'':record.actualHours}" aria-describedby="hours-help"><span>小时</span></div><p class="field-help" id="hours-help">空白表示未记录，0表示当天学习0小时。</p><label class="field-label" for="daily-note">今日小记</label><textarea class="input note-input" id="daily-note" rows="3" maxlength="3000" placeholder="记一个错因，或明天要先补的内容">${esc(record.note)}</textarea></section>
 <section class="phase-card"><h3>五阶段安排</h3><div class="phase-list">${data.phases.map((item,i)=>`<button class="phase-item ${item.id===day.phaseId?'active':''} ${item.end<day.date?'done':''}" data-action="select-day" data-date="${item.start}"><span class="phase-dot">${i+1}</span><span class="phase-copy"><strong>${esc(item.name)}</strong><small>${shortDate(item.start)} — ${shortDate(item.end)}</small></span>${item.id===day.phaseId?'<small class="phase-current">当前</small>':''}</button>`).join('')}</div></section></aside></div>`;
}
function clockName(){return 'clock';}
function renderSubject(day,subject,allocation,isMock){
 const tasks=state.days[day.date].subjects[subject.id],p=subjectProgress(tasks),style=subjectsStyle[subject.id],source=day.subjects[subject.id];
 let budget=subject.id==='english'?`${formatHours(allocation.english)} h`:subject.id==='politics'?`${formatHours(allocation.politics)} h`:isMock?'共用模拟时段':allocation.professional===6?'2 h':`专业课共 ${formatHours(allocation.professional)} h`;
 return `<article class="subject-card" style="--accent:${style.accent};--soft:${style.soft}"><div class="subject-head"><span class="subject-icon">${icon(subject.id)}</span><div class="subject-title"><h3>${subject.label}</h3><span class="subject-meta">${budget}<span>·</span>${p.complete?'已完成':p.partial?'进行中':'待完成'}</span></div><div class="subject-actions"><button class="btn-icon complete-subject ${p.complete?'is-complete':''}" data-action="complete-subject" data-subject="${subject.id}" aria-label="${p.complete?'取消':'全部完成'}${subject.label}" title="${p.complete?'取消全选':'全部完成'}" ${!tasks.length?'disabled':''}>${icon('check')}</button></div></div><ul class="task-list">${tasks.length?tasks.map(task=>`<li class="task-row ${task.done?'completed':''}"><input class="checkbox" type="checkbox" id="task-${esc(task.id)}" data-task-id="${esc(task.id)}" data-subject="${subject.id}" ${task.done?'checked':''}><label class="task-label" for="task-${esc(task.id)}">${esc(task.text)}</label><button class="task-edit" data-action="edit" data-subject="${subject.id}" data-task-id="${esc(task.id)}" aria-label="编辑：${esc(task.text)}">${icon('edit')}</button></li>`).join(''):'<li class="empty-note">暂无任务，可以添加自己的安排。</li>'}</ul>${source.notes.length?`<p class="task-note">${source.notes.map(esc).join('；')}</p>`:''}<div class="subject-foot"><button class="add-inline" data-action="add" data-subject="${subject.id}">${icon('plus')}添加任务</button><details class="original-plan"><summary>原始安排</summary><p>${esc(source.raw)}</p></details></div></article>`;
}
function renderCalendar(){
 const selected=data.phases.find(item=>item.id===phaseFilter),visibleDates=new Set(data.days.filter(day=>!selected||day.phaseId===selected.id).map(day=>day.date));
 return `<div class="page-heading"><span class="eyebrow">YOUR STUDY ROADMAP</span><h1>全部日程</h1><p>58天，五个阶段。点选日期，查看并修改当天任务。</p></div><div class="phase-tabs" aria-label="按阶段筛选"><button class="filter-chip ${phaseFilter==='all'?'active':''}" data-action="filter-phase" data-phase="all">全部58天</button>${data.phases.map(phase=>`<button class="filter-chip ${phaseFilter===phase.id?'active':''}" data-action="filter-phase" data-phase="${phase.id}">${esc(phase.name)}</button>`).join('')}</div><div class="calendar-grid">${[10,11,12].map(month=>{
 const first=new Date(Date.UTC(2026,month-1,1)),offset=(first.getUTCDay()+6)%7,length=new Date(Date.UTC(2026,month,0)).getUTCDate();
 return `<section class="month-card"><h2 class="month-title">${month}月 <span>2026</span></h2><div class="calendar-weekdays">${['一','二','三','四','五','六','日'].map(label=>`<span>${label}</span>`).join('')}</div><div class="calendar-days">${'<span class="calendar-empty"></span>'.repeat(offset)}${Array.from({length},(_,i)=>{const date=`2026-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`,day=data.days.find(item=>item.date===date);if(!day)return `<span class="calendar-day outside">${i+1}</span>`;const p=dayProgress(state.days[date]);return `<button class="calendar-day ${date===state.selectedDate?'active':''} ${p.complete?'complete':p.done?'partly':''}" data-action="select-day" data-date="${date}" ${visibleDates.has(date)?'':'disabled'} aria-label="${monthDay(date)}，${p.subjects}科完成${day.events.length?'，'+day.events.map(e=>e.label).join('、'):''}"><span>${i+1}</span>${day.events.some(e=>e.type.endsWith('_mock'))?'<i class="event-dot" aria-hidden="true"></i>':''}</button>`;}).join('')}</div></section>`;
 }).join('')}</div><div class="chart-legend calendar-legend"><span><i class="legend-complete"></i>五科完成</span><span><i class="legend-partly"></i>部分任务完成</span><span><i class="legend-event"></i>整卷模拟</span></div><section class="phase-overview">${data.phases.filter(item=>!selected||item.id===selected.id).map((phase)=>`<article class="phase-overview-card"><span class="phase-index">${phase.id.split('-')[1].padStart(2,'0')}</span><div class="phase-detail"><h2>${esc(phase.name)}<span>${shortDate(phase.start)} — ${shortDate(phase.end)} · ${phase.days}天</span></h2><p>${esc(phase.goal)}</p></div><button class="phase-link btn-icon" data-action="select-day" data-date="${phase.start}" aria-label="进入${esc(phase.name)}">${icon('arrow')}</button></article>`).join('')}</section>`;
}
function renderStats(){
 const total=allProgress(data,state),week=data.weeks[selectedWeek],weekDays=data.days.filter(day=>day.date>=week.start&&day.date<=week.end),weekRecord=state.weeks[week.id];
 const maxHours=Math.max(12,...weekDays.map(day=>state.days[day.date].actualHours??0)),actualCount=weekDays.filter(day=>state.days[day.date].actualHours!==null).length;
 const weekHours=weekDays.reduce((sum,day)=>sum+(state.days[day.date].actualHours??0),0);
 return `<div class="page-heading"><span class="eyebrow">SMALL STEPS, EVERY DAY</span><h1>学习统计</h1><p>任务完成和知识掌握分开记录，每周据此调整。</p></div><div class="stat-grid"><article class="stat-card"><span class="stat-label">已完成天数</span><strong class="stat-number">${total.completedDays}<small>/ 58</small></strong><p>当天五科任务全部完成</p></article><article class="stat-card"><span class="stat-label">累计学习时间</span><strong class="stat-number">${formatHours(total.actualHours)}<small>小时</small></strong><p>已填写 ${total.recordedDays} 天实际时长</p></article><article class="stat-card"><span class="stat-label">完成任务</span><strong class="stat-number">${total.doneTasks}<small>/ ${total.totalTasks}</small></strong><p>包括自己添加的任务</p></article><article class="stat-card"><span class="stat-label">完成科目</span><strong class="stat-number">${total.completedSubjects}<small>/ 290</small></strong><p>每天五科，独立计算</p></article></div>
 <div class="stats-grid"><section class="panel"><div class="section-heading"><div><h2>每周学习时长</h2><p class="muted">${shortDate(week.start)} — ${shortDate(week.end)} · 已记录 ${actualCount} 天，共 ${formatHours(weekHours)} 小时</p></div><div class="date-nav"><button class="btn-icon" data-action="previous-week" aria-label="上一周" ${selectedWeek===0?'disabled':''}>${icon('left')}</button><span>第 ${selectedWeek+1} 周</span><button class="btn-icon" data-action="next-week" aria-label="下一周" ${selectedWeek===data.weeks.length-1?'disabled':''}>${icon('right')}</button></div></div><div class="bar-chart" role="img" aria-label="本周计划与实际时长，${actualCount}天已记录"><span class="chart-axis">小时</span>${weekDays.map(day=>{const actual=state.days[day.date].actualHours;return `<div class="bar-column"><span class="bar-value">${formatHours(actual)}</span><div class="bar-pair"><span class="bar planned" style="height:${day.plannedHours/maxHours*100}%" title="计划${day.plannedHours}小时"></span><span class="bar actual" style="height:${(actual??0)/maxHours*100}%" title="${actual===null?'尚未记录':`实际${actual}小时`}"></span></div><span class="bar-label">${shortDate(day.date)}</span></div>`;}).join('')}</div><div class="chart-legend"><span><i class="legend-planned"></i>计划</span><span><i class="legend-actual"></i>实际</span><span>— 尚未记录，0 表示0小时</span></div></section>
 <section class="panel"><h2>各科完成情况</h2><p class="muted">按当天该科全部任务完成计算</p>${data.subjects.map(subject=>{const count=data.days.filter(day=>subjectProgress(state.days[day.date].subjects[subject.id]).complete).length;return `<div class="subject-stat"><div><span>${subject.label}</span><strong>${count} / 58 天</strong></div><div class="stat-bar"><span style="width:${count/58*100}%;background:${subjectsStyle[subject.id].accent}"></span></div></div>`;}).join('')}</section></div>
 <section class="panel heatmap-panel"><div class="section-heading"><h2>58天任务记录</h2><span class="muted">颜色越深，完成科目越多</span></div><div class="heatmap">${data.days.map(day=>{const p=dayProgress(state.days[day.date]);return `<button class="heat-cell" data-level="${p.subjects}" data-action="select-day" data-date="${day.date}" aria-label="${monthDay(day.date)}，完成${p.subjects}科" title="${monthDay(day.date)} · ${p.subjects}/5科">${day.day}</button>`;}).join('')}</div><p class="field-help">数字为计划第几天；任务打卡不代表考试得分。</p></section>
 <section class="panel review-panel"><div class="section-heading"><div><h2>第 ${selectedWeek+1} 周复盘</h2><p class="muted">${shortDate(week.start)} — ${shortDate(week.end)} · 填写同口径练习的正确率或得分率</p></div><span class="pill">选填</span></div><form id="week-form" data-week="${week.id}"><div class="review-grid">${data.subjects.map(subject=>`<label for="accuracy-${subject.id}">${subject.label}<span class="percentage-input"><input class="input" type="number" min="0" max="100" step="0.1" inputmode="decimal" id="accuracy-${subject.id}" name="${subject.id}" value="${weekRecord.accuracy[subject.id]??''}" placeholder="未记录"><span>%</span></span></label>`).join('')}</div><label class="field-label" for="week-adjustment">下一周调整</label><textarea class="input" id="week-adjustment" name="adjustment" rows="3" maxlength="3000" placeholder="哪类题反复出错？下周先补什么？">${esc(weekRecord.adjustment)}</textarea><div class="review-footer"><p class="field-help">基础抽测连续两次低于约70%时，优先补基础并调整时间。这个阈值用于安排复习。</p><button class="btn btn-primary" type="submit">保存周复盘</button></div></form></section>`;
}
function renderMethods(){
 const visibleMethods=data.methods.filter(method=>method.title!=='填写方法');
 return `<div class="page-heading"><span class="eyebrow">A PLAN YOU CAN ADJUST</span><h1>复习方法</h1><p>按现行大纲推进。题量可以调整，订正和闭卷回忆留在每日安排里。</p></div><section class="method-grid">${data.subjectMethods.map(method=>`<article class="method-card" style="--accent:${subjectsStyle[method.subjectId].accent};--soft:${subjectsStyle[method.subjectId].soft}"><div class="method-kicker">${icon(method.subjectId)}${esc(method.label)}</div><h2>${esc(method.practice)}</h2><p>${esc(method.notes)}</p><div class="method-output"><span>闭卷输出</span><strong>${esc(method.output)}</strong></div><small>${esc(method.materials)}</small></article>`).join('')}</section><section class="method-section panel"><h2>执行与调整</h2><div class="guidance-list">${visibleMethods.map(method=>`<details><summary>${esc(method.title)}</summary><p>${esc(method.text)}</p></details>`).join('')}</div></section><section class="method-section panel"><h2>计划来源与考试信息</h2><p class="muted">由《华科药学_58天冲刺计划与打卡》整理。具体考试安排以本人准考证为准。</p><div class="source-links">${data.sources.map(source=>`<div><strong>${esc(source.title)}</strong><p>${esc(source.text.split('\n')[0])}</p>${source.urls.filter(url=>/^https:\/\//.test(url)).map(url=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">查看官方信息 ${icon('arrow')}</a>`).join('')}</div>`).join('')}</div><p class="field-help">专业课专题编号用于分配剩余内容，可在每日任务中改成实际章节名。</p></section>`;
}
function chooseDate(date){
 if(!Object.hasOwn(state.days,date))return;state.selectedDate=date;state.tab='daily';save();render();closeSidebar();window.scrollTo({top:0,behavior:'instant'});
}
function navigateTab(tab){if(!tabs.some(([id])=>id===tab))return;state.tab=tab;save();render();closeSidebar();window.scrollTo({top:0,behavior:'instant'});}
function closeSidebar(){document.body.classList.remove('sidebar-open');$('#sidebar-overlay').classList.remove('show');$('.mobile-menu').setAttribute('aria-expanded','false');}
function openTask(subject='pharm',taskId=null){
 editing={date:state.selectedDate,subject,taskId};const task=taskId?state.days[editing.date].subjects[subject].find(item=>item.id===taskId):null;
 $('#task-dialog-title').textContent=task?'编辑任务':'添加任务';$('#task-dialog-date').textContent=`${monthDay(editing.date)} · ${weekday(editing.date)}`;$('#task-subject').value=subject;$('#task-subject').disabled=!!task;$('#task-text').value=task?.text??'';$('#delete-task').hidden=!task;$('#task-dialog').showModal();setTimeout(()=>$('#task-text').focus(),40);
}
function showToast(message,undo=null){
 clearTimeout(toastTimer);undoAction=undo;const toast=$('#toast');toast.textContent=message;
 if(undo){const button=document.createElement('button');button.textContent='撤销';button.dataset.action='undo';toast.append(button);}
 toast.classList.add('show');toastTimer=setTimeout(()=>{toast.classList.remove('show');undoAction=null;},undo?8000:4200);
}
function refreshAfterTask(focusId){const y=window.scrollY;save();render();window.scrollTo({top:y,behavior:'instant'});if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});}
function downloadText(text,name,type='application/json'){
 const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportState(){
 downloadText(JSON.stringify({...state,exportedAt:new Date().toISOString()},null,2),`华科药学_学习备份_${todayShanghai()}.json`);showToast('备份已导出，换设备时可导入恢复。');
}
function bindEvents(){
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
  const {action}=button.dataset;
  if(action==='tab')navigateTab(button.dataset.tab);
  if(action==='select-day')chooseDate(button.dataset.date);
  if(action==='today'){const current=todayShanghai();chooseDate(current<data.meta.startDate?data.meta.startDate:current>data.meta.endDate?data.meta.endDate:current);}
  if(action==='previous-day'||action==='next-day'){const index=data.days.findIndex(day=>day.date===state.selectedDate)+(action==='next-day'?1:-1);if(data.days[index])chooseDate(data.days[index].date);}
  if(action==='menu'){const expanded=document.body.classList.toggle('sidebar-open');$('#sidebar-overlay').classList.toggle('show',expanded);$('.mobile-menu').setAttribute('aria-expanded',String(expanded));}
  if(action==='close-sidebar')closeSidebar();
  if(action==='filter-phase'){phaseFilter=button.dataset.phase;renderMain();}
  if(action==='previous-week'||action==='next-week'){selectedWeek+=action==='next-week'?1:-1;selectedWeek=Math.max(0,Math.min(data.weeks.length-1,selectedWeek));renderMain();}
  if(action==='add')openTask(button.dataset.subject??'pharm');
  if(action==='edit')openTask(button.dataset.subject,button.dataset.taskId);
  if(action==='close-task')$('#task-dialog').close();
  if(action==='complete-subject'){const tasks=state.days[state.selectedDate].subjects[button.dataset.subject],done=!subjectProgress(tasks).complete;tasks.forEach(task=>task.done=done);refreshAfterTask();showToast(done?'该科任务已完成。':'已取消该科全选。');}
  if(action==='delete-task'&&editing){const {date,subject,taskId}=editing,tasks=state.days[date].subjects[subject],index=tasks.findIndex(task=>task.id===taskId);if(index<0)return;const [removed]=tasks.splice(index,1);$('#task-dialog').close();refreshAfterTask();showToast('任务已删除。',()=>{state.days[date].subjects[subject].splice(Math.min(index,state.days[date].subjects[subject].length),0,removed);refreshAfterTask();showToast('任务已恢复。');});}
  if(action==='undo'&&undoAction){const undo=undoAction;undoAction=null;undo();}
  if(action==='backup')$('#backup-dialog').showModal();
  if(action==='close-backup')$('#backup-dialog').close();
  if(action==='export')exportState();
  if(action==='export-recovery'&&recoveryRaw!==null){downloadText(recoveryRaw,`华科药学_原始记录_${todayShanghai()}.txt`,'text/plain');showToast('原始记录已导出，内容保持原样。');}
  if(action==='import')$('#import-file').click();
  if(action==='cancel-import'){pendingImport=null;$('#import-dialog').close();}
  if(action==='confirm-import'&&pendingImport){state=pendingImport;pendingImport=null;recoveryRaw=null;selectedWeek=Math.floor(data.days.findIndex(day=>day.date===state.selectedDate)/7);$('#import-dialog').close();$('#backup-dialog').close();const stored=save();render();showToast(stored?'备份已恢复。':'备份已载入，但浏览器未能保存；关闭前请导出当前记录。');}
 });
 document.addEventListener('change',event=>{
  const element=event.target;
  if(element.id==='date-picker')chooseDate(element.value);
  if(element.matches('input[data-task-id]')){const task=state.days[state.selectedDate].subjects[element.dataset.subject].find(item=>item.id===element.dataset.taskId);if(task){task.done=element.checked;refreshAfterTask(element.id);}}
  if(element.id==='actual-hours'){try{state.days[state.selectedDate].actualHours=validHours(element.value);element.setCustomValidity('');save();renderSidebar();showToast('学习时长已保存。');}catch(error){element.setCustomValidity(error.message);element.reportValidity();}}
 });
 document.addEventListener('input',event=>{if(event.target.id==='daily-note'){state.days[state.selectedDate].note=event.target.value;save();}if(event.target.id==='actual-hours'){event.target.setCustomValidity('');if(!event.target.validity.badInput){try{state.days[state.selectedDate].actualHours=validHours(event.target.value);save();}catch{}}}});
 document.addEventListener('submit',event=>{
  if(event.target.id==='task-form'){event.preventDefault();const text=$('#task-text').value.trim();if(!text){$('#task-text').setCustomValidity('请填写任务内容。');$('#task-text').reportValidity();return;}$('#task-text').setCustomValidity('');const subject=$('#task-subject').value,tasks=state.days[editing.date].subjects[subject];if(editing.taskId){const task=tasks.find(item=>item.id===editing.taskId);if(task)task.text=text;}else{if(tasks.length>=100){showToast('同科每天最多100个任务。');return;}tasks.push({id:`custom-${globalThis.crypto?.randomUUID?.()??`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`}`,text,done:false});}$('#task-dialog').close();refreshAfterTask();showToast(editing.taskId?'任务已修改。':'任务已添加。');}
  if(event.target.id==='week-form'){event.preventDefault();const form=event.target,week=state.weeks[form.dataset.week];for(const subject of SUBJECT_IDS){const value=form.elements[subject].value;week.accuracy[subject]=value===''?null:Number(value);}week.adjustment=form.elements.adjustment.value;save();showToast('本周复盘已保存。');}
 });
 $('#task-text').addEventListener('input',()=>$('#task-text').setCustomValidity(''));
 $('#import-file').addEventListener('change',async event=>{
  const file=event.target.files[0];event.target.value='';if(!file)return;
  try{if(file.size>2*1024*1024)throw new Error('备份文件不能超过2MB。');const incoming=JSON.parse(await file.text());pendingImport=normalizeState(incoming,data);const total=allProgress(data,pendingImport);$('#import-description').textContent=`这份备份包含 ${total.doneTasks} 项已完成任务、${total.recordedDays} 天时长记录，共 ${formatHours(total.actualHours)} 小时。`;$('#import-dialog').showModal();}catch(error){pendingImport=null;showToast(error instanceof SyntaxError?'文件不是有效JSON备份。':error.message);}
 });
 window.addEventListener('hashchange',()=>{const tab=location.hash.slice(1);if(tabs.some(([id])=>id===tab))navigateTab(tab);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeSidebar();});
}
init();
