const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loadBindings,transform}=require('next/dist/build/swc');
test('management distinguishes initial loading, service failure and denied access',async()=>{
  await loadBindings();
  const source=await readFile(path.join(__dirname,'../app/MemberManagement.jsx'),'utf8');
  const compiled=await transform(source,{filename:'MemberManagement.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  function render(states){let index=0;const context={exports:{},require(name){if(name==='react')return {...React,useEffect(){},useState:initial=>[Object.hasOwn(states,index)?states[index++]:((index++),initial),()=>{}]};return require(name);}};
    // Resolve the component's relative library import from this test folder.
    context.require=(original=>name=>name==='../lib/roster-players.cjs'?require('../lib/roster-players.cjs'):original(name))(context.require);
    vm.createContext(context);vm.runInContext(compiled.code,context);
    return renderToStaticMarkup(React.createElement(context.exports.default,{embedded:true}));
  }
  const loading=render({});
  assert.match(loading,/Carregando contas/);assert.doesNotMatch(loading,/Sua sessão não autoriza|Ir para o acesso/);
  const failed=render({1:'Serviço indisponível',6:false});
  assert.match(failed,/Serviço indisponível|Tentar carregar novamente/);assert.doesNotMatch(failed,/Sua sessão não autoriza|Ir para o acesso/);
  const denied=render({1:'Acesso negado',6:false,7:true});
  assert.match(denied,/Sua sessão não autoriza/);assert.match(denied,/Ir para o acesso/);
  const loaded=render({0:{members:[],players:[],rosterAvailable:true},6:false});
  assert.match(loaded,/Atualizar cadastros/);assert.doesNotMatch(loaded,/Sua sessão não autoriza|Carregando contas/);
});
