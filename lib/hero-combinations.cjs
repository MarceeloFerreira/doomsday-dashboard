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
    pairs.push({a,b,features:[...combined],reasons,priority:[interactions.length,scenario,specialties,complement]});
  }
  return pairs.sort((x,y)=>{for(let i=0;i<x.priority.length;i++)if(x.priority[i]!==y.priority[i])return y.priority[i]-x.priority[i];return (x.a.name+x.b.name).localeCompare(y.a.name+y.b.name,'pt');});
}
module.exports={TROOPS,MODES,listed,selectable,compatible,activeSkills,profile,applies,recommend,normalize};
