const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {loadBindings,transform}=require('next/dist/build/swc');
async function compile(name,requireOverride){
  await loadBindings();const source=await fs.readFile(path.join(__dirname,'../app/'+name+'.jsx'),'utf8');
  const compiled=await transform(source,{filename:name+'.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  const context={exports:{},require:requireOverride,window:{scrollTo(){}}};vm.createContext(context);vm.runInContext(compiled.code,context);return context.exports.default;
}
function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const match=find(child,predicate);if(match)return match;}return null;}
test('mobile menu exposes expanded state, closes on a destination link and handles Escape with focus return',async()=>{
  let open=false,focused=0;
  const Frame=await compile('SiteFrame',id=>{
    if(id==='react')return {...React,useEffect(){},useState:()=>[open,value=>{open=typeof value==='function'?value(open):value;}],useRef:()=>({current:{focus(){focused++;}}})};
    if(id==='next/navigation')return {usePathname:()=>'/herois'};
    if(id==='next/link')return ({children,prefetch,...props})=>React.createElement('a',props,children);
    if(id.startsWith('./'))return ()=>null;
    return require(id);
  });
  const render=()=>Frame({logo:'/logo.png',panels:'',children:null});
  let tree=render(),button=find(tree,n=>n.props?.className==='nav-mobile-toggle');
  assert.equal(button.props['aria-expanded'],false);assert.equal(button.props['aria-controls'],'site-navigation');
  button.props.onClick();tree=render();button=find(tree,n=>n.props?.className==='nav-mobile-toggle');
  assert.equal(button.props['aria-expanded'],true);
  let drawer=find(tree,n=>n.props?.id==='site-navigation');assert.match(drawer.props.className,/is-open/);
  drawer.props.onClick({target:{closest:()=>({})}});assert.equal(open,false);
  button.props.onClick();tree=render();drawer=find(tree,n=>n.props?.id==='site-navigation');
  find(tree,n=>n.type==='nav'&&n.props.className==='topmenu').props.onKeyDown({key:'Escape'});assert.equal(open,false);assert.equal(focused,1);
});
test('comparison action bar shows the actual prerequisite and forwards only the comparison action',async()=>{
  const Bar=await compile('RosterActionBar',id=>require(id));let compared=0;
  assert.equal(Bar({selectedCount:0,readyCount:0}),null);
  let node=Bar({kind:'herois',selectedCount:1,readyCount:1,pairCount:0,onCompare:()=>compared++});
  assert.equal(find(node,n=>n.type==='button').props.disabled,true);
  assert.match(renderToStaticMarkup(node),/1 herói selecionado/);assert.match(renderToStaticMarkup(node),/pelo menos 2/);
  node=Bar({kind:'bestas',selectedCount:3,readyCount:3,pairCount:6,onCompare:()=>compared++});
  const button=find(node,n=>n.type==='button');assert.equal(button.props.disabled,false);button.props.onClick();assert.equal(compared,1);
  assert.match(renderToStaticMarkup(node),/3 bestas selecionadas/);assert.match(renderToStaticMarkup(node),/6 combinações de líder e suporte/);
});
