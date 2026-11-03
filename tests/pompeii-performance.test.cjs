const {test}=require('node:test');
const assert=require('node:assert/strict');
const {mergePompeiiScores}=require('../lib/pompeii-performance.cjs');
const {analyzeMembers,individual}=require('../lib/member-analysis.cjs');
const {memberSelection}=require('../lib/member-selection.cjs');
const {memberProgress}=require('../lib/member-progress.cjs');
const editions=[{id:'morning',date:'2026-11-03',name:'Pompeia manhã',finalizedAt:'2026-11-03T09:00:00Z',players:[{id:'game:1',nick:'Old Nick',points:0},{id:'game:2',nick:'Bob',points:null}]},{id:'night',date:'2026-11-03',name:'Pompeia noite',finalizedAt:'2026-11-03T20:00:00Z',players:[{id:'game:1',nick:'Old Nick',points:100},{id:'game:2',nick:'Bob',points:200}]}];
const members=[{id:'1',player:'Alice'}];
test('Pompeii performance uses real scores only, preserves zero and resolves renamed players by game ID',()=>{
 const base=[['2026-11-03','I','Alice',500],['2026-11-03','Pompeia','Alice',999]];
 const merged=mergePompeiiScores(base,editions,members);
 assert.equal(merged.rows.length,4);assert.equal(merged.rows.some(r=>r[3]===999),false);
 assert.deepEqual(merged.partialEditionIds,['pompeia:morning']);
 const all=analyzeMembers(merged.rows,'','0');assert.equal(all.editions.length,3);assert.equal(all.total,800);
 const pompeii=analyzeMembers(merged.rows,'P','0');assert.equal(pompeii.editions.length,2);assert.equal(pompeii.events[0].label,'Pompeia');
 const me=individual(pompeii,'Alice');assert.equal(me.profile.average,50);assert.deepEqual(me.history.map(e=>e.points),[0,100]);
 const bob=individual(pompeii,'Bob');assert.deepEqual(bob.history.map(e=>e.points),[null,200]);
});
test('same-day editions select separately and compare the previous edition of the same event',()=>{
 const {rows}=mergePompeiiScores([['2026-11-03','I','Alice',500]],editions,members);
 const selection=memberSelection(rows,{player:'Alice',event:'P',period:'latest'});
 assert.equal(selection.effectiveEdition,'pompeia:night');assert.equal(selection.analysis.editions.length,1);
 const progress=memberProgress(rows,'Alice',selection.analysis,selection.effectiveEdition);
 assert.equal(progress.previous.points,0);assert.equal(progress.delta,100);assert.equal(progress.trend.length,2);
 assert.equal(analyzeMembers(rows,'','0','2026-11-03').total,500);
 assert.equal(analyzeMembers(rows,'','0','pompeia:morning').total,0);
 assert.equal(analyzeMembers(rows,'P','1').editions.length,1);
});
test('editions without scores do not fabricate participation or zero-point performance',()=>{
 const {rows,partialEditionIds}=mergePompeiiScores([], [{...editions[0],players:[{id:'game:1',nick:'Alice',points:null}]}],members);
 assert.equal(rows.length,0);assert.equal(partialEditionIds.length,1);
 assert.equal(memberSelection(rows,{player:'Alice',event:'P',period:'latest'}).lastParticipation,null);
});
