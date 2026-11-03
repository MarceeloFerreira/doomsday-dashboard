const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {buildTeams,announcement}=require('../lib/pompeii.cjs');
const {finalizeInput,scoreInput,historyStats}=require('../lib/pompeii-history.cjs');
const {createPompeiiHistoryHandlers}=require('../lib/pompeii-history-handlers.cjs');
function fixture(){
 const players=Array.from({length:8},(_,i)=>({id:'game:'+i,nick:'Player '+i,roles:i<2?['rally']:i<6?['guarnicao']:['campo'],power:100-i,troops:'T6'}));
 const teams=buildTeams(players);return {players,input:{id:'11111111-1111-4111-8111-111111111111',date:'2026-11-03',name:'Pompeia manhã',teams,announcement:announcement(teams,players).text}};
}
function sheetRuntime(){
 let locks=0,failMetadata=false;const sheets={};
 function makeSheet(name){const values=[];let maxRows=1000;return {values,getLastRow:()=>values.length,getMaxRows:()=>maxRows,insertRowsAfter:(after,n)=>{maxRows+=n;},getDataRange:()=>({getValues:()=>values.length?values.map(r=>[...r]):[['']]}),getRange:(row,col,height=1,width=1)=>{const range={setValues(data){if(name==='Pompeia Edições'&&row>1&&failMetadata){failMetadata=false;throw Error('injected failure');}for(let i=0;i<height;i++){values[row-1+i]??=[];for(let j=0;j<width;j++){let v=data[i][j];if(typeof v==='string'&&v[0]==="'")v=v.slice(1);values[row-1+i][col-1+j]=v;}}return range;},setValue(value){return range.setValues([[value]]);},setFontWeight:()=>range,setBackground:()=>range,setFontColor:()=>range,setNumberFormat:()=>range,setWrapStrategy:()=>range,setDataValidation:()=>range};return range;},setFrozenRows(){},setColumnWidths(){},setColumnWidth(){},setRowHeight(){}};}
 const spreadsheet={getSheetByName:name=>sheets[name]||null,insertSheet:name=>{assert.ok(['Pompeia','Pompeia Edições'].includes(name));sheets[name]=makeSheet(name);return sheets[name];},getSpreadsheetTimeZone:()=>'Europe/Lisbon'};
 const context={Date,SpreadsheetApp:{openById:()=>spreadsheet,WrapStrategy:{CLIP:'CLIP'},newDataValidation:()=>{const rule={requireValueInList:()=>rule,setAllowInvalid:()=>rule,build:()=>({})};return rule;}},PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'x'.repeat(32)})},ContentService:{MimeType:{JSON:'json'},createTextOutput:value=>({setMimeType:()=>JSON.parse(value)})},LockService:{getScriptLock:()=>({tryLock:()=>{locks++;return true;},waitLock:()=>{locks++;},releaseLock:()=>{locks--;}})},Utilities:{parseDate:value=>new Date(value+'T12:00:00Z'),formatDate:value=>value.toISOString().slice(0,10)}};
 vm.createContext(context);vm.runInContext(readFileSync(join(__dirname,'../scripts/google-sheets/Code.gs'),'utf8'),context);
 const call=input=>context.doPost({postData:{contents:JSON.stringify({token:'x'.repeat(32),...input})}});
 return {call,setup:()=>context.setupPompeiaEdicoes(),sheet:(name='Pompeia')=>sheets[name]||null,dropSheet:name=>{delete sheets[name];},failMetaOnce:()=>{failMetadata=true;},locks:()=>locks};
}
test('finalization validates dates, specialists and snapshot identity; scores distinguish blank from zero',()=>{
 const {players,input}=fixture(),edition=finalizeInput(input,players);
 assert.equal(edition.players.length,8);assert.equal(edition.players[0].nick,players.find(p=>p.id===edition.players[0].id).nick);
 for(const data of [{...input,date:'2026-02-30'},{...input,id:'bad'},{...input,announcement:'x'.repeat(1501)},{...input,teams:{verde:input.teams.verde,roxa:[]}}])assert.throws(()=>finalizeInput(data,players));
 const score={editionId:input.id,playerId:'game:0',points:0,expected:null};assert.equal(scoreInput(score).points,0);
 for(const points of [-1,1.5,'100',NaN])assert.throws(()=>scoreInput({...score,points}));
 const stats=historyStats([{players:[{id:'1',nick:'P',points:null}]},{players:[{id:'1',nick:'P',points:0}]},{players:[{id:'1',nick:'P',points:100}]}]);
 assert.deepEqual(stats[0],{id:'1',nick:'P',editions:3,records:2,total:100,average:50});
});
test('Apps Script finalizes once, retains immutable rosters and preserves manually entered scores on retry',()=>{
 const {players,input}=fixture(),edition=finalizeInput(input,players),r=sheetRuntime();
 assert.deepEqual(r.call({action:'pompeii_history'}).editions,[]);assert.equal(r.sheet(),null);
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);
 assert.equal(r.sheet().values.length,9);
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);assert.equal(r.sheet().values.length,9);
 assert.equal(r.call({action:'pompeii_finalize',edition:{...edition,id:'33333333-3333-4333-8333-333333333333'}}).error,'pompeii_duplicate');
 const id=edition.players[0].id,score={action:'pompeii_score',editionId:edition.id,playerId:id,points:0,expected:null};
 assert.equal(r.call(score).ok,true);assert.equal(r.call(score).ok,true);
 assert.equal(r.call({...score,points:100}).error,'pompeii_score_conflict');
 assert.equal(r.call({...score,points:100,expected:0}).ok,true);
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);
 const history=r.call({action:'pompeii_history'}).editions;assert.equal(history[0].players.find(p=>p.id===id).points,100);assert.equal(history[0].players.filter(p=>p.points===null).length,7);assert.equal(history[0].date,'2026-11-03');
 assert.equal(r.call({action:'pompeii_finalize',edition:{...edition,name:'Other'}}).error,'pompeii_conflict');
 assert.equal(r.locks(),0);
});
test('Apps Script retains two editions and escapes formula-like player names',()=>{
 const {players,input}=fixture(),edition=finalizeInput(input,players),r=sheetRuntime();
 edition.players[0].nick='=HYPERLINK("evil")';edition.name='+Name';assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);
 assert.equal(r.sheet().values[1][5],'=HYPERLINK("evil")');
 const second={...edition,id:'22222222-2222-4222-8222-222222222222',date:'2026-11-04'};
 assert.equal(r.call({action:'pompeii_finalize',edition:second}).ok,true);const data=r.call({action:'pompeii_history'});assert.equal(data.editions.length,2);assert.equal(data.editions[0].date,'2026-11-04');
 assert.equal(r.call({action:'pompeii_score',editionId:edition.id,playerId:'missing',points:1,expected:null}).error,'pompeii_not_found');
});
test('history endpoints deny ordinary members and cross-origin writes before accessing Sheets',async()=>{
 const keys=['MEMBERS_AUTH_MODE','SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY'],old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{MEMBERS_AUTH_MODE:'accounts',SUPABASE_URL:'fixture',SUPABASE_PUBLISHABLE_KEY:'fixture',SUPABASE_SECRET_KEY:'fixture'});
 let allowed=false,writes=0;const {players,input}=fixture();
 const handlers=createPompeiiHistoryHandlers({NextResponse:{json:(data,options)=>({data,...options})},service:{async requireSession(){if(!allowed)throw Object.assign(Error('Denied'),{status:403,safe:true});},async pompeiiRoster(){return {rosterAvailable:true,players};}},sheet:async(action,payload)=>{writes++;return {ok:true,action,payload};}});
 const req=(data,origin='http://localhost:3000')=>{const request=new Request('http://localhost:3000/api/r4/pompeii/history',{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});request.cookies={get:()=>({value:'token'})};return request;};
 try{
 assert.equal((await handlers.GET(req())).status,403);assert.equal(writes,0);
 allowed=true;assert.equal((await handlers.POST(req({action:'finalize',...input},'https://evil.example'))).status,403);assert.equal(writes,0);
 const result=await handlers.POST(req({action:'finalize',...input}));assert.equal(result.status,200);assert.equal(result.data.action,'pompeii_finalize');assert.equal(result.data.payload.edition.players.length,8);
 }finally{for(const key of keys){if(old[key]===undefined)delete process.env[key];else process.env[key]=old[key];}}
});

