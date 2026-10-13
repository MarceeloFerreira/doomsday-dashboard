const LABELS={A:'Arquipélago',G:'Gênesis',I:'Insular'};
function norm(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();}
function number(v){
  if(typeof v==='number') return Number.isFinite(v)?v:null;
  let s=String(v??'').trim().replace(/\s/g,'');
  if(!s)return null;
  const unit=s.match(/[mMkK]$/)?.[0]?.toLowerCase();if(unit)s=s.slice(0,-1);
  if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  const n=Number(s)*(unit==='m'?1e6:unit==='k'?1e3:1);
  return Number.isFinite(n)&&n>=0?n:null;
}
function date(v){
  const s=String(v??'').trim();let result;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))result=s;
  else {const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);if(!m)return null;result=`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;}
  const d=new Date(result+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===result?result:null;
}
function eventCode(v){const n=norm(v);return n==='a'||n.includes('arquip')?'A':n==='g'||n.includes('genesis')?'G':n==='i'||n.includes('insular')?'I':String(v??'').trim();}
function scoresFromSheet(values){
  const aliases=[['data','data do evento'],['evento','nome do evento'],['player','jogador','membro','nome'],['pontuacao','pontos','pontuacao do evento']];
  let header=-1,cols;
  for(let i=0;i<Math.min(values.length,15);i++){const names=values[i].map(norm);const indexes=aliases.map(list=>names.findIndex(n=>list.includes(n)));if(indexes.every(n=>n>=0)){header=i;cols=indexes;break;}}
  if(header<0)throw Error('Cabeçalho do histórico não reconhecido. Use Data, Evento, Player e Pontuação.');
  const rows=[];
  for(let i=header+1;i<values.length;i++){
    const r=values[i];if(r.every(v=>!String(v??'').trim()))continue;
    const d=date(r[cols[0]]),e=eventCode(r[cols[1]]),p=String(r[cols[2]]??'').trim(),points=number(r[cols[3]]);
    if(!d||!e||!p||points===null)throw Error(`Linha ${i+1} do histórico incompleta ou inválida.`);
    rows.push([d,e,p,points]);
  }
  return validateScores(rows);
}
function validateScores(rows){
  if(!rows.length)throw Error('Histórico sem pontuações.');
  const dates=new Map(),keys=new Set();
  for(const [d,e,p,n] of rows){
    if(!date(d)||!e||!p||!Number.isFinite(n)||n<0)throw Error('Pontuação inválida.');
    if(dates.has(d)&&dates.get(d)!==e)throw Error('Há dois eventos diferentes na mesma data.');dates.set(d,e);
    const key=d+'|'+norm(p);if(keys.has(key))throw Error(`Jogador duplicado na edição ${d}: ${p}.`);keys.add(key);
  }return rows;
}
function membersFromSheet(values=[]){
  const aliases=[['player','jogador','membro','nome'],['tropas','tropa','tipo de tropas','tier'],['poder','poder atual']];
  let header=-1,cols;
  for(let i=0;i<Math.min(values.length,15);i++){const names=values[i].map(norm);const indexes=aliases.map(list=>names.findIndex(n=>list.includes(n)));if(indexes.every(n=>n>=0)){header=i;cols=indexes;break;}}
  if(header<0)return {members:[],warning:'Na aba Membros, adicione as colunas Player, Tropas e Poder para calcular as metas.'};
  const namesHeader=values[header].map(norm);
  const idCol=namesHeader.indexOf('id'),typeCol=namesHeader.indexOf('tipo');
  const activeCol=namesHeader.findIndex(n=>n.replace(/[?]/g,'').trim()==='esta na alianca');
  const members=[],names=new Set();
  for(const r of values.slice(header+1)){
    const player=String(r[cols[0]]??'').trim();if(!player)continue;
    const key=norm(player);if(names.has(key))throw Error('Jogador duplicado na aba Membros: '+player);names.add(key);
    const troops=String(r[cols[1]]??'').trim().toUpperCase();
    const active=activeCol>=0?norm(r[activeCol]):'';
    members.push({player,id:idCol>=0?String(r[idCol]??'').trim():'',type:typeCol>=0?norm(r[typeCol]):'',inAlliance:active==='sim'?true:active==='nao'?false:null,troops:['T5','T6'].includes(troops)?troops:null,power:number(r[cols[2]])});
  }return {members,warning:null};
}
function goal(event,member){
  if(event!=='A')return {minimum:null,reason:'Sem regra definida para este evento'};
  if(!member?.troops||!(member.power>0))return {minimum:null,reason:'Sem dados para calcular a meta'};
  if(member.troops==='T5')return {minimum:member.power*.3,reason:'T5: 30% do poder'};
  if(member.troops==='T6')return {minimum:member.power<=180e6?80e6:120e6,reason:member.power<=180e6?'T6 até 180M: 80M':'T6 acima de 180M: 120M'};
  return {minimum:null,reason:'Sem dados para calcular a meta'};
}
function editions(rows){const map=new Map();for(const [d,e,p,n]of rows){if(!map.has(d))map.set(d,{date:d,event:e,label:LABELS[e]||e,total:0,records:0});const r=map.get(d);r.total+=n;r.records++;}return [...map.values()].sort((a,b)=>b.date.localeCompare(a.date));}
function analyze(rows,members,selectedDate){
  const all=editions(rows),edition=all.find(e=>e.date===selectedDate);if(!edition)return null;
  const previous=all.find(e=>e.event===edition.event&&e.date<selectedDate);
  const metadata=new Map(members.map(m=>[norm(m.player),m]));
  const prior=new Map(rows.filter(r=>r[0]===previous?.date).map(r=>[norm(r[2]),r[3]]));
  const selected=rows.filter(r=>r[0]===selectedDate);
  const ranking=selected.map(([,event,player,points])=>{
    const member=metadata.get(norm(player)),target=goal(event,member),prev=prior.get(norm(player));
    return {player,points,id:member?.id??'',type:member?.type??'',inAlliance:member?.inAlliance??null,troops:member?.troops??null,power:member?.power??null,minimum:target.minimum,rule:target.reason,percent:target.minimum?points/target.minimum*100:null,missing:target.minimum===null?null:Math.max(0,target.minimum-points),status:target.minimum===null?'unknown':points>=target.minimum?'met':'below',previous:prev??null,delta:prev===undefined?null:points-prev};
  }).sort((a,b)=>b.points-a.points||a.player.localeCompare(b.player));
  const recorded=new Set(selected.map(r=>norm(r[2])));
  const noRecord=members.filter(m=>m.inAlliance===true&&!recorded.has(norm(m.player))).map(m=>({player:m.player,type:m.type,troops:m.troops,power:m.power,...goal(edition.event,m)}));
  return {edition,previous,ranking,noRecord,summary:{total:edition.total,records:ranking.length,scorers:ranking.filter(r=>r.points>0).length,average:ranking.length?edition.total/ranking.length:0,met:ranking.filter(r=>r.status==='met').length,below:ranking.filter(r=>r.status==='below').length,unknown:ranking.filter(r=>r.status==='unknown').length}};
}
module.exports={number,date,norm,scoresFromSheet,membersFromSheet,validateScores,goal,editions,analyze};
