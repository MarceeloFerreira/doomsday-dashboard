const {test}=require('node:test');const assert=require('node:assert/strict');const {createAccounts,publicProfile}=require('../lib/member-accounts.cjs');const {createAccountHandlers}=require('../lib/account-handlers.cjs');const {accessSummary,accessDate}=require('../lib/member-access-summary.cjs');
test('access summary distinguishes missing history from zero logins and formats Lisbon summer/winter time',()=>{
 assert.equal(accessSummary(null),null);assert.equal(accessSummary({login_count:0}).count,0);assert.equal(accessSummary({login_count:'1'}).count,1);
 assert.equal(accessDate('invalid'),null);assert.match(accessDate('2026-07-01T12:00:00Z'),/13:00/);assert.match(accessDate('2026-11-02T12:00:00Z'),/12:00/);
 assert.equal(publicProfile({id:'member',access:{login_count:9}}).access,undefined);
});
test('management access stats are admin-only and missing audit migration does not break member management',async()=>{
 const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','MEMBERS_AUTH_MODE'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));Object.assign(process.env,{SUPABASE_URL:'fixture',SUPABASE_PUBLISHABLE_KEY:'fixture',SUPABASE_SECRET_KEY:'fixture',MEMBERS_AUTH_MODE:'accounts'});
 let role='member',statsReads=0,statsError=null,rpcArgs;
 const member={id:'member',email:'m@example.test',role:'member',status:'active',player_id:'player',created_at:'2026-11-02'};
 const db={from(table){const q={select(){return q;},eq(){return q;},gt(){return q;},order(){return q;},limit(){return q;},async maybeSingle(){return {data:table==='member_sessions'?{user_id:'admin'}:{...member,role}};},then(resolve,reject){if(table==='member_access_stats')statsReads++;return Promise.resolve({data:table==='member_profiles'?[member]:table==='alliance_players'?[{id:'player',nick:'Membro'}]:[{user_id:'member',login_count:1,last_login_at:'2026-11-02'}],error:table==='member_access_stats'?statsError:null}).then(resolve,reject);}};return q;},async rpc(name,args){rpcArgs={name,args};return {};}};
 try{
  const service=createAccounts({clientFactory:()=>db});await assert.rejects(service.list('a'.repeat(64)),e=>e.status===403);assert.equal(statsReads,0);
  role='admin';let data=await service.list('a'.repeat(64));assert.equal(data.members[0].access.login_count,1);assert.equal(data.accessWarning,null);
  statsError={code:'PGRST205'};data=await service.list('a'.repeat(64));assert.equal(data.members[0].access,null);assert.match(data.accessWarning,/migração/);assert.equal(data.players.length,1);
  await assert.rejects(service.activity('invalid'),e=>e.status===401);assert.equal(rpcArgs,undefined);
  const token='a'.repeat(64);await service.activity(token);assert.equal(rpcArgs.name,'bope_touch_member_activity');assert.notEqual(rpcArgs.args.p_token_hash,token);
  let called=false;const handlers=createAccountHandlers({NextResponse:{json:(data,options)=>({data,...options})},service:{activity:async()=>{called=true;return {ok:true};}}});
  const req=origin=>{const r=new Request('http://localhost:3000/api/members/activity',{method:'POST',headers:{Origin:origin}});r.cookies={get:()=>({value:token})};return r;};
  assert.equal((await handlers.ACTIVITY(req('https://evil.example'))).status,403);assert.equal(called,false);
  assert.equal((await handlers.ACTIVITY(req('http://localhost:3000'))).status,200);assert.equal(called,true);
 }finally{for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
