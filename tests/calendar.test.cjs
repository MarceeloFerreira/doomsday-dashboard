const {test}=require('node:test');
const assert=require('node:assert/strict');
const {windowFor}=require('../public/calendar-core.js');
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
