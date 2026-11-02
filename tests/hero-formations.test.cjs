const {test}=require('node:test');
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const {TROOPS,MODES,compatible,selectable,recommend,buildFormation,formationKey}=require('../lib/hero-combinations.cjs');
const catalog=require('../data/heroes.json');

test('formations fill up to five squads without reusing a hero, including odd and small rosters',()=>{
  for(const troop of TROOPS){
    const eligible=catalog.heroes.filter(h=>h.complete&&selectable(h)&&compatible(h,troop));
    for(const n of [0,1,2,3,4,7,9,10,11,eligible.length]){
      const owned=eligible.slice(0,n).map(h=>h.id);
      const pairs=recommend(catalog.heroes,owned,{troop});
      const formation=buildFormation(pairs);
      assert.equal(formation.length,Math.min(5,Math.floor(n/2)));
      const used=formation.flatMap(p=>[p.a.id,p.b.id]);
      assert.equal(new Set(used).size,used.length);
      assert.ok(used.every(id=>owned.includes(id)));
    }
  }
});

test('formation compares total synergy instead of taking a strong first pair that weakens the rest',()=>{
  const heroes=[1,2,3,4].map(id=>({id}));
  const pair=(a,b,weight)=>({a:heroes[a-1],b:heroes[b-1],priority:[weight,0,0,0]});
  const pairs=[pair(1,2,10),pair(1,3,9),pair(2,4,9),pair(1,4,1),pair(2,3,1),pair(3,4,0)];
  assert.equal(formationKey(buildFormation(pairs)),'1-3|2-4');
});

test('regeneration changes partners or reserves with the same roster, but preserves the sole possible pair',()=>{
  const eligible=catalog.heroes.filter(h=>h.complete&&selectable(h)&&compatible(h,'Infantaria'));
  for(const n of [2,3,4,10,eligible.length]){
    const pairs=recommend(catalog.heroes,eligible.slice(0,n).map(h=>h.id));
    const first=buildFormation(pairs),second=buildFormation(pairs,first);
    assert.equal(second.length,first.length);
    assert.equal(formationKey(first)===formationKey(second),n===2);
    assert.deepEqual(buildFormation(pairs),first);
    assert.ok(second.every(p=>pairs.includes(p)));
  }
});

test('formation and pair assessments respect scenario, awakening, eligibility and private catalog exclusions',()=>{
  const all=catalog.heroes.map(h=>h.id);
  for(const mode of MODES)for(const awakened of [false,true]){
    const pairs=recommend(catalog.heroes,all,{troop:'Atirador',mode,awakened});
    for(const pair of buildFormation(pairs)){
      assert.ok(pair.reasons.length>0&&pair.cautions.length>0);
      assert.ok([pair.a,pair.b].every(h=>h.complete&&selectable(h)&&compatible(h,'Atirador')));
      assert.ok(pair.cautions.every(c=>!c.includes('identifica')));
      assert.ok(pair.cautions.every(c=>c.includes(pair.a.name)||c.includes(pair.b.name)));
    }
  }
});

test('full roster generation stays bounded for the current catalog',()=>{
  const all=catalog.heroes.map(h=>h.id);
  const pairs=recommend(catalog.heroes,all);
  const start=performance.now();
  const formation=buildFormation(pairs);
  const elapsed=performance.now()-start;
  assert.equal(formation.length,5);
  console.log(`Full roster formation: ${Math.round(elapsed)} ms`);
  assert.ok(elapsed<5000);
});

test('four heroes cycle through all three unique arrangements before repeating',()=>{
  const heroes=catalog.heroes.filter(h=>h.complete&&selectable(h)&&compatible(h,'Infantaria')).slice(0,4);
  const pairs=recommend(catalog.heroes,heroes.map(h=>h.id));
  const first=buildFormation(pairs),second=buildFormation(pairs,first),third=buildFormation(pairs,second,[formationKey(first),formationKey(second)]);
  assert.equal(new Set([first,second,third].map(formationKey)).size,3);
  assert.equal(formationKey(buildFormation(pairs,third,[first,second,third].map(formationKey))),formationKey(first));
});

test('ten infantry heroes replace all five partnerships on repeated regeneration',()=>{
  const owned=catalog.heroes.filter(h=>h.complete&&selectable(h)&&h.troop==='Infantaria').slice(0,10).map(h=>h.id);
  const pairs=recommend(catalog.heroes,owned);
  let formation=buildFormation(pairs);const history=[formationKey(formation)];
  for(let i=0;i<12;i++){
    const previous=new Set(formation.map(p=>formationKey([p])));
    const next=buildFormation(pairs,formation,history);
    assert.equal(next.length,5);
    assert.equal(new Set(next.flatMap(p=>[p.a.id,p.b.id])).size,10);
    assert.ok(next.every(p=>!previous.has(formationKey([p]))));
    assert.ok(!history.includes(formationKey(next)));
    formation=next;history.push(formationKey(next));
  }
});

test('cautions explain actual hero mechanics and use the active awakening version',()=>{
  const owned=[1101,1107,1109,1115];
  const pairs=recommend(catalog.heroes,owned);
  const bodala=pairs.find(p=>[p.a.id,p.b.id].includes(1101)&&[p.a.id,p.b.id].includes(1107));
  assert.ok(bodala.cautions.some(c=>c.includes('escudo')&&c.includes('restar')));
  assert.ok(bodala.cautions.some(c=>c.includes('Eileen Volt')&&c.includes('flanqueado')));
  assert.ok(bodala.cautions.every(c=>!c.includes('Corrente de Raios')));
  const unawakened=recommend(catalog.heroes,owned,{awakened:false}).find(p=>p.a.id===bodala.a.id&&p.b.id===bodala.b.id);
  assert.ok(unawakened.cautions.some(c=>c.includes('Tamanho do Esquadrão')));
});

test('formation criteria retain late tie-breakers even when early values are large',()=>{
  const heroes=[1,2,3,4].map(id=>({id}));
  const pair=(a,b,last=0)=>({a:heroes[a-1],b:heroes[b-1],priority:[1000000000,0,0,0,0,last]});
  const pairs=[pair(1,2),pair(3,4),pair(1,3,1),pair(2,4),pair(1,4),pair(2,3)];
  assert.equal(formationKey(buildFormation(pairs)),'1-3|2-4');
});
