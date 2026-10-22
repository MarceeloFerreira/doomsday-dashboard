const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAccounts}=require('../lib/member-accounts.cjs');
test('a database uniqueness race returns the account owning the player',async()=>{
  const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY'];const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  for(const k of keys)process.env[k]='fixture';
  const admin='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222',player='33333333-3333-4333-8333-333333333333';
  let claimed=false,rpcCalls=0;
  const profile={id:admin,role:'admin',status:'active',player_id:'admin-player'};
  const db={from(table){
    const filters={};let update=false;
    const q={select(){return q;},eq(k,v){filters[k]=v;return q;},neq(){return q;},gt(){return q;},order(){return q;},limit(){return q;},update(){update=true;return q;},
      maybeSingle:async()=>({error:null,data:table==='member_sessions'?{user_id:admin}:filters.id?profile:claimed?{id:'owner',display_name:'Outra conta',email:'owner@example.test'}:null}),
      then(resolve,reject){return Promise.resolve({error:null,data:update?null:table==='member_profiles'?[profile]:[{id:player,nick:'Jogador',game_id:'123'}]}).then(resolve,reject);}};
    return q;
  },async rpc(){rpcCalls++;claimed=true;return {error:{code:'23505'},data:null};}};
  try{
    const service=createAccounts({clientFactory:()=>db,rosterSource:async()=>({source:'google-sheets',members:[{player:'Jogador',id:'123'}]})});
    await assert.rejects(service.command('a'.repeat(64),{action:'save_member',target,role:'member',status:'active',playerId:player}),e=>e.status===409&&e.message.includes('Outra conta (owner@example.test)'));
    assert.equal(rpcCalls,1);
  }finally{for(const k of keys){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
});
