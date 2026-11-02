const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const catalog=require('../data/beasts.json');
const {ELEMENTS,MODES,roleSkills,profile,recommend}=require('../lib/beast-combinations.cjs');
const context=(mode='Campo',supportElement='Água',enemyElement='')=>({mode,supportElement,enemyElement});
test('private catalog contains 17 legendary and 8 epic beasts with separate leader and support skill sets',()=>{
  assert.equal(catalog.beasts.length,25);assert.equal(new Set(catalog.beasts.map(b=>b.id)).size,25);
  for(const b of catalog.beasts){
    assert.ok(['Lendário','Épico'].includes(b.rarity));assert.equal(b.complete,true);assert.ok(ELEMENTS.includes(b.element));
    assert.equal(roleSkills(b,'Líder').length,4);assert.equal(roleSkills(b,'Suporte').length,3);
    assert.ok(roleSkills(b,'Líder').every(s=>!roleSkills(b,'Suporte').some(other=>other.id===s.id)));
    assert.ok([...roleSkills(b,'Líder'),...roleSkills(b,'Suporte')].every(s=>s.level>0&&s.description&&s.descriptionEn));
  }
});
test('combinations are ordered, owned-only and never pair a beast with itself',()=>{
  const owned=[51,86,86],pairs=recommend(catalog.beasts,owned);
  assert.equal(pairs.length,2);
  assert.deepEqual(new Set(pairs.map(p=>p.leader.id+'-'+p.support.id)),new Set(['51-86','86-51']));
  for(const mode of MODES){
    const all=catalog.beasts.map(b=>b.id),result=recommend(catalog.beasts,all,{mode});
    assert.equal(result.length,25*24);assert.equal(new Set(result.map(p=>p.leader.id+'-'+p.support.id)).size,600);
    assert.ok(result.every(p=>p.leader.id!==p.support.id));
  }
  const fake={...catalog.beasts[0],id:999,rarity:'Raro'};
  assert.equal(recommend([...catalog.beasts,fake],[51,999]).length,0);
  assert.equal(recommend(catalog.beasts,[51]).length,0);assert.equal(recommend(catalog.beasts,[]).length,0);
});
test('roles do not pool skill descriptions or automatically include special abilities',()=>{
  const fraudrin=catalog.beasts.find(b=>b.id===86);
  assert.ok(fraudrin.skills.Especial.length>0);
  assert.ok(!roleSkills(fraudrin,'Líder').some(s=>s.name==='Pressão Demoníaca'));
  assert.deepEqual(roleSkills(fraudrin,'Especial'),[]);
  assert.ok(roleSkills(fraudrin,'Suporte').some(s=>s.description.includes('Ao acionar um contra-ataque')));
});
test('enemy-element bonuses require a known matching opponent',()=>{
  const fraudrin=catalog.beasts.find(b=>b.id===86);
  for(const role of ['Líder','Suporte']){
    assert.equal(profile(fraudrin,role,context()).enemy,0);
    assert.ok(profile(fraudrin,role,context('Campo','Água','Fogo')).enemy>0);
    assert.equal(profile(fraudrin,role,context('Campo','Água','Grama')).enemy,0);
  }
});
test('Dirgewing garrison branch uses the actual support element instead of granting every branch',()=>{
  const dirgewing=catalog.beasts.find(b=>b.id===61);
  const fire=profile(dirgewing,'Líder',context('Guarnição','Fogo'));
  assert.ok(fire.produces.includes('Detonar'));assert.ok(!fire.produces.includes('Corrosão'));assert.ok(!fire.produces.includes('Escudo'));
  const water=profile(dirgewing,'Líder',context('Guarnição','Água'));
  assert.ok(water.produces.includes('Corrosão'));assert.ok(!water.produces.includes('Detonar'));
  const grass=profile(dirgewing,'Líder',context('Guarnição','Grama'));
  assert.ok(grass.produces.includes('Escudo'));
  const field=profile(dirgewing,'Líder',context('Campo','Fogo'));
  assert.ok(!field.produces.includes('Detonar'));assert.equal(field.scenario,0);
});
test('beast API authorizes before reading data and never serves a public JSON fallback',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../app/api/beasts/route.js'),'utf8').replace(/^import .*;$/gm,'').replace(/^export const .*;$/gm,'').replace('export async function','async function');
  for(const allowed of [false,true]){
    const chipCatalog=require('../data/beast-chips.json');
    let reads=0;const ctx={Response,JSON,path,process,permitted:async()=>allowed,readFile:async file=>{reads++;return JSON.stringify(path.basename(file)==='beast-chips.json'?chipCatalog:catalog);}};
    vm.createContext(ctx);vm.runInContext(source,ctx);
    const response=await ctx.GET({});assert.equal(response.status,allowed?200:401);assert.equal(reads,allowed?2:0);
    if(allowed){const body=await response.json();assert.equal(body.chips.sets.length,52);assert.equal(body.chips.manifest,body.manifest);}
    assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Vary'),'Cookie');
  }
  assert.equal(fs.existsSync(path.join(__dirname,'../public/data/beasts.json')),false);
});
test('direct beast page access is membership protected and preserves the login destination',async()=>{
  const raw=fs.readFileSync(path.join(__dirname,'../proxy.js'),'utf8');assert.match(raw,/matcher:.*'\/bestas'/);
  const source=raw.replace(/^import .*;$/gm,'').replace(/^export const .*;$/gm,'').replace('export async function','async function');
  for(const allowed of [false,true]){
    const ctx={URL,permitted:async()=>allowed,NextResponse:{next:()=>({status:200}),redirect:url=>({status:307,url:String(url)})}};
    vm.createContext(ctx);vm.runInContext(source,ctx);
    const response=await ctx.proxy({url:'http://localhost/bestas',nextUrl:{pathname:'/bestas'}});
    assert.equal(response.status,allowed?200:307);if(!allowed)assert.equal(response.url,'http://localhost/membros?destino=bestas');
  }
});
