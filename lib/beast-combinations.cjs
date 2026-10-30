const {normalize}=require('./hero-combinations.cjs');
const ELEMENTS=['Fogo','Água','Grama','Físico'];
const MODES=['Campo','Invasão','Guarnição'];
const ROLES=['Líder','Suporte'];
function listed(beast){return beast.rarity==='Lendário';}
function roleSkills(beast,role){return ROLES.includes(role)?beast.skills[role]||[]:[];}

function supportBranch(text,supportElement){
  if(!/elemento da besta bioquimica de suporte/.test(normalize(text)))return text;
  const start=text.search(/(?:Físico|Fogo|Água|Grama):/);
  if(start<0)return '';
  const header=text.slice(0,start);
  const branches=[...text.slice(start).matchAll(/(Físico|Fogo|Água|Grama):\s*([\s\S]*?)(?=(?:Físico|Fogo|Água|Grama):|$)/g)];
  const selected=branches.find(m=>m[1]===supportElement);
  return selected?header.replace(/[.!?]\s*$/,' ')+selected[2]:'';
}
function segmentContext(text,{mode,enemyElement}){
  const t=normalize(text),head=t.split(',')[0];
  const outsideInv=/nao.{0,32}invasao|fora (?:de|da) invasao/.test(head);
  const outsideGar=/nao.{0,65}(?:guarnecid|guarnicao)|fora (?:de|da) guarnicao/.test(head);
  if(mode==='Invasão'&&outsideInv||mode==='Guarnição'&&outsideGar)return null;
  const invasion=!outsideInv&&/(?:durante|quando|enquanto).{0,32}invas/.test(head);
  const garrison=!outsideGar&&/(?:quando|enquanto).{0,65}guarnecid|ao guarnecer|durante.{0,16}guarnicao/.test(head);
  if((invasion||garrison)&&!(mode==='Invasão'&&invasion||mode==='Guarnição'&&garrison))return null;
  const required=ELEMENTS.find(e=>new RegExp('tipo '+normalize(e)+'|(?:adversar|oponent).{0,100}'+normalize(e)).test(t));
  if(required&&required!==enemyElement)return null;
  return {text:t,scenario:Number(invasion||garrison),enemy:Number(Boolean(required))};
}
const mechanisms=[
  ['Corrosão',/corrosao/],['Detonar',/detonar/],['Combo',/combo/],['Contra-ataque',/contra-ataq/],
  ['CRIT',/crit/],['Escudo',/escudo/],['Cura',/cura|recupera.{0,20}pv/],
  ['Resistência',/reducao de dano|def (?:do |de )?lider \+|def \+/],
];
const states=[
  ['Corrosão',/(?:inflig|aplic).{0,45}corrosao/,/(?:alvo|esquad).{0,45}(?:com|afetad).{0,20}corrosao|dano de corrosao \+/],
  ['Detonar',/(?:inflig|aplic).{0,45}detonar/,/(?:alvo|esquad).{0,45}(?:com|afetad).{0,20}detonar|dano de detonar \+/],
  ['Escudo',/(?:ganha|gera|recebe|concede).{0,25}escudo/,/(?:enquanto|quando).{0,35}(?:tem|possui|com) (?:um )?escudo/],
];
function profile(beast,role,context){
  const segments=roleSkills(beast,role).flatMap(s=>supportBranch(s.description,context.supportElement).split(/[.!?]\s+|(?=Quando |Durante |Enquanto |Se )/))
    .map(text=>segmentContext(text,context)).filter(Boolean);
  const text=segments.map(s=>s.text).join(' ');
  return {mechanisms:mechanisms.filter(([,regex])=>regex.test(text)).map(([key])=>key),
    produces:states.filter(([,regex])=>regex.test(text)).map(([key])=>key),
    benefits:states.filter(([, ,regex])=>regex.test(text)).map(([key])=>key),
    scenario:segments.reduce((n,s)=>n+s.scenario,0),enemy:segments.reduce((n,s)=>n+s.enemy,0)};
}
function recommend(beasts,owned,{mode='Campo',enemyElement=''}={}){
  if(!MODES.includes(mode)||enemyElement&&!ELEMENTS.includes(enemyElement))return [];
  const ids=new Set(owned.map(Number)),eligible=beasts.filter(b=>ids.has(b.id)&&listed(b)&&b.complete);
  const pairs=[];
  for(const leader of eligible)for(const support of eligible){
    if(leader.id===support.id)continue;
    const context={mode,enemyElement,supportElement:support.element};
    const lp=profile(leader,'Líder',context),sp=profile(support,'Suporte',context);
    const interactions=[];
    for(const [first,second,a,b,role] of [[leader,support,lp,sp,'líder'],[support,leader,sp,lp,'suporte']]){
      for(const state of a.produces)if(b.benefits.includes(state))interactions.push(`${first.name} como ${role} aplica ${state.toLowerCase()}, condição aproveitada por ${second.name}.`);
    }
    const shared=lp.mechanisms.filter(m=>sp.mechanisms.includes(m)&&!['Cura','Resistência'].includes(m));
    const reasons=[...interactions];
    if(shared.length)reasons.push(`Os conjuntos de líder e suporte compartilham ${shared.slice(0,3).join(', ')}.`);
    const scenario=lp.scenario+sp.scenario,enemy=lp.enemy+sp.enemy;
    if(scenario)reasons.push(`Há efeitos de ${mode.toLowerCase()} nas habilidades dessas funções.`);
    if(enemy)reasons.push(`Inclui efeitos condicionados à besta inimiga de ${enemyElement.toLowerCase()}.`);
    const sustain=Number([...lp.mechanisms,...sp.mechanisms].some(m=>['Escudo','Cura','Resistência'].includes(m)));
    if(sustain)reasons.push('O par inclui recursos de proteção ou resistência.');
    if(!reasons.length)reasons.push('Par disponível no seu elenco. Confira os gatilhos e condições de cada função.');
    pairs.push({leader,support,reasons,mechanisms:[...new Set([...lp.mechanisms,...sp.mechanisms])],priority:[interactions.length,enemy,scenario,shared.length,sustain]});
  }
  return pairs.sort((a,b)=>{for(let i=0;i<a.priority.length;i++)if(a.priority[i]!==b.priority[i])return b.priority[i]-a.priority[i];return (a.leader.name+a.support.name).localeCompare(b.leader.name+b.support.name,'pt');});
}
module.exports={ELEMENTS,MODES,ROLES,listed,roleSkills,profile,recommend};
