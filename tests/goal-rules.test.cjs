const {test}=require('node:test');const assert=require('node:assert/strict');
const core=require('../lib/leadership.cjs');const rulesCore=require('../lib/goal-rules.cjs');
const header=['Evento','Tropa','Poder acima de','Poder até','Tipo de meta','Meta','Ativo'];
const initial=[header,['Arquipélago','T5','','','Percentual','30%','TRUE'],['Arquipélago','T6','','180M','Pontos','80M','Sim'],['Arquipélago','T6','180M','','Pontos','120M','TRUE']];
test('sheet rules preserve exact 180M boundary and power percentage',()=>{
 const {rules,status}=core.rulesFromSheet(initial);assert.equal(status,'sheet');assert.equal(rules.length,3);
 assert.equal(core.goal('A',{troops:'T5',power:200e6},rules).minimum,60e6);
 assert.equal(core.goal('A',{troops:'T6',power:180e6},rules).minimum,80e6);
 assert.equal(core.goal('A',{troops:'T6',power:180e6+1},rules).minimum,120e6);
 assert.equal(core.goal('G',{troops:'T6',power:181e6},rules).minimum,null);
});
test('different events have independent rules and edits affect both target and displayed rule',()=>{
 const values=[...initial,['Gênesis','T6','','','Pontos','25M','TRUE'],['Insular','T5','','','Percentual',50,true]];
 const first=core.rulesFromSheet(values).rules;const player={troops:'T6',power:200e6};
 assert.equal(core.goal('G',player,first).minimum,25e6);assert.equal(core.goal('A',player,first).minimum,120e6);
 const changed=values.map(r=>[...r]);changed[4][5]='40M';
 const second=core.rulesFromSheet(changed).rules;assert.equal(core.goal('G',player,second).minimum,40e6);
 assert.match(rulesCore.describe(second[3]),/40M/);
 assert.equal(core.goal('I',{troops:'T5',power:200e6},second).minimum,100e6);
});
test('overlap and invalid bounds fail closed; inactive and blank checkbox rows are ignored',()=>{
 for(const row of [ ['Arquipélago','T6','100M','200M','Pontos','99M',true],['Gênesis','T6','','abc','Pontos','25M',true],['Gênesis','T6','100M','50M','Pontos','25M',true],['Gênesis','T6','','','Pontos','',true] ]){
  const result=core.rulesFromSheet([...initial,row]);assert.equal(result.status,'invalid');assert.equal(result.rules.length,0);
 }
 const result=core.rulesFromSheet([...initial,['Gênesis','T6','','','Pontos','25M',false],['','','','','','',false]]);
 assert.equal(result.rules.length,3);
 assert.equal(core.rulesFromSheet([header]).rules.length,0);
 assert.equal(core.rulesFromSheet().status,'defaults');
});
test('R4 scopes ranking, totals, previous editions and missing records to current accounts',()=>{
 const members=[{player:'Main',type:'conta',inAlliance:true,troops:'T5',power:200},{player:'Farm',type:'farm',inAlliance:true},{player:'Former',type:'conta',inAlliance:false},{player:'Missing',type:'conta',inAlliance:true}];
 const rows=[['2026-01-01','A','Main',30],['2026-01-01','A','Farm',900],['2026-01-02','A','Main',60],['2026-01-02','A','Farm',900],['2026-01-02','A','Former',800],['2026-01-02','A','Unknown',700]];
 const data=core.analyze(rows,members,'2026-01-02',rulesCore.DEFAULT_RULES,true);
 assert.equal(data.summary.total,60);assert.equal(data.previous.total,30);assert.equal(data.summary.records,1);
 assert.equal(data.ranking[0].player,'Main');assert.equal(data.ranking[0].status,'met');assert.deepEqual(data.noRecord.map(m=>m.player),['Missing']);
 const empty=core.analyze(rows,members.filter(m=>m.player!=='Main'),'2026-01-02',[],true);assert.equal(empty.summary.records,0);assert.deepEqual(empty.ranking,[]);
});
