const {evaluateSynergy}=require('./beast-synergy.cjs');
const {compareLeadership}=require('./beast-leadership.cjs');
const {normalize,buildFormation:buildHeroFormation,formationKey:heroFormationKey}=require('./hero-combinations.cjs');
const ELEMENTS=['Fogo','Água','Grama','Físico'];
const MODES=['Campo','Invasão','Guarnição'];
const ROLES=['Líder','Suporte'];
function listed(beast){return ['Lendário','Épico'].includes(beast.rarity);}
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
function pairCautions(leader,support,context){
  const perRole=[[leader,'Líder'],[support,'Suporte']].map(([beast,role])=>{
    const notes=[];
    for(const skill of roleSkills(beast,role)){
      const description=supportBranch(skill.description,support.element);
      for(const sentence of description.split(/(?<=[.!?])\s+/)){
        const text=normalize(sentence);
        const enemy=ELEMENTS.find(e=>new RegExp('tipo '+normalize(e)+'|(?:adversar|oponent).{0,100}'+normalize(e)).test(text));
        let advice='',weight=0;
        if(enemy){
          advice=context.enemyElement===enemy?`Este bônus exige manter o alvo de ${enemy.toLowerCase()}.`:`Este bônus exige inimigo de ${enemy.toLowerCase()}; ${context.enemyElement?'não se aplica ao elemento selecionado':'o elemento inimigo ainda não foi informado'}.`;weight=8;
        }else if(/ao receber/.test(text)){
          advice='A proteção depende de receber o tipo de dano indicado; não fica disponível de forma permanente.';weight=7;
        }else if(/(?:ao acionar|acionada por|acionado por|quando acionar).{0,45}(?:combo|contra-ataque)/.test(text)){
          advice=/combo/.test(text)?'Este efeito depende de um combo. Use chips e uma parceira que favoreçam esse gatilho.':'Este efeito depende de contra-ataque. Use chips e uma parceira que favoreçam esse gatilho.';weight=10;
        }else if(/(?:causa|causar).{0,20}(?:acerto critico|golpe critico)/.test(text)){
          advice='O efeito exige acerto crítico; invista em CRIT para aproveitar esta habilidade.';weight=10;
        }else if(/(?:com|possui|tiver|tem|tempo de) (?:um )?escudo/.test(text)){
          advice='O bônus exige escudo ativo; acompanhe a duração e a reposição do escudo.';weight=9;
        }else if(/(?:com|de|ao|inflige|infligir).{0,20}corrosao|detonar/.test(text)){
          advice='Respeite a condição de aplicação e a duração do estado antes de contar com este efeito.';weight=8;
        }else if(/acumul|maximo de|para cada/.test(text)){
          advice='O benefício precisa de tempo ou ativações para chegar ao limite; combates curtos podem limitar o resultado.';weight=8;
        }else if([...text.matchAll(/(\d+(?:[.,]\d+)?)% de chance/g)].some(m=>Number(m[1].replace(',','.'))<100)){
          advice='O efeito tem chance de ativação; não conte com ele em todos os ataques.';weight=7;
        }else if(/guarnecid|guarnicao|invasao|agrupad/.test(text)){
          advice='Este efeito depende do cenário ou do alvo indicado, não de qualquer combate.';weight=8;
        }else if(/a cada|por \d+s|proxima vez/.test(text)){
          advice='Respeite o intervalo e a janela do bônus; o efeito não permanece ativo o tempo todo.';weight=5;
        }
        if(advice)notes.push({weight,text:`${beast.name} · ${role} · ${skill.name}: ${advice} “${sentence.trim()}”`});
      }
    }
    return notes.sort((a,b)=>b.weight-a.weight).slice(0,2);
  });
  return [0,1].flatMap(i=>perRole.flatMap(notes=>notes[i]?[notes[i].text]:[]));
}
const asHeroPair=p=>({a:p.leader,b:p.support,priority:[p.leadership.leader?.baseMight||0,p.synergy.score,p.synergy.coverage,p.synergy.utility],original:p});
function formationKey(pairs){return heroFormationKey(pairs.map(asHeroPair));}
function buildFormation(pairs,previous=[],history=[]){
  // Both orientations are scored above; keep the better role assignment per partnership.
  const best=new Map();
  for(const pair of pairs){const key=formationKey([pair]);if(!best.has(key))best.set(key,asHeroPair(pair));}
  return buildHeroFormation([...best.values()],previous.map(asHeroPair),history).map(p=>p.original);
}
function recommend(beasts,owned,{mode='Campo',enemyElement=''}={}){
  if(!MODES.includes(mode)||enemyElement&&!ELEMENTS.includes(enemyElement))return [];
  const ids=new Set(owned.map(Number)),eligible=beasts.filter(b=>ids.has(b.id)&&listed(b)&&b.complete);
  const pairs=[];
  for(const leader of eligible)for(const support of eligible){
    if(leader.id===support.id)continue;
    const context={mode,enemyElement,supportElement:support.element};
    const synergy=evaluateSynergy(leader,support,context);
    const relations=synergy.links.filter(l=>['support_enables','leader_activates'].includes(l.category));
    const benefits=synergy.links.filter(l=>!['support_enables','leader_activates'].includes(l.category));
    const reasons=[...relations.slice(0,3),...benefits.slice(0,relations.length?1:3)].map(l=>l.reason);
    if(!reasons.length)reasons.push('Confira os efeitos de líder e suporte desta dupla; as regras de complementaridade ainda não cobrem esta configuração.');
    const leadership=compareLeadership(leader,support,{mode});
    // Preserve a clear numerical advantage; skill synergy resolves stat tradeoffs.
    const hardPreference=['dominance','stats'].includes(leadership.basis)?leadership.decision+1:1;
    pairs.push({leader,support,leadership,synergy,reasons,cautions:pairCautions(leader,support,context),mechanisms:synergy.mechanisms,
      priority:[hardPreference,synergy.score,synergy.coverage,synergy.utility,leadership.decision+1]});
  }
  for(const pair of pairs){
    if(pair.priority[0]===1&&pair.leadership.decision<0){
      pair.leadership={...pair.leadership,reason:`A escolha de ${pair.leader.name} considera como ${pair.support.name} favorece suas habilidades. Há compensações na comparação numérica; a complementaridade da dupla tem preferência sobre o desempate isolado de atributos.`};
    }
  }
  return pairs.sort((a,b)=>{for(let i=0;i<a.priority.length;i++)if(a.priority[i]!==b.priority[i])return b.priority[i]-a.priority[i];return a.leader.id-b.leader.id||a.support.id-b.support.id;});
}
module.exports={buildFormation,formationKey,pairCautions,ELEMENTS,MODES,ROLES,listed,roleSkills,profile,recommend};
