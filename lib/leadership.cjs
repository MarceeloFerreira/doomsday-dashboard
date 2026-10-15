const rulesCore=require('./goal-rules.cjs');
const {norm,date}=require('./sheet-values.cjs');
const LABELS={A:'Arquipélago',G:'Gênesis',I:'Insular'};
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
    members.push({player,id:idCol>=0?String(r[idCol]??'').trim():'',type:typeCol>=0?norm(r[typeCol]):'',inAlliance:active==='sim'?true:active==='nao'?false:null,troops:/^T[1-9]\d*$/.test(troops)?troops:null,power:number(r[cols[2]])});
  }return {members,warning:null};
}
const goal=rulesCore.goal;
const rulesFromSheet=values=>rulesCore.resolveRules(values,{number,eventCode});
function eligibleRows(rows,members){const current=new Set(members.filter(m=>m.type==='conta'&&m.inAlliance===true).map(m=>norm(m.player)));return rows.filter(r=>current.has(norm(r[2])));}
function editions(rows){const map=new Map();for(const [d,e,p,n]of rows){if(!map.has(d))map.set(d,{date:d,event:e,label:LABELS[e]||e,total:0,records:0});const r=map.get(d);r.total+=n;r.records++;}return [...map.values()].sort((a,b)=>b.date.localeCompare(a.date));}
function analyze(rows,members,selectedDate,rules=rulesCore.DEFAULT_RULES,membersOnly=false){
  let all=editions(rows);
  if(membersOnly){rows=eligibleRows(rows,members);members=members.filter(m=>m.type==='conta'&&m.inAlliance===true);const scoped=new Map(editions(rows).map(e=>[e.date,e]));all=all.map(e=>scoped.get(e.date)||{...e,total:0,records:0});}
  const edition=all.find(e=>e.date===selectedDate);if(!edition)return null;
  const previous=all.find(e=>e.event===edition.event&&e.date<selectedDate);
  const metadata=new Map(members.map(m=>[norm(m.player),m]));
  const prior=new Map(rows.filter(r=>r[0]===previous?.date).map(r=>[norm(r[2]),r[3]]));
  const selected=rows.filter(r=>r[0]===selectedDate);
  const ranking=selected.map(([,event,player,points])=>{
    const member=metadata.get(norm(player)),target=goal(event,member,rules),prev=prior.get(norm(player));
    return {player,points,id:member?.id??'',type:member?.type??'',inAlliance:member?.inAlliance??null,troops:member?.troops??null,power:member?.power??null,minimum:target.minimum,rule:target.reason,percent:target.minimum?points/target.minimum*100:null,missing:target.minimum===null?null:Math.max(0,target.minimum-points),status:target.minimum===null?'unknown':points>=target.minimum?'met':'below',previous:prev??null,delta:prev===undefined?null:points-prev};
  }).sort((a,b)=>b.points-a.points||a.player.localeCompare(b.player));
  const recorded=new Set(selected.map(r=>norm(r[2])));
  const noRecord=members.filter(m=>m.inAlliance===true&&!recorded.has(norm(m.player))).map(m=>({player:m.player,type:m.type,troops:m.troops,power:m.power,...goal(edition.event,m,rules)}));
  return {edition,previous,ranking,noRecord,summary:{total:edition.total,records:ranking.length,scorers:ranking.filter(r=>r.points>0).length,average:ranking.length?edition.total/ranking.length:0,met:ranking.filter(r=>r.status==='met').length,below:ranking.filter(r=>r.status==='below').length,unknown:ranking.filter(r=>r.status==='unknown').length}};
}
module.exports={rulesFromSheet,eligibleRows,number,date,norm,scoresFromSheet,membersFromSheet,validateScores,goal,editions,analyze};
