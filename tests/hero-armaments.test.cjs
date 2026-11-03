const {test}=require('node:test');const assert=require('node:assert/strict');
const {recommend,activeSkills}=require('../lib/hero-combinations.cjs');
const {DEFAULT_ARMAMENTS,normalizeArmaments,leaderOnlySkills,positionCautions,offenseSignals,buildEquippedFormation,equippedFormationKey}=require('../lib/hero-armaments.cjs');
const catalog=require('../data/heroes.json');const hero=id=>catalog.heroes.find(h=>h.id===id);
const equipment=(patch={})=>({...DEFAULT_ARMAMENTS,enabled:true,...patch});
const pairs=owned=>recommend(catalog.heroes,owned,{skins:{1095:109501},balanced:true});
test('armament inputs clamp counts and preserve an editable 4 infantry + 1 weaker leader scenario',()=>{
 const c=normalizeArmaments(equipment());assert.equal(c.stock.Infantaria,4);assert.equal(c.stock['Líder'],1);assert.equal(c.leaderDevelopment,'weaker');
 const bad=normalizeArmaments({enabled:'true',stock:{Infantaria:-2,Motos:100,Atirador:'5','Líder':Infinity},leaderDevelopment:'bad'});
 assert.deepEqual(bad.stock,{Infantaria:0,Motos:5,Atirador:0,'Líder':0});assert.equal(bad.enabled,false);assert.equal(bad.leaderDevelopment,'weaker');
});
test('a developed infantry set favors an infantry leader and does not count the assistants set',()=>{
 const p=pairs([1095,1106]);const before=JSON.stringify(p);
 const f=buildEquippedFormation(p,{equipment:equipment(),balanced:true});assert.equal(f.length,1);
 assert.equal(f[0].deployment.leader.id,1095);assert.equal(f[0].deployment.assistant.id,1106);assert.equal(f[0].deployment.type,'Infantaria');assert.equal(f[0].deployment.weak,false);
 assert.equal(f[0].deployment.setNumber,1);assert.equal(JSON.stringify(p),before);
});
test('the relative leader set development changes orientation without pretending to know damage percentages',()=>{
 const p=pairs([1095,1106]);const f=buildEquippedFormation(p,{equipment:equipment({leaderDevelopment:'stronger'}),balanced:true});
 assert.equal(f[0].deployment.leader.id,1106);assert.equal(f[0].deployment.type,'Líder');assert.equal(f[0].deployment.weak,false);
 const onlyLeader=equipment({stock:{Infantaria:0,Atirador:0,Motos:0,'Líder':1}});const weak=buildEquippedFormation(p,{equipment:onlyLeader,balanced:true});
 assert.equal(weak[0].deployment.weak,true);assert.ok(weak[0].cautions.some(s=>s.includes('menos desenvolvido')));
 assert.equal(buildEquippedFormation(p,{equipment:{...onlyLeader,includeWeaker:false},balanced:true}).length,0);
});
test('global allocation uses four infantry sets and one leader set without reusing heroes or sets',()=>{
 const owned=[1095,1107,1087,1122,1101,1092,1115,1109,1106,1114],p=pairs(owned);
 const first=buildEquippedFormation(p,{equipment:equipment(),balanced:true});assert.equal(first.length,5);
 assert.equal(first.filter(p=>p.deployment.type==='Infantaria').length,4);assert.equal(first.filter(p=>p.deployment.type==='Líder').length,1);
 assert.equal(new Set(first.flatMap(p=>[p.a.id,p.b.id])).size,10);
 assert.equal(new Set(first.map(p=>p.deployment.type+':'+p.deployment.setNumber)).size,5);
 const reduced=buildEquippedFormation(p,{equipment:equipment({includeWeaker:false}),balanced:true});assert.equal(reduced.length,4);assert.ok(reduced.every(p=>p.deployment.type==='Infantaria'));
 const again=buildEquippedFormation(p,{equipment:equipment(),balanced:true},first,[equippedFormationKey(first)]);assert.equal(again.length,5);assert.equal(new Set(again.flatMap(p=>[p.a.id,p.b.id])).size,10);assert.notEqual(equippedFormationKey(again),equippedFormationKey(first));
});
test('no matching set never creates a fictitious deployment and scarce tanks remain limited',()=>{
 assert.deepEqual(buildEquippedFormation(pairs([1095,1092]),{equipment:equipment({stock:{Infantaria:0,'Líder':1}}),balanced:true}),[]);
 const p=pairs([1095,1107,1087,1122,1101]);const f=buildEquippedFormation(p,{equipment:equipment(),balanced:true});assert.equal(f.length,1);
 assert.equal(buildEquippedFormation(p,{equipment:equipment({stock:{Infantaria:0,'Líder':0}}),balanced:true}).length,0);
});
test('explicit leader-only abilities are removed for assistants and their loss is explained',()=>{
 const isabella={...hero(1114),deploymentRole:'assistant'};
 assert.equal(leaderOnlySkills(hero(1095),'Campo',true).length,0);
 assert.equal(leaderOnlySkills(hero(1114),'Campo',true).length,1);assert.equal(leaderOnlySkills(hero(1114),'Guarnição',true).length,0);
 assert.equal(activeSkills(isabella,true).some(s=>s.name==='Estrela em Ascensão'),false);
 const normalIds=leaderOnlySkills(hero(1114),'Campo',true).map(s=>s.id);assert.ok(!activeSkills(isabella,true).some(s=>normalIds.includes(s.id)));
 const f=buildEquippedFormation(pairs([1114,1092]),{equipment:equipment(),balanced:true});assert.equal(f[0].deployment.leader.id,1092);
 assert.ok(f[0].cautions.some(s=>s.includes('exige atuar como líder')&&s.includes('não foi contabilizada')));
});
test('assistant-specific damage penalties remain explicit instead of being silently counted at leader strength',()=>{
 const unit={...hero(1061),tags:["Infantaria","General"]};const p=recommend([unit,hero(1106)],[1061,1106]);const f=buildEquippedFormation(p,{equipment:equipment({leaderDevelopment:'stronger'})});
 assert.equal(f[0].deployment.leader.id,1061);assert.ok(positionCautions(hero(1106),{...unit,deploymentRole:'assistant'},'Campo',true).some(s=>s.includes('Vice-General')&&s.includes('4800')));
});
test('offensive signals describe damage modes, not automatic kills, and exclude field-ineligible effects',()=>{
 const fake={skills:[{id:1,slot:'Fúria',description:'Causa DANO a até 3 inimigos em uma área semicircular (Fator de Dano: 10000).'},{id:2,slot:'Passiva',description:'Durante as Invasões, causa DANO Contínuo ao alvo a cada segundo por 3s (Fator de Dano: 1000).'}]};
 assert.ok(offenseSignals([fake],'Campo',true).includes('Dano em área'));assert.ok(!offenseSignals([fake],'Campo',true).includes('Dano recorrente'));assert.ok(offenseSignals([fake],'Invasão',true).includes('Dano recorrente'));
});
test('full-roster armament planning stays bounded and respects the inventory in repeated versions',()=>{
 const p=pairs(catalog.heroes.map(h=>h.id)),start=Date.now();const f=buildEquippedFormation(p,{equipment:equipment(),balanced:true});
 assert.equal(f.length,5);assert.ok(Date.now()-start<5000);
 for(const d of f.map(p=>p.deployment)){assert.ok([d.leader.id,d.assistant.id].every(id=>catalog.heroes.some(h=>h.id===id)));assert.equal(d.type,d.leader.troop);}
});
