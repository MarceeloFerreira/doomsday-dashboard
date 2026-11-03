const {test}=require('node:test');
const assert=require('node:assert/strict');
const {combatRole,applySkin,recommend,buildFormation,formationKey,TROOPS,MODES,compatible,selectable}=require('../lib/hero-combinations.cjs');
const catalog=require('../data/heroes.json');
const hero=id=>catalog.heroes.find(h=>h.id===id);
test('balanced roles distinguish actual damage from a kit with multiple defensive skills',()=>{
 for(const id of [1095,1107,1087,1122])assert.equal(combatRole(hero(id)).kind,'damage',hero(id).name);
 for(const id of [1101,1092,1115,1106])assert.equal(combatRole(hero(id)).kind,'tank',hero(id).name);
 const role=combatRole(applySkin(hero(1095),109501));assert.equal(role.kind,'damage');assert.ok(role.offensiveSkills.some(s=>s.name==='Grande Momento'));
 const fake={troop:'Infantaria',skills:[{id:1,slot:'Fúria',name:'Ataque em área',description:'Causa DANO a até 3 inimigos (Fator de Dano: 10000). O DANO sofrido por cada Esquadrão inimigo é reduzido em 10% para cada alvo adicional.'},{id:2,slot:'Passiva',name:'Defesa incidental',description:'Aumenta o PV do Esquadrão em 30% e reduz o DANO recebido em 15%.'}]};
 const p=combatRole(fake);assert.equal(p.kind,'damage');assert.equal(p.defensiveSkills.length,1);
});
test('tank classification respects scenario, awakening, troop restrictions and self-protection direction',()=>{
 const fake={troop:'Infantaria',skills:[{id:1,slot:'Fúria',name:'Escudo',description:'Ganha um Escudo por 3s (Fator de Escudo: 5000).'},{id:2,slot:'Passiva',name:'Guarnição',description:'Se estiver guarnecendo, aumenta a DEF do Esquadrão em 30%.'},{id:3,slot:'Despertar',name:'Defesa',description:'Aumenta o PV do Esquadrão de Infantaria em 30%.'}]};
 assert.equal(combatRole(fake,'Campo',false).kind,'support');assert.equal(combatRole(fake,'Guarnição',false).kind,'tank');assert.equal(combatRole(fake,'Campo',true).kind,'tank');
 assert.equal(combatRole(fake,'Campo',true,'Motos').kind,'support');
 const vulnerable={skills:[{id:1,slot:'Fúria',description:'Causa DANO ao alvo (Fator de Dano: 10000). O DANO recebido de Esquadrões inimigos aumenta em 10%.'},{id:2,slot:'Passiva',description:'Reduz o PV do inimigo em 30%.'}]};
 assert.equal(combatRole(vulnerable).kind,'damage');assert.equal(combatRole(vulnerable).defensiveSkills.length,0);
});
test('balanced mode permits only distinct damage and tank heroes and leaves the general mode available',()=>{
 const owned=[1095,1107,1101,1092],pairs=recommend(catalog.heroes,owned,{balanced:true,skins:{1095:109501}});
 assert.equal(pairs.length,4);assert.equal(recommend(catalog.heroes,owned).length,6);
 for(const pair of pairs){assert.ok(pair.balance);assert.notEqual(pair.balance.damageId,pair.balance.tankId);assert.match(pair.reasons[0],/Dupla equilibrada/);}
 assert.equal(recommend(catalog.heroes,[1095,1107],{balanced:true}).length,0);
 assert.equal(recommend(catalog.heroes,[1101,1092],{balanced:true}).length,0);
 const skin=pairs.flatMap(p=>[p.a,p.b]).find(h=>h.id===1095);assert.equal(skin.selectedSkin.id,109501);
});
test('a scarce role yields the attainable number of squads instead of an empty or fabricated formation',()=>{
 const owned=[1095,1107,1087,1122,1101];const pairs=recommend(catalog.heroes,owned,{balanced:true});
 const first=buildFormation(pairs);assert.equal(first.length,1);assert.equal(first[0].balance.tankId,1101);
 const second=buildFormation(pairs,first);assert.equal(second.length,1);assert.notEqual(formationKey(first),formationKey(second));
 const only=recommend(catalog.heroes,[1095,1101],{balanced:true});assert.equal(formationKey(buildFormation(only,buildFormation(only))),formationKey(buildFormation(only)));
 const used=new Set();for(const p of buildFormation(recommend(catalog.heroes,[1095,1107,1101,1092],{balanced:true}))){for(const id of [p.a.id,p.b.id]){assert.ok(!used.has(id));used.add(id);}}assert.equal(used.size,4);
});
test('balanced formations across troops and scenarios preserve ownership and active roles',()=>{
 const owned=catalog.heroes.map(h=>h.id);
 for(const troop of TROOPS)for(const mode of MODES)for(const awakened of [true,false]){
  const pairs=recommend(catalog.heroes,owned,{troop,mode,awakened,balanced:true,skins:{1095:109501}}),formation=buildFormation(pairs);
  const used=formation.flatMap(p=>[p.a.id,p.b.id]);assert.equal(new Set(used).size,used.length);assert.ok(formation.length<=5);
  for(const p of formation){const damage=p.a.id===p.balance.damageId?p.a:p.b,tank=p.a.id===p.balance.tankId?p.a:p.b;assert.equal(combatRole(damage,mode,awakened,troop).kind,'damage');assert.equal(combatRole(tank,mode,awakened,troop).kind,'tank');assert.ok([damage,tank].every(h=>compatible(h,troop)&&selectable(h)&&h.complete));}
 }
});
