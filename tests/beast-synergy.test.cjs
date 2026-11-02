const {test}=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../data/beasts.json');
const rules=require('../scripts/beast-mechanics-rules.json');
const {evaluateSynergy,activeFacts,access,opportunity}=require('../lib/beast-synergy.cjs');
const {recommend,buildFormation}=require('../lib/beast-combinations.cjs');
const byId=id=>catalog.beasts.find(b=>b.id===id);
const context=(support,mode='Campo',enemyElement='')=>({mode,enemyElement,supportElement:support.element});
const score=(leader,support,mode='Campo',enemy='')=>evaluateSynergy(byId(leader),byId(support),context(byId(support),mode,enemy));

test('all 228 reviewed facts retain exact role-specific skill evidence and never include special abilities',()=>{
  let total=0;
  for(const beast of catalog.beasts)for(const role of ['Líder','Suporte']){
    const expected=rules.beasts[beast.id][role],actual=beast.mechanics.roles[role];
    assert.equal(actual.length,expected.length);
    for(let i=0;i<actual.length;i++){
      const skill=beast.skills[role].find(s=>s.id===actual[i].skillId);
      assert.ok(skill);
      assert.equal(expected[i].sourceDescription,skill.descriptionEn);
      const {sourceDescription,...fact}=expected[i];assert.deepEqual(actual[i],fact);
      total++;
    }
  }
  assert.equal(total,228);
});

test('Fraudrin values a cross-element Counter provider over merely sharing Water and Corrosion keywords',t=>{
  const mixed=score(86,56),same=score(86,82);
  t.diagnostic(`Fraudrin + Dragão Furcacão: ${mixed.score}; Fraudrin + Otachi: ${same.score}`);
  assert.ok(mixed.score>same.score);
  const bridge=mixed.links.find(l=>l.category==='support_enables'&&l.mechanism==='counter');
  assert.equal(bridge.from.skillId,6033);assert.equal(bridge.to.skillId,6220);
  assert.ok(bridge.reason.includes('+150'));
});

test('same-element complement remains valuable: Knifehead benefits from Titan shields over unrelated mixed-element triggers',()=>{
  const same=score(81,84),mixed=score(81,86);
  assert.ok(same.score>mixed.score);
  const link=same.links.find(l=>l.category==='support_enables'&&l.mechanism==='shield');
  assert.equal(link.from.skillId,6191);assert.equal(link.to.skillId,6163);
});

test('element labels, names and keyword stuffing cannot increase compatibility without an explicit elemental branch',()=>{
  const leader=byId(86),support=byId(56);
  const original=evaluateSynergy(leader,support,context(support));
  const edited=structuredClone(support);edited.element='Água';edited.name='AAA';
  for(const skills of Object.values(edited.skills))for(const skill of skills){skill.description+=' Corrosão Combo CRIT Escudo Detonar';}
  const changed=evaluateSynergy(leader,edited,context(edited));
  assert.equal(changed.score,original.score);assert.equal(changed.coverage,original.coverage);
});

test('own shields and outgoing Corrosion never satisfy enemy-shield or incoming-Corrosion conditions',()=>{
  const leader=byId(81),support=byId(24),ctx=context(support);
  const facts=activeFacts(support,'Suporte',ctx),world=[...activeFacts(leader,'Líder',ctx),...facts];
  assert.ok(opportunity('shield',world)>0);
  assert.equal(access(facts.find(f=>f.external==='enemy_shield_and_incoming_damage'),world),0);
  const water=byId(86),grass=byId(26),ctx2=context(grass);
  const world2=[...activeFacts(water,'Líder',ctx2),...activeFacts(grass,'Suporte',ctx2)];
  assert.ok(opportunity('corrosion',world2)>0);
  assert.equal(access(world2.find(f=>f.external==='incoming_corrosion'),world2),0);
});

test('main-attack CRIT cannot be reused as permanent CRIT for an Active Skill follow-up',()=>{
  const result=score(53,23);
  assert.ok(!result.links.some(l=>l.category==='leader_activates'&&l.from.skillId===6001&&l.to.skillId===6059));
  const leader=byId(53),support=byId(23),ctx=context(support);
  const world=[...activeFacts(leader,'Líder',ctx),...activeFacts(support,'Suporte',ctx)];
  assert.equal(opportunity('crit',world,new Set(),'main'),3);
  assert.equal(opportunity('crit',world,new Set(),'active'),1);
});

test('conditional crit-shield loops do not bootstrap themselves into an unconditional source',()=>{
  const support=byId(81),facts=activeFacts(support,'Suporte',context(support));
  const crit=facts.find(f=>f.kind==='boost'&&f.mechanism==='crit');
  assert.equal(access(crit,facts),1);
  assert.equal(opportunity('crit',facts),1);
});

