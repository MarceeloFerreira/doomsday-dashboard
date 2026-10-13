const test=require('node:test');
const assert=require('node:assert/strict');
const {chartAnalysis}=require('../lib/r4-analytics.cjs');
const data={edition:{date:'2026-08-24',event:'A'},events:[{date:'2026-09-21',event:'A'},{date:'2026-08-24',event:'A'},{date:'2026-08-03',event:'I'},{date:'2026-07-27',event:'A'}]};
const row=(player,points,minimum,status)=>({player,points,minimum,status,percent:minimum?points/minimum*100:null});
test('goal rate excludes unknown targets and median works with an unordered filtered cohort',()=>{
  const a=chartAnalysis(data,[row('Low',40,80,'below'),row('Unknown',100,null,'unknown'),row('High',240,120,'met'),row('Zero',0,null,'unknown')]);
  assert.equal(a.total,380);assert.equal(a.goalRate,50);assert.equal(a.median,70);
  assert.deepEqual(a.counts,{met:1,below:1,unknown:2});
  assert.deepEqual(a.attention.map(r=>r.player),['Low','High']);
  assert.deepEqual(a.top.map(r=>r.player),['High','Unknown','Low','Zero']);
  assert.equal(a.scale,240);
});
test('history compares only the same event up to the selected edition, retaining at most eight in chronological order',()=>{
  const a=chartAnalysis(data,[]);
  assert.deepEqual(a.history.map(e=>e.date),['2026-07-27','2026-08-24']);
  const events=Array.from({length:12},(_,i)=>({date:`2026-${String(i+1).padStart(2,'0')}-01`,event:'A'}));
  assert.equal(chartAnalysis({edition:{date:'2026-12-01',event:'A'},events},[]).history.length,8);
});
test('empty and zero-point selections do not invent concentration or goal compliance; large percentages retain their true values',()=>{
  const empty=chartAnalysis(data,[]);assert.equal(empty.median,null);assert.equal(empty.concentration,null);assert.equal(empty.goalRate,null);
  const zero=chartAnalysis(data,[row('Zero',0,null,'unknown')]);assert.equal(zero.median,0);assert.equal(zero.concentration,null);assert.equal(zero.goalRate,null);
  const high=chartAnalysis(data,[row('High',800,100,'met')]);assert.equal(high.attention[0].percent,800);assert.equal(high.goalScale,200);
});
