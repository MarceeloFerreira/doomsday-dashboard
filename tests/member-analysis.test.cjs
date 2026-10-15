const {test}=require('node:test');
const assert=require('node:assert/strict');
const {analyzeMembers,individual,burntFromSheet,imageReference}=require('../lib/member-analysis.cjs');
const auth=require('../lib/member-auth.cjs');
const scores=[['2026-08-01','A','Alice',0],['2026-08-01','A','Bob',100],['2026-08-08','I','Bob',300],['2026-08-15','A','Alice',200]];
test('member analysis counts zero records, aggregates by player and filters editions before aggregation',()=>{
  const all=analyzeMembers(scores,'','0');assert.equal(all.total,600);assert.equal(all.players,2);assert.equal(all.average,300);assert.equal(all.editions.length,3);
  const a=analyzeMembers(scores,'A','1');assert.equal(a.total,200);assert.equal(a.players,1);assert.equal(a.editions.length,1);assert.equal(a.ranking[0].average,200);
  assert.equal(analyzeMembers(scores,'G','6').total,0);
});
test('personal history distinguishes an explicit zero from a missing record and compares the same edition average',()=>{
  const result=individual(analyzeMembers(scores,'','0'),'Alice');assert.deepEqual(result.history.map(r=>r.points),[0,null,200]);assert.equal(result.history[0].average,50);assert.equal(result.history[0].position,2);assert.equal(result.history[1].position,null);assert.equal(result.profile.records,2);
  const serialized=JSON.stringify(result);assert.ok(!serialized.includes('minimum'));assert.ok(!serialized.includes('power'));
});
test('gallery accepts private Drive links, ignores disabled/invalid rows and rejects unsafe image destinations',()=>{
  const data=burntFromSheet([['Data','Player','Foto','Legenda','Ativo'],['13/10/2026','Alice','https://drive.google.com/file/d/abc123456789/view','Churrasco!','TRUE'],['12/10/2026','Bob','https://example.com/fire.png','','FALSE'],['13/10/2026','Eve','javascript:alert(1)','','TRUE']]);
  assert.equal(data.items.length,1);assert.equal(data.items[0].date,'2026-10-13');assert.equal(data.items[0].image,'/api/members/photos?file=abc123456789');assert.ok(data.warning);
  for(const url of ['http://example.com/a.png','https://127.0.0.1/a','https://localhost/a','https://user:pass@example.com/a','https://drive.google.com/file/d/x/view'])assert.equal(imageReference(url),null);
});
test('member cookies are signed, expire, reject tampering and never accept an R4 cookie',()=>{
  const previous={R4_SESSION_SECRET:process.env.R4_SESSION_SECRET,MEMBERS_PASSWORD:process.env.MEMBERS_PASSWORD};
  try{process.env.R4_SESSION_SECRET='s'.repeat(32);process.env.MEMBERS_PASSWORD='local-members-password';const now=1000,token=auth.issue(now);assert.ok(auth.passwordValid('local-members-password'));assert.ok(!auth.passwordValid('LOCAL-MEMBERS-PASSWORD'));assert.ok(!auth.passwordValid('wrong'));assert.ok(auth.valid(token,now));assert.ok(!auth.valid(token+'x',now));assert.ok(!auth.valid(token,now+8*3600000));assert.ok(!auth.valid('r4.token',now));}finally{for(const[key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});

test('unusual event labels cannot mutate JavaScript object prototypes',()=>{
  analyzeMembers([['2026-10-16','__proto__','Player',100],['2026-10-17','constructor','Player',200]],'','0');
  assert.equal(Object.prototype.total,undefined);assert.equal(Object.prototype.records,undefined);assert.equal(Object.total,undefined);
});
