const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const TROOPS=['Infantaria','Atirador','Motos'];
const MODES=['Campo','Invasão','Guarnição'];
// Product availability is separate from the extracted client configuration.
// Amir remains visible for skill consultation until his release is confirmed.
const PREVIEW_ONLY_IDS=new Set([1123]);
function listed(hero){return hero.rarity==='Lendário'&&!hero.tags.some(tag=>/colet|cacador de zumbis/.test(normalize(tag)));}
function selectable(hero){return listed(hero)&&!PREVIEW_ONLY_IDS.has(hero.id);}
function compatible(hero,troop){return listed(hero)&&TROOPS.includes(troop)&&[troop,'Líder'].includes(hero.troop);}
function applySkin(hero,skinId){
  const skin=hero.skins?.find(s=>s.id===Number(skinId));
  if(!skin)return hero;
  const replacements=new Map(skin.skills.map(s=>[s.replaces,s]));
  return {...hero,selectedSkin:{id:skin.id,name:skin.name},skills:hero.skills.map(s=>{
    const replacement=replacements.get(s.id);
    return replacement?{...replacement,baseSkillId:s.id}:s;
  })};
}
function activeSkills(hero,awakened=true,skinId){
  return applySkin(hero,skinId).skills.filter(s=>!(hero.deploymentRole==='assistant'&&/^(?:quando )?atua como lider\b/.test(normalize(s.description)))&&s.slot!=='Substituição do despertar'&&
    (awakened||s.slot!=='Despertar')&&!(awakened&&hero.awakeningReplaces&&(s.baseSkillId||s.id)===hero.awakeningReplaces));
}
function applies(text,mode){
  const t=normalize(text);
  if(/zumbi|coleta|coletar|construcao|producao de recurso|experiencia/.test(t))return false;
  const notInvasion=/nao.{0,28}invasao|fora (?:de|da) invasao/.test(t);
  const notGarrison=/nao.{0,65}(?:guarnecid|guarnecend|guarnicao)|fora (?:de|da) guarnicao/.test(t);
  if(mode==='Invasão'&&notInvasion||mode==='Guarnição'&&notGarrison)return false;
  if(!notInvasion&&/durante.{0,10}(?:invas|cerco)|(?:quando|enquanto).{0,20}invasao/.test(t)&&mode!=='Invasão')return false;
  if(!notGarrison&&/(?:quando|enquanto|se estiver|se).{0,15}(?:guarnecid|guarnecend|guarnicao)|ao guarnecer|durante.{0,10}guarnicao/.test(t)&&mode!=='Guarnição')return false;
  return true;
}
const features=[
  ['Dano de habilidade',/fator de dano|aumenta.{0,30}dano de habilidade|dano de habilidade.{0,20}aumenta/],
  ['Ataque básico',/ataques? basicos?.{0,35}(?:tem|causa|chance)|aumenta.{0,30}dano de ataque basico|dano de ataque basico.{0,25}aumenta/],
  ['Contra-ataque',/(?:contra-ataques? (?:tem|causam|removem)|aumenta.{0,30}dano de contra-ataque|dano de contra-ataque.{0,25}aumenta)/],
  ['Cura',/fator de cura|recupera.{0,12}pv|cura (?:ate|o |os |aliad)/],
  ['Escudo',/(?:ganha|recebe|concede|gera|cria|ativa).{0,35}escudo/],
  ['Resistência',/reducao de dano|reduz.{0,40}dano.{0,30}(?:recebido|sofrido)|reduz.{0,30}dano de habilidade causado pelo inimigo|aumenta.{0,30}(?:def|pv)|(?:def|pv).{0,25}aumenta/],
  ['Controle',/atordoa|silencia|inflige.{0,20}(?:silencio|atordoamento|lentidao)|reduz.{0,45}velocidade de viagem/],
  ['Fúria',/(?:recupera|restaura|ganha|concede|aumenta).{0,30}furia/],
];
const states=[['Lentidão',/reduz.{0,45}velocidade de viagem|(?:inflige|aplica).{0,20}lentidao/,/(?:alvo|esquad).{0,45}(?:com|sob|afetad).{0,18}lentidao/],
  ['Sangramento',/(?:inflige|aplica|causa).{0,30}sangramento/,/(?:alvo|esquad).{0,45}(?:com|sob|afetad).{0,18}sangramento/],
  ['Veneno',/(?:inflige|aplica).{0,30}veneno/,/(?:alvo|esquad).{0,45}(?:com|sob|afetad).{0,18}veneno/]];
