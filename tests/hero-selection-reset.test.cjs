const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loadBindings,transform}=require('next/dist/build/swc');
const catalog=require('../data/heroes.json');
const {compatible,selectable}=require('../lib/hero-combinations.cjs');
function find(node,predicate){
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  for(const child of React.Children.toArray(node.props?.children)){const match=find(child,predicate);if(match)return match;}
  return null;
}
test('changing troop clears all owned heroes and results, including versatile leaders; returning keeps the roster empty',async()=>{
  await loadBindings();
  const source=await fs.readFile(path.join(__dirname,'../app/Heroes.jsx'),'utf8');
  const compiled=await transform(source,{filename:'Heroes.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  const owned=catalog.heroes.filter(h=>h.complete&&selectable(h)&&compatible(h,'Infantaria')).slice(0,2).map(h=>h.id);
  const leader=catalog.heroes.find(h=>h.complete&&selectable(h)&&h.troop==='Líder').id;
  if(!owned.includes(leader))owned.push(leader);
  const states=[catalog,'',0,'Infantaria','Campo',owned,'',true,true,true];let index=0;
  const context={exports:{},require(id){
    if(id==='react')return {...React,useEffect(){},useMemo:fn=>fn(),useState:initial=>{const slot=index++;if(!(slot in states))states[slot]=initial;return [states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value;}];}};
    if(id==='next/link')return ({children,...props})=>React.createElement('a',props,children);
    if(id==='./RosterActionBar')return ()=>null;
    if(id==='./SessionLoading')return ()=>null;
    if(id.endsWith('.css'))return {};
    return require(id);
  }};
  vm.createContext(context);vm.runInContext(compiled.code,context);
  const render=()=>{index=0;return context.exports.default();};
  const troopButton=(tree,troop)=>find(tree,n=>n.type==='button'&&Array.isArray(n.props.children)&&n.props.children.at(-1)===troop);
  let tree=render();
  assert.match(renderToStaticMarkup(tree),new RegExp(owned.length+' selecionados'));
  troopButton(tree,'Infantaria').props.onClick();
  assert.equal(states[5].length,owned.length); // Clicking the active troop is not a change.
  troopButton(tree,'Motos').props.onClick();
  assert.equal(states[3],'Motos');assert.equal(states[5].length,0);assert.equal(states[7],false);assert.equal(states[9],false);
  tree=render();
  const html=renderToStaticMarkup(tree);
  assert.match(html,/0 selecionados/);assert.doesNotMatch(html,/hero-card is-selected|mostrando \d+ de/);
  assert.equal(find(tree,n=>n.type==='button'&&n.props.children==='Ver combinações').props.disabled,true);
  troopButton(tree,'Infantaria').props.onClick();tree=render();
  assert.match(renderToStaticMarkup(tree),/0 selecionados/);
});
