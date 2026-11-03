const {ASSIGNMENTS,SIDES,inspectTeams}=require('./pompeii.cjs');
function fail(message,status=400){return Object.assign(Error(message),{status,safe:true});}
function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
function finalizeInput(input,players){
  if(!input||typeof input.id!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(input.id))throw fail('Identificador da edição inválido.');
  if(!validDate(input.date))throw fail('Informe uma data válida para a edição.');
  if(typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>80)throw fail('Dê um nome para a edição, com até 80 caracteres.');
  if(typeof input.announcement!=='string'||!input.announcement.trim()||input.announcement.length>1500)throw fail('O aviso deve ter de 1 a 1.500 caracteres.');
  const opponents=input.opponents===undefined||input.opponents===null||input.opponents===''?null:input.opponents;
  if(opponents!==null&&(!Number.isInteger(opponents)||opponents<1||opponents>999))throw fail('Informe de 1 a 999 oponentes ou deixe em branco.');
  const opponentAlliance=input.opponentAlliance===undefined?'':input.opponentAlliance;
  if(typeof opponentAlliance!=='string'||opponentAlliance.trim().length>80)throw fail('Informe a aliança adversária com até 80 caracteres.');
  const teams=input.teams;
  if(!teams||!SIDES.every(side=>Array.isArray(teams[side])&&teams[side].length<=100&&teams[side].every(e=>e&&typeof e.id==='string'&&Object.hasOwn(ASSIGNMENTS,e.assignment))))throw fail('Equipes inválidas.');
  const entries=SIDES.flatMap(side=>teams[side].map(e=>({...e,side})));
  if(!entries.length||entries.length>100)throw fail('Selecione de 1 a 100 inscritos.');
  const warnings=inspectTeams(teams,players);if(warnings.length)throw fail('Revise as equipes antes de finalizar: '+warnings[0]);
  const byId=new Map(players.map(p=>[p.id,p]));
  return {id:input.id,date:input.date,name:input.name.trim(),announcement:input.announcement.trim(),opponents,opponentAlliance:opponentAlliance.trim(),participants:entries.length,players:entries.map(e=>{
    const p=byId.get(e.id);return {id:p.id,nick:p.nick,side:e.side,assignment:e.assignment,power:p.power??null,troops:p.troops||''};
  })};
}
function scoreInput(input){
  if(!input||typeof input.editionId!=='string'||!/^[a-f0-9-]{36}$/i.test(input.editionId)||typeof input.playerId!=='string'||input.playerId.length>200)throw fail('Edição ou jogador inválido.');
  const valid=value=>value===null||(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0);
  if(!valid(input.points)||!valid(input.expected))throw fail('Informe uma pontuação inteira e positiva, zero ou deixe em branco.');
  return {editionId:input.editionId,playerId:input.playerId,points:input.points,expected:input.expected};
}
function historyStats(editions){
  const players=new Map();
  for(const edition of editions)for(const p of edition.players){
    const row=players.get(p.id)||{id:p.id,nick:p.nick,editions:0,records:0,total:0};
    row.editions++;if(p.points!==null){row.records++;row.total+=p.points;}players.set(p.id,row);
  }
  return [...players.values()].map(p=>({...p,average:p.records?p.total/p.records:null})).sort((a,b)=>b.total-a.total||a.nick.localeCompare(b.nick,'pt-BR'));
}
module.exports={fail,validDate,finalizeInput,scoreInput,historyStats};
