// Directional compatibility, not expected damage. Scores are bounded heuristic
// points; neither event opportunity nor access is a probability or uptime.
const EVENTS=new Set(['crit','combo','counter']);
const LABELS={crit:'CRIT',combo:'Combo',counter:'Contra-ataque',shield:'Escudo',corrosion:'Corrosão',detonate:'Detonar',attack:'ATQ',defense:'DEF',damage:'DANO',skillDamage:'DANO de habilidade',critDamage:'DANO CRIT',comboDamage:'DANO de Combo',counterDamage:'DANO de Contra-ataque',shieldStrength:'força do Escudo',protection:'redução de DANO',armorBreak:'redução da DEF do alvo',vulnerability:'DANO recebido pelo alvo'};
function activeFacts(beast,role,context){
  if(beast.mechanics?.version!==1)return [];
  return (beast.mechanics.roles?.[role]||[]).filter(f=>
    (!f.modes||f.modes.includes(context.mode))&&(!f.enemy||f.enemy===context.enemyElement)&&
    (!f.supportElement||f.supportElement===context.supportElement))
    .flatMap(f=>{const skill=beast.skills[role]?.find(s=>s.id===f.skillId);return skill?[{...f,beast,role,skill,leaderInterval:context.leaderInterval}]:[];});
}
const scopeFits=(provider,consumer)=>!provider.scope||!consumer.triggerScope||provider.scope===consumer.triggerScope;
function access(fact,facts,path=new Set()){
  if(fact.external||path.has(fact))return 0;
  const next=new Set(path);next.add(fact);
  let level=3;
  for(const requirement of fact.requires||[])level=Math.min(level,opportunity(requirement,facts,next,fact.triggerScope));
  if(fact.anyOf?.length)level=Math.min(level,Math.max(...fact.anyOf.map(r=>opportunity(r,facts,next,fact.triggerScope))));
  if(fact.chance<100||fact.delayed)level=Math.min(level,2);
  if(fact.period==='leader'&&fact.duration<fact.leaderInterval)level=Math.min(level,fact.duration*2<fact.leaderInterval?1:2);
  return level;
}
function opportunity(channel,facts,path=new Set(),scope){
  let level=EVENTS.has(channel)?1:0; // A base event may occur, but no rate is assumed.
  for(const fact of facts){
    if(fact.mechanism!==channel||!['state','boost'].includes(fact.kind))continue;
    if(fact.scope&&scope&&fact.scope!==scope)continue;
    const available=access(fact,facts,path);
    if(fact.kind==='state')level=Math.max(level,available);
    else level=Math.max(level,Math.min(available,fact.amount>=70?3:2));
  }
  return level;
}
const source=f=>`${f.beast.name} · ${f.skill.name}`;
const deps=f=>[...(f.requires||[]),...(f.anyOf||[]),...(f.improvedBy||[])];
const bonus=amount=>Math.min(10,Math.round(amount/20));
function evaluateSynergy(leader,support,context){
  context={...context,leaderInterval:leader.combatReference?.periodicAttacks?.[0]?.interval||6};
  const lf=activeFacts(leader,'Líder',context),sf=activeFacts(support,'Suporte',context),world=[...lf,...sf];
  if(!lf.length||!sf.length)return {version:1,score:0,coverage:0,utility:0,links:[],mechanisms:[],complete:false};
  const links=new Map();
  function offer(category,channel,points,from,to,reason){
    points=Math.round(points);
    if(points<=0)return;
    const key=category+':'+channel;
    const link={category,mechanism:channel,points:Math.round(points),from:{beastId:from.beast.id,role:from.role,skillId:from.skillId},to:to?{beastId:to.beast.id,role:to.role,skillId:to.skillId}:null,reason};
    if(!links.has(key)||links.get(key).points<link.points)links.set(key,link);
  }
  const needs=lf.filter(f=>f.kind==='need');
  // A support enabler is valuable because it feeds a real leader payoff.
  for(const fact of sf.filter(f=>['boost','state'].includes(f.kind))){
    const target=needs.find(n=>n.mechanism===fact.mechanism&&scopeFits(fact,n)&&access(n,world)>0);
    const level=access(fact,world);
    if(!target||!level)continue;
    const existing=opportunity(fact.mechanism,lf,new Set(),target.triggerScope);
    let points;
    if(fact.kind==='boost'){
      points=(existing<=1?8:4)*level+bonus(fact.amount);
      offer('support_enables',fact.mechanism,points,fact,target,`${source(fact)} concede +${fact.amount} de ${LABELS[fact.mechanism]}, favorecendo o gatilho que ${source(target)} aproveita. O bônus mantém suas condições e duração.`);
    }else{
      points=(existing===0?12:4)*level;
      if(fact.onlyWithout&&existing>0)points=Math.min(points,4);
      offer('support_enables',fact.mechanism,points,fact,target,`${source(fact)} ${existing?'reforça a oferta de':'oferece'} ${LABELS[fact.mechanism]}, condição aproveitada por ${source(target)}. ${deps(fact).length||level<3?'A aplicação depende do gatilho da habilidade.':'A janela do efeito precisa coincidir com o ataque.'}`);
    }
  }
  // Leader enablers activate support follow-ups and conditional support buffs.
  for(const giver of lf.filter(f=>['boost','state'].includes(f.kind))){
    const level=access(giver,lf);
    if(!level)continue;
    for(const receiver of sf.filter(f=>deps(f).includes(giver.mechanism)&&!f.external&&scopeFits(giver,f))){
      const value=giver.kind==='boost'?5*level+bonus(giver.amount):7*level;
      offer('leader_activates',giver.mechanism,value,giver,receiver,`${source(giver)} ${giver.kind==='boost'?`concede +${giver.amount} de`: 'aplica ou concede'} ${LABELS[giver.mechanism]}, favorecendo ${source(receiver)} na função de suporte. Isso ajuda a cumprir o gatilho; não garante sua ativação em todos os ataques.`);
    }
  }
  // Score support effects once per benefit type, not once per keyword or sentence.
  for(const fact of sf){
    const level=access(fact,world);
    if(!level)continue;
    if(fact.kind==='followup'){
      const points=Math.min(12,Math.round(fact.amount/80)*level);
      offer('followup','damage',points,fact,null,`${source(fact)} acrescenta dano com multiplicador inicial de ${fact.amount}%, sujeito ao gatilho e à chance descritos na habilidade.`);
    }
    if(fact.kind!=='buff')continue;
    let fit=1;
    const channel={critDamage:'crit',comboDamage:'combo',counterDamage:'counter',shieldStrength:'shield'}[fact.mechanism];
    if(channel){
      const available=opportunity(channel,world);
      if(!available)continue;
      fit=available===1?0.4:1;
    }
    const tactical=context.mode==='Guarnição'&&['defense','protection'].includes(fact.mechanism)?1.25:1;
    const points=Math.min(12,Math.round(fact.amount/3))*level*fit*tactical;
    const condition=deps(fact).length?` O benefício depende de ${deps(fact).map(c=>LABELS[c]).join(' ou ')}.`:'';
    offer('support_benefit',fact.mechanism,points,fact,null,`${source(fact)} oferece +${fact.amount}% em ${LABELS[fact.mechanism]}.${condition}${fact.stackLimit?' Consideramos o incremento inicial, sem presumir todos os acúmulos.':''}`);
  }
  // A shield can complement an offensive kit even without a shield-specific payoff.
  const shield=sf.filter(f=>f.kind==='state'&&f.mechanism==='shield').sort((a,b)=>access(b,world)-access(a,world))[0];
  if(shield&&access(shield,world))offer('protection','shield',3*access(shield,world),shield,null,`${source(shield)} acrescenta uma fonte de escudo à dupla, respeitando seu gatilho e duração.`);
  const sorted=[...links.values()].sort((a,b)=>b.points-a.points||a.category.localeCompare(b.category)||a.mechanism.localeCompare(b.mechanism));
  return {version:1,score:sorted.reduce((n,l)=>n+l.points,0),coverage:sorted.filter(l=>['support_enables','leader_activates'].includes(l.category)).length,
    utility:sorted.filter(l=>l.category==='support_benefit').reduce((n,l)=>n+l.points,0),links:sorted,
    mechanisms:[...new Set(world.map(f=>LABELS[f.mechanism]).filter(Boolean))],complete:lf.length>0&&sf.length>0};
}
module.exports={LABELS,activeFacts,access,opportunity,scopeFits,evaluateSynergy};
