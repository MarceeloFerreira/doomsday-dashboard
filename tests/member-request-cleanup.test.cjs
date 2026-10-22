const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const vm=require('node:vm');
const {loadBindings,transform}=require('next/dist/build/swc');
test('leaving the member panel ignores pending responses without aborting or changing state',async()=>{
  await loadBindings();
  const source=await readFile(path.join(__dirname,'../app/MemberArea.jsx'),'utf8');
  const compiled=await transform(source,{filename:'MemberArea.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  for(const outcome of ['success','failure']){
    const effects=[],updates=[];let index=0,resolveRequest,rejectRequest,aborts=0,cleared=0;
    const context={exports:{},require(name){
      if(name==='react')return {useEffect:fn=>effects.push(fn),useState:initial=>{const slot=index++;return [slot===1?{mode:'accounts',authenticated:true}:initial,value=>updates.push({slot,value})];}};
      if(name==='react/jsx-runtime')return require(name);
      if(name==='next/navigation')return {useSearchParams:()=>new URLSearchParams()};
      if(name==='react-dom')return {createPortal:()=>null};
      return {};
    },fetch:()=>new Promise((resolve,reject)=>{resolveRequest=resolve;rejectRequest=reject;}),
    AbortSignal,AbortController:class{constructor(){this.signal=new AbortController().signal;}abort(){aborts++;}},URLSearchParams,
    setInterval:()=>1,clearInterval:()=>{cleared++;},document:{getElementById:()=>null,querySelector:()=>null}};
    vm.createContext(context);vm.runInContext(compiled.code,context);context.exports.default();
    // Initial/session effects are not run; isolate the request effect registered
    // by the real component, with a live session and a deferred network response.
    const requestEffect=effects.find(effect=>effect.toString().includes('/api/members/report'));
    assert.ok(requestEffect);
    const cleanup=requestEffect();assert.equal(typeof cleanup,'function');
    cleanup();const before=updates.length;
    if(outcome==='success')resolveRequest({status:200,ok:true,json:async()=>({scores:[],source:'google-sheets'})});
    else rejectRequest(new DOMException('Request expired','TimeoutError'));
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(updates.length,before);assert.equal(aborts,0);assert.equal(cleared,1);
  }
});
