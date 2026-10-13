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
  const spreadsheet={getSheets:()=>[sheet],getSheetByName:name=>name==='MembrosAlianca'?{getName:()=>name,getDataRange:()=>({getDisplayValues:()=>members})}:null,getSpreadsheetTimeZone:()=> 'Europe/Lisbon'};
  const context={PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='DASHBOARD_TOKEN'?'x'.repeat(32):null})},SpreadsheetApp:{openById:()=>{reads++;return spreadsheet;}},ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}};
  vm.createContext(context);vm.runInContext(readFileSync(path.join(__dirname,'../scripts/google-sheets/Code.gs'),'utf8'),context);
  return {context,reads:()=>reads};
}
test('Apps Script returns scores, member power and troop using the Spreadsheet timezone method',()=>{
  const {context}=setup();const result=context.doPost({postData:{contents:JSON.stringify({token:'x'.repeat(32)})}});
  assert.equal(result.ok,true);assert.equal(result.spreadsheetTimezone,'Europe/Lisbon');
  assert.equal(result.members.sheet,'MembrosAlianca');assert.equal(result.members.values[1][2],'200M');assert.equal(result.members.values[1][3],'T6');
  assert.equal(result.values[1][3],'120.000.000');
});
test('Apps Script rejects invalid token before reading either sheet',()=>{
  const {context,reads}=setup();const result=context.doPost({postData:{contents:'{"token":"wrong"}'}});
  assert.equal(result.ok,false);assert.equal(result.error,'unauthorized');assert.equal(reads(),0);
});
