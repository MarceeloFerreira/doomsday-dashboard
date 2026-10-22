const {test}=require('node:test');
const assert=require('node:assert/strict');
const {canAccess,validateCredentials,tokenHash,publicProfile}=require('../lib/member-accounts.cjs');
const {body,createAccountHandlers}=require('../lib/account-handlers.cjs');
test('membership access requires active status, a linked player, and no reset in progress',()=>{
  const p={status:'active',role:'member',player_id:'123'};
  assert.equal(canAccess(p),true);assert.equal(canAccess(p,true),false);
  assert.equal(canAccess({...p,role:'admin'},true),true);
  for(const override of [{status:'pending'},{status:'inactive'},{player_id:null},{reset_pending:true}])assert.equal(canAccess({...p,...override}),false);
});
test('credentials enforce bounds and do not normalize passwords or accept client roles',()=>{
  const password=' literal password ';
  assert.deepEqual(validateCredentials({email:' Name@Example.com ',password,displayName:' Nick ',role:'admin'},true),{email:'name@example.com',password,displayName:'Nick'});
  for(const input of [{email:'bad',password},{email:'a@b.c',password:'short'},{email:'a@b.c',password,displayName:''},{email:'a@b.c',password:'x'.repeat(129),displayName:'Nick'}])assert.throws(()=>validateCredentials(input,true));
});
test('session tokens are opaque, bounded, and hashed before database lookup',()=>{
  assert.match(tokenHash('a'.repeat(64)),/^[a-f0-9]{64}$/);assert.notEqual(tokenHash('a'.repeat(64)),'a'.repeat(64));
  for(const value of [null,'', 'abc','x'.repeat(64),'a'.repeat(65)])assert.equal(tokenHash(value),null);
  assert.equal(publicProfile({id:'x',reset_pending:true}).reset_pending,undefined);
});
test('JSON bodies enforce content type, shape, and actual byte size',async()=>{
  const req=(value,type='application/json')=>new Request('http://localhost:3000/api/members/manage',{method:'POST',headers:{'Content-Type':type},body:value});
  assert.deepEqual(await body(req('{"action":"save_member"}')),{action:'save_member'});
  for(const request of [req('[]'),req('null'),req('{}','text/plain'),req('{"x":"'+'a'.repeat(9000)+'"}')])await assert.rejects(body(request));
});
test('account endpoints reject cross-origin mutations before touching authentication',async()=>{
  const before=process.env.MEMBERS_AUTH_MODE;process.env.MEMBERS_AUTH_MODE='accounts';
  const NextResponse={json:(data,options)=>({data,...options})};
  let touched=false;
  const handlers=createAccountHandlers({NextResponse,service:{login:()=>{touched=true;}}});
  try{
    const r=await handlers.POST(new Request('http://localhost:3000/api/members/session',{method:'POST',headers:{Origin:'https://evil.example'}}));
    assert.equal(r.status,403);assert.equal(touched,false);assert.equal(r.headers['Cache-Control'],'private, no-store');
  }finally{if(before===undefined)delete process.env.MEMBERS_AUTH_MODE;else process.env.MEMBERS_AUTH_MODE=before;}
});

test('account passwords accept six characters without complexity requirements',()=>{
  assert.equal(validateCredentials({email:'a@example.test',password:'abc123'}).password,'abc123');
  assert.equal(validateCredentials({email:'a@example.test',password:'aaaaaa',displayName:'Teste'},true).password,'aaaaaa');
  assert.throws(()=>validateCredentials({email:'a@example.test',password:'abc12'}));
});
