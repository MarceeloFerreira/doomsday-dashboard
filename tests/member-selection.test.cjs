const {test}=require('node:test');
const assert=require('node:assert/strict');
const {memberSelection}=require('../lib/member-selection.cjs');
const rows=[['2026-10-01','A','Player',100],['2026-10-10','G','Player',0],['2026-10-10','G','Outro',200],['2026-10-20','I','Outro',900]];
test('latest personal event uses the player last record rather than alliance last date',()=>{
  const r=memberSelection(rows,{player:' player ',period:'latest'});
  assert.equal(r.effectiveEdition,'2026-10-10');assert.equal(r.analysis.editions.length,1);assert.equal(r.analysis.ranking.length,2);
  assert.equal(r.analysis.ranking.find(p=>p.player==='Player').total,0);
});
test('latest personal event honors the event type filter',()=>{
  assert.equal(memberSelection(rows,{player:'Player',period:'latest',event:'A'}).effectiveEdition,'2026-10-01');
  const absent=memberSelection(rows,{player:'Player',period:'latest',event:'I'});assert.equal(absent.analysis.rows.length,0);assert.equal(absent.lastParticipation,null);
});
test('unknown or unselected players never fall back to another player last event',()=>{
  for(const player of ['Missing',''])assert.equal(memberSelection(rows,{player,period:'latest'}).analysis.rows.length,0);
});
test('alliance latest event and explicit edition keep their own selection behavior',()=>{
  assert.equal(memberSelection(rows,{period:'latest',personal:false}).effectiveEdition,'2026-10-20');
  assert.equal(memberSelection(rows,{player:'Player',period:'latest',edition:'2026-10-01'}).effectiveEdition,'2026-10-01');
  assert.equal(memberSelection(rows,{player:'Player',period:'6'}).analysis.editions.length,3);
});
