const {test}=require('node:test');const assert=require('node:assert/strict');
const {requestSheet,keepLatest}=require('../lib/sheet-request.cjs');
test('timeout receives one bounded retry and then returns a successful response',async()=>{
  let calls=0;const result=await requestSheet(async()=>{if(++calls===1){const e=new Error('timeout');e.name='TimeoutError';throw e;}return {status:200,ok:true};},'https://script.google.com/test','test-only');assert.equal(calls,2);assert.equal(result.ok,true);
});
test('permission rejection is not retried; temporary server failures are',async()=>{
  let calls=0;await requestSheet(async()=>{calls++;return {status:401};},'url','test-only');assert.equal(calls,1);
  calls=0;await requestSheet(async()=>({status:++calls===1?503:200}), 'url','test-only');assert.equal(calls,2);
});
test('repeated timeouts stop after two calls',async()=>{
  let calls=0;await assert.rejects(requestSheet(async()=>{calls++;const e=new Error('timeout');e.name='TimeoutError';throw e;},'url','test-only'));assert.equal(calls,2);
});
test('failed refresh retains live goals for same edition, without crossing edition boundaries',()=>{
  const previous={source:'google-sheets',edition:{date:'2026-08-24'},ranking:[{minimum:80e6}],fetchedAt:'2026-10-13T10:00:00Z'};
  const fallback={source:'snapshot',edition:{date:'2026-08-24'},ranking:[],warning:'A atualização falhou. Exibindo o histórico salvo no projeto.'};
  const kept=keepLatest(previous,fallback);assert.equal(kept.ranking[0].minimum,80e6);assert.equal(kept.stale,true);assert.equal(kept.fetchedAt,previous.fetchedAt);
  const other={...fallback,edition:{date:'2026-06-29'}};assert.equal(keepLatest(previous,other),other);
});
