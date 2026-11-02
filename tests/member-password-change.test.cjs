const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAccounts,tokenHash}=require('../lib/member-accounts.cjs');
const {createAccountHandlers}=require('../lib/account-handlers.cjs');
test('own password change verifies current credentials, uses the session owner, and fails closed',async()=>{
 const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','MEMBERS_AUTH_MODE'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{SUPABASE_URL:'fixture',SUPABASE_PUBLISHABLE_KEY:'fixture',SUPABASE_SECRET_KEY:'fixture',MEMBERS_AUTH_MODE:'accounts'});
 const id='11111111-1111-4111-8111-111111111111',token='a'.repeat(64),p={id,email:'member@example.test',status:'active',role:'member',player_id:'player'};
 let events=[],verifyError=null,beginError=null,authError=null,finishError=null,identity=id;
 const db={from(table){const q={select(){return q;},eq(){return q;},gt(){return q;},async maybeSingle(){return {data:table==='member_sessions'?{user_id:id}:p};},update(value){events.push({name:'finish',value});return {eq:async()=>({error:finishError})};},async insert(value){events.push({name:'audit',value});return {};}};return q;},async rpc(name,args){events.push({name,args});return {data:id,error:beginError};},auth:{async signInWithPassword(args){events.push({name:'verify',args});return {data:{user:{id:identity,updated_at:'2026-11-02T10:00:00Z'}},error:verifyError};},admin:{async updateUserById(target,args){events.push({name:'change',target,args});return {error:authError};}}}};
 const service=createAccounts({clientFactory:()=>db}),input={currentPassword:'old123',password:'new123',confirmPassword:'new123',target:'attacker',email:'attacker@example.test',role:'admin'};
 try{
  for(const bad of [{confirmPassword:'wrong'},{password:'short'},{password:'old123',confirmPassword:'old123'},{currentPassword:null}])await assert.rejects(service.changePassword(token,{...input,...bad}));
  assert.equal(events.length,0);
  verifyError={status:400};await assert.rejects(service.changePassword(token,input),/Senha atual incorreta/);assert.deepEqual(events.map(e=>e.name),['verify']);
  events=[];verifyError={status:429};await assert.rejects(service.changePassword(token,input),e=>e.status===429);
  events=[];verifyError=null;identity='someone-else';await assert.rejects(service.changePassword(token,input),e=>e.status===401);assert.equal(events.length,1);identity=id;
  events=[];beginError={message:'login_changed'};await assert.rejects(service.changePassword(token,input),e=>e.status===401);assert.deepEqual(events.map(e=>e.name),['verify','bope_begin_password_change']);
  events=[];beginError={code:'PGRST202'};await assert.rejects(service.changePassword(token,input),/atualização do banco/);assert.equal(events.length,2);
  events=[];beginError=null;authError={message:'unavailable'};await assert.rejects(service.changePassword(token,input),/recuperar o acesso/);assert.equal(events.some(e=>e.name==='finish'),false);
  events=[];authError=null;finishError={message:'unavailable'};await assert.rejects(service.changePassword(token,input),/manutenção/);assert.equal(events.at(-1).name,'finish');
  events=[];finishError=null;await service.changePassword(token,input);
  assert.deepEqual(events.map(e=>e.name),['verify','bope_begin_password_change','change','finish','audit']);
  assert.equal(events[0].args.email,p.email);assert.equal(events[2].target,id);assert.equal(events[1].args.p_token_hash,tokenHash(token));
  assert.equal(JSON.stringify(events.at(-1)).includes(input.password),false);
  const writes=[],NextResponse={json:(data,options)=>({data,...options,cookies:{set:(...args)=>writes.push(args)}})};
  const h=createAccountHandlers({NextResponse,service:{changePassword:async(t,b)=>{assert.equal(t,token);assert.equal(b.confirmPassword,'new123');return {message:'ok'};}}});
  const request=origin=>{const req=new Request('http://localhost:3000/api/members/password',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)});req.cookies={get:()=>({value:token})};return req;};
  assert.equal((await h.PASSWORD(request('https://evil.example'))).status,403);assert.equal(writes.length,0);
  assert.equal((await h.PASSWORD(request('http://localhost:3000'))).status,200);assert.equal(writes[0][0],'bope_account');assert.equal(writes[0][1],'');assert.equal(writes[0][2].maxAge,0);
 }finally{for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
});
