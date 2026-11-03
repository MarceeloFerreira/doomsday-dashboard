const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loadBindings,transform}=require('next/dist/build/swc');
const catalog=require('../data/heroes.json');
async function loadCard(){
  await loadBindings();
  const source=await fs.readFile(path.join(__dirname,'../app/Heroes.jsx'),'utf8');
  const compiled=await transform(source,{filename:'Heroes.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  const context={exports:{},require(id){
    if(id==='./heroes.css')return {};
    if(id==='./RosterActionBar')return ()=>null;
    if(id==='./SessionLoading')return ()=>null;
    if(id==='next/link')return ()=>null;
    return require(id);
  }};
  vm.createContext(context);vm.runInContext(compiled.code,context);
  return context.exports.HeroCard;
}
function inputOf(element){
  if(!element||typeof element!=='object')return null;
  if(element.type==='input')return element;
  for(const child of React.Children.toArray(element.props?.children)){const result=inputOf(child);if(result)return result;}
  return null;
}
test('preview-only Amir has a disabled unchecked selection and readable skill descriptions',async()=>{
  const HeroCard=await loadCard();let toggles=0;
  const hero=catalog.heroes.find(h=>h.id===1123);
  const node=HeroCard({hero,selected:true,awakened:true,onToggle:()=>toggles++});
  const input=inputOf(node);
  assert.equal(input.props.disabled,true);assert.equal(input.props.checked,false);
  input.props.onChange();assert.equal(toggles,0);
  const html=renderToStaticMarkup(node);
  assert.match(html,/is-preview/);assert.match(html,/Em breve · ainda indisponível/);
  assert.match(html,/aria-describedby="hero-availability-1123"/);
  assert.match(html,/<details class="hero-skills">/);
  assert.ok(hero.skills.some(s=>html.includes(s.name)));
});
test('available hero uses an accessible custom checkbox and can toggle its stable ID',async()=>{
  const HeroCard=await loadCard();let selected;
  const hero=catalog.heroes.find(h=>h.id===1124);
  const node=HeroCard({hero,selected:true,onToggle:id=>selected=id});
  const input=inputOf(node);
  assert.equal(input.props.disabled,false);assert.equal(input.props.checked,true);
  input.props.onChange();assert.equal(selected,1124);
  const html=renderToStaticMarkup(node);
  assert.match(html,/aria-label="Tenho Sebastian"/);
  assert.match(html,/hero-card-toggle/);assert.match(html,/hero-card-status/);
  assert.match(html,/No meu elenco/);assert.doesNotMatch(html,/is-preview/);
});

test('Miyamoto card exposes an independent accessible skin checkbox and switches displayed skills',async()=>{
 const Card=await loadCard(),hero=catalog.heroes.find(h=>h.id===1095);let selection;
 const card=Card({hero,selected:true,skinId:109501,onToggle(){},onSkinChange:(...args)=>{selection=args;}});
 function inputs(node){if(!node||typeof node!=='object')return [];return [...(node.type==='input'?[node]:[]),...React.Children.toArray(node.props?.children).flatMap(inputs)];}
 const checkboxes=inputs(card);assert.equal(checkboxes.length,2);assert.equal(checkboxes[1].props.checked,true);
 checkboxes[1].props.onChange({target:{checked:false}});assert.deepEqual(selection,[1095,null]);
 checkboxes[1].props.onChange({target:{checked:true}});assert.deepEqual(selection,[1095,109501]);
 const html=renderToStaticMarkup(card);assert.match(html,/Possui Skin Samurai Mundano/);assert.match(html,/Grande Momento/);assert.match(html,/Firme e Resoluto/);assert.match(html,/Crença Inabalável/);assert.doesNotMatch(html,/Dois Céus como Um|Cinco Anéis|Postura Defensiva/);
 const normal=renderToStaticMarkup(Card({hero,selected:true,onToggle(){}}));assert.match(normal,/Dois Céus como Um/);assert.match(normal,/Postura Defensiva/);assert.match(normal,/Cinco Anéis/);assert.doesNotMatch(normal,/Grande Momento|Crença Inabalável/);
 const other=catalog.heroes.find(h=>h.id===1092);assert.doesNotMatch(renderToStaticMarkup(Card({hero:other,onToggle(){}})),/hero-skin-choice/);
});
