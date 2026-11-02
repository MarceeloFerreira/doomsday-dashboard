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
const button=(tree,label)=>find(tree,n=>n.type==='button'&&n.props.children===label);

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
