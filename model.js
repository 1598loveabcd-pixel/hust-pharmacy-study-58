export const SUBJECT_IDS = ['pharm','analysis','organic','english','politics'];
export const STORAGE_KEY = 'hust-pharmacy-58-v1';

export function todayShanghai() {
  return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
export function validHours(value) {
  if (value === '' || value == null) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 24) throw new Error('实际时长请填写0—24之间的数字。');
  return Math.round(number * 100) / 100;
}
export function createState(data) {
  const today=todayShanghai();
  return {version:1, planId:'hust-pharmacy-2026', selectedDate:today<data.meta.startDate?data.meta.startDate:today>data.meta.endDate?data.meta.endDate:today, tab:'daily', updatedAt:null,
    days:Object.fromEntries(data.days.map(day=>[day.date,{
      subjects:Object.fromEntries(SUBJECT_IDS.map(id=>[id,day.subjects[id].tasks.map(task=>({...task,done:day.tracking.subjectStatus[id]==='完成'}))])),
      actualHours:day.tracking.actualHours??null, note:day.tracking.note??''
    }])),
    weeks:Object.fromEntries(data.weeks.map(week=>[week.id,{accuracy:{...week.accuracy},adjustment:week.adjustment??''}]))
  };
}
export function subjectProgress(tasks) {
  const total=tasks.length, done=tasks.filter(task=>task.done).length;
  return {total,done,complete:total>0&&done===total,partial:done>0&&done<total};
}
export function dayProgress(record) {
  const subjects=SUBJECT_IDS.map(id=>subjectProgress(record.subjects[id]));
  const total=subjects.reduce((sum,p)=>sum+p.total,0), done=subjects.reduce((sum,p)=>sum+p.done,0);
  return {total,done,subjects:subjects.filter(p=>p.complete).length,complete:subjects.every(p=>p.complete),taskRate:total?done/total:0};
}
export function allProgress(data,state) {
  let completedDays=0,completedSubjects=0,doneTasks=0,totalTasks=0,actualHours=0,recordedDays=0,activeDays=0;
  for(const day of data.days) {
    const record=state.days[day.date], p=dayProgress(record);
    completedDays+=Number(p.complete);completedSubjects+=p.subjects;doneTasks+=p.done;totalTasks+=p.total;
    if(record.actualHours!==null){actualHours+=record.actualHours;recordedDays++;}
    if(p.done>0||(record.actualHours!==null&&record.actualHours>0))activeDays++;
  }
  return {completedDays,completedSubjects,doneTasks,totalTasks,actualHours:Math.round(actualHours*100)/100,recordedDays,activeDays};
}
export function allocationFor(day) {
  let allocation=day.date<='2026-11-08'?{professional:6,english:2.5,politics:1.5}:day.date<='2026-11-22'?{professional:6,english:2.25,politics:1.75}:{professional:5.5,english:2,politics:2.5};
  if(day.events.some(event=>event.type==='english_mock'))allocation={professional:4.5,english:3,politics:2.5};
  if(day.date==='2026-12-10')allocation={professional:5,english:2,politics:3};
  if(day.date==='2026-12-17')allocation={professional:4,english:1.5,politics:2.5};
  if(day.date==='2026-12-18')allocation={professional:3,english:1,politics:2};
  return allocation;
}
export function normalizeState(input,data) {
  if(!input||typeof input!=='object'||input.version!==1||input.planId!=='hust-pharmacy-2026')throw new Error('这不是本计划的有效备份文件。');
  if(!input.days||typeof input.days!=='object')throw new Error('备份缺少每日记录。');
  const result=createState(data), allTaskIds=new Set();
  for(const day of data.days) {
    const incoming=input.days[day.date];
    if(!incoming||!incoming.subjects)throw new Error('备份日期不完整，请选择完整的58天备份。');
    const target=result.days[day.date];
    for(const subject of SUBJECT_IDS) {
      const tasks=incoming.subjects[subject];
      if(!Array.isArray(tasks)||tasks.length>100)throw new Error('备份任务数量或格式不正确。');
      target.subjects[subject]=tasks.map(task=>{
        if(!task||typeof task.id!=='string'||!task.id||task.id.length>160||typeof task.text!=='string'||!task.text.trim()||task.text.length>500||typeof task.done!=='boolean'||allTaskIds.has(task.id))throw new Error('备份含无效或重复任务。');
        allTaskIds.add(task.id);return {id:task.id,text:task.text,done:task.done};
      });
    }
    target.actualHours=validHours(incoming.actualHours);
    if(incoming.note!=null&&typeof incoming.note!=='string')throw new Error('备份备注格式不正确。');
    target.note=(incoming.note??'').slice(0,3000);
  }
  for(const week of data.weeks) {
    const incoming=input.weeks?.[week.id];if(!incoming)continue;
    for(const id of SUBJECT_IDS) {
      const raw=incoming.accuracy?.[id];
      if(raw===null||raw===undefined||raw===''){result.weeks[week.id].accuracy[id]=null;continue;}
      if(typeof raw!=='number'||!Number.isFinite(raw)||raw<0||raw>100)throw new Error('正确率应在0—100%之间。');
      result.weeks[week.id].accuracy[id]=raw;
    }
    result.weeks[week.id].adjustment=typeof incoming.adjustment==='string'?incoming.adjustment.slice(0,3000):'';
  }
  if(Object.hasOwn(result.days,input.selectedDate))result.selectedDate=input.selectedDate;
  if(['daily','calendar','stats','methods'].includes(input.tab))result.tab=input.tab;
  result.updatedAt=typeof input.updatedAt==='string'?input.updatedAt:null;
  return result;
}
