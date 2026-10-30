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

test('Next dev loopback aliases require development, the same protocol and exact port',()=>{
  const previous=process.env.NODE_ENV;
  const r=(origin,extra={})=>request('http://localhost:3000/api/members/session',{origin,...extra});
  try{
    process.env.NODE_ENV='development';
    assert.equal(sameOrigin(r('http://127.0.0.1:3000',{'sec-fetch-site':'same-origin'})),true);
    assert.equal(sameOrigin(r('http://[::1]:3000')),true);
    assert.equal(sameOrigin(r('http://127.0.0.1:3001')),false);
    assert.equal(sameOrigin(r('https://127.0.0.1:3000')),false);
    assert.equal(sameOrigin(r('https://attacker.example',{'x-forwarded-host':'attacker.example'})),false);
    assert.equal(sameOrigin(r('http://127.0.0.1:3000',{'sec-fetch-site':'cross-site'})),false);
    assert.equal(sameOrigin(request('https://site.example/api/members/session',{origin:'http://127.0.0.1:3000'})),false);
    process.env.NODE_ENV='production';
    assert.equal(sameOrigin(r('http://127.0.0.1:3000')),false);
    assert.equal(sameOrigin(r('http://localhost:3000')),true);
  }finally{if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;}
});
