const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAccountHandlers}=require('../lib/account-handlers.cjs');
test('account HTTP lifecycle keeps tokens server-side and denies protected state after inactivation',async()=>{
  const keys=['MEMBERS_AUTH_MODE','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY'];
  const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{MEMBERS_AUTH_MODE:'accounts',SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'public-test',SUPABASE_SECRET_KEY:'private-test'});
  const p={id:'1',email:'m@example.test',display_name:'Membro',status:'pending',role:'member',player_id:null};
  let current=p;const cookieWrites=[];
  const NextResponse={json:(data,options)=>({data,...options,cookies:{set:(...args)=>cookieWrites.push(args)}})};
  const token='a'.repeat(64);
  const service={login:async()=>({token,profile:p}),session:async()=>current?{profile:current}:null,logout:async()=>{current=null;}};
  const h=createAccountHandlers({NextResponse,service});
  const request=method=>{const r=new Request('http://localhost:3000/api/members/session',{method,headers:{Origin:'http://localhost:3000','Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({email:'m@example.test',password:'long password'})}:{})});r.cookies={get:()=>({value:token})};return r;};
  try{
    const pending=await h.POST(request('POST'));
    assert.equal(pending.data.authenticated,false);assert.equal(pending.data.signedIn,true);assert.equal(pending.data.profile.status,'pending');
    assert.equal(JSON.stringify(pending.data).includes(token),false);
    assert.equal(cookieWrites[0][0],'bope_account');assert.equal(cookieWrites[0][2].httpOnly,true);assert.equal(cookieWrites[0][2].sameSite,'strict');
    assert.ok(cookieWrites.some(([name,value,options])=>name==='bope_member'&&value===''&&options.maxAge===0));
    current={...p,status:'active',player_id:'player-id'};
    assert.equal((await h.GET(request('GET'))).data.authenticated,true);
    current={...current,status:'inactive'};
    assert.equal((await h.GET(request('GET'))).data.authenticated,false);
    await h.DELETE(request('DELETE'));
    assert.equal((await h.GET(request('GET'))).data.signedIn,false);
  }finally{for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
