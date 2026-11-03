const {test}=require('node:test');
const assert=require('node:assert/strict');
const {applySkin,activeSkills,profile,recommend,applies}=require('../lib/hero-combinations.cjs');
const catalog=require('../data/heroes.json');
const miyamoto=catalog.heroes.find(h=>h.id===1095);
test('Miyamoto skin replaces exactly three mapped skills and leaves the source catalog immutable',()=>{
 const before=JSON.stringify(miyamoto),skin=miyamoto.skins.find(s=>s.id===109501);
 assert.equal(skin.name,'Samurai Mundano');assert.equal(skin.evidence.asOf,'2026-11-03');
 assert.ok(skin.evidence.sources.every(s=>/^[a-f0-9]{64}$/.test(s.sha256)));
 assert.deepEqual(skin.skills.map(s=>[s.replaces,s.id]),[[10951,10952],[10953,10957],[10955,10959]]);
 const normal=activeSkills(miyamoto,true),skinned=activeSkills(miyamoto,true,109501);
 assert.equal(normal.length,4);assert.equal(skinned.length,4);
 assert.deepEqual(skinned.map(s=>s.id),[10952,10959,10957,10956]);
 assert.match(skinned.find(s=>s.id===10952).description,/13500.*10%/);
 assert.match(skinned.find(s=>s.id===10957).description,/15%.*25%.*30%/);
 assert.match(skinned.find(s=>s.id===10959).description,/45%.*30%/);
 assert.deepEqual(activeSkills(miyamoto,true,null),normal);
 assert.deepEqual(activeSkills(miyamoto,true,999999),normal);
 assert.equal(JSON.stringify(miyamoto),before);
 assert.equal(applySkin(catalog.heroes.find(h=>h.id===1092),109501).selectedSkin,undefined);
});
test('skin respects the separate awakening switch and never stacks both versions',()=>{
 const plain=activeSkills(miyamoto,false),skin=activeSkills(miyamoto,false,109501);
 assert.ok(plain.some(s=>s.id===10954));assert.ok(skin.some(s=>s.id===10954));
 assert.ok(!skin.some(s=>[10955,10959].includes(s.id)));
 assert.ok(skin.some(s=>s.id===10952));assert.ok(skin.some(s=>s.id===10957));
 const awakened=activeSkills(applySkin(miyamoto,109501),true);
 assert.ok(awakened.some(s=>s.id===10959));assert.ok(!awakened.some(s=>[10951,10953,10954,10955].includes(s.id)));
});
test('recommendations and caution quotes use the selected skin without duplicating or forcing hero ownership',()=>{
 const owned=[1095,1087];
 const plain=recommend(catalog.heroes,owned)[0],skin=recommend(catalog.heroes,owned,{skins:{1095:109501}})[0];
 const active=skin.a.id===1095?skin.a:skin.b;
 assert.equal(active.selectedSkin.id,109501);
 assert.ok(skin.reasons.some(s=>s.includes('Samurai Mundano')));
 assert.ok(skin.reasons.some(s=>s.includes('redução de pv')));
 assert.ok(skin.cautions.some(s=>s.includes('25% de chance')&&s.includes('30%')));
 assert.ok(!plain.reasons.some(s=>s.includes('Samurai Mundano')));
 assert.deepEqual(recommend(catalog.heroes,[1087],{skins:{1095:109501}}),[]);
});
test('defensive skill and counterattack reductions do not masquerade as outgoing damage',()=>{
 const fake={skills:[{id:1,slot:'Passiva',description:'Reduz o DANO de Habilidade recebido em 20%. Reduz o DANO de Contra-ataque recebido em 20%. Reduz o DANO de ataque básico recebido em 15%.'}]};
 const p=profile(fake,'Campo',true);
 assert.ok(p.features.includes('Resistência'));
 for(const f of ['Dano de habilidade','Contra-ataque','Ataque básico'])assert.ok(!p.features.includes(f),f);
});
test('explicit shield and HP reduction interactions refine suggestions and retain scenario limits',()=>{
 const riven=catalog.heroes.find(h=>h.id===1092),robert=catalog.heroes.find(h=>h.id===1087);
 assert.ok(profile(riven,'Campo',true).shieldBenefit);
 assert.ok(profile(robert,'Campo',true).consumes.includes('Redução de PV'));
 assert.ok(profile(miyamoto,'Campo',true).produces.includes('Redução de PV'));
 const pair=recommend(catalog.heroes,[1092,1101])[0];assert.ok(pair.reasons.some(s=>s.includes('escudo')));
 assert.equal(applies('Durante as Invasões, aumenta o ATQ em 40%.','Campo'),false);
 assert.equal(applies('Durante os Cercos, aumenta o DANO em 30%.','Guarnição'),false);
 assert.equal(applies('Durante as Invasões, aumenta o ATQ em 40%.','Invasão'),true);
});

test('self-supplied conditions and duplicate shields do not inflate pair priority',()=>{
 const pair=recommend(catalog.heroes,[1095,1087],{skins:{1095:109501}})[0];
 assert.equal(pair.priority[0],0);assert.ok(pair.reasons.some(s=>s.includes('próprio kit')));
 const shields=recommend(catalog.heroes,[1092,1101])[0];assert.equal(shields.priority[1],0);
 assert.ok(shields.reasons.some(s=>s.includes('não presumimos que os escudos se acumulem')));
 const counter=recommend(catalog.heroes,[1092,1122])[0];assert.ok(counter.reasons.some(s=>s.includes('não comprova amplificação')));
});
