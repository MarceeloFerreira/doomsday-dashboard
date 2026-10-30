const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loadBindings,transform}=require('next/dist/build/swc');

async function component(name,states){
  const source=await fs.readFile(path.join(__dirname,'../app/'+name+'.jsx'),'utf8');
  const compiled=await transform(source,{filename:name+'.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  let index=0;
  const context={exports:{},require(id){
    if(id==='react')return {...React,useEffect(){},useState:value=>[Object.hasOwn(states,index)?states[index++]:((index++),value),()=>{}]};
    if(id==='react-dom')return {createPortal:node=>node};
    if(id==='next/navigation')return {useSearchParams:()=>new URLSearchParams('aba=lideranca'),useRouter:()=>({replace(){}})};
    if(id==='./SessionLoading')return ({error,label})=>React.createElement('p',{role:error?'alert':'status'},error||label||'Verificando seu acesso…');
    if(id==='./AccountAccess')return ()=>React.createElement('div',null,'Acesso por conta individual');
    if(id.startsWith('./'))return ()=>null;
    return require(id);
  }};
  vm.createContext(context);vm.runInContext(compiled.code,context);
  return context.exports.default;
}
test('member area never shows the obsolete shared password while checking the session',async()=>{
  await loadBindings();
  for(const states of [{},{0:{gate:{}}}]){
    const Component=await component('MemberArea',states);
    const html=renderToStaticMarkup(React.createElement(Component));
    assert.match(html,/role="status"/);assert.match(html,/Verificando seu acesso/);
    assert.doesNotMatch(html,/type="password"|Senha da aliança/);
  }
  const Failed=await component('MemberArea',{0:{gate:{}},2:'Falha na sessão'});
  assert.match(renderToStaticMarkup(React.createElement(Failed)),/role="alert"/);
  const Guest=await component('MemberArea',{0:{gate:{}},1:{authenticated:false,mode:'accounts',configured:true}});
  assert.match(renderToStaticMarkup(React.createElement(Guest)),/Acesso por conta individual/);
});
test('leadership renders loading for an unresolved session in both embedded and standalone views',async()=>{
  await loadBindings();
  const Component=await component('Leadership',{});
  for(const embedded of [false,true]){
    const html=renderToStaticMarkup(React.createElement(Component,{embedded}));
    assert.match(html,/role="status"/);assert.match(html,/Verificando acesso da liderança/);
    assert.doesNotMatch(html,/type="password"|Senha da liderança|Acesso de administrador/);
  }
  const Guest=await component('Leadership',{0:{authenticated:false,mode:'accounts'}});
  const html=renderToStaticMarkup(React.createElement(Guest));
  assert.match(html,/Entrar na minha conta/);assert.doesNotMatch(html,/type="password"/);
});
