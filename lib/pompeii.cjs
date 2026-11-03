const ROLES={rally:'Rally',guarnicao:'Guarnição',campo:'Campo',incubadora:'Incubadora'};
const ASSIGNMENTS={rally:'Rally',heliponto:'Heliponto',base:'Base de Operações',campo:'Campo',zumbis:'Zumbis / Apoio'};
const SIDES=['verde','roxa'];
const REQUIRED=['rally','heliponto','base'];
const skill=assignment=>assignment==='rally'?'rally':['heliponto','base'].includes(assignment)?'guarnicao':assignment==='campo'?'campo':null;
const capable=(player,assignment)=>!skill(assignment)||player.roles?.includes(skill(assignment));
const support=player=>player.roles?.includes('campo')?'campo':'zumbis';
const power=player=>Number.isFinite(player.power)&&player.power>0?player.power:0;
function validateRoles(roles){if(!Array.isArray(roles)||roles.length>Object.keys(ROLES).length||roles.some(r=>!Object.hasOwn(ROLES,r))||new Set(roles).size!==roles.length)throw Error('Selecione funções válidas.');return Object.keys(ROLES).filter(r=>roles.includes(r));}
function buildTeams(players){
  const ordered=[...players].sort((a,b)=>power(b)-power(a)||a.nick.localeCompare(b.nick,'pt-BR'));
  if(new Set(ordered.map(p=>p.id)).size!==ordered.length)throw Error('Jogador duplicado.');
  const slots=REQUIRED.flatMap(assignment=>SIDES.map(side=>({side,assignment})));
  const occupied=new Map(),taken=new Map();
  function match(index,seen){
    for(const p of ordered){if(seen.has(p.id)||!capable(p,slots[index].assignment))continue;seen.add(p.id);
      if(!taken.has(p.id)||match(taken.get(p.id),seen)){occupied.set(index,p);taken.set(p.id,index);return true;}
    }return false;
  }
  slots.forEach((_,i)=>match(i,new Set()));
  const teams={verde:[],roxa:[]};
  for(const [i,p]of occupied)teams[slots[i].side].push({id:p.id,assignment:slots[i].assignment});
  const sums=side=>teams[side].reduce((sum,e)=>sum+power(ordered.find(p=>p.id===e.id)),0);
  for(const p of ordered.filter(p=>!taken.has(p.id))){const side=teams.verde.length!==teams.roxa.length?(teams.verde.length<teams.roxa.length?'verde':'roxa'):sums('verde')<=sums('roxa')?'verde':'roxa';teams[side].push({id:p.id,assignment:support(p)});}
  // Improve power balance without changing headcount or leaving a required role uncovered.
  const byId=new Map(ordered.map(p=>[p.id,p]));
  for(let iteration=0;iteration<100;iteration++){
    const delta=sums('verde')-sums('roxa');
    const incubation=p=>p.roles?.includes('incubadora')?1:0;
    const incubationDelta=teams.verde.reduce((sum,e)=>sum+incubation(byId.get(e.id)),0)-teams.roxa.reduce((sum,e)=>sum+incubation(byId.get(e.id)),0);
    let best=Math.abs(delta),bestIncubation=Math.abs(incubationDelta),pair;
    for(let i=0;i<teams.verde.length;i++)for(let j=0;j<teams.roxa.length;j++){
      const a=teams.verde[i],b=teams.roxa[j],pa=byId.get(a.id),pb=byId.get(b.id);
      if(!capable(pa,b.assignment)||!capable(pb,a.assignment))continue;
      const next=Math.abs(delta-2*power(pa)+2*power(pb)),nextIncubation=Math.abs(incubationDelta-2*incubation(pa)+2*incubation(pb));
      if(nextIncubation<bestIncubation||nextIncubation===bestIncubation&&next<best){best=next;bestIncubation=nextIncubation;pair=[i,j];}
    }
    if(!pair)break;const [i,j]=pair,a=teams.verde[i].id;teams.verde[i].id=teams.roxa[j].id;teams.roxa[j].id=a;
  }
  return teams;
}
function movePlayer(teams,id,to){
  if(!SIDES.includes(to))return teams;
  const from=SIDES.find(side=>teams[side].some(e=>e.id===id));if(!from||from===to)return teams;
  const entry=teams[from].find(e=>e.id===id);
  const assignment=REQUIRED.includes(entry.assignment)&&teams[to].some(e=>e.assignment===entry.assignment)?'zumbis':entry.assignment;
  return {...teams,[from]:teams[from].filter(e=>e.id!==id),[to]:[...teams[to],{id,assignment}]};
}
function assignPlayer(teams,id,assignment,players){
  if(!Object.hasOwn(ASSIGNMENTS,assignment))return teams;
  const side=SIDES.find(s=>teams[s].some(e=>e.id===id));if(!side)return teams;
  return {...teams,[side]:teams[side].map(e=>e.id===id?{...e,assignment}:REQUIRED.includes(assignment)&&e.assignment===assignment?{...e,assignment:support(players.find(p=>p.id===e.id)||{})}:e)};
}
function inspectTeams(teams,players){
  const byId=new Map(players.map(p=>[p.id,p])),warnings=[];
  for(const side of SIDES){
    const label=side==='verde'?'Verde':'Roxa';
    for(const assignment of REQUIRED)if(teams[side].filter(e=>e.assignment===assignment).length!==1)warnings.push(`${label}: defina 1 responsável por ${ASSIGNMENTS[assignment]}.`);
    for(const e of teams[side]){const p=byId.get(e.id);if(!p)warnings.push(`${label}: jogador fora da lista atual.`);else if(!capable(p,e.assignment))warnings.push(`${p.nick}: ${ASSIGNMENTS[e.assignment]} não consta nas funções cadastradas.`);}
  }
  const ids=SIDES.flatMap(s=>teams[s].map(e=>e.id));
  if(new Set(ids).size!==ids.length)warnings.push('Há jogadores repetidos entre as equipes.');
  if(Math.abs(teams.verde.length-teams.roxa.length)>1)warnings.push('As equipes têm diferença de mais de 1 jogador.');
  return warnings;
}
function announcement(teams,players,opponents=''){
  const byId=new Map(players.map(p=>[p.id,p]));
  const nick=e=>String(byId.get(e.id)?.nick||'A definir').replace(/[\r\n\t]+/g,' ');
  const names=side=>teams[side].map(nick).join(', ')||'A definir';
  const owner=(side,assignment)=>teams[side].filter(e=>e.assignment===assignment).map(nick).join(', ')||'A definir';
  const zombies=SIDES.flatMap(s=>teams[s]).filter(e=>e.assignment==='campo'||e.assignment==='zumbis').map(nick).join(', ')||'Nenhum';
  const incubators=SIDES.flatMap(side=>teams[side]).filter(e=>byId.get(e.id)?.roles?.includes('incubadora')).map(nick);
  const incubatorNames=incubators.length>1?incubators.slice(0,-1).join(', ')+' e '+incubators.at(-1):incubators[0]||'A definir';
  const total=teams.verde.length+teams.roxa.length;
  const matchup=/^[1-9]\d{0,2}$/.test(String(opponents))?`Pareamento: ${opponents} adversários contra ${total} do nosso lado. `:'';
  let text=`BOM DIA, INSCRITOS NA POMPEIA!\n\nLeiam tudo com atenção! Somos ${total} jogadores.\n\nEQUIPE VERDE: ${names('verde')}.\nEQUIPE ROXA: ${names('roxa')}.\n\nRESPONSÁVEIS\nRally: ${owner('verde','rally')} (Verde) e ${owner('roxa','rally')} (Roxa).\nGuarnição Verde: ${owner('verde','heliponto')} no Heliponto; ${owner('verde','base')} na Base de Operações.\nGuarnição Roxa: ${owner('roxa','heliponto')} no Heliponto; ${owner('roxa','base')} na Base de Operações.\nZumbis: ${zombies}.\nIncubadora: ${incubatorNames}.\n\n${matchup}Foco e organização! Cada equipe cuida do seu lado.\n\n1. TODOS: primeiro preencham o rally da sua equipe. Rally completo é essencial!\n2. Mantenham reforçadas as guarnições do Heliponto e da Base de Operações do seu lado. Sigam as tags e os responsáveis.\n3. Os primeiros rallys atacarão o Heliponto adversário. Quem luta em campo deve acompanhar e apoiar o ataque.\n4. Após preencher o rally, façam os zumbis. Os responsáveis pela Incubadora devem capturá-la; os demais apoiam conforme o chat.\n5. Se o Heliponto não cair, ajustaremos a estratégia pelo chat.\n\nATENÇÃO ÀS TAGS E AO CHAT!\nVamos jogar juntos! Abraços!`;
  if(text.length>1500){
    const priorities=text.indexOf('\n\n1. TODOS:');
    text=text.slice(0,priorities)+'\n\nPRIORIDADES\n1. Todos: preencham primeiro o rally do seu time.\n2. Reforcem o Heliponto e a Base de Operações do seu lado.\n3. Rallys atacam o Heliponto adversário; quem luta em campo acompanha e apoia.\n4. Após o rally, façam zumbis. Os responsáveis pela Incubadora fazem a captura.\n5. Se o Heliponto não cair, mudaremos a estratégia pelo chat.\n\nATENÇÃO ÀS TAGS E AO CHAT! Abraços!';
  }
  if(text.length>1500)text=`POMPEIA - ${total} INSCRITOS\n\nVERDE: ${names('verde')}.\nROXA: ${names('roxa')}.\n\nRALLY: ${owner('verde','rally')} (Verde); ${owner('roxa','rally')} (Roxa).\nGUARNIÇÕES\nVerde: ${owner('verde','heliponto')} (Heliponto); ${owner('verde','base')} (Base).\nRoxa: ${owner('roxa','heliponto')} (Heliponto); ${owner('roxa','base')} (Base).\nZUMBIS: ${zombies}.\nIncubadora: ${incubatorNames}.\n\n${matchup}Cada time cuida do seu lado.\n1. TODOS: preencham primeiro o rally do seu time!\n2. Reforcem seu Heliponto e sua Base de Operações.\n3. Rallys atacam o Heliponto adversário; campo acompanha e apoia.\n4. Após o rally, façam zumbis. Incubadora: responsáveis fazem a captura.\n5. Se o Heliponto não cair, ajustamos pelo chat.\nATENÇÃO ÀS TAGS E AO CHAT! Abraços!`;
  return {text,length:text.length,overLimit:text.length>1500};
}
module.exports={ROLES,ASSIGNMENTS,SIDES,REQUIRED,validateRoles,buildTeams,movePlayer,assignPlayer,inspectTeams,announcement};
