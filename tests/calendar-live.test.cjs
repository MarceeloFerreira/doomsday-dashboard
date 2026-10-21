const {test}=require('node:test');
const assert=require('node:assert/strict');
const {validateCalendar,calendarHash}=require('../lib/calendar-data.cjs');
const {createCalendarReader}=require('../lib/calendar-source.cjs');
const {publishCalendar}=require('../lib/calendar-publish.cjs');
const snapshot=require('../public/data/calendar.json');
const clone=()=>structuredClone(snapshot);
function fakeStore(initial=null){
  const values=new Map(initial?[['current',structuredClone(initial)]]:[]);
  const writes=[];
  let revision=1;
  return {values,writes,conflict:false,
    async get(key){return structuredClone(values.get(key)??null);},
    async getWithMetadata(key){return values.has(key)?{data:structuredClone(values.get(key)),etag:String(revision)}:null;},
    async setJSON(key,data,options={}){
      if(key==='current'&&(this.conflict||(options.onlyIfNew&&values.has(key))||(options.onlyIfMatch&&options.onlyIfMatch!==String(revision))))return {modified:false};
      writes.push(key);values.set(key,structuredClone(data));if(key==='current')revision++;
      return {modified:true,etag:String(revision)};
    }
  };
}
test('calendar validator rejects duplicate IDs and invalid windows before publication',()=>{
  const data=clone();data.events.push(data.events[0]);assert.throws(()=>validateCalendar(data));
  const dates=clone();dates.events[0].start='invalid';assert.throws(()=>validateCalendar(dates));
  assert.throws(()=>validateCalendar({}));
});
test('publication hash ignores collection timestamps but includes content and restrictions',()=>{
  const data=clone();data.generatedAt='2030-01-01T00:00:00Z';assert.equal(calendarHash(data),calendarHash(snapshot));
  data.events[0].kingdomIds=[999];assert.notEqual(calendarHash(data),calendarHash(snapshot));
});
test('reader uses live data, expires cache and reads an update without a build',async()=>{
  let now=0;const store=fakeStore(snapshot);
  const read=createCalendarReader({openStore:()=>store,fallback:snapshot,clock:()=>now,ttl:10});
  assert.equal((await read()).delivery.source,'live');
  const next=clone();next.patch='99';store.values.set('current',next);
  assert.notEqual((await read()).patch,'99');
  now=11;assert.equal((await read()).patch,'99');
});
test('reader keeps last valid live data when remote becomes invalid',async()=>{
  let now=0;const data=clone();data.patch='88';const store=fakeStore(data);
  const read=createCalendarReader({openStore:()=>store,fallback:snapshot,clock:()=>now,ttl:10});
  await read();store.values.set('current',{});now=11;
  const result=await read();assert.equal(result.patch,'88');assert.equal(result.delivery.degraded,true);
});
test('missing storage falls back to bundled data; timeout does not hang requests',async()=>{
  const read=createCalendarReader({openStore:()=>({get:()=>new Promise(()=>{})}),fallback:snapshot,timeout:5});
  const result=await read();assert.equal(result.events.length,snapshot.events.length);assert.equal(result.delivery.source,'bundled');assert.equal(result.delivery.degraded,true);
});
test('publisher archives, conditionally publishes and reads back current data',async()=>{
  const store=fakeStore();const result=await publishCalendar(store,clone());
  assert.equal(result.status,'published');assert.equal(store.writes.length,2);
  assert.deepEqual(store.values.get('current'),snapshot);
});
test('identical content does not write on every collection',async()=>{
  const store=fakeStore(snapshot),data=clone();data.generatedAt='2030-01-01T00:00:00Z';
  assert.equal((await publishCalendar(store,data)).status,'unchanged');assert.equal(store.writes.length,0);
});
test('invalid or unexpectedly truncated publication preserves current version',async()=>{
  const store=fakeStore(snapshot),bad=clone();bad.events=bad.events.slice(0,10);bad.generatedAt='2030-01-01T00:00:00Z';
  await assert.rejects(publishCalendar(store,bad),/20%/);
  assert.equal(store.writes.length,0);assert.deepEqual(store.values.get('current'),snapshot);
});
test('stale publication cannot overwrite newer data',async()=>{
  const store=fakeStore(snapshot),bad=clone();bad.generatedAt='2020-01-01T00:00:00Z';bad.patch='old';
  await assert.rejects(publishCalendar(store,bad),/anterior/);assert.equal(store.writes.length,0);
});
test('concurrent publication does not overwrite another writer',async()=>{
  const store=fakeStore(snapshot),next=clone();next.patch='new';next.generatedAt='2030-01-01T00:00:00Z';store.conflict=true;
  await assert.rejects(publishCalendar(store,next),/mesmo tempo/);assert.deepEqual(store.values.get('current'),snapshot);
});
