const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loadBindings,transform}=require('next/dist/build/swc');
test('unified navigation hides admin sections for members and retains tools for admins',async()=>{
  await loadBindings();
  const source=await readFile(path.join(__dirname,'../app/MemberSectionNav.jsx'),'utf8');
  const compiled=await transform(source,{filename:'MemberSectionNav.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  const context={exports:{},require(name){
    if(name==='next/link')return ({children,prefetch,...props})=>React.createElement('a',props,children);
    return require(name);
  }};
  vm.createContext(context);vm.runInContext(compiled.code,context);
  const Nav=context.exports.default;
  const member=renderToStaticMarkup(React.createElement(Nav,{isAdmin:false,selected:'desempenho',pendingCount:3}));
  assert.doesNotMatch(member,/aba=gestao|aba=lideranca|Liderança|R4|R5|nav-pending-badge/);
  assert.match(member,/Membros/);assert.match(member,/Calendário/);assert.match(member,/Desempenho/);assert.match(member,/Cálculos do Supremo/);assert.match(member,/Utilitários/);
  const withPending=renderToStaticMarkup(React.createElement(Nav,{isAdmin:true,selected:'gestao',pendingCount:3}));
  assert.match(withPending,/Membros e acessos, 3 pedidos pendentes/);assert.match(withPending,/nav-pending-badge/);
  const admin=renderToStaticMarkup(React.createElement(Nav,{isAdmin:true,selected:'lideranca'}));
  assert.doesNotMatch(admin,/nav-pending-badge/);
  for(const section of ['desempenho','supremo','util','lideranca','gestao'])assert.ok(admin.includes('aba='+section));
  assert.equal((admin.match(/aria-current="page"/g)||[]).length,1);
  assert.match(admin,/href="\/membros\?aba=lideranca" class="topmenu-link active" aria-current="page"/);
});