function profile(hero,mode,awakened,troop=hero.troop){
  const clauses=activeSkills(hero,awakened).flatMap(s=>s.description.split(/[.!?]\s+|(?=Quando |Durante |Enquanto )/))
    .filter(t=>applies(t,mode)&&!(/(?:2 ou mais|dois ou mais) tipos (?:de tropa|de tropas)/.test(normalize(t))))
    .map(normalize);
  const produces=states.filter(([,rule])=>clauses.some(t=>rule.test(t))).map(([name])=>name);
  const consumes=states.filter(([, ,rule])=>clauses.some(t=>rule.test(t))).map(([name])=>name);
  if(clauses.some(t=>/reduz.{0,65}(?:pv|hp|vida).{0,30}(?:alvo|inimig)|reduz.{0,30}(?:pv|hp) (?:do|dos) (?:alvo|inimig)/.test(t)))produces.push('Redução de PV');
  if(clauses.some(t=>/(?:infligid|afetad|sob|com).{0,40}reducao de (?:pv|hp|vida)/.test(t)))consumes.push('Redução de PV');
  const found=features.filter(([,rule])=>clauses.some(t=>rule.test(t))).map(([name])=>name);
  return {features:found,produces,consumes,
    shieldBenefit:clauses.some(t=>/bonus.{0,25}escudo obtido|(?:enquanto|quando).{0,30}escudo.{0,35}(?:ativo|ativado)|absorcao do escudo|absorvido pelo escudo/.test(t)),
    healingBenefit:clauses.some(t=>/aumenta.{0,20}(?:efeito|eficacia) de cura/.test(t)),
    counterBenefit:clauses.some(t=>/aumenta.{0,25}dano de contra-ataque|dano de contra-ataque.{0,25}aumenta/.test(t)),
    counterTrigger:clauses.some(t=>/contra-ataques?.{0,25}(?:tem|têm|causam|concedem|removem)/.test(t))};
}
// Roles describe the active kit, not leader/assistant order or simulated combat power.
function combatRole(hero,mode='Campo',awakened=true,troop=hero.troop){
  const defensive=[],offensive=[];
  const protection=new Set();
  for(const skill of activeSkills(hero,awakened)){
    const clauses=skill.description.split(/[.!?]\s+|(?=Quando |Durante |Enquanto )/)
      .filter(t=>applies(t,mode)).map(normalize);
    const ownDefense=clauses.filter(t=>!/(?:cada|alvo).{0,25}(?:esquadrao )?inimigo/.test(t));
    const qualities=[];
    if(ownDefense.some(t=>/(?:ganha|recebe|concede|gera|cria|ativa).{0,35}escudo/.test(t)))qualities.push('Escudo');
    if(ownDefense.some(t=>/fator de cura|recupera.{0,12}pv|cura (?:ate|o |os |aliad)/.test(t)))qualities.push('Cura');
    if(ownDefense.some(t=>/reduz.{0,45}dano.{0,30}(?:recebido|sofrido)|reducao de dano recebido/.test(t)))qualities.push('Redução de dano');
    const ownStats=ownDefense.filter(t=>!/(?:aumenta|aumentam).{0,30}dano.{0,20}(?:recebido|sofrido)/.test(t));
    const otherTroop=troop==='Infantaria'?/esquadrao (?:de )?(?:motocic|atirador|longo alcance)/:troop==='Motos'?/esquadrao (?:de )?(?:infantaria|atirador|longo alcance)/:/esquadrao (?:de )?(?:infantaria|motocic)/;
    if(ownStats.some(t=>!otherTroop.test(t)&&/aumenta.{0,35}(?:def|pv|hp)|(?:def|pv|hp).{0,35}aumenta/.test(t)))qualities.push('DEF / PV');
    if(qualities.length){defensive.push({id:skill.baseSkillId||skill.id,name:skill.name,qualities});for(const q of qualities)protection.add(q);}
    if(clauses.some(t=>/(?:causa|causam|causando|causar|lidando com).{0,30}dano|dano.{0,25}(?:sera desviado|causado ao inimigo)|aumenta.{0,25}dano (?:de |do )?(?:ataque basico|contra-ataque)/.test(t)))offensive.push({id:skill.baseSkillId||skill.id,name:skill.name});
  }
  const skills=[...new Map(defensive.map(s=>[s.id,s])).values()];
  // Require separate defensive skills plus an active form of protection. A
  // single incidental stat boost, enemy debuff or AoE falloff is not a tank kit.
  const tank=skills.length>=2&&['Escudo','Cura','Redução de dano'].some(q=>protection.has(q));
  return {kind:tank?'tank':offensive.length?'damage':'support',defensiveSkills:skills,offensiveSkills:offensive,protection:[...protection]};
}
function balancedPair(a,b,ra,rb){
  const [damage,tank,role]=ra.kind==='damage'&&rb.kind==='tank'?[a,b,rb]:rb.kind==='damage'&&ra.kind==='tank'?[b,a,ra]:[];
  return damage?{damageId:damage.id,tankId:tank.id,damageName:damage.name,tankName:tank.name,protection:role.protection}:null;
}
// Conditions are quoted from active skills so cautions remain tied to actual hero mechanics.
function pairCautions(a,b,mode,awakened){
  const perHero=[a,b].map(hero=>{
    const notes=[];
    for(const skill of activeSkills(hero,awakened)){
      const sentences=skill.description.split(/(?<=[.!?])\s+/);
      for(const sentence of sentences){
        const text=normalize(sentence);
        let advice='',weight=0;
        if(/restante.{0,20}escudo/.test(text)){
          advice='Preserve o escudo até o fim: o dano de retorno depende do valor que restar.';weight=10;
        }else if(/flanquead/.test(text)){
          advice='Para aproveitar o bônus contra alvo flanqueado, coordene o foco com outros esquadrões.';weight=9;
        }else if(/tamanho.{0,60}(?:maior|menor|reducao)|reducao do tamanho/.test(text)){
          advice='O bônus muda com o tamanho do próprio esquadrão; considere as perdas durante o combate.';weight=9;
        }else if(/conjuracoes repetidas|acumul|empilh/.test(text)){
          advice='O efeito depende de acumular ativações; combates curtos podem terminar antes do benefício máximo.';weight=8;
        }else if(/ao receber|quando recebe|quando.{0,25}atacad/.test(text)){
          advice='Este efeito exige receber ataques: ao atacar sem ser alvo, não conte com essa ativação.';weight=8;
        }else if(/\d+(?:[.,]\d+)?% de chance/.test(text)){
          advice='A ativação é probabilística; o efeito não acontece em todos os ataques.';weight=7;
        }else if(/(?:apenas|somente|exclusivamente).{0,35}(?:infantaria|atirador|motocic)/.test(text)){
          advice='Mantenha a composição de tropas exigida para aproveitar este bônus.';weight=7;
        }else if(/a cada|pode ser (?:ativad|acionad)|enquanto.{0,35}escudo/.test(text)){
          advice='Observe a janela de ativação: este benefício não fica ativo continuamente.';weight=6;
        }else if(/quando|enquanto|durante|ao atacar|se o alvo/.test(text)){
          advice='Respeite esta condição ao escolher o alvo e o tipo de combate.';weight=5;
        }
        if(!advice)continue;
        // Keep restrictions that explain why an effect is unavailable in this scenario.
        if(!applies(sentence,mode)){
          advice=`Esta condição restringe o uso do efeito em ${mode.toLowerCase()}; confira antes de levar a dupla para esse cenário.`;weight=9;
        }
        notes.push({weight,text:`${hero.name} · ${skill.name}: ${advice} “${sentence.trim()}”`});
      }
    }
    return notes.sort((x,y)=>y.weight-x.weight).slice(0,2);
  });
  const notes=[];
  for(let i=0;i<2;i++)for(const list of perHero)if(list[i])notes.push(list[i].text);
  return notes;
}
function recommend(heroes,owned,{troop='Infantaria',mode='Campo',awakened=true,skins={},balanced=false}={}){
  if(!TROOPS.includes(troop)||!MODES.includes(mode))return [];
  const ids=new Set(owned.map(Number));
  const eligible=heroes.filter(h=>ids.has(h.id)&&compatible(h,troop)&&selectable(h)&&h.complete).map(h=>applySkin(h,skins[h.id]));
  const profiles=new Map(eligible.map(h=>[h.id,profile(h,mode,awakened,troop)]));
  const roles=balanced?new Map(eligible.map(h=>[h.id,combatRole(h,mode,awakened,troop)])):null;
  const pairs=[];
  for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
    const a=eligible[i],b=eligible[j],pa=profiles.get(a.id),pb=profiles.get(b.id);
    const balance=balanced?balancedPair(a,b,roles.get(a.id),roles.get(b.id)):null;
    if(balanced&&!balance)continue;
    const interactions=[],overlaps=[];
    for(const [first,second,pf,ps] of [[a,b,pa,pb],[b,a,pb,pa]])for(const state of pf.produces){
      if(ps.consumes.includes(state)){
        if(ps.produces.includes(state))overlaps.push(`${first.name} também aplica ${state.toLowerCase()}; ${second.name} já atende essa condição no próprio kit. Isso não presume acúmulo dos efeitos.`);
        else interactions.push(`${first.name} aplica ${state.toLowerCase()}, condição aproveitada por ${second.name}.`);
      }
    }
    const support=[];
    for(const [provider,beneficiary,pf,ps] of [[a,b,pa,pb],[b,a,pb,pa]]){
      if(pf.features.includes('Escudo')&&ps.shieldBenefit){
        const reason=`${provider.name} fornece escudo; ${beneficiary.name} possui efeitos ligados a escudos. Confira as condições e a duração.`;
        if(ps.features.includes('Escudo'))overlaps.push(reason+' O parceiro já gera escudo; não presumimos que os escudos se acumulem.');
        else support.push(reason);
      }
      if(pf.features.includes('Cura')&&ps.healingBenefit){
        const reason=`${provider.name} oferece cura e ${beneficiary.name} possui bônus de efeito de cura; confira o alvo e a condição da habilidade.`;
        if(ps.features.includes('Cura'))overlaps.push(reason+' O parceiro já possui cura no próprio kit.');
        else support.push(reason);
      }
      if(pf.counterTrigger&&ps.counterBenefit)overlaps.push(`${provider.name} depende de contra-ataques e ${beneficiary.name} possui bônus de contra-ataque. O bônus não comprova amplificação de dano adicional de habilidade.`);
    }
    const specialties=[a,b].filter(h=>h.troop===troop).length;
    const modeTags=mode==='Invasão'?['Cerco']:mode==='Guarnição'?['Guarnição']:['Campo de Batalha','General','Cooperação'];
    const scenario=[a,b].filter(h=>h.tags.some(tag=>modeTags.includes(tag))).length;
    const combined=new Set([...pa.features,...pb.features]);
    const damage=p=>p.features.some(f=>['Dano de habilidade','Ataque básico','Contra-ataque'].includes(f));
    const sustain=p=>p.features.some(f=>['Cura','Escudo','Resistência'].includes(f));
    const complement=Number(damage(pa)&&sustain(pb)||damage(pb)&&sustain(pa));
    const reasons=[...interactions,...support,...overlaps];
    if(balance)reasons.unshift(`Dupla equilibrada: ${balance.damageName} fornece dano e ${balance.tankName} oferece sustentação (${balance.protection.join(', ')}).`);
    for(const h of [a,b])if(h.selectedSkin)reasons.push(`${h.name}: habilidades da skin ${h.selectedSkin.name} consideradas.`);
    if(scenario)reasons.push(`${scenario===2?'Os dois têm':'Um dos heróis tem'} especialização indicada para ${mode.toLowerCase()}.`);
    if(specialties===2)reasons.push(`Os dois são especialistas em ${troop.toLowerCase()}.`);
    else reasons.push(specialties?'Combina especialista e versatilidade; confira os bônus de tropa nas habilidades.':'Reúne heróis versáteis; confira os bônus de tropa nas habilidades.');
    if(complement)reasons.push('Combina fontes de dano com recursos de resistência, cura ou escudo.');
    const cautions=pairCautions(a,b,mode,awakened);
    pairs.push({a,b,balance,features:[...combined],reasons,cautions,priority:[interactions.length,support.length,scenario,specialties,complement]});
  }
  return pairs.sort((x,y)=>{for(let i=0;i<x.priority.length;i++)if(x.priority[i]!==y.priority[i])return y.priority[i]-x.priority[i];return (x.a.name+x.b.name).localeCompare(y.a.name+y.b.name,'pt');});
}
// Bounded search over whole formations, rather than picking the best pair greedily.
// Keep several arrangements per used roster so new versions can change partners.
function formationKey(pairs){return pairs.map(p=>[p.a.id,p.b.id].sort((a,b)=>a-b).join('-')).sort().join('|');}
function buildFormation(pairs,previous=[],history=[]){
  const ids=[...new Set(pairs.flatMap(p=>[p.a.id,p.b.id]))].sort((a,b)=>a-b);
  const count=Math.min(5,Math.floor(ids.length/2));
  if(!count)return [];
  const bits=new Map(ids.map((id,i)=>[id,1n<<BigInt(i)]));
  const dimensions=Math.max(...pairs.map(p=>p.priority.length));
  const previousPairs=new Set(previous.map(p=>formationKey([p])));
  const available=pairs.length>1?pairs.filter(p=>!previousPairs.has(formationKey([p]))):pairs;
  const edges=available.map((pair,index)=>({pair,index:pairs.indexOf(pair),mask:bits.get(pair.a.id)|bits.get(pair.b.id),score:Array.from({length:dimensions},(_,i)=>pair.priority[i]||0)}));
  const compare=(a,b)=>{for(let i=0;i<dimensions;i++)if(a.score[i]!==b.score[i])return b.score[i]-a.score[i];return a.key.localeCompare(b.key);};
  let beam=[{mask:0n,score:Array(dimensions).fill(0),indices:[],key:''}];
  for(let depth=0;depth<count;depth++){
    const candidates=new Map();
    for(const state of beam)for(const edge of edges){
      if(state.mask&edge.mask)continue;
      const mask=state.mask|edge.mask;
      const indices=[...state.indices,edge.index].sort((a,b)=>a-b);
      const key=indices.join(',');
      const alternatives=candidates.get(mask)||[];
      if(alternatives.some(s=>s.key===key))continue;
      const next={mask,indices,key,score:state.score.map((n,i)=>n+edge.score[i])};
      alternatives.push(next);alternatives.sort(compare);alternatives.length=Math.min(8,alternatives.length);
      candidates.set(mask,alternatives);
    }
    if(!candidates.size)break;
    beam=[...candidates.values()].flat().sort(compare).slice(0,128);
  }
  const seen=new Set(history);
  seen.add(formationKey(previous));
  const chosen=beam.find(s=>!seen.has(formationKey(s.indices.map(i=>pairs[i]))))||beam[0];
  const result=chosen?chosen.indices.map(i=>pairs[i]):[];
  // A scarce role may make changing every partner impossible. Keep the maximum
  // attainable squad count, and report an unchanged formation when necessary.
  if(previous.length&&result.length<previous.length)return buildFormation(pairs,[],[...history,formationKey(previous)]);
  return result;
}
module.exports={combatRole,balancedPair,applySkin,pairCautions,buildFormation,formationKey,TROOPS,MODES,listed,selectable,compatible,activeSkills,profile,applies,recommend,normalize};
