const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAccounts}=require('../lib/member-accounts.cjs');
const {createAccountHandlers}=require('../lib/account-handlers.cjs');
test('Pompeii API authorizes live admins, handles missing migration, and resolves player identity server-side',async()=>{
  const keys=['MEMBERS_AUTH_MODE','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY'];
  const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{MEMBERS_AUTH_MODE:'accounts',SUPABASE_URL:'fixture',SUPABASE_PUBLISHABLE_KEY:'fixture',SUPABASE_SECRET_KEY:'fixture'});
  let role='member',reads=0,missing=false,write;
  const db={from(table){let columns;const q={select(value){columns=value;return q;},eq(){return q;},gt(){return q;},limit(){return q;},async maybeSingle(){return {data:table==='member_sessions'?{user_id:'admin'}:{id:'admin',role,status:'active',player_id:'admin-player'}};},then(resolve,reject){reads++;return Promise.resolve({data:[{nick:'Player',game_id:'123',pompeii_roles:['rally']}],error:missing&&columns.includes('pompeii_roles')?{code:'42703'}:null}).then(resolve,reject);}};return q;},async rpc(name,args){write={name,args};return {};}};
  const service=createAccounts({clientFactory:()=>db,rosterSource:async()=>({source:'google-sheets',members:[{player:'Player',id:'123',inAlliance:true,type:'conta',power:900}]})});
  const token='a'.repeat(64);
  try{
    await assert.rejects(service.pompeiiRoster(token),e=>e.status===403);assert.equal(reads,0);
    await assert.rejects(service.savePompeiiRoles(token,{playerId:'game:123',roles:['rally']}),e=>e.status===403);assert.equal(write,undefined);
    role='admin';let roster=await service.pompeiiRoster(token);assert.equal(roster.rolesReady,true);assert.deepEqual(roster.players[0].roles,['rally']);
    await service.savePompeiiRoles(token,{playerId:'game:123',nick:'Injected',gameId:'999',roles:['campo']});
    assert.equal(write.name,'bope_save_pompeii_roles');assert.equal(write.args.p_nick,'Player');assert.equal(write.args.p_game_id,'123');assert.notEqual(write.args.p_token_hash,token);
    await assert.rejects(service.savePompeiiRoles(token,{playerId:'not-in-roster',roles:[]}),e=>e.status===409);
    missing=true;roster=await service.pompeiiRoster(token);assert.equal(roster.rolesReady,false);assert.match(roster.warning,/migração/);
    await assert.rejects(service.savePompeiiRoles(token,{playerId:'game:123',roles:[]}),e=>e.status===503);
    const handlers=createAccountHandlers({NextResponse:{json:(data,options)=>({data,...options})},service});
    const request=new Request('http://localhost:3000/api/r4/pompeii',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({playerId:'game:123',roles:[]})});request.cookies={get:()=>({value:token})};
    const result=await handlers.POMPEII_ROLES(request);assert.equal(result.status,403);assert.equal(result.headers['Cache-Control'],'private, no-store');
  }finally{for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}}
});
