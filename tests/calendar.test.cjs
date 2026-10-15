const {test}=require('node:test');
const assert=require('node:assert/strict');
const {windowFor,regionMatches,groupRows,windowSummary,timingFor,remainingLabel,DAY}=require('../public/calendar-core.js');
const e={start:'2026-10-01T00:00:00Z',durationDays:3,loopDays:7};
test('recurring event is active at its start and schedules next occurrence at exclusive end',()=>{
  assert.equal(windowFor(e,Date.parse(e.start)).status,'active');
  const next=windowFor(e,Date.parse('2026-10-04T00:00:00Z'));
  assert.equal(next.status,'upcoming');
  assert.equal(next.startMs,Date.parse('2026-10-08T00:00:00Z'));
});
test('fixed events end at exclusive duration boundary',()=>{
  assert.equal(windowFor({...e,loopDays:0},Date.parse('2026-10-04T00:00:00Z')).status,'ended');
});
test('future anchor and explicit end cap are respected',()=>{
  assert.equal(windowFor(e,Date.parse('2026-09-30T23:59:59Z')).status,'upcoming');
  assert.equal(windowFor({...e,end:'2026-10-02T00:00:00Z'},Date.parse('2026-10-02T00:00:00Z')).status,'ended');
});
test('UTC recurrence does not drift across daylight saving change',()=>{
  const r=windowFor(e,Date.parse('2026-10-26T12:00:00Z'));
  assert.equal(r.startMs,Date.parse('2026-10-29T00:00:00Z'));
});
test('a recurrence capped during its gap keeps the last real window',()=>{
  const r=windowFor({...e,end:'2026-10-06T00:00:00Z'},Date.parse('2026-10-05T00:00:00Z'));
  assert.equal(r.status,'ended');
  assert.equal(r.startMs,Date.parse(e.start));
  assert.equal(r.endMs,Date.parse('2026-10-04T00:00:00Z'));
});
test('region 541 includes unrestricted and explicitly allowed events only',()=>{
  assert.ok(regionMatches({kingdomIds:[]},541));
  assert.ok(regionMatches({kingdomIds:[540,541]},'541'));
  assert.equal(regionMatches({kingdomIds:[542]},541),false);
  assert.ok(regionMatches({kingdomIds:[542]},''));
});
test('one name retains separate phases, dates, conditions and every searchable ID',()=>{
  const now=Date.parse('2026-10-02T00:00:00Z');
  const records=[
    {...e,id:1,name:'Manual',kingdomIds:[]},
    {...e,id:2,name:'Manual',kingdomIds:[],calendar:true},
    {...e,id:3,name:'Manual',kingdomIds:[],start:'2026-10-16T00:00:00Z'},
    {...e,id:4,name:'Manual',kingdomIds:[],serverDay:30},
    {...e,id:5,name:'Manual',kingdomIds:[],conditions:{SpecialzoneServer:1}},
  ];
  const [family]=groupRows(records.map(r=>windowFor(r,now)));
  assert.equal(groupRows(records.map(r=>windowFor(r,now))).length,1);
  assert.equal(family.variants.length,4);
  assert.deepEqual(family.variants[0].ids,[1,2]);
  assert.deepEqual([...family.ids].sort(),[1,2,3,4,5]);
  assert.equal(family.status,'active');
});
test('installed calendar has unique IDs and grouping loses no region-compatible record',()=>{
  const data=require('../public/data/calendar.json');
  const records=data.events.filter(e=>regionMatches(e,541));
  const groups=groupRows(records.map(e=>windowFor(e,Date.parse('2026-10-15T12:00:00Z'))));
  assert.equal(new Set(data.events.map(e=>e.id)).size,data.events.length);
  assert.equal(new Set(groups.map(g=>g.name)).size,groups.length);
  assert.deepEqual(groups.flatMap(g=>g.variants.flatMap(v=>v.ids)).sort((a,b)=>a-b),records.map(e=>e.id).sort((a,b)=>a-b));
  for(const g of groups)for(const v of g.variants)assert.ok(v.startMs<v.endMs,'inverted window for '+v.id);
});
test('Presentes Fantasmagóricos is one event with two active and two future windows on October 15',()=>{
  const data=require('../public/data/calendar.json');
  const now=Date.parse('2026-10-15T12:00:00Z');
  const rows=data.events.filter(e=>e.name==='Presentes Fantasmagóricos'&&regionMatches(e,541)).map(e=>windowFor(e,now));
  const groups=groupRows(rows.filter(r=>r.status!=='ended'));
  assert.equal(groups.length,1);
  assert.equal(groups[0].variants.length,4);
  assert.equal(windowSummary(groups[0]),'2 em andamento · 2 futuras');
  assert.equal(groupRows(rows.filter(r=>r.status==='active')).length,1);
});
test('48-hour warning starts at its exact boundary, never for upcoming or ended events',()=>{
  const end=Date.parse('2026-10-20T00:00:00Z');
  const event={...e,id:1,name:'Prazo',start:'2026-10-01T00:00:00Z',durationDays:19,loopDays:0};
  const timing=now=>timingFor(groupRows([windowFor(event,now)])[0],now);
  assert.equal(timing(end-2*DAY-1).ending,false);
  assert.equal(timing(end-2*DAY).ending,true);
  assert.equal(timing(end).ending,false);
  assert.equal(timing(Date.parse('2026-09-30T12:00:00Z')).ending,false);
  assert.ok(timing(end-DAY).progress>90);
});
test('a phase deadline does not imply that the monthly event has ended',()=>{
  const data=require('../public/data/calendar.json');
  const now=Date.parse('2026-10-18T12:00:00Z');
  const [group]=groupRows(data.events.filter(e=>e.name==='Presentes Fantasmagóricos').map(e=>windowFor(e,now)));
  const timing=timingFor(group,now);
  assert.equal(timing.ending,true);
  assert.equal(timing.phase,true);
  assert.equal(timing.window.id,191328);
  assert.equal(timing.remaining,DAY/2);
  assert.equal(group.status,'active');
  assert.equal(group.endMs,Date.parse('2026-10-31T00:00:00Z'));
});
test('countdown rounds to readable minutes, hours and days',()=>{
  assert.equal(remainingLabel(59000),'1 min');
  assert.equal(remainingLabel(90*60000),'1h 30min');
  assert.equal(remainingLabel(49*3600000),'2d 1h');
});
test('localized event descriptions are short plain text with traceable sources',()=>{
  const data=require('../public/data/calendar.json');
  const descriptions=data.events.filter(e=>e.description);
  assert.ok(descriptions.length>0);
  for(const event of descriptions){
    assert.ok(event.description.length<=240,'description too long for '+event.id);
    assert.ok(event.descriptionSourceKey);
    assert.doesNotMatch(event.description,/<[^>]*>|\{\d+\}|\[\/?(?:color|b|i|u)(?:=|\])/i);
  }
});
