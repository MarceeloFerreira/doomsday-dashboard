// Conservative comparison of two candidates for leadership at the catalog's
// reference level. This is not a damage formula or a battle simulation.
const STAT_KEYS=['attack','defense','hp'];
function reference(beast,mode='Campo'){
  const source=beast.combatReference;
  if(!source||!STAT_KEYS.every(k=>Number.isFinite(source.baseStats?.[k])&&source.baseStats[k]>0)||source.periodicAttacks?.length!==2)return null;
  const attacks=source.periodicAttacks.map(a=>({...a,multiplier:a.scenarioMultipliers?.[mode]??a.multiplier}));
  if(attacks.some(a=>!Number.isFinite(a.multiplier)||a.multiplier<=0||!Number.isFinite(a.interval)||a.interval<=0))return null;
  return {level:source.level,baseMight:source.baseMight||0,stats:source.baseStats,attacks};
}
function dominates(a,b){return a.every((n,i)=>n>=b[i])&&a.some((n,i)=>n>b[i]);}
function compareLeadership(leader,support,{mode='Campo'}={}){
  const a=reference(leader,mode),b=reference(support,mode);
  const result=(decision,basis,reason)=>({decision,basis,reason,leader:a,alternative:b});
  if(!a||!b||a.level!==b.level)return result(0,'incomplete','A referência quantitativa não permite comparar as duas candidatas no mesmo nível. A posição segue a sinergia das funções.');
  const statsA=STAT_KEYS.map(k=>a.stats[k]),statsB=STAT_KEYS.map(k=>b.stats[k]);
  const comparable=a.attacks.every((attack,i)=>attack.kind===b.attacks[i].kind);
  const ratesA=a.attacks.map(attack=>attack.multiplier/attack.interval);
  const ratesB=b.attacks.map(attack=>attack.multiplier/attack.interval);
  const vectorsA=comparable?[...statsA,...ratesA]:statsA;
  const vectorsB=comparable?[...statsB,...ratesB]:statsB;
  for(const [candidate,other,sign,values,opposite] of [[leader,support,1,vectorsA,vectorsB],[support,leader,-1,vectorsB,vectorsA]]){
    if(dominates(values,opposite))return result(sign,comparable?'dominance':'stats',
      `${candidate.name} lidera porque apresenta vantagem nos atributos base${comparable?' e nos ataques periódicos comparáveis':''} no nível de referência. ${comparable?'A cadência é considerada junto dos multiplicadores iniciais.':'Os ataques principais têm tipos diferentes e seus multiplicadores não são tratados como equivalentes.'}`);
  }
  // Superior base attributes take precedence over counting keywords or states.
  for(const [candidate,sign,values,opposite] of [[leader,1,statsA,statsB],[support,-1,statsB,statsA]]){
    if(dominates(values,opposite))return result(sign,'stats',`${candidate.name} lidera por ter atributos base superiores no conjunto. Há diferenças entre as habilidades; esta escolha conservadora preserva a base da líder, sem atribuir dano garantido a efeitos condicionais.`);
  }
  if(comparable){
    for(const [candidate,sign,values,opposite] of [[leader,1,ratesA,ratesB],[support,-1,ratesB,ratesA]]){
      if(dominates(values,opposite))return result(sign,'periodic',`${candidate.name} lidera pela vantagem de multiplicador e cadência nos ataques periódicos comparáveis. Os atributos apresentam equilíbrio ou compensações; confira os valores abaixo.`);
    }
  }
  // Explicit, scenario-dependent tie-break for stat tradeoffs, not rarity/name.
  const order=mode==='Guarnição'?['defense','hp','attack']:['attack','hp','defense'];
  const labels={attack:'ATQ',defense:'DEF',hp:'PV'};
  for(const key of order){
    if(a.stats[key]===b.stats[key])continue;
    const decision=Math.sign(a.stats[key]-b.stats[key]),candidate=decision>0?leader:support;
    return result(decision,'tradeoff',`${candidate.name} lidera pelo desempate de ${labels[key]} em ${mode.toLowerCase()}. Existem compensações entre atributos e habilidades; esta escolha não significa superioridade em todo combate.`);
  }
  return result(0,'synergy','Os atributos base e os ataques comparáveis não definem uma vencedora. A posição segue a sinergia entre as habilidades de líder e suporte para este cenário.');
}
module.exports={reference,dominates,compareLeadership};
