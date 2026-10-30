const {test}=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../data/beast-chips.json');
const beasts=require('../data/beasts.json');
const {recommend}=require('../lib/beast-combinations.cjs');
const {suggestChips,activeEffects,direction,DIRECTIONS}=require('../lib/beast-chips.cjs');
const byId=id=>beasts.beasts.find(b=>b.id===id);
const pair=(leader,support)=>({leader:byId(leader),support:byId(support)});

test('chip catalog preserves all elemental slot variants, OC flag, ranks and role-specific skill references',()=>{
  assert.equal(catalog.chips.length,192);assert.equal(catalog.sets.length,52);
  assert.equal(new Set(catalog.chips.map(c=>c.id)).size,192);
  assert.equal(catalog.manifest,beasts.manifest);
  assert.deepEqual(Object.fromEntries(['uncommon','purple','legendary','oc'].map(tier=>[tier,catalog.chips.filter(c=>c.tier===tier).length])),{uncommon:24,purple:72,legendary:72,oc:24});
  for(const set of catalog.sets){
    assert.equal(new Set(set.slots).size,set.slots.length);
    assert.deepEqual(set.chipIds.map(id=>catalog.chips.find(c=>c.id===id).slot),set.slots);
    for(const effect of set.effects){
      assert.ok(effect.description&&!/\{\d+\}|\[missing:/.test(effect.description));
      if(effect.pieces>=4){assert.equal(effect.leaderSkills.length,1);assert.equal(effect.supportSkills.length,1);assert.notEqual(effect.leaderSkills[0].id,effect.supportSkills[0].id);}
    }
  }
});
test('each automatic direction is grounded in the correct role and handles physical scenario branches',()=>{
  for(const beast of beasts.beasts)for(const role of ['Líder','Suporte']){
    assert.ok(DIRECTIONS[beast.id]);const d=direction(beast,role);assert.ok(beast.skills[role].some(s=>s.id===d.skillId));
  }
  assert.equal(direction(byId(81),'Líder').focus,'crit'); // Grass is not automatically counter.
  assert.equal(direction(byId(83),'Líder').focus,'combo'); // Fire is not automatically CRIT.
  assert.equal(direction(byId(86),'Líder').focus,'counter'); // Water is not automatically combo.
  assert.equal(direction(byId(60),'Líder',{mode:'Campo'}).focus,'crit');
  assert.equal(direction(byId(60),'Líder',{mode:'Invasão'}).focus,'combo');
  assert.equal(direction(byId(61),'Líder',{mode:'Guarnição',supportElement:'Físico'}).focus,'counter');
});
test('every pair receives six legal slots per role without exceeding its shared investment limit',()=>{
  const pairs=recommend(beasts.beasts,beasts.beasts.map(b=>b.id));
  for(const p of pairs)for(const mode of ['Campo','Invasão','Guarnição'])for(const profile of ['purple','mixed','oc'])for(const budget of [0,2,4,6,8,10,12]){
    const plan=suggestChips(p,catalog,{profile,budget,mode});assert.ok(plan);
    assert.equal(Object.values(plan.used).reduce((a,b)=>a+b,0),12);
    assert.ok(plan.used.legendary+plan.used.oc<=(profile==='purple'?0:budget));
    for(const build of [plan.leader,plan.support]){
      const chips=build.groups.flatMap(g=>g.chips);
      assert.deepEqual(chips.map(c=>c.slot).sort((a,b)=>a-b),[1,2,3,4,5,6]);
      assert.ok(chips.every(c=>c.element===build.element));
      for(const g of build.groups){
        assert.equal(g.pieces,g.chips.length);assert.ok(g.effects.every(e=>e.pieces<=g.pieces));
        if(g.tier==='oc')assert.ok(catalog.sets.find(s=>s.id===g.setId).modes.includes(mode));
        for(const e of g.effects)assert.deepEqual(e.roleSkills,build.role==='Líder'?e.leaderSkills:e.supportSkills);
      }
    }
  }
});
test('small legendary budgets buy complete blocks, not a broken four-piece purple matrix',()=>{
  for(const [budget,limbs,core] of [[2,'purple','legendary'],[4,'legendary','purple'],[6,'legendary','legendary']]){
    const plan=suggestChips(pair(59,81),catalog,{profile:'mixed',budget});
    assert.equal(plan.leader.groups.find(g=>g.slots.includes(1)).tier,limbs);
    assert.equal(plan.leader.groups.find(g=>g.slots.includes(5)).tier,core);
    assert.equal(plan.used.legendary,budget);assert.ok(plan.support.groups.every(g=>g.tier==='purple'));
  }
  const plan=suggestChips(pair(59,81),catalog,{profile:'mixed',budget:8});
  assert.equal(plan.support.groups.find(g=>g.slots.includes(5)).tier,'legendary');assert.equal(plan.used.legendary,8);
});
test('OC only promises reached thresholds and avoids wrong-trigger or field-only traps',()=>{
  for(const pieces of [2,4,6]){
    const plan=suggestChips(pair(59,81),catalog,{profile:'oc',budget:pieces});
    assert.equal(plan.used.oc,pieces);
    assert.deepEqual(plan.leader.groups.find(g=>g.tier==='oc').effects.map(e=>e.pieces),[2,4,6].filter(n=>n<=pieces));
  }
  const knife=suggestChips(pair(81,86),catalog,{profile:'oc',budget:12});
  assert.equal(knife.used.oc,0);assert.ok(knife.leader.warnings.some(w=>w.includes('CRIT')));
  const field=suggestChips(pair(60,61),catalog,{profile:'oc',budget:12,mode:'Campo'});
  assert.equal(field.used.oc,0);assert.ok(field.leader.warnings.some(w=>w.includes('invasão ou guarnição')));
  const rally=suggestChips(pair(60,61),catalog,{profile:'oc',budget:12,mode:'Invasão'});assert.equal(rally.used.oc,12);
});
test('different rarities cannot be merged into one matrix; chosen rank gates every threshold',()=>{
  const purple=catalog.sets.find(s=>s.id===1),legend=catalog.sets.find(s=>s.id===31);
  assert.notEqual(purple.id,legend.id);assert.equal(activeEffects(purple,3).some(e=>e.pieces===4),false);
  assert.equal(activeEffects(legend,4,1).find(e=>e.pieces===4).stars,0);
  assert.equal(activeEffects(legend,4,10).find(e=>e.pieces===4).stars,5);
  assert.ok(activeEffects(legend,4,10).find(e=>e.pieces===4).description.includes('73%'));
});
test('same-element pairs require separate copies and do not claim additive duplicate matrices',()=>{
  const plan=suggestChips(pair(59,53),catalog);
  assert.equal(plan.used.purple,12);assert.equal(plan.leader.groups[0].chips[0].id,plan.support.groups[0].chips[0].id);
  assert.ok(plan.notes.some(n=>n.includes('soma automática')));
});
test('missing or unsupported data does not produce a speculative build and manual focus is explicit',()=>{
  assert.equal(suggestChips(pair(59,53),null),null);
  assert.equal(suggestChips(pair(59,53),catalog,{mode:'Outro'}),null);
  const unknown={...byId(59),id:999};assert.equal(suggestChips({leader:unknown,support:byId(53)},catalog),null);
  const manual=suggestChips(pair(59,81),catalog,{focus:'combo'});assert.equal(manual.leader.focus,'combo');assert.match(manual.leader.reason,/Você priorizou Combo/);
  assert.equal(suggestChips(pair(59,81),catalog,{profile:'mixed',budget:NaN}).used.legendary,0);
});

test('OC investment can be completed with a separately limited legendary budget',()=>{
  for(const oc of [0,2,4,6,8,10,12])for(const legendary of [0,2,4,6,8,10,12]){
    const plan=suggestChips(pair(59,53),catalog,{profile:'oc',budget:oc,legendaryBudget:legendary});
    assert.ok(plan.used.oc<=oc);assert.ok(plan.used.legendary<=legendary);
    assert.equal(Object.values(plan.used).reduce((a,b)=>a+b,0),12);
    for(const role of [plan.leader,plan.support])assert.deepEqual(role.groups.flatMap(g=>g.slots).sort((a,b)=>a-b),[1,2,3,4,5,6]);
  }
  const plan=suggestChips(pair(59,53),catalog,{profile:'oc',budget:6,legendaryBudget:4});
  assert.equal(plan.used.oc,6);assert.equal(plan.used.legendary,4);assert.equal(plan.used.purple,2);
});