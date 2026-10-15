const {norm}=require('./sheet-values.cjs');
const DEFAULT_RULES=[
  {event:'A',troops:'T5',above:0,upTo:null,kind:'percent',value:30},
  {event:'A',troops:'T6',above:0,upTo:180e6,kind:'points',value:80e6},
  {event:'A',troops:'T6',above:180e6,upTo:null,kind:'points',value:120e6},
];
const compact=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n>=1e6?n/1e6:n)+(n>=1e6?'M':'');
function describe(rule){
  const range=rule.above>0?(rule.upTo!==null?`acima de ${compact(rule.above)} e até ${compact(rule.upTo)} de poder`:`acima de ${compact(rule.above)} de poder`):rule.upTo!==null?`até ${compact(rule.upTo)} de poder`:'qualquer poder';
  return `${rule.troops} · ${range}: ${rule.kind==='percent'?compact(rule.value)+'% do poder':compact(rule.value)+' de pontos'}`;
}
function parseRules(values,{number,eventCode}){
  if(!Array.isArray(values)||!values.length)throw Error('A aba RegrasMetas precisa do cabeçalho.');
  const names=values[0].map(norm),required=['evento','tropa','poder acima de','poder ate','tipo de meta','meta','ativo'];
  const cols=required.map(n=>names.indexOf(n));
  if(cols.some(i=>i<0))throw Error('Use o cabeçalho: Evento, Tropa, Poder acima de, Poder até, Tipo de meta, Meta, Ativo.');
  const rules=[];
  for(let i=1;i<values.length;i++){
    const cells=cols.map(c=>values[i][c]);
    // Ignore unused checkbox rows as well as explicitly disabled rules.
    if(cells.slice(0,6).every(v=>!String(v??'').trim()))continue;
    const active=norm(cells[6]);
    if(['false','falso','nao','não','0'].includes(active))continue;
    if(!['true','verdadeiro','sim','1'].includes(active))throw Error(`Linha ${i+1}: marque Ativo ou desative a regra.`);
    const event=eventCode(cells[0]),troops=String(cells[1]??'').trim().toUpperCase();
    const above=String(cells[2]??'').trim()?number(cells[2]):0;
    const upTo=String(cells[3]??'').trim()?number(cells[3]):null;
    const kindText=norm(cells[4]);
    const kind=['percentual','percent','%'].includes(kindText)?'percent':['pontos','points','fixa'].includes(kindText)?'points':null;
    let raw=String(cells[5]??'').trim();if(kind==='percent')raw=raw.replace(/%$/,'').trim();
    const value=number(raw);
    if(!event||!/^T[1-9]\d*$/.test(troops)||above===null||(String(cells[3]??'').trim()&&upTo===null)||(upTo!==null&&upTo<=above)||!kind||!(value>0))throw Error(`Linha ${i+1}: evento, tropa, faixa de poder ou meta inválidos.`);
    const rule={event,troops,above,upTo,kind,value};
    if(rules.some(r=>r.event===event&&r.troops===troops&&Math.max(r.above,above)<Math.min(r.upTo??Infinity,upTo??Infinity)))throw Error(`Linha ${i+1}: faixas de poder sobrepostas para ${troops} neste evento.`);
    rules.push(rule);
  }
  return rules;
}
function resolveRules(values,helpers){
  if(values===undefined||values===null)return {rules:DEFAULT_RULES,status:'defaults',warning:'RegrasMetas ainda não foi recebida. Usando as três regras padrão do Arquipélago; atualize o Apps Script e crie a nova aba.'};
  try{return {rules:parseRules(values,helpers),status:'sheet',warning:null};}
  catch(error){return {rules:[],status:'invalid',warning:'RegrasMetas inválida: '+error.message+' As metas não foram avaliadas.'};}
}
function goal(event,member,rules=DEFAULT_RULES){
  if(!rules.some(r=>r.event===event))return {minimum:null,reason:'Sem regra definida para este evento'};
  if(!member?.troops||!(member.power>0))return {minimum:null,reason:'Sem dados para calcular a meta'};
  const matches=rules.filter(r=>r.event===event&&r.troops===member.troops&&member.power>r.above&&(r.upTo===null||member.power<=r.upTo));
  if(matches.length!==1)return {minimum:null,reason:'Sem regra única para esta tropa e poder'};
  const rule=matches[0];return {minimum:rule.kind==='percent'?member.power*rule.value/100:rule.value,reason:describe(rule)};
}
module.exports={DEFAULT_RULES,describe,parseRules,resolveRules,goal};
