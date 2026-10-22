const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const vm=require('node:vm');
const path=require('node:path');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {loadBindings,transform}=require('next/dist/build/swc');
test('account tabs default to all, filter on click and keep global pending emphasis',async()=>{
  await loadBindings();const source=await fs.readFile(path.join(__dirname,'../app/MemberManagement.jsx'),'utf8');
  const compiled=await transform(source,{filename:'MemberManagement.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  const fixture={members:[{id:'p',display_name:'Pendente Teste',email:'p@example.test',status:'pending',role:'member'},{id:'a',display_name:'Ativo Teste',email:'a@example.test',status:'active',role:'member'}],players:[],rosterAvailable:true};
  const state=[fixture];let cursor=0;
  const context={exports:{},require(name){if(name==='react')return {useEffect(){},useState(initial){const slot=cursor++;if(!(slot in state))state[slot]=initial;return [state[slot],value=>{state[slot]=typeof value==='function'?value(state[slot]):value;}];}};return require(name);}};
  vm.createContext(context);vm.runInContext(compiled.code,context);
  function render(){cursor=0;return context.exports.default({embedded:true});}
  function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}return null;}
  const tab=(tree,key)=>find(tree,node=>node.type==='button'&&node.props.className?.split(' ').includes(key||'all'));
  const editors=tree=>{const found=[];function walk(node){if(!node||typeof node!=='object')return;if(node.props?.member)found.push(node.props.member);for(const child of React.Children.toArray(node.props?.children))walk(child);}walk(tree);return found;};
  let tree=render();assert.equal(tab(tree,'').props['aria-pressed'],true);assert.deepEqual(editors(tree).map(m=>m.id),['p','a']);
  let html=renderToStaticMarkup(tree);assert.ok(html.indexOf('>Todas<')<html.indexOf('>Pendentes<'));assert.match(html,/1 cadastro aguarda aprovação/);assert.match(html,/account-member-pending/);
  tab(tree,'active').props.onClick();tree=render();assert.deepEqual(editors(tree).map(m=>m.id),['a']);assert.match(tab(tree,'pending').props.className,/has-pending/);
  tab(tree,'pending').props.onClick();tree=render();assert.deepEqual(editors(tree).map(m=>m.id),['p']);
  tab(tree,'inactive').props.onClick();tree=render();assert.equal(editors(tree).length,0);assert.match(renderToStaticMarkup(tree),/Nenhuma conta nesta situação/);
});
