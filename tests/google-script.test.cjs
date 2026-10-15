const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

function setup(){
  let reads=0;
  const scores=[['Data','Evento','Player','Pontuação'],['13/10/2026','Arquipélago','Jogador de teste','120.000.000']];
  const members=[['ID','Player','Poder','Tropa','Tipo','Esta na aliança ?'],['1','Jogador de teste','200M','T6','conta','Sim']];
  const sheet={getSheetId:()=>707290562,getName:()=> 'Hist. Pontuações',getDataRange:()=>({getDisplayValues:()=>scores})};
  // Spreadsheet has getSpreadsheetTimeZone, but deliberately has no getParent.
  const spreadsheet={getSheets:()=>[sheet],getSheetByName:name=>name==='RegrasMetas'?{getDataRange:()=>({getDisplayValues:()=>[['Evento','Tropa','Poder acima de','Poder até','Tipo de meta','Meta','Ativo'],['Gênesis','T6','','','Pontos','25M','TRUE']]})}:name==='MembrosAlianca'?{getName:()=>name,getDataRange:()=>({getDisplayValues:()=>members})}:null,getSpreadsheetTimeZone:()=> 'Europe/Lisbon'};
  const context={PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='DASHBOARD_TOKEN'?'x'.repeat(32):null})},SpreadsheetApp:{openById:()=>{reads++;return spreadsheet;}},ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}};
  vm.createContext(context);vm.runInContext(readFileSync(path.join(__dirname,'../scripts/google-sheets/Code.gs'),'utf8'),context);
  return {context,reads:()=>reads};
}
test('Apps Script returns scores, member power and troop using the Spreadsheet timezone method',()=>{
  const {context}=setup();const result=context.doPost({postData:{contents:JSON.stringify({token:'x'.repeat(32)})}});
  assert.equal(result.rules.sheet,'RegrasMetas');assert.equal(result.rules.values[1][0],'Gênesis');
  assert.equal(result.ok,true);assert.equal(result.spreadsheetTimezone,'Europe/Lisbon');
  assert.equal(result.members.sheet,'MembrosAlianca');assert.equal(result.members.values[1][2],'200M');assert.equal(result.members.values[1][3],'T6');
  assert.equal(result.values[1][3],'120.000.000');
});
test('Apps Script rejects invalid token before reading either sheet',()=>{
  const {context,reads}=setup();const result=context.doPost({postData:{contents:'{"token":"wrong"}'}});
  assert.equal(result.ok,false);assert.equal(result.error,'unauthorized');assert.equal(reads(),0);
});

test('goal-rule setup seeds the three rules once and preserves an existing sheet',()=>{
  const {context}=setup();let created=false,insertions=0;const writes=[];
  const range={setValues:values=>{writes.push(values);return range;},setFontWeight:()=>range,insertCheckboxes:()=>range,setNumberFormat:()=>range};
  const sheet={getRange:()=>range,setFrozenRows:()=>{},setColumnWidths:()=>{}};
  context.SpreadsheetApp.openById=()=>({getSheetByName:()=>created?sheet:null,insertSheet:name=>{assert.equal(name,'RegrasMetas');created=true;insertions++;return sheet;}});
  context.setupRegrasMetas();context.setupRegrasMetas();
  assert.equal(insertions,1);assert.equal(writes.length,2);
  assert.equal(writes[0][0][0],'Evento');assert.equal(writes[1].length,3);assert.equal(writes[1][0][5],30);assert.equal(writes[1][1][3],180e6);assert.equal(writes[1][2][2],180e6);
});

test('Apps Script validates null, arrays and oversized requests before reading data',()=>{
  const {context,reads}=setup();
  for(const contents of ['null','[]','{',JSON.stringify({token:'x'.repeat(5000)})])assert.equal(context.doPost({postData:{contents}}).error,'invalid_request');
  assert.equal(context.doPost({}).error,'invalid_request');assert.equal(reads(),0);
});
