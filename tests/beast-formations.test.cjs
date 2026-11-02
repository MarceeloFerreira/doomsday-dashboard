const {test}=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../data/beasts.json');
const chips=require('../data/beast-chips.json');
const {MODES,listed,roleSkills,recommend,buildFormation,formationKey}=require('../lib/beast-combinations.cjs');
const {suggestChips}=require('../lib/beast-chips.cjs');

test('only epic and legendary beasts participate, even when excluded IDs are passed in a stale roster',()=>{
  assert.equal(catalog.beasts.filter(b=>b.rarity==='Épico').length,8);
  assert.equal(catalog.beasts.filter(b=>b.rarity==='Lendário').length,17);
  const fakes=['Raro','Comum'].map((rarity,i)=>({...catalog.beasts[0],id:11+i,rarity}));
  assert.ok(fakes.every(b=>!listed(b)));
  const pairs=recommend([...catalog.beasts,...fakes],[...catalog.beasts.map(b=>b.id),11,12]);
  assert.ok(pairs.every(p=>[p.leader,p.support].every(b=>listed(b))));
  assert.ok(catalog.beasts.every(b=>!/^(?:Cão|Javali)\b/.test(b.name)));
});

test('beast formations fill at most five squads and never reuse a beast in either role',()=>{
  for(const n of [0,1,2,3,4,7,8,9,10,11,25]){
    const owned=catalog.beasts.slice(0,n).map(b=>b.id);
    const pairs=recommend(catalog.beasts,owned),formation=buildFormation(pairs);
    assert.equal(formation.length,Math.min(5,Math.floor(n/2)));
    const used=formation.flatMap(p=>[p.leader.id,p.support.id]);
    assert.equal(used.length,new Set(used).size);
    assert.ok(used.every(id=>owned.includes(id)));
    for(const p of formation){
      const reverse=pairs.find(r=>r.leader.id===p.support.id&&r.support.id===p.leader.id);
      assert.ok(pairs.indexOf(p)<pairs.indexOf(reverse));
    }
  }
});

test('ten mixed-rarity beasts replace all five partnerships repeatedly, rather than just inverting roles',()=>{
  const owned=[...catalog.beasts.filter(b=>b.rarity==='Épico'),...catalog.beasts.filter(b=>b.rarity==='Lendário').slice(0,2)].map(b=>b.id);
  const pairs=recommend(catalog.beasts,owned);
  let formation=buildFormation(pairs);const history=[formationKey(formation)];
  for(let i=0;i<12;i++){
    const previous=new Set(formation.map(p=>formationKey([p])));
    const next=buildFormation(pairs,formation,history);
    assert.equal(next.length,5);
    assert.ok(next.every(p=>!previous.has(formationKey([p]))));
    assert.equal(new Set(next.flatMap(p=>[p.leader.id,p.support.id])).size,10);
    assert.ok(!history.includes(formationKey(next)));
    formation=next;history.push(formationKey(next));
  }
  const one=buildFormation(pairs.slice(0,1));
  assert.equal(formationKey(one),formationKey(buildFormation(pairs.slice(0,1),one)));
});

test('assessments quote skills from the actual assigned role and chips work for every epic beast',()=>{
  const owned=catalog.beasts.map(b=>b.id);
  for(const mode of MODES)for(const pair of buildFormation(recommend(catalog.beasts,owned,{mode}))){
    assert.ok(pair.cautions.length>0);
    assert.ok(pair.reasons.length>0);
    for(const caution of pair.cautions){
      assert.doesNotMatch(caution,/não (?:foi identific|identifica)/i);
      const match=caution.match(/^(.+?) · (Líder|Suporte) · (.+?): /);
      assert.ok(match);
      const beast=match[2]==='Líder'?pair.leader:pair.support;
      assert.equal(match[1],beast.name);
      assert.ok(roleSkills(beast,match[2]).some(s=>s.name===match[3]));
    }
  }
  for(const beast of catalog.beasts.filter(b=>b.rarity==='Épico'))for(const role of ['leader','support']){
    const pair={leader:catalog.beasts.find(b=>b.id===86),support:catalog.beasts.find(b=>b.id===59),[role]:beast};
    const plan=suggestChips(pair,chips);
    assert.ok(plan);
    assert.equal(plan[role].groups.flatMap(g=>g.chips).length,6);
    assert.ok(roleSkills(beast,role==='leader'?'Líder':'Suporte').some(s=>s.id===plan[role].skillId));
  }
  assert.equal(chips.manifest,catalog.manifest);
});
