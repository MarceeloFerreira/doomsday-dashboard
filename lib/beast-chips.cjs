const FOCUS_LABELS={crit:'CRIT',combo:'Combo',counter:'Contra-ataque'};
const TIER_LABELS={purple:'Roxo',legendary:'Lendário',oc:'OC (soberbo)',uncommon:'Incomum'};
const CHIP_PROFILES=[{id:'purple',name:'Só roxos',description:'Base econômica para as duas bestas.'},{id:'mixed',name:'Roxos + lendários',description:'Evolua por blocos, dentro do seu limite.'},{id:'oc',name:'Avaliar OC / soberbos',description:'Só quando o gatilho e o cenário combinam.'}];
// Each recommendation has a role-specific skill reference in data/beasts.json.
// These are qualitative build directions, not combat scores or damage rankings.
const DIRECTIONS={
  21:{leader:['combo',6074,'Corrosão concede Combo para alimentar as habilidades.'],support:['combo',6073,'O combo garante a aplicação de Corrosão da habilidade de suporte.']},
  22:{leader:['combo',6081,'Combos reforçam a Corrosão e o próximo uso da habilidade de líder.'],support:['combo',6080,'Combos aplicam Corrosão e reduzem o CRIT do alvo.']},
  23:{leader:['crit',6060,'Acertos críticos reforçam o dano do próximo uso da habilidade.'],support:['crit',6059,'Críticos da habilidade ativa acionam acompanhamento e reduzem a DEF do alvo.']},
  24:{leader:['crit',6067,'Acertos críticos concedem DANO CRIT e CRIT.'],support:['crit',6066,'Críticos da habilidade ativa acionam o dano de acompanhamento.']},
  25:{leader:['counter',6093,'Contra-ataques durante o escudo reforçam o dano da habilidade ativa.'],support:['counter',6094,'O contra-ataque garante a criação do escudo da habilidade de suporte.']},
  26:{leader:['counter',6088,'Contra-ataques podem gerar o escudo.'],support:['counter',6087,'Contra-ataques acionam o dano de acompanhamento.']},
  27:{leader:['combo',6102,'Combos reforçam o próximo uso da habilidade ativa.'],support:['crit',6101,'Críticos da habilidade ativa acionam o dano de acompanhamento.']},
  28:{leader:['counter',6109,'Contra-ataques reforçam o próximo uso da habilidade ativa.'],support:['crit',6108,'Críticos da habilidade ativa acionam o dano de acompanhamento.']},
  85:{leader:['counter',6196,'Contra-ataques garantem a aplicação de Detonar na habilidade ativa.'],support:['counter',6197,'O contra-ataque aplica Detonar e aumenta o dano recebido pelo alvo.']},
  61:{leader:['crit',6212,'A habilidade ativa recebe DANO CRIT adicional.'],support:['counter',6213,'Contra-ataques acionam o dano de acompanhamento da habilidade de suporte.']},
  52:{leader:['combo',6025,'Combos ativam Redemoinho e reforçam a Corrosão.'],support:['combo',6024,'Combos aplicam Corrosão e concedem Combo à líder.']},
  54:{leader:['crit',6011,'Acertos críticos ativam Fogo Selvagem e reforçam o dano crítico.'],support:['crit',6010,'O acerto crítico da habilidade ativa aciona dano de acompanhamento.']},
  56:{leader:['counter',6032,'Contra-ataques podem gerar e reforçar o escudo.'],support:['counter',6031,'Contra-ataques acionam o dano de acompanhamento.']},
  86:{leader:['counter',6220,'Quando a habilidade ativa vem de um contra-ataque, a chance de Corrosão sobe para 100%.'],support:['counter',6221,'Contra-ataques aplicam a Corrosão da habilidade de suporte.']},
  59:{leader:['crit',6174,'Acertos críticos aplicam Detonar; Kirin também aproveita combos como caminho secundário.'],support:['crit',6175,'Acertos críticos ou Detonar acumulam ATQ e CRIT para a líder.']},
  81:{leader:['crit',6166,'Acertos críticos aumentam DANO CRIT e geram escudo.'],support:['crit',6165,'Críticos da habilidade ativa acionam acompanhamento e escudo.']},
  83:{leader:['combo',6180,'Combos reforçam o dano da habilidade ativa.'],support:['combo',6183,'Combos e Detonar acumulam Combo e DANO de Combo.']},
  60:{leader:['combo',6204,'Habilidades ativas acionadas por combos reduzem o Contra-ataque do alvo.'],support:['combo',6205,'Combos acionam o ataque subsequente da habilidade de suporte.']},
  82:{leader:['crit',6158,'Críticos geram Ácido, que reforça a próxima Corrosão da habilidade de líder.'],support:['crit',6157,'Críticos da habilidade ativa aplicam Corrosão e aumentam DANO CRIT da líder.']},
  58:{leader:['counter',6051,'Críticos da habilidade ativa concedem Contra-ataque, apoiando essa sequência.'],support:['crit',6052,'Críticos da habilidade ativa acionam o dano de acompanhamento.']},
  53:{leader:['crit',6004,'O crítico da habilidade de líder aciona o dano residual.'],support:['crit',6003,'Críticos da habilidade ativa causam acompanhamento e reduzem a DEF do alvo.']},
  84:{leader:['combo',6187,'Combos da habilidade de líder garantem o dano de acompanhamento.'],support:['combo',6189,'Combos geram escudo e ampliam o dano da habilidade ativa.']},
  57:{leader:['combo',6044,'Críticos da habilidade ativa concedem Combo para alimentar a sequência.'],support:['crit',6045,'Críticos da habilidade ativa acionam o dano de acompanhamento.']},
  55:{leader:['counter',6036,'Espinheiro concede Contra-ataque e o kit aproveita escudos.'],support:['counter',6038,'Contra-ataques podem garantir o acompanhamento; a habilidade também cria ou aproveita escudo.']},
  51:{leader:['combo',6018,'Acúmulos de Corrosão concedem Combo.'],support:['combo',6017,'Habilidades ativas acionadas por combo ou contra-ataque garantem a aplicação de Corrosão.']},
};

