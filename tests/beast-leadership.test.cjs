const {test}=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../data/beasts.json');
const {reference,compareLeadership}=require('../lib/beast-leadership.cjs');
const {recommend,buildFormation,MODES}=require('../lib/beast-combinations.cjs');
const byId=id=>catalog.beasts.find(b=>b.id===id);

test('all eligible beasts have auditable base attributes and periodic skill references at the same reference level',()=>{
  for(const beast of catalog.beasts){
    const ref=reference(beast);
    assert.equal(ref.level,100);
    assert.ok(Object.values(ref.stats).every(n=>n>0));
    for(const attack of ref.attacks){
      const skill=beast.skills['Líder'].find(s=>s.id===attack.skillId);
      assert.ok(skill);
      assert.ok(skill.descriptionEn.includes(String(attack.multiplier)+'%'));
      assert.ok(attack.interval>0);
    }
  }
  assert.deepEqual(reference(byId(21)).stats,{attack:1320,defense:1140,hp:23160});
  assert.deepEqual(reference(byId(51)).stats,{attack:1650,defense:1425,hp:28950});
});

test('legendary counterparts lead at equivalent reference evolution on numerical evidence rather than alphabetic names',()=>{
  for(const [epic,legendary] of [[21,51],[22,52],[23,53],[24,54],[25,55],[26,56],[27,57],[28,58]])for(const mode of MODES){
    const pairs=recommend(catalog.beasts,[epic,legendary],{mode});
    assert.equal(pairs[0].leader.id,legendary);
    assert.ok(pairs[0].leadership.decision>0);
    assert.notEqual(pairs[0].leadership.basis,'synergy');
    assert.equal(buildFormation(pairs)[0].leader.id,legendary);
    const renamed=[{...byId(epic),name:'AAA'},{...byId(legendary),name:'ZZZ'}];
    assert.equal(recommend(renamed,[epic,legendary],{mode})[0].leader.id,legendary);
  }
});

test('cadence and scenario affect the numeric reference without assuming maximum conditional effects',()=>{
  assert.equal(reference(byId(53)).attacks[0].multiplier,476);
  assert.equal(reference(byId(53)).attacks[0].interval,5);
  assert.equal(reference(byId(81)).attacks[0].multiplier,750); // 900 needs shield.
  assert.equal(reference(byId(86)).attacks[0].multiplier,600); // 750 needs Full Size.
  assert.equal(reference(byId(57),'Campo').attacks[0].multiplier,600);
  assert.equal(reference(byId(57),'Invasão').attacks[0].multiplier,900);
  assert.equal(reference(byId(58),'Guarnição').attacks[0].multiplier,900);
  assert.equal(reference(byId(58),'Campo').attacks[0].multiplier,600);
  assert.equal(reference(byId(21)).attacks[0].kind,'corrosion');
  assert.equal(reference(byId(51)).attacks[0].kind,'direct');
  assert.equal(compareLeadership(byId(51),byId(21)).basis,'stats');
});

test('rarity is not a hard-coded leader requirement and skill values resolve otherwise equal attributes',()=>{
  const epic=structuredClone(byId(23)),legend=structuredClone(byId(53));
  epic.combatReference=structuredClone(legend.combatReference);
  epic.combatReference.periodicAttacks[0].multiplier*=2;
  assert.equal(compareLeadership(epic,legend).decision,1);
  assert.equal(recommend([epic,legend],[epic.id,legend.id])[0].leader.id,epic.id);
  // Real evolution is not inferred from rarity or from a user's ownership selection.
  delete epic.combatReference;
  const incomplete=compareLeadership(epic,legend);
  assert.equal(incomplete.decision,0);
  assert.equal(incomplete.basis,'incomplete');
});

test('explicit stat tradeoffs use the scenario and do not invent a universal damage score',()=>{
  const a=structuredClone(byId(51)),b=structuredClone(byId(21));
  a.combatReference.baseStats={attack:1500,defense:1000,hp:23000};
  b.combatReference.baseStats={attack:1300,defense:1200,hp:23000};
  const field=compareLeadership(a,b,{mode:'Campo'}),garrison=compareLeadership(a,b,{mode:'Guarnição'});
  assert.equal(field.decision,1);assert.equal(field.basis,'tradeoff');
  assert.equal(garrison.decision,-1);assert.equal(garrison.basis,'tradeoff');
});
