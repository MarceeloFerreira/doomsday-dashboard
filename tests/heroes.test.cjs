const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {TROOPS,MODES,listed,selectable,compatible,activeSkills,profile,recommend}=require('../lib/hero-combinations.cjs');
const catalog=require('../data/heroes.json');

test('catalog contains only legendary heroes and includes the three newly catalogued heroes',()=>{
  assert.equal(catalog.heroes.length,64);
  assert.equal(new Set(catalog.heroes.map(h=>h.id)).size,64);
  assert.ok(catalog.heroes.every(h=>h.rarity==='Lendário'));
  for(const id of [1123,1124,1125])assert.ok(catalog.heroes.find(h=>h.id===id)?.complete);
});
test('pairs use only owned, complete legendary heroes of the chosen troop or versatile tags',()=>{
  const all=catalog.heroes.map(h=>h.id);
  const bad={...catalog.heroes.find(h=>h.complete),id:999,rarity:'Épico'};
  for(const troop of TROOPS)for(const mode of MODES){
    const eligible=catalog.heroes.filter(h=>h.complete&&selectable(h)&&compatible(h,troop));
    const pairs=recommend([...catalog.heroes,bad],[...all,999,999],{troop,mode});
    assert.equal(pairs.length,eligible.length*(eligible.length-1)/2);
    assert.equal(new Set(pairs.map(p=>[p.a.id,p.b.id].sort().join('-'))).size,pairs.length);
    assert.ok(pairs.every(p=>p.a.id!==p.b.id&&p.a.complete&&p.b.complete&&p.a.rarity==='Lendário'&&p.b.rarity==='Lendário'));
  }
  assert.deepEqual(recommend(catalog.heroes,[]),[]);
  assert.deepEqual(recommend(catalog.heroes,[1124]),[]);
  assert.deepEqual(recommend(catalog.heroes,[1124,1125],{troop:'Infantaria'}),[]);
  assert.equal(recommend(catalog.heroes,[1124,1125],{troop:'Atirador'}).length,1);
});
test('awakening replaces its basic skill rather than adding both versions',()=>{
  const valeria=catalog.heroes.find(h=>h.id===1125);
  assert.ok(activeSkills(valeria,false).some(s=>s.slot==='Fúria'));
  assert.ok(!activeSkills(valeria,false).some(s=>s.slot==='Despertar'));
  const awakened=activeSkills(valeria,true);
  assert.ok(awakened.some(s=>s.slot==='Despertar'));
  assert.ok(!awakened.some(s=>s.id===valeria.awakeningReplaces));
  assert.ok(!awakened.some(s=>s.slot==='Substituição do despertar'));
});
test('scenario conditions do not grant Valeria field healing in invasion or garrison',()=>{
  const valeria=catalog.heroes.find(h=>h.id===1125);
  assert.ok(profile(valeria,'Campo',true).features.includes('Cura'));
  assert.ok(!profile(valeria,'Invasão',true).features.includes('Cura'));
  assert.ok(!profile(valeria,'Guarnição',true).features.includes('Cura'));
  const fake={skills:[{id:1,slot:'Passiva',description:'Aumenta a Velocidade de Construção do Abrigo em 15%.'}]};
  assert.equal(profile(fake,'Campo',false).features.length,0);
});
test('hero API authorizes membership before loading private catalog data',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../app/api/heroes/route.js'),'utf8').replace(/^import .*;$/gm,'').replace(/^export const .*;$/gm,'').replace('export async function','async function');
  for(const allowed of [false,true]){
    let reads=0;
    const context={Response,JSON,path,process,permitted:async()=>allowed,readFile:async()=>{reads++;return JSON.stringify(catalog);}};
    vm.createContext(context);vm.runInContext(source,context);
    const response=await context.GET({});
    assert.equal(response.status,allowed?200:401);
    assert.equal(reads,allowed?1:0);
    assert.match(response.headers.get('Cache-Control'),/private.*no-store/);
    assert.equal(response.headers.get('Vary'),'Cookie');
  }
  assert.ok(!fs.existsSync(path.join(__dirname,'../public/data/heroes.json')));
});
test('direct access to heroes redirects guests and keeps the login destination',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../proxy.js'),'utf8').replace(/^import .*;$/gm,'').replace(/^export const .*;$/gm,'').replace('export async function','async function');
  for(const allowed of [false,true]){
    const context={URL,permitted:async()=>allowed,NextResponse:{next:()=>({status:200}),redirect:url=>({status:307,url:String(url)})}};
    vm.createContext(context);vm.runInContext(source,context);
    const response=await context.proxy({url:'http://localhost/herois',nextUrl:{pathname:'/herois'}});
    assert.equal(response.status,allowed?200:307);
    if(!allowed)assert.equal(response.url,'http://localhost/membros?destino=herois');
  }
});

test('gatherers and zombie hunters never appear or participate even with stale selections',()=>{
  const blocked=catalog.heroes.filter(h=>h.tags.some(tag=>/Coletar|Caçador de Zumbis/.test(tag)));
  assert.ok(blocked.length>0);
  for(const hero of blocked){
    assert.equal(listed(hero),false);
    for(const troop of TROOPS)assert.equal(compatible(hero,troop),false);
  }
  const all=catalog.heroes.map(h=>h.id);
  for(const troop of TROOPS){
    const pairs=recommend(catalog.heroes,all,{troop});
    assert.ok(pairs.every(p=>!blocked.some(h=>[p.a.id,p.b.id].includes(h.id))));
    assert.ok(catalog.heroes.filter(h=>compatible(h,troop)).every(h=>[troop,'Líder'].includes(h.troop)));
  }
});
test('Amir remains consultable but cannot be selected or recommended for any troop or mode',()=>{
  const amir=catalog.heroes.find(h=>h.id===1123);
  assert.equal(listed(amir),true);
  assert.ok(activeSkills(amir,true).length>0);
  assert.equal(selectable(amir),false);
  const ids=catalog.heroes.map(h=>h.id);
  for(const troop of TROOPS)for(const mode of MODES){
    assert.equal(compatible(amir,troop),true);
    assert.ok(recommend(catalog.heroes,ids,{troop,mode}).every(p=>p.a.id!==1123&&p.b.id!==1123));
  }
});

test('refreshed hero descriptions retain combat conditions and resolve localization arguments',()=>{
  assert.equal(catalog.client,'1.62.0');
  assert.equal(catalog.asOf,'2026-10-27');
  for(const hero of catalog.heroes)for(const skill of hero.skills){
    assert.doesNotMatch(skill.description,/\{\d+\}|\[missing:/);
    assert.doesNotMatch(skill.descriptionEn,/\{\d+\}|\[missing:/);
  }
  const cynthia=catalog.heroes.find(h=>h.id===1034).skills.find(s=>s.id===10344);
  assert.match(cynthia.description,/Catherine.*15%/);
  const tom=catalog.heroes.find(h=>h.id===1032).skills.find(s=>s.slot==='Despertar');
  assert.match(tom.description,/Levemente Feridas/);
  assert.match(tom.description,/até 5 Esquadrões/);
  const valeria=catalog.heroes.find(h=>h.id===1125).skills.find(s=>s.slot==='Despertar');
  assert.match(valeria.description,/35% deste DANO causado/);
});