test('bonus windows, initial stack increments, proc chances and duplicate channels are treated conservatively',()=>{
  const support=byId(56),ctx={...context(support),leaderInterval:6};
  const counter=activeFacts(support,'Suporte',ctx).find(f=>f.kind==='boost');
  assert.equal(counter.amount,150);assert.equal(access(counter,[counter]),2);
  const sustained={...counter,duration:6};assert.equal(access(sustained,[sustained]),3);
  const original=score(59,59); // Model-only fixture, never passed to the roster recommender.
  const copy=structuredClone(byId(59));
  copy.mechanics.roles.Suporte.push(...structuredClone(copy.mechanics.roles.Suporte));
  assert.equal(evaluateSynergy(byId(59),copy,context(copy)).score,original.score);
  const boost=activeFacts(byId(59),'Suporte',context(byId(59))).find(f=>f.kind==='boost'&&!f.external);
  assert.equal(boost.amount,40);assert.equal(boost.stackLimit,4);
});

test('garrison/rally support-element branches are exact; unknown enemy excludes conditional enemy facts',()=>{
  const dirge=byId(61),fire=byId(59),water=byId(86),grass=byId(81),physical=byId(60);
  const mainStates=(support,mode)=>activeFacts(dirge,'Líder',context(support,mode)).filter(f=>f.skillId===6216);
  assert.deepEqual(mainStates(fire,'Campo'),[]);
  assert.deepEqual(mainStates(fire,'Guarnição').map(f=>f.mechanism),['detonate']);
  assert.deepEqual(mainStates(water,'Guarnição').map(f=>f.mechanism),['corrosion']);
  assert.deepEqual(mainStates(grass,'Guarnição').map(f=>f.mechanism),['shield']);
  assert.deepEqual(mainStates(physical,'Guarnição').map(f=>f.mechanism),['counter']);
  assert.ok(!activeFacts(byId(85),'Líder',context(fire)).some(f=>f.enemy));
  assert.ok(activeFacts(byId(85),'Líder',context(fire,'Campo','Grama')).some(f=>f.enemy==='Grama'));
});

test('real formations may contain mixed elements and keep unique squads and explained directional links',t=>{
  const pairs=recommend(catalog.beasts,catalog.beasts.map(b=>b.id));
  const formation=buildFormation(pairs);
  assert.equal(formation.length,5);
  assert.equal(new Set(formation.flatMap(p=>[p.leader.id,p.support.id])).size,10);
  assert.ok(formation.some(p=>p.leader.element!==p.support.element));
  for(const pair of formation){
    assert.ok(pair.synergy.complete);
    assert.ok(pair.reasons.length>0);
    assert.ok(pair.reasons.every(r=>!r.includes('compartilham')));
  }
  t.diagnostic(formation.map(p=>`${p.leader.name} + ${p.support.name} (${p.synergy.score})`).join('; '));
});

test('missing structured rules fail closed instead of falling back to counting terms',()=>{
  const unknown=structuredClone(byId(51));delete unknown.mechanics;
  const result=evaluateSynergy(byId(86),unknown,context(unknown));
  assert.equal(result.complete,false);assert.equal(result.score,0);assert.deepEqual(result.links,[]);
});

test('enabling a missing shield requirement is worth more than repeating a shield already provided by the leader',()=>{
  const leader=structuredClone(byId(81)),support=byId(84);
  const existing=evaluateSynergy(leader,support,context(support));
  leader.mechanics.roles['Líder']=leader.mechanics.roles['Líder'].filter(f=>!(f.kind==='state'&&f.mechanism==='shield'));
  const missing=evaluateSynergy(leader,support,context(support));
  const points=result=>result.links.find(l=>l.category==='support_enables'&&l.mechanism==='shield').points;
  assert.ok(points(missing)>points(existing));
});

test('actual buff magnitude distinguishes supports with the same mechanism',()=>{
  const strong=byId(56),weak=structuredClone(strong);
  weak.mechanics.roles.Suporte.find(f=>f.kind==='boost'&&f.mechanism==='counter').amount=60;
  assert.ok(evaluateSynergy(byId(86),strong,context(strong)).score>evaluateSynergy(byId(86),weak,context(weak)).score);
});

test('five legendary and five epic beasts preserve five stronger reference leaders while optimizing compatibility',()=>{
  const owned=[...catalog.beasts.filter(b=>b.rarity==='Lendário').slice(0,5),...catalog.beasts.filter(b=>b.rarity==='Épico').slice(0,5)].map(b=>b.id);
  const formation=buildFormation(recommend(catalog.beasts,owned));
  assert.equal(formation.length,5);
  assert.ok(formation.every(p=>p.leader.combatReference.baseMight===100000));
  assert.equal(new Set(formation.flatMap(p=>[p.leader.id,p.support.id])).size,10);
});