test('notices are stored independently of player rows and stay available after the first row is removed',()=>{
 const {players,input}=fixture(),edition=finalizeInput(input,players),r=sheetRuntime();
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);
 assert.equal(r.sheet().values[0].length,10);assert.equal(r.sheet().values[1].length,10);
 const metadata=r.sheet('Pompeia Edições');assert.equal(metadata.values.length,2);assert.equal(metadata.values[1][3],edition.announcement);
 r.sheet().values.splice(1,1);
 const history=r.call({action:'pompeii_history'});assert.equal(history.editions[0].announcement,edition.announcement);assert.equal(history.editions[0].players.length,7);
});
test('failed metadata writes can be retried without duplicating rosters or losing points',()=>{
 const {players,input}=fixture(),edition=finalizeInput(input,players),r=sheetRuntime();r.failMetaOnce();
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,false);assert.equal(r.sheet().values.length,9);
 assert.deepEqual(r.call({action:'pompeii_history'}).editions,[]);
 r.sheet().values[1][9]=123;
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);assert.equal(r.sheet().values.length,9);
 assert.equal(r.call({action:'pompeii_history'}).editions[0].players[0].points,123);
});
test('legacy twelve-column histories remain readable before the test sheet is recreated',()=>{
 const {players,input}=fixture(),edition=finalizeInput(input,players),r=sheetRuntime();
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);
 r.sheet().values[0].push('Aviso','Finalizado em');
 for(let i=1;i<r.sheet().values.length;i++)r.sheet().values[i].push(i===1?edition.announcement:'','2026-11-03T12:00:00Z');
 r.dropSheet('Pompeia Edições');
 const history=r.call({action:'pompeii_history'});assert.equal(history.ok,true);assert.equal(history.editions[0].announcement,edition.announcement);
});

