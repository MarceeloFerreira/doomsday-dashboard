const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const {join}=require('node:path');
const vm=require('node:vm');
const {loadBindings,transform}=require('next/dist/build/swc');
test('leadership effects return only cleanup functions in all session states',async()=>{
  const source=await readFile(join(__dirname,'../app/Leadership.jsx'),'utf8');
  await loadBindings();
  const compiled=await transform(source,{filename:'Leadership.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
  for(const session of [null,{mode:'accounts',authenticated:false},{mode:'accounts',authenticated:true}]){
    const effects=[];let stateIndex=0;
    const react={useState:initial=>[stateIndex++===0?session:initial,()=>{}],useEffect:effect=>effects.push(effect)};
    const context={exports:{},require(name){
      if(name==='react')return react;
      if(name==='react/jsx-runtime')return require(name);
      if(name==='next/navigation')return {useRouter:()=>({replace(){}}),useSearchParams:()=>new URLSearchParams('aba=lideranca')};
      if(name.endsWith('goal-rules.cjs'))return {describe:()=>''};
      if(name.endsWith('sheet-request.cjs'))return {keepLatest:(_,data)=>data};
      return {default:()=>null};
    },fetch:()=>new Promise(()=>{}),AbortController,AbortSignal,URLSearchParams,
      setInterval:()=>1,clearInterval:()=>{},document:{addEventListener(){},removeEventListener(){},visibilityState:'visible'}};
    vm.createContext(context);vm.runInContext(compiled.code,context);
    context.exports.default({embedded:true});
    assert.equal(effects.length,3);
    for(const effect of effects){
      const cleanup=effect();
      assert.ok(cleanup===undefined||typeof cleanup==='function',`Unexpected effect return while authenticated=${session?.authenticated}`);
      if(cleanup)cleanup();
    }
  }
});
