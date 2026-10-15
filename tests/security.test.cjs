const {test}=require('node:test');const assert=require('node:assert/strict');
const {createSessionHandlers}=require('../lib/session-handlers.cjs');
const {securityHeaders}=require('../lib/security-headers.cjs');
const member=require('../lib/member-auth.cjs');const r4=require('../lib/r4-auth.cjs');
const origin='https://example.com';
function handlers(){
 const cookies=[];const NextResponse={json:(body,options)=>{const r=Response.json(body,options);r.cookies={set:(...args)=>cookies.push(args)};return r;}};
 return {...createSessionHandlers({NextResponse,cookieName:'test-cookie',auth:{configured:()=>true,passwordValid:p=>p==='valid-password',issue:()=> 'signed',valid:()=>false},unconfigured:'Configure o acesso.'}),cookies};
}
function request(body,extra={}){return new Request(origin+'/api/r4/session',{method:'POST',headers:{origin,'content-type':'application/json',...extra},body:typeof body==='string'?body:JSON.stringify(body)});}
test('both roles require an explicit case-sensitive password, and cookies cannot cross roles',()=>{
 const keys=['MEMBERS_PASSWORD','MEMBERS_SESSION_SECRET','R4_PASSWORD','R4_SESSION_SECRET'];const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  process.env.R4_SESSION_SECRET='s'.repeat(32);delete process.env.MEMBERS_SESSION_SECRET;delete process.env.MEMBERS_PASSWORD;
  assert.equal(member.configured(),false);assert.equal(member.passwordValid('anything'),false);
  process.env.MEMBERS_PASSWORD='member-password';process.env.R4_PASSWORD='r4-password-long';
  assert.equal(member.passwordValid('member-password'),true);assert.equal(member.passwordValid('MEMBER-PASSWORD'),false);
  assert.equal(r4.valid(member.issue()),false);assert.equal(member.valid(r4.issue()),false);
  const token=member.issue();process.env.MEMBERS_PASSWORD='different-password';assert.equal(member.valid(token),false);
 }finally{for(const [k,v]of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
test('login rejects malformed JSON, null, arrays and non-string passwords without 500s',async()=>{
 const h=handlers();for(const body of ['{','null','[]','{}','{"password":42}'])assert.equal((await h.POST(request(body))).status,400);
 assert.equal((await h.POST(request({password:'valid-password'},{'content-type':'text/plain'}))).status,400);
});
test('login enforces the actual body limit without trusting Content-Length',async()=>{
 const h=handlers();const body=JSON.stringify({password:'valid-password',padding:'x'.repeat(5000)});
 assert.equal((await h.POST(request(body))).status,400);
 assert.equal((await h.POST(request(body,{'content-length':'1'}))).status,400);
 const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(body.slice(0,3000)));c.enqueue(new TextEncoder().encode(body.slice(3000)));c.close();}});
 const req=new Request(origin+'/api/r4/session',{method:'POST',headers:{origin,'content-type':'application/json'},body:stream,duplex:'half'});
 assert.equal((await h.POST(req)).status,400);
});
test('session changes require a same-origin request; successful cookies have safe flags',async()=>{
 const h=handlers();assert.equal((await h.POST(request({password:'valid-password'},{origin:'https://evil.example'}))).status,403);
 assert.equal((await h.DELETE(new Request(origin+'/api/r4/session',{method:'DELETE'}))).status,403);
 const response=await h.POST(request({password:'valid-password'}));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(h.cookies[0][2],{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:28800});
});
test('login blocks repeated guesses for an IP even if a later guess is correct',async()=>{
 const h=handlers();for(let i=0;i<10;i++)assert.equal((await h.POST(request({password:'wrong'},{'x-nf-client-connection-ip':'192.0.2.1'}))).status,401);
 assert.equal((await h.POST(request({password:'valid-password'},{'x-nf-client-connection-ip':'192.0.2.1'}))).status,429);
 assert.equal((await h.POST(request({password:'valid-password'},{'x-nf-client-connection-ip':'192.0.2.2'}))).status,200);
});
test('login rate-limit storage is bounded during a flood of different IPs',async()=>{
 const h=handlers();for(let i=0;i<2000;i++){const ip=`198.18.${Math.floor(i/256)}.${i%256}`;assert.equal((await h.POST(request({password:'wrong'},{'x-nf-client-connection-ip':ip}))).status,401);}
 assert.equal((await h.POST(request({password:'wrong'},{'x-nf-client-connection-ip':'192.0.2.200'}))).status,429);
});
test('security headers block frames, plugins, inline handlers and off-origin API connections',()=>{
 const headers=Object.fromEntries(securityHeaders().map(h=>[h.key,h.value]));
 assert.equal(headers['X-Frame-Options'],'DENY');assert.equal(headers['X-Content-Type-Options'],'nosniff');assert.equal(headers['Referrer-Policy'],'no-referrer');
 for(const directive of ["frame-ancestors 'none'","object-src 'none'","script-src-attr 'none'","connect-src 'self'"])assert.ok(headers['Content-Security-Policy'].includes(directive));
 assert.ok(!headers['Content-Security-Policy'].includes('unsafe-eval'));assert.ok(securityHeaders(true)[0].value.includes('unsafe-eval'));
});