test('edition metadata stores opponent count and participants, and preserves later results on retries',()=>{
 const {players,input}=fixture(),edition=finalizeInput({...input,opponents:24,participants:99,opponentAlliance:' [ABC] Rivais '},players),r=sheetRuntime();
 assert.equal(edition.participants,8);assert.equal(edition.opponents,24);
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);
 const meta=r.sheet('Pompeia Edições');assert.deepEqual(meta.values[0].slice(5),['Resultado','Participantes','Oponentes','Aliança adversária']);
 assert.deepEqual(meta.values[1].slice(5,8),['',8,24]);
 meta.values[1][5]='Vitória';meta.values[1][6]=7;
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);
 const saved=r.call({action:'pompeii_history'}).editions[0];assert.equal(saved.result,'Vitória');assert.equal(saved.participants,7);assert.equal(saved.opponents,24);assert.equal(saved.opponentAlliance,'[ABC] Rivais');
 assert.throws(()=>finalizeInput({...input,opponentAlliance:'a'.repeat(81)},players));
 for(const opponents of [-1,0,1000,1.5,'24'])assert.throws(()=>finalizeInput({...input,opponents},players));
});
test('setup adds the four columns to existing editions without deleting notices, points or manual values',()=>{
 const {players,input}=fixture(),edition=finalizeInput(input,players),r=sheetRuntime();
 assert.equal(r.call({action:'pompeii_finalize',edition}).ok,true);
 const meta=r.sheet('Pompeia Edições');meta.values[0]=meta.values[0].slice(0,5);meta.values[1]=meta.values[1].slice(0,5);
 r.sheet().values[1][9]=123;
 assert.equal(r.call({action:'pompeii_history'}).editions[0].participants,8);
 r.setup();assert.equal(meta.values[0].length,9);assert.equal(meta.values[1][6],8);assert.equal(meta.values[1][3],edition.announcement);assert.equal(r.sheet().values[1][9],123);
 meta.values[1][5]='Derrota';meta.values[1][6]=0;meta.values[1][7]=24;r.setup();
 const saved=r.call({action:'pompeii_history'}).editions[0];assert.equal(saved.result,'Derrota');assert.equal(saved.participants,0);assert.equal(saved.opponents,24);
 assert.equal(r.locks(),0);
});
