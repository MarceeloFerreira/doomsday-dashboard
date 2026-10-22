const {test}=require('node:test');const assert=require('node:assert/strict');const {createAccounts}=require('../lib/member-accounts.cjs');
test('pending deletion requires explicit confirmation and completes Auth removal only after database authorization',async()=>{
 const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY'],previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));for(const k of keys)process.env[k]='fixture';
 const admin='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222';let events=[],rpcError=null,authError=null;
 const db={from(table){const q={select(){return q;},eq(){return q;},gt(){return q;},async maybeSingle(){return {data:table==='member_sessions'?{user_id:admin}:{id:admin,role:'admin',status:'active',player_id:'player'},error:null};}};return q;},async rpc(name,args){events.push({name,args});return {error:rpcError};},auth:{admin:{async deleteUser(id,soft){events.push({name:'deleteUser',id,soft});return {error:authError};}}}};
 try{const service=createAccounts({clientFactory:()=>db}),input={action:'delete_pending',target,email:'pending@example.test',confirm:true};
  await assert.rejects(service.command('a'.repeat(64),{...input,confirm:false}),/Confirme/);assert.equal(events.length,0);
  rpcError={message:'pending_only'};await assert.rejects(service.command('a'.repeat(64),input),e=>e.status===409);assert.equal(events.some(e=>e.name==='deleteUser'),false);
  events=[];rpcError=null;authError={message:'temporary'};await assert.rejects(service.command('a'.repeat(64),input),/permanece bloqueado/);assert.equal(events[0].name,'bope_prepare_pending_deletion');assert.equal(events[1].name,'deleteUser');
  events=[];authError=null;const result=await service.command('a'.repeat(64),input);assert.match(result.message,/mesmo e-mail/);assert.equal(events[1].id,target);assert.equal(events[1].soft,false);
  events=[];rpcError={code:'PGRST202'};await assert.rejects(service.command('a'.repeat(64),input),/atualização do banco/);assert.equal(events.length,1);
 }finally{for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
});
