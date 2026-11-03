const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loadBindings,transform}=require('next/dist/build/swc');
const catalog=require('../data/heroes.json');
const {compatible,selectable,formationKey}=require('../lib/hero-combinations.cjs');
function find(node,predicate){
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  for(const child of React.Children.toArray(node.props?.children)){const match=find(child,predicate);if(match)return match;}
  return null;
}
async function screen(n){
  await loadBindings();
  const source=await fs.readFile(path.join(__dirname,'../app/Heroes.jsx'),'utf8');
  const compiled=await transform(source,{filename:'Heroes.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  const owned=catalog.heroes.filter(h=>h.complete&&selectable(h)&&compatible(h,'Infantaria')).slice(0,n).map(h=>h.id);
  const states=[catalog,'',0,'Infantaria','Campo',owned,'',false,true,false];let index=0;
  const context={exports:{},requestAnimationFrame(){},require(id){
    if(id==='react')return {...React,useEffect(){},useMemo:fn=>fn(),useState:initial=>{const slot=index++;if(!(slot in states))states[slot]=initial;return [states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value;}];}};
    if(id==='next/link')return ({children,...props})=>React.createElement('a',props,children);
    if(id==='./RosterActionBar'||id==='./SessionLoading')return ()=>null;
    if(id.endsWith('.css'))return {};
    return require(id);
  }};
  vm.createContext(context);vm.runInContext(compiled.code,context);
  return {states,render(){index=0;return context.exports.default();}};
}
const button=(tree,label)=>find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).join('')===label);

test('hero screen generates squads, displays both assessments, regenerates and invalidates stale results',async()=>{
  const ui=await screen(10);
  let tree=ui.render();
  assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);
  button(tree,'Ver combinações').props.onClick();tree=ui.render();
  let html=renderToStaticMarkup(tree);
  assert.equal((html.match(/class="hero-pair"/g)||[]).length,5);
  assert.equal((html.match(/Pontos fortes/g)||[]).length,5);
  assert.equal((html.match(/Pontos de atenção/g)||[]).length,5);
  const first=formationKey(ui.states[10].pairs);
  const originalPairs=new Set(ui.states[10].pairs.map(p=>formationKey([p])));
  button(tree,'Gerar novas combinações').props.onClick();tree=ui.render();
  assert.notEqual(formationKey(ui.states[10].pairs),first);
  assert.ok(ui.states[10].pairs.every(p=>!originalPairs.has(formationKey([p]))));
  assert.equal(ui.states[5].length,10);
  assert.match(renderToStaticMarkup(tree),/Versão 2/);
  const scenario=find(tree,n=>n.type==='select');
  scenario.props.onChange({target:{value:'Guarnição'}});tree=ui.render();
  assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);
  button(tree,'Ver combinações').props.onClick();tree=ui.render();
  assert.match(renderToStaticMarkup(tree),/Versão 1/);
  const toggle=find(tree,n=>typeof n.type==='function'&&n.props.hero&&n.props.selected);
  toggle.props.onToggle(toggle.props.hero.id);tree=ui.render();
  assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);
  button(tree,'Ver combinações').props.onClick();tree=ui.render();
  assert.equal((renderToStaticMarkup(tree).match(/class="hero-pair"/g)||[]).length,4);
  const awakening=find(tree,n=>n.type==='input'&&n.props.type==='checkbox'&&n.props.onChange&&n.props.checked===true);
  awakening.props.onChange({target:{checked:false}});tree=ui.render();
  assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);
});

test('two selected heroes show one squad and explain the disabled regeneration action',async()=>{
  const ui=await screen(2);let tree=ui.render();
  button(tree,'Ver combinações').props.onClick();tree=ui.render();
  const html=renderToStaticMarkup(tree);
  assert.equal((html.match(/class="hero-pair"/g)||[]).length,1);
  assert.match(html,/só há uma dupla possível/);
  assert.equal(button(tree,'Gerar novas combinações').props.disabled,true);
});

test('changing Miyamoto skin invalidates existing formations and regenerates using the selected kit',async()=>{
 const ui=await screen(2);ui.states[5]=[1095,1087];let tree=ui.render();
 button(tree,'Ver combinações').props.onClick();tree=ui.render();assert.match(renderToStaticMarkup(tree),/class="hero-pair"/);
 const card=()=>find(tree,n=>n.props?.hero?.id===1095);
 card().props.onSkinChange(1095,109501);tree=ui.render();assert.equal(card().props.skinId,109501);
 assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);
 button(tree,'Ver combinações').props.onClick();tree=ui.render();assert.match(renderToStaticMarkup(tree),/Samurai Mundano/);assert.match(renderToStaticMarkup(tree),/Grande Momento/);
 card().props.onSkinChange(1095,null);tree=ui.render();assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);
 button(tree,'Ver combinações').props.onClick();tree=ui.render();
 const active=ui.states[10].pairs.flatMap(p=>[p.a,p.b]).find(h=>h.id===1095);assert.equal(active.selectedSkin,undefined);
 assert.ok(active.skills.some(s=>s.name==='Dois Céus como Um'));
});

