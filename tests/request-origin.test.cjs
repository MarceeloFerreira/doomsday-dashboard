const {test}=require('node:test');const assert=require('node:assert/strict');
const {sameOrigin,secureCookie}=require('../lib/request-origin.cjs');
function request(url,headers){return {url,headers:new Headers(headers)};}
test('Netlify public HTTPS origin is accepted even when its handler URL is internal HTTP',()=>{
  const before=process.env.URL;process.env.URL='https://doomsday-bope.netlify.app';
  try{const r=request('http://localhost:3000/api/r4/session',{origin:'https://doomsday-bope.netlify.app'});assert.equal(sameOrigin(r),true);assert.equal(secureCookie(r),true);}finally{if(before===undefined)delete process.env.URL;else process.env.URL=before;}
});
test('local origin and port match, but forged forwarded headers and cross-site requests do not',()=>{
  assert.equal(sameOrigin(request('http://localhost:3002/api/r4/session',{origin:'http://localhost:3002'})),true);
  assert.equal(sameOrigin(request('http://localhost:3002/api/r4/session',{origin:'http://localhost:3003'})),false);
  assert.equal(sameOrigin(request('https://site.example/api/r4/session',{origin:'https://attacker.example','x-forwarded-host':'attacker.example'})),false);
  assert.equal(sameOrigin(request('https://site.example/api/r4/session',{origin:'https://site.example','sec-fetch-site':'cross-site'})),false);
  assert.equal(sameOrigin(request('https://site.example/api/r4/session',{})),false);
});
