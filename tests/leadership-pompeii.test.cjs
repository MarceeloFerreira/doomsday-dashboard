const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../lib/leadership.cjs');
const {mergePompeiiScores,performanceSource}=require('../lib/pompeii-performance.cjs');
const {chartAnalysis}=require('../lib/r4-analytics.cjs');
const {keepLatest}=require('../lib/sheet-request.cjs');
const members=[{id:'1',player:'Alice',type:'conta',inAlliance:true,troops:'T6',power:200e6},{id:'2',player:'Bob',type:'conta',inAlliance:true,troops:'T5',power:100e6},{id:'3',player:'Farm',type:'farm',inAlliance:true},{id:'4',player:'Former',type:'conta',inAlliance:false}];
const history={editions:[{id:'morning',date:'2026-11-03',name:'Manhã',finalizedAt:'2026-11-03T09:00:00Z',players:[{id:'game:1',nick:'Old Alice',points:0},{id:'game:2',nick:'Bob',points:null}]},{id:'night',date:'2026-11-03',name:'Noite',finalizedAt:'2026-11-03T20:00:00Z',players:[{id:'game:1',nick:'Old Alice',points:120},{id:'game:2',nick:'Bob',points:10},{id:'game:3',nick:'Farm',points:999},{id:'game:4',nick:'Former',points:888}]}]};
const base=[['2026-11-03','I','Alice',500],['2026-11-03','Pompeia','Alice',9999]];
const header=['Evento','Tropa','Poder acima de','Poder até','Tipo de meta','Meta','Ativo'];
const rules=()=>core.rulesFromSheet([header,['Pompéia','T6','','','Pontos',100,true],['P','T5','','','Percentual','25%',true]]).rules;
const source=()=>({rows:base,members,rules:rules(),rulesStatus:'sheet',source:'google-sheets',fetchedAt:'2026-11-03T21:00:00Z',warning:null});
test('leadership separates same-day Pompeii editions and applies the sheet goals to current accounts',()=>{
 const {rows}=mergePompeiiScores(base,history.editions,members);
 assert.equal(core.editions(rows).length,3);
 const report=core.analyze(rows,members,'pompeia:night',rules(),true);
 assert.equal(report.edition.label,'Pompeia');assert.equal(report.edition.name,'Noite');assert.equal(report.summary.total,130);assert.equal(report.summary.records,2);
 assert.equal(report.previous.id,'pompeia:morning');assert.equal(report.previous.total,0);
 assert.deepEqual(report.ranking.map(p=>[p.player,p.minimum,p.status,p.delta]),[['Alice',100,'met',120],['Bob',25e6,'below',null]]);
 const earlier=core.analyze(rows,members,'pompeia:morning',rules(),true);assert.equal(earlier.previous,undefined);assert.equal(earlier.ranking[0].points,0);assert.deepEqual(earlier.noRecord.map(p=>p.player),['Bob']);
 assert.equal(core.analyze(rows,members,'2026-11-03',rules(),true).summary.total,500);
});
test('Pompeii goal edits, disabled rules, and absent rules never borrow targets from another event',()=>{
 const rows=mergePompeiiScores(base,history.editions,members).rows;
 const changed=core.rulesFromSheet([header,['Pompeia','T6','','','Pontos',200,true],['Pompeia','T5','','','Pontos',5,false]]);
 assert.equal(changed.status,'sheet');
 const report=core.analyze(rows,members,'pompeia:night',changed.rules,true);
 assert.equal(report.ranking[0].minimum,200);assert.equal(report.ranking[0].status,'below');assert.equal(report.ranking[1].status,'unknown');
 assert.ok(core.analyze(rows,members,'pompeia:night',undefined,true).ranking.every(p=>p.minimum===null&&p.status==='unknown'));
});
test('Pompeii chart history excludes later editions on the same day',()=>{
 const events=core.editions(mergePompeiiScores(base,history.editions,members).rows);
 const morning=events.find(e=>e.id==='pompeia:morning');
 assert.deepEqual(chartAnalysis({events,edition:morning},[]).history.map(e=>e.id),['pompeia:morning']);
 const night=events.find(e=>e.id==='pompeia:night');
 assert.deepEqual(chartAnalysis({events,edition:night},[]).history.map(e=>e.id),['pompeia:morning','pompeia:night']);
});
test('shared performance source merges points and preserves sheet rules and partial status',async()=>{
 const report=await performanceSource(async()=>source(),async()=>history);
 assert.equal(report.pompeiiAvailable,true);assert.deepEqual(report.rules,rules());assert.deepEqual(report.partialEditionIds,['pompeia:morning']);
 assert.equal(report.rows.some(r=>r[3]===9999),false);assert.equal(report.rows.some(r=>r[4]==='pompeia:night'),true);
});
test('failed or malformed Pompeii history leaves the other events and rules available with a warning',async()=>{
 for(const readHistory of [async()=>{throw Error('offline');},async()=>({editions:[{date:'2026-11-03'}]})]){
  const report=await performanceSource(async()=>source(),readHistory);
  assert.equal(report.pompeiiAvailable,false);assert.deepEqual(report.rows,base);assert.deepEqual(report.rules,rules());assert.match(report.warning,/Pompeia/);
 }
});
test('a stale fallback cannot replace a different same-day edition',()=>{
 const previous={source:'google-sheets',edition:{id:'pompeia:night',date:'2026-11-03'}};
 const incoming={source:'snapshot',edition:{id:'2026-11-03',date:'2026-11-03'}};
 assert.equal(keepLatest(previous,incoming),incoming);
});

