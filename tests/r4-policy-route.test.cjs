const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');const core=require('../lib/leadership.cjs');
function route(source,allowed=true){
  let reads=0;
  const context={NextResponse:Response,permitted:async()=>allowed,core,leadershipSource:async()=>{reads++;return source;}};
  const code=fs.readFileSync(path.join(__dirname,'../app/api/r4/events/route.js'),'utf8').replace(/^import .*;$/gm,'').replace(/^export const .*;$/gm,'').replace('export async function','async function');
  vm.createContext(context);vm.runInContext(code,context);
  return {get:()=>context.GET({cookies:{get:()=>({value:'test-session'})},nextUrl:new URL('http://localhost/api/r4/events?date=2026-01-02')}),reads:()=>reads};
}
const fixture={rows:[['2026-01-01','G','Main',20],['2026-01-02','G','Main',40],['2026-01-02','G','Farm',900]],members:[{player:'Main',type:'conta',inAlliance:true,troops:'T6',power:200e6},{player:'Farm',type:'farm',inAlliance:true}],rules:[{event:'G',troops:'T6',above:0,upTo:null,kind:'points',value:25},{event:'A',troops:'T6',above:0,upTo:null,kind:'points',value:100}],rulesStatus:'sheet',source:'google-sheets'};
test('R4 endpoint applies event rules and current-account scope consistently',async()=>{
  const response=await route(fixture).get();const data=await response.json();
  assert.equal(response.status,200);assert.equal(data.rules.length,1);assert.equal(data.rules[0].event,'G');
  assert.equal(data.summary.total,40);assert.equal(data.previous.total,20);assert.equal(data.events[0].records,1);assert.equal(data.ranking[0].minimum,25);assert.equal(data.ranking[0].status,'met');assert.equal(data.ranking.length,1);
});
test('unavailable roster does not claim real zero totals',async()=>{
  const data=await (await route({...fixture,members:[],source:'snapshot'}).get()).json();
  assert.equal(data.rosterAvailable,false);assert.equal(data.summary,null);assert.equal(data.edition.total,null);assert.equal(data.events[0].records,null);
});
test('rules and scores remain behind the R4 session check',async()=>{
  const handler=route(fixture,false);assert.equal((await handler.get()).status,401);assert.equal(handler.reads(),0);
});
