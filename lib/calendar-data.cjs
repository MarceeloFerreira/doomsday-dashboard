const {createHash}=require('node:crypto');
const STORE='doomsday-calendar',KEY='current';
function validateCalendar(data){
  if(!data||data.schemaVersion!==1||data.timezone!=='UTC'||!Number.isFinite(Date.parse(data.generatedAt))||
    !Array.isArray(data.events)||data.events.length<10||data.events.length>10000)throw Error('Calendário inválido ou incompleto');
  const ids=new Set();
  for(const e of data.events){
    if(!e||!Number.isSafeInteger(e.id)||ids.has(e.id)||typeof e.name!=='string'||!e.name.trim()||
      !Number.isFinite(Date.parse(e.start))||!Number.isFinite(e.durationDays)||e.durationDays<=0||e.durationDays>=999999||
      !Number.isFinite(e.loopDays)||e.loopDays<0||
      (e.end!==null&&e.end!==undefined&&!Number.isFinite(Date.parse(e.end)))||
      !Array.isArray(e.kingdomIds)||!e.kingdomIds.every(Number.isSafeInteger)||
      e.evidence!=='client-config')throw Error('Evento inválido: '+e?.id);
    ids.add(e.id);
  }
  if(!Array.isArray(data.sources)||!data.sources.length||data.sources.some(s=>!s.table||!/^[a-f0-9]{64}$/.test(s.sha256)))throw Error('Fontes inválidas');
  return data;
}
function stable(v){
  if(Array.isArray(v))return v.map(stable);
  if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));
  return v;
}
function calendarHash(data){
  const {generatedAt,...content}=data;
  return createHash('sha256').update(JSON.stringify(stable(content))).digest('hex');
}
module.exports={STORE,KEY,validateCalendar,calendarHash};
