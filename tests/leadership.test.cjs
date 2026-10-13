const {test}=require('node:test');const assert=require('node:assert/strict');const core=require('../lib/leadership.cjs');const auth=require('../lib/r4-auth.cjs');
test('Arquipélago goals respect T5 and exact 180M T6 boundary',()=>{
  assert.equal(core.goal('A',{troops:'T5',power:200e6}).minimum,60e6);
  assert.equal(core.goal('A',{troops:'T6',power:180e6}).minimum,80e6);
  assert.equal(core.goal('A',{troops:'T6',power:180e6+1}).minimum,120e6);
  assert.equal(core.goal('A',{troops:'T6',power:181e6}).minimum,120e6);
  assert.equal(core.goal('G',{troops:'T6',power:181e6}).minimum,null);
  assert.equal(core.goal('A',{troops:'T5',power:null}).minimum,null);
});
test('Sheet headers, numeric formats and current membership',()=>{
  assert.equal(core.number('180M'),180e6);assert.equal(core.number('180.000.000'),180e6);assert.equal(core.number('180,5M'),180.5e6);assert.equal(core.number(''),null);
  const {members}=core.membersFromSheet([['ID','Player','Poder','Tropa','Tipo','Esta na aliança ?'],['123','Jin','180M','T6','conta','Não'],['456','Deleti','200M','T5','conta','Sim']]);
  assert.equal(members[0].inAlliance,false);assert.equal(members[1].inAlliance,true);
});
test('event comparison uses previous same event, and missing records are not zero',()=>{
  const rows=[['2026-01-01','A','X',30],['2026-01-02','G','X',900],['2026-01-03','A','X',60]];
  const r=core.analyze(rows,[{player:'X',power:200,troops:'T5',inAlliance:true},{player:'Y',inAlliance:true},{player:'Z',inAlliance:false}],'2026-01-03');
  assert.equal(r.previous.date,'2026-01-01');assert.equal(r.ranking[0].delta,30);assert.equal(r.ranking[0].status,'met');assert.deepEqual(r.noRecord.map(m=>m.player),['Y']);
});
test('duplicate players and ambiguous event dates fail validation',()=>{
  assert.throws(()=>core.validateScores([['2026-01-01','A','X',1],['2026-01-01','G','Y',2]]));
  assert.throws(()=>core.validateScores([['2026-01-01','A','X',1],['2026-01-01','A',' x ',2]]));
  assert.throws(()=>core.scoresFromSheet([['Data','Evento','Player','Pontuação'],['31/02/2026','A','X','1']]));
});
test('R4 rejects absent configuration, tampered and expired sessions and wrong password',()=>{
  process.env.R4_PASSWORD='test-only-r4-password';process.env.R4_SESSION_SECRET='x'.repeat(32);
  const token=auth.issue(1000);assert.equal(auth.valid(token,1001),true);assert.equal(auth.valid(token+'x',1001),false);assert.equal(auth.valid(token,1000+8*3600000),false);assert.equal(auth.passwordValid('wrong'),false);
  process.env.R4_PASSWORD='different-password';assert.equal(auth.valid(token,1001),false);
  delete process.env.R4_PASSWORD;delete process.env.R4_SESSION_SECRET;assert.equal(auth.valid(token,1001),false);
});
