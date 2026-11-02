const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loadBindings,transform}=require('next/dist/build/swc');
const catalog=require('../data/beasts.json');
const escaped=text=>renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7);
function find(node,predicate){
  if(!node||typeof node!=='object')return null;
  if(predicate(node))return node;
  for(const child of React.Children.toArray(node.props?.children)){const result=find(child,predicate);if(result)return result;}
  return null;
}
async function load(states){
  await loadBindings();
  const source=await fs.readFile(path.join(__dirname,'../app/Beasts.jsx'),'utf8');
  const compiled=await transform(source,{filename:'Beasts.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  let index=0;
  const ctx={exports:{},requestAnimationFrame(){},require(id){
    if(id==='react'&&states)return {...React,useEffect(){},useMemo:fn=>fn(),useState:initial=>{const slot=index++;if(!(slot in states))states[slot]=initial;return [states[slot],value=>{states[slot]=typeof value==='function'?value(states[slot]):value;}];}};
    if(id==='next/link')return ({children,...props})=>React.createElement('a',props,children);
    if(id==='./RosterActionBar')return ()=>null;
    if(id==='./SessionLoading')return ()=>React.createElement('p',{role:'status'},'Carregando suas bestas…');
    if(id.endsWith('.css'))return {};
    return require(id);
  }};
  vm.createContext(ctx);vm.runInContext(compiled.code,ctx);
  return {Card:ctx.exports.BeastCard,ChipSuggestion:ctx.exports.ChipSuggestion,render:()=>{index=0;return ctx.exports.default();}};
}
test('beast card keeps the approved checkbox and displays the selected role without pooling descriptions',async()=>{
  const {Card}=await load(),beast=catalog.beasts.find(b=>b.id===86);let toggled;
  const leader=Card({beast,role:'Líder',selected:true,onToggle:id=>toggled=id});
  const checkbox=find(leader,n=>n.type==='input');assert.equal(checkbox.props.checked,true);checkbox.props.onChange();assert.equal(toggled,86);
  const html=renderToStaticMarkup(leader);
  assert.match(html,/hero-card-input/);assert.match(html,/hero-card-toggle/);assert.match(html,/Ver 4 habilidades de líder/);
  assert.ok(html.includes(escaped(beast.skills['Líder'][0].description)));
  assert.ok(!html.includes(escaped(beast.skills.Suporte[0].description)));
  assert.ok(html.includes(escaped(beast.skills.Especial[0].description)));assert.match(html,/apenas consulta nesta versão/);
  const support=renderToStaticMarkup(React.createElement(Card,{beast,role:'Suporte',onToggle(){}}));
  assert.match(support,/Ver 3 habilidades de suporte/);assert.ok(support.includes(escaped(beast.skills.Suporte[0].description)));
  assert.ok(!support.includes(escaped(beast.skills['Líder'][0].description)));
});
test('role and element filters preserve cross-element ownership; clearing resets pairs and disables comparison',async()=>{
  const states=[catalog,'',0,'Campo','','Líder',[51,86],'','',false,true];
  const {render}=await load(states);let tree=render();
  assert.match(renderToStaticMarkup(tree),/2 selecionadas/);
  find(tree,n=>n.type==='button'&&n.props.children==='Suporte').props.onClick();
  tree=render();assert.equal(states[5],'Suporte');assert.equal(states[6].length,2);
  find(tree,n=>n.type==='select'&&n.props.value===''&&React.Children.toArray(n.props.children).some(c=>c.props?.children==='Todos os elementos')).props.onChange({target:{value:'Fogo'}});
  tree=render();assert.equal(states[6].length,2);assert.match(renderToStaticMarkup(tree),/2 selecionadas/);
  find(tree,n=>n.type==='button'&&n.props.children==='Limpar seleção').props.onClick();
  tree=render();assert.equal(states[6].length,0);assert.equal(states[10],false);
  assert.equal(find(tree,n=>n.type==='button'&&n.props.children==='Ver combinações').props.disabled,true);
  assert.doesNotMatch(renderToStaticMarkup(tree),/beast-pair-members/);
});
test('initial beast view contains only loading until authenticated data arrives',async()=>{
  const {render}=await load([]);const html=renderToStaticMarkup(render());
  assert.match(html,/Carregando suas bestas/);assert.doesNotMatch(html,/Fraudrin|Knifehead|Selecionar lista/);
});

test('chip profiles update the two-role plan without changing the beast roster or expanding roster cards',async()=>{
  const chips=require('../data/beast-chips.json'),data={...catalog,chips};
  const states=[data,'',0,'Campo','','Líder',[59,81],'','',false,true];
  const {render}=await load(states);let tree=render();
  find(tree,n=>n.type==='button'&&n.props.children==='Ver combinações').props.onClick();tree=render();
  assert.match(renderToStaticMarkup(tree),/Chips sugeridos · 12 roxos/);
  find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).some(c=>c.props?.children==='Roxos + lendários')).props.onClick();
  tree=render();assert.equal(states[11],'mixed');assert.equal(states[12],4);assert.deepEqual(states[6],[59,81]);
  assert.match(renderToStaticMarkup(tree),/Chips sugeridos · 8 roxos \+ 4 lendários/);
  const budget=find(tree,n=>n.type==='select'&&n.props.value===4);budget.props.onChange({target:{value:'2'}});
  tree=render();assert.match(renderToStaticMarkup(tree),/Chips sugeridos · 10 roxos \+ 2 lendários/);
  find(tree,n=>n.type==='button'&&React.Children.toArray(n.props.children).some(c=>c.props?.children==='Avaliar OC / soberbos')).props.onClick();
  tree=render();assert.equal(states[11],'oc');assert.equal(states[12],6);assert.deepEqual(states[6],[59,81]);
  assert.match(renderToStaticMarkup(tree),/Lendários para completar a dupla/);
  find(tree,n=>n.type==='select'&&n.props.value===0).props.onChange({target:{value:'2'}});
  tree=render();assert.match(renderToStaticMarkup(tree),/Chips sugeridos · 4 roxos \+ 2 lendários \+ 6 OC/);
});
test('mixed beast roster generates five squads, changes every partnership and preserves formation through display filters',async()=>{
  const {formationKey}=require('../lib/beast-combinations.cjs');
  const chips=require('../data/beast-chips.json');
  const owned=[...catalog.beasts.filter(b=>b.rarity==='Épico'),...catalog.beasts.filter(b=>b.rarity==='Lendário').slice(0,2)].map(b=>b.id);
  const states=[{...catalog,chips},'',0,'Campo','','Líder',owned,'','',false,false];
  const {render}=await load(states);let tree=render();
  assert.match(renderToStaticMarkup(tree),/17 lendárias · 8 épicas/);
  find(tree,n=>n.type==='button'&&n.props.children==='Ver combinações').props.onClick();tree=render();
  let html=renderToStaticMarkup(tree);
  assert.equal((html.match(/class="hero-pair beast-pair"/g)||[]).length,5);
  assert.equal((html.match(/Pontos de atenção/g)||[]).length,5);
  const first=states[15].pairs,firstKey=formationKey(first);
  find(tree,n=>n.type==='button'&&n.props.children==='Gerar novas combinações').props.onClick();tree=render();
  assert.notEqual(formationKey(states[15].pairs),firstKey);
  assert.ok(states[15].pairs.every(p=>!first.some(q=>formationKey([p])===formationKey([q]))));
  const currentKey=formationKey(states[15].pairs);
  find(tree,n=>n.type==='select'&&React.Children.toArray(n.props.children).some(c=>c.props?.children==='Épicas')).props.onChange({target:{value:'Épico'}});tree=render();
  assert.equal(states[6].length,10);assert.equal(states[16],'Épico');
  assert.equal(formationKey(states[15].pairs),currentKey);
  assert.equal((renderToStaticMarkup(tree).match(/class="hero-pair beast-pair"/g)||[]).length,5);
  find(tree,n=>n.type==='button'&&n.props.children==='Suporte').props.onClick();tree=render();
  assert.equal(formationKey(states[15].pairs),currentKey);
  find(tree,n=>n.type==='select'&&n.props.value==='Campo').props.onChange({target:{value:'Guarnição'}});tree=render();
  assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair beast-pair"/);
  find(tree,n=>n.type==='button'&&n.props.children==='Ver combinações').props.onClick();tree=render();
  const enemySelect=find(tree,n=>n.type==='select'&&React.Children.toArray(n.props.children).some(c=>c.props?.children==='Não informado'));
  enemySelect.props.onChange({target:{value:'Fogo'}});tree=render();
  assert.doesNotMatch(renderToStaticMarkup(tree),/class="hero-pair beast-pair"/);
});

