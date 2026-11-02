const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const TROOPS=['Infantaria','Atirador','Motos'];
const MODES=['Campo','Invasão','Guarnição'];
// Product availability is separate from the extracted client configuration.
// Amir remains visible for skill consultation until his release is confirmed.
const PREVIEW_ONLY_IDS=new Set([1123]);
function listed(hero){return hero.rarity==='Lendário'&&!hero.tags.some(tag=>/colet|cacador de zumbis/.test(normalize(tag)));}
function selectable(hero){return listed(hero)&&!PREVIEW_ONLY_IDS.has(hero.id);}
function compatible(hero,troop){return listed(hero)&&TROOPS.includes(troop)&&[troop,'Líder'].includes(hero.troop);}
function activeSkills(hero,awakened=true){
  return hero.skills.filter(s=>s.slot!=='Substituição do despertar'&&
    (awakened||s.slot!=='Despertar')&&!(awakened&&hero.awakeningReplaces&&s.id===hero.awakeningReplaces));
}
function applies(text,mode){
  const t=normalize(text);
  if(/zumbi|coleta|coletar|construcao|producao de recurso|experiencia/.test(t))return false;
  const notInvasion=/nao.{0,28}invasao|fora (?:de|da) invasao/.test(t);
  const notGarrison=/nao.{0,65}(?:guarnecid|guarnicao)|fora (?:de|da) guarnicao/.test(t);
  if(mode==='Invasão'&&notInvasion||mode==='Guarnição'&&notGarrison)return false;
  if(!notInvasion&&/durante.{0,10}invas|(?:quando|enquanto).{0,20}invasao/.test(t)&&mode!=='Invasão')return false;
  if(!notGarrison&&/(?:quando|enquanto).{0,15}guarnecid|ao guarnecer|durante.{0,10}guarnicao/.test(t)&&mode!=='Guarnição')return false;
  return true;
}
const features=[
  ['Dano de habilidade',/fator de dano|dano de habilidade/],
  ['Ataque básico',/ataque[s]? basico/],
  ['Contra-ataque',/contra-ataq/],
  ['Cura',/fator de cura|recupera.{0,12}pv|cura (?:ate|o |os |aliad)/],
  ['Escudo',/(?:ganha|recebe|concede|gera|cria).{0,35}escudo/],
  ['Resistência',/reducao de dano|aumenta.{0,30}(?:def|pv)|(?:def|pv).{0,25}aumenta/],
  ['Controle',/atordoa|silencia|inflige.{0,20}(?:silencio|atordoamento|lentidao)|reduz.{0,45}velocidade de viagem/],
  ['Fúria',/(?:recupera|ganha|aumenta).{0,30}furia/],
];
const states=[['Lentidão',/reduz.{0,45}velocidade de viagem|(?:inflige|aplica).{0,20}lentidao/,/(?:alvo|esquad).{0,45}(?:com|sob|afetad).{0,18}lentidao/],
  ['Sangramento',/(?:inflige|aplica|causa).{0,30}sangramento/,/(?:alvo|esquad).{0,45}(?:com|sob|afetad).{0,18}sangramento/],
  ['Veneno',/(?:inflige|aplica).{0,30}veneno/,/(?:alvo|esquad).{0,45}(?:com|sob|afetad).{0,18}veneno/]];
function profile(hero,mode,awakened){
  const text=activeSkills(hero,awakened).flatMap(s=>s.description.split(/[.!?]\s+|(?=Quando |Durante |Enquanto )/)).filter(t=>applies(t,mode)).map(normalize).join(' ');
  return {features:features.filter(([,rule])=>rule.test(text)).map(([name])=>name),
    produces:states.filter(([,rule])=>rule.test(text)).map(([name])=>name),
    consumes:states.filter(([, ,rule])=>rule.test(text)).map(([name])=>name)};
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
function recommend(heroes,owned,{troop='Infantaria',mode='Campo',awakened=true}={}){
  if(!TROOPS.includes(troop)||!MODES.includes(mode))return [];
  const ids=new Set(owned.map(Number));
  const eligible=heroes.filter(h=>ids.has(h.id)&&compatible(h,troop)&&selectable(h)&&h.complete);
  const pairs=[];
  for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
    const a=eligible[i],b=eligible[j],pa=profile(a,mode,awakened),pb=profile(b,mode,awakened);
    const interactions=[];
    for(const [first,second,pf,ps] of [[a,b,pa,pb],[b,a,pb,pa]])for(const state of pf.produces){
      if(ps.consumes.includes(state))interactions.push(`${first.name} aplica ${state.toLowerCase()}, condição aproveitada por ${second.name}.`);
    }
    const specialties=[a,b].filter(h=>h.troop===troop).length;
    const modeTags=mode==='Invasão'?['Cerco']:mode==='Guarnição'?['Guarnição']:['Campo de Batalha','General','Cooperação'];
    const scenario=[a,b].filter(h=>h.tags.some(tag=>modeTags.includes(tag))).length;
    const combined=new Set([...pa.features,...pb.features]);
    const damage=p=>p.features.some(f=>['Dano de habilidade','Ataque básico','Contra-ataque'].includes(f));
    const sustain=p=>p.features.some(f=>['Cura','Escudo','Resistência'].includes(f));
    const complement=Number(damage(pa)&&sustain(pb)||damage(pb)&&sustain(pa));
    const reasons=[...interactions];
    if(scenario)reasons.push(`${scenario===2?'Os dois têm':'Um dos heróis tem'} especialização indicada para ${mode.toLowerCase()}.`);
    if(specialties===2)reasons.push(`Os dois são especialistas em ${troop.toLowerCase()}.`);
    else reasons.push(specialties?'Combina especialista e versatilidade; confira os bônus de tropa nas habilidades.':'Reúne heróis versáteis; confira os bônus de tropa nas habilidades.');
    if(complement)reasons.push('Combina fontes de dano com recursos de resistência, cura ou escudo.');
    const cautions=pairCautions(a,b,mode,awakened);
    pairs.push({a,b,features:[...combined],reasons,cautions,priority:[interactions.length,scenario,specialties,complement]});
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
      if(depth===count-2&&!edges.some(e=>!(mask&e.mask)))continue;
      const indices=[...state.indices,edge.index].sort((a,b)=>a-b);
      const key=indices.join(',');
      const alternatives=candidates.get(mask)||[];
      if(alternatives.some(s=>s.key===key))continue;
      const next={mask,indices,key,score:state.score.map((n,i)=>n+edge.score[i])};
      alternatives.push(next);alternatives.sort(compare);alternatives.length=Math.min(8,alternatives.length);
      candidates.set(mask,alternatives);
    }
    beam=[...candidates.values()].flat().sort(compare).slice(0,128);
  }
  const seen=new Set(history);
  seen.add(formationKey(previous));
  const chosen=beam.find(s=>!seen.has(formationKey(s.indices.map(i=>pairs[i]))))||beam[0];
  return chosen?chosen.indices.map(i=>pairs[i]):[];
}
module.exports={pairCautions,buildFormation,formationKey,TROOPS,MODES,listed,selectable,compatible,activeSkills,profile,applies,recommend,normalize};