async function route(permitted){
 const fs=require('node:fs/promises'),vm=require('node:vm');
 const {loadBindings,transform}=require('next/dist/build/swc');await loadBindings();
 const text=await fs.readFile(require('node:path').join(__dirname,'../app/api/r4/events/route.js'),'utf8');
 const compiled=await transform(text,{filename:'route.js',jsc:{parser:{syntax:'ecmascript'},target:'es2022'},module:{type:'commonjs'}});
 let reads=0;
 const context={exports:{},require(id){
  if(id==='next/server')return {NextResponse:{json:(body,options={})=>({body,status:options.status||200})}};
  if(id.endsWith('member-access.cjs'))return {permitted:async()=>permitted};
  if(id.endsWith('leadership.cjs'))return core;
  if(id.endsWith('leadership-source'))return {leadershipSource:async()=>{reads++;return source();}};
  if(id.endsWith('pompeii-sheet'))return {pompeiiSheet:async()=>{reads++;return history;}};
  if(id.endsWith('pompeii-performance.cjs'))return {performanceSource};
  throw Error(id);
 }};vm.createContext(context);vm.runInContext(compiled.code,context);
 return {get:id=>context.exports.GET({nextUrl:new URL('http://localhost/api/r4/events'+(id?'?date='+encodeURIComponent(id):''))}),reads:()=>reads};
}
test('leadership route loads Pompeii, selects by ID, and exposes matching goals and partial results',async()=>{
 const api=await route(true),latest=await api.get();assert.equal(latest.status,200);assert.equal(latest.body.edition.id,'pompeia:night');assert.equal(latest.body.summary.total,130);assert.equal(latest.body.rules.length,2);
 assert.equal(latest.body.events.find(e=>e.id==='pompeia:morning').partial,true);
 const morning=await api.get('pompeia:morning');assert.equal(morning.body.edition.partial,true);assert.equal(morning.body.summary.records,1);
 assert.equal((await api.get('not-found')).status,404);
});
test('leadership route checks access before reading either sheet source',async()=>{
 const api=await route(false);assert.equal((await api.get()).status,401);assert.equal(api.reads(),0);
});

test('event picker keeps a stable Pompeii filter and navigates same-day editions by ID',async()=>{
 const React=require('react'),fs=require('node:fs/promises'),vm=require('node:vm');
 const {renderToStaticMarkup}=require('react-dom/server');
 const {loadBindings,transform}=require('next/dist/build/swc');await loadBindings();
 const text=await fs.readFile(require('node:path').join(__dirname,'../app/EventPicker.jsx'),'utf8');
 const compiled=await transform(text,{filename:'EventPicker.jsx',jsc:{parser:{syntax:'ecmascript',jsx:true},transform:{react:{runtime:'automatic'}},target:'es2022'},module:{type:'commonjs'}});
 let kind='',selectedId='pompeia:night';const chosen=[];
 const events=core.editions(mergePompeiiScores(base,history.editions,members).rows);
 const context={exports:{},require(id){return id==='react'?{...React,useState:()=>[kind,v=>{kind=v;}]}:require(id);}};
 vm.createContext(context);vm.runInContext(compiled.code,context);
 const render=()=>context.exports.default({data:{events,edition:events.find(e=>e.id===selectedId)},loading:false,onDate:id=>{chosen.push(id);selectedId=id;}});
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}return null;}
 let tree=render();const pompeii=find(tree,n=>n.type==='button'&&n.props.children==='Pompeia');assert.ok(pompeii);pompeii.props.onClick();tree=render();
 const html=renderToStaticMarkup(tree);assert.match(html,/value="pompeia:morning"/);assert.match(html,/value="pompeia:night"/);assert.match(html,/Manhã/);assert.match(html,/Noite/);assert.doesNotMatch(html,/value="2026-11-03"/);
 find(tree,n=>n.props?.['aria-label']==='Abrir edição anterior').props.onClick();assert.equal(chosen.at(-1),'pompeia:morning');tree=render();
 find(tree,n=>n.props?.['aria-label']==='Abrir edição mais recente').props.onClick();assert.equal(chosen.at(-1),'pompeia:night');
});
