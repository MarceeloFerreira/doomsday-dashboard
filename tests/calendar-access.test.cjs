const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function source(file){return fs.readFileSync(path.join(__dirname,'..',file),'utf8').replace(/^import .*;$/gm,'').replace(/^export const .*;$/gm,'').replace('export async function','async function');}
test('calendar API checks membership before reading data and uses private responses',async()=>{
  for(const allowed of [false,true]){
    let reads=0;const context={Response,permitted:async()=>allowed,createCalendarReader:()=>async()=>{reads++;return {events:[],delivery:{source:'fixture'}};},bundled:{}};
    vm.createContext(context);vm.runInContext(source('app/api/calendar/route.js'),context);
    const response=await context.GET({});assert.equal(response.status,allowed?200:401);assert.equal(reads,allowed?1:0);assert.match(response.headers.get('Cache-Control'),/private.*no-store/);
  }
});
test('calendar page and static fallback require membership while login retains destination',async()=>{
  for(const allowed of [false,true])for(const pathname of ['/calendario','/data/calendar.json']){
    const context={URL,permitted:async()=>allowed,NextResponse:{next:()=>({status:200}),json:(body,init)=>Response.json(body,init),redirect:url=>({status:307,url:String(url)})}};
    vm.createContext(context);vm.runInContext(source('proxy.js'),context);
    const response=await context.proxy({url:'http://localhost'+pathname,nextUrl:{pathname}});
    assert.equal(response.status,allowed?200:pathname==='/calendario'?307:401);
    if(!allowed&&pathname==='/calendario')assert.equal(response.url,'http://localhost/membros?destino=calendario');
  }
});