test('two epic beasts show a single chosen role assignment and explain disabled regeneration',async()=>{
  const owned=catalog.beasts.filter(b=>b.rarity==='Épico').slice(0,2).map(b=>b.id);
  const states=[catalog,'',0,'Campo','','Líder',owned,'','',false,false];
  const {render}=await load(states);let tree=render();
  find(tree,n=>n.type==='button'&&n.props.children==='Ver combinações').props.onClick();tree=render();
  const html=renderToStaticMarkup(tree);
  assert.equal((html.match(/class="hero-pair beast-pair"/g)||[]).length,1);
  assert.match(html,/As duas posições já foram avaliadas/);
  assert.equal(find(tree,n=>n.type==='button'&&n.props.children==='Gerar novas combinações').props.disabled,true);
});

test('leader explanation shows the two candidate stat sheets without pooling the support leader skills into the active pair',async()=>{
  const {recommend}=require('../lib/beast-combinations.cjs');
  const states=[catalog,'',0,'Campo','','Líder',[21,51],'','',false,false];
  const {render}=await load(states);let tree=render();
  find(tree,n=>n.type==='button'&&n.props.children==='Ver combinações').props.onClick();tree=render();
  const html=renderToStaticMarkup(tree);
  assert.match(html,/Por que esta líder/);
  assert.match(html,/Comparar as duas opções de líder/);
  assert.match(html,/1\.650/);assert.match(html,/1\.320/);
  assert.match(html,/habilidades de líder da suporte não são somadas/);
  assert.match(html,/sem estimar dano final/);
  assert.equal(recommend(catalog.beasts,[21,51])[0].leader.id,51);
});
