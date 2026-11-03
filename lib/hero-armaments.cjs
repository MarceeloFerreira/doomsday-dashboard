const {TROOPS,activeSkills,combatRole,applies,normalize,recommend}=require('./hero-combinations.cjs');
const TYPES=[...TROOPS,'Líder'];
const DEFAULT_ARMAMENTS={enabled:false,stock:{Infantaria:4,Atirador:0,Motos:0,'Líder':1},leaderDevelopment:'weaker',includeWeaker:true,offensive:true};
function normalizeArmaments(input){
  const count=value=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(5,Math.floor(value))):0;
  return {enabled:input?.enabled===true,stock:Object.fromEntries(TYPES.map(t=>[t,count(input?.stock?.[t])])),
    leaderDevelopment:['weaker','comparable','stronger'].includes(input?.leaderDevelopment)?input.leaderDevelopment:'weaker',
    includeWeaker:input?.includeWeaker!==false,offensive:input?.offensive!==false};
}
function leaderOnlySkills(hero,mode,awakened){return activeSkills({...hero,deploymentRole:undefined},awakened).filter(s=>applies(s.description,mode)&&/^(?:quando )?atua como lider\b|^quando.{0,12}(?:atua|esta) como lider\b/.test(normalize(s.description)));}
function positionCautions(leader,assistant,mode,awakened){
  const notes=leaderOnlySkills(assistant,mode,awakened).map(s=>`${assistant.name} como assistente: ${s.name} exige atuar como líder e não foi contabilizada nesta posição.`);
  for(const s of activeSkills(assistant,awakened))if(/(?:como assistente|como vice-general)/.test(normalize(s.description)))notes.push(`${assistant.name} · ${s.name}: a habilidade muda quando atua como assistente. Confira os valores: “${s.description}”`);
  if(!leaderOnlySkills(leader,mode,awakened).length)notes.push('A escolha do líder favorece o conjunto disponível. Confira os talentos e a evolução dos dois heróis antes de mobilizar.');
  return notes;
}
// This is a categorical tie-breaker, never estimated damage, kills or event points.
function offenseSignals(heroes,mode,awakened){
  const sources=new Set();
  for(const hero of heroes)for(const s of activeSkills(hero,awakened)){
    const clauses=s.description.split(/[.!?]\s+|(?=Quando |Durante |Enquanto )/).filter(t=>applies(t,mode)).map(normalize);
    for(const t of clauses){
      const deals=/(?:causa|causam|causando|causar|lidando com).{0,35}dano/.test(t);
      if(deals)sources.add('Dano direto');
      if(deals&&/(?:[2-9]|ate \d+) (?:outros )?(?:esquadroes|inimigos|alvos|personagens)|area (?:semicircular|em forma|circular)/.test(t))sources.add('Dano em área');
      if(deals&&/cada segundo|continuo|proximos.{0,5}s|ataques basicos|contra-ataques/.test(t))sources.add('Dano recorrente');
      if(/reduz.{0,40}(?:pv|hp|def).{0,30}(?:alvo|inimig)/.test(t))sources.add('Enfraquecimento do alvo');
    }
  }
  return [...sources];
}
function equippedFormationKey(pairs){return pairs.map(p=>p.deployment?`${p.deployment.leader.id}>${p.deployment.assistant.id}:${p.deployment.type}`:[p.a.id,p.b.id].sort((a,b)=>a-b).join('-')).sort().join('|');}
function buildEquippedFormation(pairs,{equipment,troop='Infantaria',mode='Campo',awakened=true,balanced=false}={},previous=[],history=[]){
  const config=normalizeArmaments(equipment),stock={...config.stock};
  if(!TROOPS.includes(troop))return [];
  if(config.leaderDevelopment==='weaker'&&!config.includeWeaker)stock['Líder']=0;
  const ids=[...new Set(pairs.flatMap(p=>[p.a.id,p.b.id]))].sort((a,b)=>a-b);
  const count=Math.min(5,Math.floor(ids.length/2),stock[troop]+stock['Líder']);if(!count)return [];
  const bits=new Map(ids.map((id,i)=>[id,1n<<BigInt(i)])),oldPairs=new Set(previous.map(p=>[p.a.id,p.b.id].sort((a,b)=>a-b).join('-')));
  const options=[];
  for(const pair of pairs)for(const [lead,assist] of [[pair.a,pair.b],[pair.b,pair.a]]){
    const type=lead.troop==='Líder'?'Líder':lead.troop;if(![troop,'Líder'].includes(type)||!stock[type])continue;
    // Only the leader contributes a set. Re-evaluate descriptions with positional
    // restrictions, keeping a leader-only passive out of an assistant's kit.
    const leader={...lead,deploymentRole:'leader'},assistant={...assist,deploymentRole:'assistant'};
    const directed=recommend([leader,assistant],[leader.id,assistant.id],{troop,mode,awakened,balanced})[0];if(!directed)continue;
    const signals=offenseSignals([leader,assistant],mode,awakened);
    const weak=type==='Líder'&&config.leaderDevelopment==='weaker';
    const quality=type==='Líder'?(config.leaderDevelopment==='weaker'?0:config.leaderDevelopment==='stronger'?2:1):1;
    const leadBenefits=leaderOnlySkills(leader,mode,awakened).length;
    const assistantLoss=positionCautions(leader,assistant,mode,awakened).filter(n=>/não foi contabilizada|muda quando/.test(n)).length;
    const leadDamage=Number(combatRole(leader,mode,awakened,troop).kind==='damage');
    const score=[quality,leadBenefits-assistantLoss,...(config.offensive?[signals.length]:[]),...directed.priority,leadDamage];
    const notes=positionCautions(leader,assistant,mode,awakened);
    if(weak)notes.unshift('Conjunto da categoria Líder informado como menos desenvolvido. Este esquadrão não foi tratado como equivalente aos conjuntos mais desenvolvidos.');
    options.push({pair:{...directed,reasons:[`Conjunto de ${type} contabilizado somente em ${leader.name}, líder da dupla.`,...directed.reasons],cautions:[...notes,...directed.cautions],deployment:{leader,assistant,type,weak,signals,notes}},type,mask:bits.get(lead.id)|bits.get(assist.id),score,key:`${lead.id}>${assist.id}:${type}`,old:oldPairs.has([pair.a.id,pair.b.id].sort((a,b)=>a-b).join('-'))});
  }
  if(!options.length)return [];
  const dimensions=options[0].score.length;
  const compare=(a,b)=>{for(let i=0;i<dimensions;i++)if(a.score[i]!==b.score[i])return b.score[i]-a.score[i];return a.key.localeCompare(b.key);};
  function search(allowOld){
    const edges=allowOld?options:options.filter(o=>!o.old);
    let beam=[{mask:0n,uses:{[troop]:0,'Líder':0},score:Array(dimensions).fill(0),choices:[],key:''}];
    for(let depth=0;depth<count;depth++){
      const states=new Map();
      for(const state of beam)for(const edge of edges){
        if(state.mask&edge.mask||state.uses[edge.type]>=stock[edge.type])continue;
        const mask=state.mask|edge.mask,uses={...state.uses,[edge.type]:state.uses[edge.type]+1};
        const choices=[...state.choices,edge].sort((a,b)=>a.key.localeCompare(b.key)),key=choices.map(e=>e.key).join('|');
        const bucketKey=mask.toString()+':'+uses[troop]+':'+uses['Líder'];
        const bucket=states.get(bucketKey)||[];if(bucket.some(s=>s.key===key))continue;
        bucket.push({mask,uses,choices,key,score:state.score.map((n,i)=>n+edge.score[i])});bucket.sort(compare);bucket.length=Math.min(4,bucket.length);states.set(bucketKey,bucket);
      }
      if(!states.size)break;
      beam=[...states.values()].flat().sort(compare).slice(0,128);
    }
    return beam;
  }
  let beam=search(previous.length===0);
  if(previous.length&&(beam[0]?.choices.length||0)<Math.min(previous.length,count))beam=search(true);
  const seen=new Set([...history,equippedFormationKey(previous)]);
  const chosen=beam.find(s=>!seen.has(equippedFormationKey(s.choices.map(e=>e.pair))))||beam[0];
  const used={[troop]:0,'Líder':0};
  return (chosen?.choices||[]).map(e=>({...e.pair,deployment:{...e.pair.deployment,setNumber:++used[e.type]}}));
}
module.exports={DEFAULT_ARMAMENTS,normalizeArmaments,leaderOnlySkills,positionCautions,offenseSignals,equippedFormationKey,buildEquippedFormation};
