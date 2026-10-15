const {test}=require('node:test');const assert=require('node:assert/strict');const {analyzeMembers}=require('../lib/member-analysis.cjs');const {memberProgress}=require('../lib/member-progress.cjs');
const rows=[['2026-01-01','A','Me',0],['2026-01-01','A','Other',100],['2026-01-02','G','Other',1000],['2026-01-03','A','Me',200],['2026-01-03','A','Other',400],['2026-01-04','G','Me',50],['2026-01-04','G','Other',150],['2026-01-05','A','Other',800]];
test('event averages match only the editions actually recorded for the player, including zero',()=>{
 const progress=memberProgress(rows,'Me',analyzeMembers(rows,'','0'));
 const a=progress.breakdown.find(e=>e.event==='A'),g=progress.breakdown.find(e=>e.event==='G');
 assert.equal(a.ownAverage,100);assert.equal(a.peerAverage,175);assert.equal(a.ownRecords,2);
 assert.equal(g.ownAverage,50);assert.equal(g.peerAverage,100);assert.equal(g.ownRecords,1);
});
test('single-edition selection ignores the period limit and retains only that edition in the report',()=>{
 const a=analyzeMembers(rows,'A','1','2026-01-01');assert.equal(a.editions.length,1);assert.equal(a.total,100);
 const r=memberProgress(rows,'Me',a,'2026-01-01');assert.equal(r.focus.points,0);assert.equal(r.previous,null);assert.equal(r.personal.profile.records,1);
});
test('comparison stays in the same event, does not divide by zero and never includes future editions',()=>{
 const r=memberProgress(rows,'Me',analyzeMembers(rows,'A','6','2026-01-03'),'2026-01-03');
 assert.equal(r.previous.date,'2026-01-01');assert.equal(r.delta,200);assert.equal(r.deltaPercent,null);assert.deepEqual(r.trend.map(e=>e.date),['2026-01-01','2026-01-03']);assert.equal(r.best.points,200);
});
test('missing scores and unknown nicknames do not become zero-point results or invented averages',()=>{
 const a=analyzeMembers(rows,'A','0','2026-01-05');const r=memberProgress(rows,'Me',a,'2026-01-05');
 assert.equal(r.focus.points,null);assert.equal(r.delta,null);assert.equal(r.breakdown[0].ownAverage,null);assert.equal(r.personal.profile,undefined);
 const none=memberProgress(rows,'Unknown',analyzeMembers(rows,'','0'));assert.equal(none.best,null);assert.ok(none.breakdown.every(e=>e.ownAverage===null));
 assert.equal(analyzeMembers(rows,'G','0','2026-01-01').editions.length,0);
 for(const key of ['minimum','power','troops','rule'])assert.ok(!JSON.stringify(r).includes('"'+key+'"'));
});