function direction(beast,role,{mode='Campo',supportElement,focus='auto'}={}){
  let entry=DIRECTIONS[beast.id]?.[role==='Líder'?'leader':'support'];
  if(!entry||!beast.skills[role]?.some(s=>s.id===entry[1]))return null;
  if(role==='Líder'&&beast.id===60&&mode==='Campo')entry=['crit',6204,'No campo, a habilidade ativa mantém DANO CRIT adicional; os bônus de invasão e guarnição ficam fora desta escolha.'];
  if(role==='Líder'&&beast.id===61&&mode==='Guarnição'&&supportElement==='Físico')entry=['counter',6216,'Em guarnição, uma suporte física faz Réquiem conceder Contra-ataque à líder.'];
  return {focus:FOCUS_LABELS[focus]?focus:entry[0],skillId:entry[1],reason:entry[2],manual:Boolean(FOCUS_LABELS[focus])};
}
function activeEffects(set,pieces,rank=1){return set.effects.filter(e=>e.pieces<=pieces&&e.rank<=rank).filter(e=>!set.effects.some(other=>other.pieces===e.pieces&&other.rank>e.rank&&other.rank<=rank));}
function group(set,slots,catalog,role){
  const chips=slots.map(slot=>catalog.chips.find(c=>c.setId===set.id&&c.slot===slot));
  if(chips.some(c=>!c))throw Error('Chip set is missing a required slot');
  return {setId:set.id,name:set.name,tier:set.tier,focus:set.focus,pieces:slots.length,slots,chips,
    effects:activeEffects(set,slots.length).map(e=>({...e,roleSkills:role==='Líder'?e.leaderSkills:e.supportSkills}))};
}
function findSet(catalog,element,tier,focus,length){return catalog.sets.find(s=>s.element===element&&s.tier===tier&&s.focus===focus&&s.slots.length===length);}
function boundedBudget(value,fallback){const n=Number(value??fallback);return Number.isFinite(n)?Math.max(0,Math.min(12,Math.floor(n/2)*2)):0;}
function upgradeGroups(spend){return {limbs:spend>=4,core:spend===2||spend>=6};}
function suggestChips(pair,catalog,{profile='purple',budget=4,legendaryBudget=0,mode='Campo',focus='auto'}={}){
  if(!catalog?.sets?.length||!catalog.chips?.length||!['Campo','Invasão','Guarnição'].includes(mode))return null;
  if(!CHIP_PROFILES.some(p=>p.id===profile))profile='purple';
  let remaining=profile==='purple'?0:boundedBudget(budget,profile==='mixed'?4:6);
  let remainingLegendary=profile==='oc'?boundedBudget(legendaryBudget,0):0;
  const notes=[],plans=[];
  for(const [role,beast] of [['Líder',pair.leader],['Suporte',pair.support]]){
    const d=direction(beast,role,{mode,supportElement:pair.support.element,focus});
    if(!d)return null;
    let groups=[],spent=0;
    const warnings=[];
    if(profile==='oc'&&remaining>=2){
      const oc=catalog.sets.find(s=>s.element===beast.element&&s.tier==='oc');
      const possible=Math.min(6,remaining);
      if(oc&&!oc.modes.includes(mode))warnings.push(`${oc.name}: não priorizada no campo; os bônus de 4 e 6 peças exigem invasão ou guarnição.`);
      else if(oc&&oc.focus!==d.focus&&!(oc.element==='Físico'&&possible>=4))warnings.push(`${oc.name}: o foco de 2/4 peças é ${FOCUS_LABELS[oc.focus]}, enquanto a escolha atual é ${FOCUS_LABELS[d.focus]}. Mantemos os roxos para não investir só pela raridade.`);
      else if(oc){
        spent=possible;
        const slots=spent===2?[5,6]:spent===4?[1,2,3,4]:[1,2,3,4,5,6];
        groups.push(group(oc,slots,catalog,role));
        if(spent<6)warnings.push(`${spent} peças OC: somente os patamares de ${spent===2?'2':'2 e 4'} peças ficam previstos. O bônus de 6 ainda não está ativo.`);
      }
    }
    const freeCount=6-groups.reduce((n,g)=>n+g.pieces,0);
    const legendary=profile==='mixed'?Math.min(6,remaining):profile==='oc'?(freeCount===6?Math.min(6,remainingLegendary):remainingLegendary>=freeCount?freeCount:0):0;
    if(profile==='mixed')spent=legendary;
    if(profile==='oc')remainingLegendary-=legendary;
    const upgrade=upgradeGroups(legendary);
    for(const [length,slots,isLegendary] of [[4,[1,2,3,4],upgrade.limbs],[2,[5,6],upgrade.core]]){
      const free=slots.filter(slot=>!groups.some(g=>g.slots.includes(slot)));
      if(!free.length)continue;
      const set=findSet(catalog,beast.element,isLegendary?'legendary':'purple',d.focus,length);
      if(!set)return null;
      groups.push(group(set,free,catalog,role));
    }
    remaining-=spent;
    groups.sort((a,b)=>a.slots[0]-b.slots[0]);
    const rationale=d.manual?`Você priorizou ${FOCUS_LABELS[d.focus]}. O foco automático desta função seria ${FOCUS_LABELS[DIRECTIONS[beast.id][role==='Líder'?'leader':'support'][0]]}.`:d.reason;
    plans.push({role,beastId:beast.id,name:beast.name,element:beast.element,focus:d.focus,skillId:d.skillId,reason:rationale,groups,warnings});
  }
  const used={purple:0,legendary:0,oc:0};
  for(const plan of plans)for(const g of plan.groups)used[g.tier]+=g.pieces;
  if(profile==='mixed')notes.push('Lendários vão primeiro para a líder: com 2 peças, cérebro + coluna; com 4, os quatro membros; com 6, os dois blocos. O restante segue para a suporte. É uma ordem econômica de planejamento, não uma garantia de maior dano.');
  if(profile!=='purple')notes.push('Antes de substituir um roxo evoluído, compare os atributos e os bônus ativos no ranque real.');
  if(profile==='oc')notes.push('Os OC são avaliados primeiro para a líder e depois para a suporte. O limite não obriga a gastar todas as peças: gatilho e cenário precisam combinar.');
  if(remainingLegendary)notes.push(`${remainingLegendary} peças lendárias do complemento ficaram sem uso.`);
  if(remaining&&profile!=='purple')notes.push(`${remaining} peças do limite ficaram sem uso nesta sugestão.`);
  const sets=plans.flatMap(p=>p.groups.map(g=>g.setId));
  if(new Set(sets).size<sets.length)notes.push('Há matrizes iguais nas duas bestas. Não considere seus efeitos como uma soma automática ou como o dobro do bônus.');
  return {profile,leader:plans[0],support:plans[1],used,notes,summary:Object.entries(used).filter(([,n])=>n).map(([tier,n])=>`${n} ${tier==='purple'?'roxos':tier==='legendary'?'lendários':'OC'}`).join(' + ')};
}
module.exports={FOCUS_LABELS,TIER_LABELS,CHIP_PROFILES,DIRECTIONS,direction,activeEffects,suggestChips};