test('balanced checkbox invalidates previous results and displays the damage and tank assignments',async()=>{
 const ui=await screen(2);ui.states[5]=[1095,1107,1101,1092];let tree=ui.render();
 button(tree,'Ver combinações').props.onClick();tree=ui.render();assert.match(renderToStaticMarkup(tree),/class="hero-pair"/);
 const balance=()=>find(tree,n=>n.type==='label'&&n.props.className?.includes('hero-balanced-choice'));
 const check=()=>find(balance(),n=>n.type==='input');assert.equal(check().props.checked,false);
 check().props.onChange({target:{checked:true}});tree=ui.render();assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);assert.equal(check().props.checked,true);
 button(tree,'Ver combinações').props.onClick();tree=ui.render();assert.match(renderToStaticMarkup(tree),/hero-pair-roles/);assert.match(renderToStaticMarkup(tree),/Tank \/ sustentação/);assert.ok(ui.states[10].pairs.every(p=>p.balance));
 check().props.onChange({target:{checked:false}});tree=ui.render();assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);
 button(tree,'Ver combinações').props.onClick();tree=ui.render();assert.ok(ui.states[10].pairs.every(p=>p.balance===null));
});
test('balanced mode explains a missing tank and previews only attainable squads',async()=>{
 const ui=await screen(2);ui.states[5]=[1095,1107];ui.states[12]=true;let tree=ui.render();
 let html=renderToStaticMarkup(tree);assert.match(html,/Não há uma dupla equilibrada/);assert.equal(button(tree,'Ver combinações').props.disabled,true);
 ui.states[5]=[1095,1107,1087,1122,1101];tree=ui.render();html=renderToStaticMarkup(tree);assert.match(html,/1 dupla disponível/);
 button(tree,'Ver combinações').props.onClick();tree=ui.render();assert.equal(ui.states[10].pairs.length,1);assert.match(renderToStaticMarkup(tree),/3 herói\(s\) ficam de reserva/);
});

test('armament planning invalidates old results and identifies the leader, assistant and assigned set',async()=>{
 const ui=await screen(2);ui.states[5]=[1095,1106];let tree=ui.render();
 button(tree,'Ver combinações').props.onClick();tree=ui.render();assert.match(renderToStaticMarkup(tree),/class="hero-pair"/);
 const option=find(tree,n=>n.type==='section'&&n.props['aria-label']==='Planejamento de armamentos');
 find(option,n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});tree=ui.render();assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);
 button(tree,'Ver combinações').props.onClick();tree=ui.render();const html=renderToStaticMarkup(tree);
 assert.match(html,/Líder da dupla:/);assert.match(html,/Assistente:/);assert.match(html,/conjunto Infantaria 1/);assert.match(html,/Armamento do assistente não contabilizado/);
 assert.equal(ui.states[10].pairs[0].deployment.leader.id,1095);
 const control=find(tree,n=>n.type==='input'&&n.props.type==='number'&&n.props.value===4);control.props.onChange({target:{value:'0'}});tree=ui.render();assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair"/);
});
test('armament controls show an empty-state explanation when all usable sets are disabled',async()=>{
 const ui=await screen(2);ui.states[5]=[1095,1092];ui.states[13]={enabled:true,stock:{Infantaria:0,Atirador:0,Motos:0,'Líder':1},leaderDevelopment:'weaker',includeWeaker:false,offensive:true};
 const tree=ui.render();assert.equal(button(tree,'Ver combinações').props.disabled,true);assert.match(renderToStaticMarkup(tree),/Não há uma dupla que atenda/);
});

test('nine-hero roster explains the balanced limit and uses three infantry sets plus one leader set',async()=>{
 const ui=await screen(9);
 ui.states[5]=[1101,1106,1086,1107,1115,1202,1095,1116,1100];
 ui.states[11]={1095:109501};ui.states[12]=true;
 ui.states[13]={enabled:true,stock:{Infantaria:3,Atirador:0,Motos:0,'Líder':1},leaderDevelopment:'comparable',includeWeaker:true,offensive:true};
 let tree=ui.render();assert.match(renderToStaticMarkup(tree),/Duplas equilibradas limita este elenco a 3/);
 button(tree,'Ver combinações').props.onClick();tree=ui.render();assert.equal(ui.states[10].pairs.length,3);
 button(tree,'Gerar 4 duplas sem exigir equilíbrio').props.onClick();tree=ui.render();
 const formation=ui.states[10].pairs;assert.equal(ui.states[12],false);assert.equal(formation.length,4);
 assert.equal(formation.filter(p=>p.deployment.type==='Infantaria').length,3);
 assert.equal(formation.filter(p=>p.deployment.type==='Líder').length,1);
 assert.equal(new Set(formation.flatMap(p=>[p.a.id,p.b.id])).size,8);
 assert.ok(formation.flatMap(p=>[p.a,p.b]).some(h=>h.id===1095&&h.selectedSkin?.id===109501));
 const html=renderToStaticMarkup(tree);assert.equal((html.match(/class="hero-pair"/g)||[]).length,4);
 assert.doesNotMatch(html,/Duplas equilibradas limita/);assert.match(html,/conjunto Líder 1/);
 button(tree,'Gerar novas combinações').props.onClick();tree=ui.render();assert.equal(ui.states[10].pairs.length,4);
});
