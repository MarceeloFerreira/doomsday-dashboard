/**
 * BoPE: leitura da aba Hist. Pontuações para o servidor Next.js.
 * Pompeia: escalações finalizadas e pontuações na aba dedicada Pompeia.
 * Defina DASHBOARD_TOKEN nas Propriedades do script (Configurações do projeto).
 * Implantação: aplicativo da Web, executar como proprietário.
 * O acesso ao aplicativo deve permitir a chamada do servidor sem login Google.
 * A chave é verificada antes de ler os dados. Nunca a coloque no frontend.
 */
function doGet() {
  return json_({ok:false,error:'use_post'});
}

function doPost(e) {
  var input;
  try { if(!e||!e.postData||typeof e.postData.contents!=='string'||e.postData.contents.length>65536)throw Error('invalid_request'); input = JSON.parse(e.postData.contents); if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid_request'); }
  catch (error) { return json_({ok:false,error:'invalid_request'}); }
  var token = PropertiesService.getScriptProperties().getProperty('DASHBOARD_TOKEN');
  var supplied = typeof input.token === 'string' && input.token.length <= 512 ? input.token : '';
  if (!token || token.length < 32 || !supplied || !constantTimeEqual_(token, supplied)) {
    return json_({ok:false,error:'unauthorized'});
  }
  try {
    var spreadsheet = SpreadsheetApp.openById('1V2w4mNnAFZNncsheQI0HvXYSpwlWXm0YF5wJVwygIk8');
    if (['pompeii_history','pompeii_finalize','pompeii_score'].indexOf(input.action)>=0) return pompeii_(spreadsheet,input);
    if (input.action === 'photo') return photo_(spreadsheet, input.file);
    if (input.action === 'gallery') {
      var gallerySheet=spreadsheet.getSheetByName('Queimadinhos');
      return json_({ok:true,fetchedAt:new Date().toISOString(),burnt:gallerySheet?{sheet:'Queimadinhos',values:galleryValues_(gallerySheet)}:null});
    }
    if (input.action && input.action !== 'report') return json_({ok:false,error:'invalid_request'});
    var sheet = spreadsheet.getSheets().filter(function(s){return s.getSheetId() === 707290562;})[0];
    if (!sheet || sheet.getName() !== 'Hist. Pontuações') {
      return json_({ok:false,error:'sheet_not_found'});
    }
    var values = sheet.getDataRange().getDisplayValues();
    var memberName = PropertiesService.getScriptProperties().getProperty('MEMBER_SHEET_NAME') || 'MembrosAlianca';
    var membersSheet = spreadsheet.getSheetByName(memberName);
    var members = membersSheet ? {sheet:membersSheet.getName(),values:membersSheet.getDataRange().getDisplayValues()} : null;
    var rulesSheet = spreadsheet.getSheetByName('RegrasMetas');
    var rules = rulesSheet ? {sheet:'RegrasMetas',values:rulesSheet.getDataRange().getDisplayValues()} : null;
    var burntSheet = spreadsheet.getSheetByName('Queimadinhos');
    var burnt = burntSheet ? {sheet:'Queimadinhos',values:galleryValues_(burntSheet)} : null;
    return json_({ok:true,schemaVersion:1,sheet:sheet.getName(),sheetId:sheet.getSheetId(),
      fetchedAt:new Date().toISOString(),spreadsheetTimezone:spreadsheet.getSpreadsheetTimeZone(),values:values,members:members,rules:rules,burnt:burnt});
  } catch (error) {
    // Não retornar informações da conta, IDs internos ou detalhes de permissões.
    return json_({ok:false,error:'sheet_read_failed'});
  }
}

function constantTimeEqual_(a,b) {
  var mismatch = a.length ^ b.length;
  for (var i=0;i<a.length;i++) mismatch |= a.charCodeAt(i) ^ (b.charCodeAt(i)||0);
  return mismatch === 0;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

// The website gallery is public. Only active files listed in Queimadinhos are served.
function driveId_(value) {
  var text=String(value||'').trim();
  if(!/^https:\/\/(drive|docs)\.google\.com\//.test(text))return null;
  var match=text.match(/\/d\/([\w-]+)/)||text.match(/[?&]id=([\w-]+)/);
  return match&&/^[\w-]{10,200}$/.test(match[1])?match[1]:null;
}
function photo_(spreadsheet,fileId) {
  if(typeof fileId!=='string'||!/^[\w-]{10,200}$/.test(fileId))return json_({ok:false,error:'invalid_photo'});
  var sheet=spreadsheet.getSheetByName('Queimadinhos');
  if(!sheet)return json_({ok:false,error:'photo_not_found'});
  var values=galleryValues_(sheet);
  var headers=values[0].map(function(v){return String(v).trim().toLowerCase();});
  var photo=headers.indexOf('foto'),active=headers.indexOf('ativo');
  var listed=photo>=0&&active>=0&&values.slice(1).some(function(row){var state=String(row[active]).trim().toLowerCase();return ['true','verdadeiro','sim','1'].indexOf(state)>=0&&driveId_(row[photo])===fileId;});
  if(!listed)return json_({ok:false,error:'photo_not_found'});
  try{
    var file=DriveApp.getFileById(fileId),blob=file.getBlob();
    var mime=blob.getContentType(),bytes=blob.getBytes();
    if(['image/jpeg','image/png','image/webp','image/gif'].indexOf(mime)<0||bytes.length>4*1024*1024)return json_({ok:false,error:'photo_format'});
    return json_({ok:true,mime:mime,base64:Utilities.base64Encode(bytes)});
  }catch(error){return json_({ok:false,error:'photo_read_failed'});}
}
function setupQueimadinhos() {
  var spreadsheet=SpreadsheetApp.openById('1V2w4mNnAFZNncsheQI0HvXYSpwlWXm0YF5wJVwygIk8');
  if(spreadsheet.getSheetByName('Queimadinhos'))return;
  var sheet=spreadsheet.insertSheet('Queimadinhos');
  sheet.getRange(1,1,1,5).setValues([['Data','Player','Foto','Legenda','Ativo']]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange('A2:A1000').setNumberFormat('dd/MM/yyyy');
  sheet.getRange('E2:E1000').insertCheckboxes();
  sheet.setColumnWidths(1,5,180);
  sheet.setColumnWidth(3,360);sheet.setColumnWidth(4,360);
  // The Drive file stays private; the website serves active gallery photos publicly.
  DriveApp.getRootFolder().getName();
}

// Read the actual hyperlink, even when the cell displays a filename or caption.
function galleryValues_(sheet) {
  var range=sheet.getDataRange(),values=range.getDisplayValues();
  if(!values.length)return values;
  var photo=values[0].map(function(v){return String(v).trim().toLowerCase();}).indexOf('foto');
  if(photo<0||typeof range.getRichTextValues!=='function')return values;
  var rich=range.getRichTextValues();
  for(var i=1;i<values.length;i++){
    var cell=rich[i]&&rich[i][photo];
    if(!cell)continue;
    var link=cell.getLinkUrl();
    if(!link){var links=cell.getRuns().map(function(run){return run.getLinkUrl();}).filter(Boolean);var unique=links.filter(function(url,index){return links.indexOf(url)===index;});if(unique.length===1)link=unique[0];}
    if(link)values[i][photo]=link;
  }
  return values;
}

// Run once to create editable goal rules. Existing rules are never overwritten.
function setupRegrasMetas() {
  var spreadsheet=SpreadsheetApp.openById('1V2w4mNnAFZNncsheQI0HvXYSpwlWXm0YF5wJVwygIk8');
  if(spreadsheet.getSheetByName('RegrasMetas'))return;
  var sheet=spreadsheet.insertSheet('RegrasMetas');
  sheet.getRange(1,1,1,7).setValues([['Evento','Tropa','Poder acima de','Poder até','Tipo de meta','Meta','Ativo']]).setFontWeight('bold');
  sheet.getRange('G2:G1000').insertCheckboxes();
  sheet.getRange(2,1,3,7).setValues([
    ['Arquipélago','T5','','','Percentual',30,true],
    ['Arquipélago','T6','',180000000,'Pontos',80000000,true],
    ['Arquipélago','T6',180000000,'','Pontos',120000000,true]
  ]);
  sheet.setFrozenRows(1);sheet.setColumnWidths(1,7,175);
  sheet.getRange('C2:D1000').setNumberFormat('#,##0');
  sheet.getRange('F2:F1000').setNumberFormat('0.##');
}

var POMPEII_HEADERS_=['ID Edição','Data','Edição','Lado','ID Player','Player','Função','Poder','Tropa','Pontos'];
var POMPEII_EDITION_HEADERS_=['ID Edição','Data','Edição','Aviso','Finalizado em','Resultado','Participantes','Oponentes','Aliança adversária'];
function pompeiiText_(value){var text=String(value);return /^[=+\-@]/.test(text)?"'"+text:text;}
function pompeiiRows_(sheet,headers){
  if(!sheet)return [];
  headers=headers||POMPEII_HEADERS_;
  var rows=sheet.getDataRange().getValues();
  if(rows.length>20001)throw Error('pompeii_invalid');
  if(!rows.length||headers.some(function(h,i){return rows[0][i]!==h;}))throw Error('pompeii_header');
  return rows.slice(1).map(function(row,i){return {row:i+2,values:row};}).filter(function(item){return String(item.values[0]).trim();});
}
function pompeiiDate_(value,timezone){return value instanceof Date?Utilities.formatDate(value,timezone,'yyyy-MM-dd'):String(value);}
function pompeiiPoints_(value){
  if(value===''||value===null)return null;
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw Error('pompeii_invalid');
  return value;
}
function pompeiiCount_(value,max){
  if(value===undefined||value===null||value==='')return null;
  if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>max)throw Error('pompeii_invalid');
  return value;
}
function pompeiiResult_(value){
  var text=String(value||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(!text)return '';if(text==='vitoria')return 'Vitória';if(text==='derrota')return 'Derrota';throw Error('pompeii_invalid');
}
function pompeiiMetadata_(sheet,timezone){
  if(sheet){var header=sheet.getDataRange().getValues()[0];for(var c=5;c<9;c++)if(header[c]&&header[c]!==POMPEII_EDITION_HEADERS_[c])throw Error('pompeii_header');}
  var seen={};return pompeiiRows_(sheet,POMPEII_EDITION_HEADERS_.slice(0,5)).map(function(item){
    var r=item.values,id=String(r[0]);if(seen[id])throw Error('pompeii_invalid');seen[id]=true;
    return {id:id,date:pompeiiDate_(r[1],timezone),name:String(r[2]),announcement:String(r[3]||''),finalizedAt:String(r[4]||''),result:pompeiiResult_(r[5]),participants:pompeiiCount_(r[6],100),opponents:pompeiiCount_(r[7],999),opponentAlliance:String(r[8]||'').trim()};
  });
}
function pompeiiEditionColumns_(sheet){
  // Validate existing data before extending the original five-column schema.
  pompeiiMetadata_(sheet,'UTC');
  sheet.getRange(1,1,1,9).setValues([POMPEII_EDITION_HEADERS_]).setFontWeight('bold').setBackground('#233328').setFontColor('#ffffff');
  sheet.setColumnWidths(6,4,150);
}
function pompeiiEditionInputs_(sheet,start,count){
  var validation=SpreadsheetApp.newDataValidation().requireValueInList(['Vitória','Derrota'],true).setAllowInvalid(false).build();
  sheet.getRange(start,6,count,1).setDataValidation(validation).setBackground('#fff2cc').setFontColor('#1558b0');
  sheet.getRange(start,6,count,4).setBackground('#fff2cc').setFontColor('#1558b0');
  sheet.getRange(start,7,count,2).setNumberFormat('#,##0');
}
function setupPompeiaEdicoes(){
  var spreadsheet=SpreadsheetApp.openById('1V2w4mNnAFZNncsheQI0HvXYSpwlWXm0YF5wJVwygIk8');
  var lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    var sheet=spreadsheet.getSheetByName('Pompeia Edições');
    if(!sheet)sheet=pompeiiNewSheet_(spreadsheet,'Pompeia Edições',POMPEII_EDITION_HEADERS_);
    pompeiiEditionColumns_(sheet);
    var entries=pompeiiRows_(sheet,POMPEII_EDITION_HEADERS_),players=pompeiiRows_(spreadsheet.getSheetByName('Pompeia'));
    entries.forEach(function(item){
      if(item.values[6]===undefined||item.values[6]===''){
        var count=players.filter(function(p){return p.values[0]===item.values[0];}).length;
        if(count)sheet.getRange(item.row,7).setValue(count);
      }
    });
    if(entries.length)pompeiiEditionInputs_(sheet,2,sheet.getLastRow()-1);
  }finally{lock.releaseLock();}
}
function pompeiiEditions_(rows,timezone,metadata,includeIncomplete){
  var editions={},order=[],meta={};(metadata||[]).forEach(function(m){meta[m.id]=m;});
  rows.forEach(function(item){
    var r=item.values,id=String(r[0]);
    if(!editions[id]){editions[id]={id:id,date:pompeiiDate_(r[1],timezone),name:String(r[2]),announcement:'',finalizedAt:String(r[11]||''),players:[],legacy:false};order.push(id);}
    var edition=editions[id];
    if(edition.players.some(function(p){return p.id===String(r[4]);})||['verde','roxa'].indexOf(r[3])<0)throw Error('pompeii_invalid');
    edition.players.push({id:String(r[4]),nick:String(r[5]),side:String(r[3]),assignment:String(r[6]),power:r[7]===''?null:r[7],troops:String(r[8]),points:pompeiiPoints_(r[9])});
    // Compatibility with the previous twelve-column player sheet.
    if(r[10])edition.announcement=String(r[10]);if(r[10]||r[11])edition.legacy=true;
  });
  return order.filter(function(id){return includeIncomplete||meta[id]||editions[id].legacy;}).map(function(id){
    var edition=editions[id],m=meta[id];
    if(m){if(edition.date!==m.date||edition.name!==m.name)throw Error('pompeii_invalid');edition.announcement=m.announcement;edition.finalizedAt=m.finalizedAt;edition.result=m.result;edition.participants=m.participants;edition.opponents=m.opponents;edition.opponentAlliance=m.opponentAlliance;}
    if(edition.participants===undefined||edition.participants===null)edition.participants=edition.players.length;
    return edition;
  }).sort(function(a,b){return b.date.localeCompare(a.date)||b.finalizedAt.localeCompare(a.finalizedAt);});
}
function pompeiiValidateEdition_(e){
  if(!e||typeof e.id!=='string'||!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(e.id)||typeof e.name!=='string'||!e.name.trim()||e.name.length>80||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||!Number.isFinite(Date.parse(e.date))||new Date(e.date).toISOString().slice(0,10)!==e.date)throw Error('pompeii_invalid');
  if(typeof e.announcement!=='string'||!e.announcement.trim()||e.announcement.length>1500||!Array.isArray(e.players)||e.players.length<6||e.players.length>100)throw Error('pompeii_invalid');
  if(e.opponents!==undefined&&e.opponents!==null&&(!Number.isInteger(e.opponents)||e.opponents<1||e.opponents>999))throw Error('pompeii_invalid');
  if(e.opponentAlliance!==undefined&&(typeof e.opponentAlliance!=='string'||e.opponentAlliance.length>80))throw Error('pompeii_invalid');
  var seen={};
  e.players.forEach(function(p){
    if(!p||typeof p.id!=='string'||!p.id||p.id.length>200||seen[p.id]||typeof p.nick!=='string'||!p.nick.trim()||p.nick.length>80||['verde','roxa'].indexOf(p.side)<0||['rally','heliponto','base','campo','zumbis'].indexOf(p.assignment)<0||(p.power!==null&&(typeof p.power!=='number'||!Number.isFinite(p.power)||p.power<0))||typeof p.troops!=='string'||p.troops.length>20)throw Error('pompeii_invalid');seen[p.id]=true;
  });
  ['verde','roxa'].forEach(function(side){['rally','heliponto','base'].forEach(function(role){if(e.players.filter(function(p){return p.side===side&&p.assignment===role;}).length!==1)throw Error('pompeii_invalid');});});
  if(Math.abs(e.players.filter(function(p){return p.side==='verde';}).length-e.players.filter(function(p){return p.side==='roxa';}).length)>1)throw Error('pompeii_invalid');
}
function pompeiiNewSheet_(spreadsheet,name,headers){
  var sheet=spreadsheet.insertSheet(name);
  sheet.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#233328').setFontColor('#ffffff');
  sheet.setFrozenRows(1);sheet.setColumnWidths(1,headers.length,150);sheet.setColumnWidth(3,220);
  if(name==='Pompeia'){sheet.setColumnWidth(6,200);}else{sheet.setColumnWidth(4,420);}
  return sheet;
}
function pompeiiSpace_(sheet,start,count){
  var needed=start+count-1;if(needed>20001)throw Error('pompeii_invalid');
  if(needed>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),needed-sheet.getMaxRows());
}
function pompeii_(spreadsheet,input){
  var lock;
  try{
    var sheet=spreadsheet.getSheetByName('Pompeia'),timezone=spreadsheet.getSpreadsheetTimeZone();
    var editionSheet=spreadsheet.getSheetByName('Pompeia Edições');
    if(input.action==='pompeii_history')return json_({ok:true,editions:pompeiiEditions_(pompeiiRows_(sheet),timezone,pompeiiMetadata_(editionSheet,timezone)),fetchedAt:new Date().toISOString()});
    lock=LockService.getScriptLock();if(!lock.tryLock(5000))throw Error('pompeii_sheet_failed');
    sheet=spreadsheet.getSheetByName('Pompeia');editionSheet=spreadsheet.getSheetByName('Pompeia Edições');
    if(input.action==='pompeii_finalize'){
      var e=input.edition;pompeiiValidateEdition_(e);
      var metadata=pompeiiMetadata_(editionSheet,timezone),rows=pompeiiRows_(sheet),editions=pompeiiEditions_(rows,timezone,metadata,true);
      var existing=editions.filter(function(item){return item.id===e.id;})[0],savedMeta=metadata.filter(function(m){return m.id===e.id;})[0];
      var snapshot=function(edition){return JSON.stringify({date:edition.date,name:edition.name,announcement:edition.announcement,players:edition.players.map(function(p){return {id:p.id,nick:p.nick,side:p.side,assignment:p.assignment,power:p.power,troops:p.troops};}).sort(function(a,b){return a.id.localeCompare(b.id);})});};
      if(existing){
        // A failed metadata write may leave a complete roster. Retry only the metadata,
        // retaining any points entered since the first request.
        var comparison=Object.assign({},existing);if(!savedMeta&&!existing.legacy)comparison.announcement=e.announcement;
        if(snapshot(comparison)!==snapshot(e))throw Error('pompeii_conflict');
        if(savedMeta||existing.legacy)return json_({ok:true,editionId:e.id,message:'Esta escalação já está salva na planilha.'});
      }
      if(savedMeta&&(savedMeta.date!==e.date||savedMeta.name!==e.name||savedMeta.announcement!==e.announcement))throw Error('pompeii_conflict');
      if(editions.concat(metadata).some(function(item){return item.id!==e.id&&item.date===e.date&&item.name.trim().toLowerCase()===e.name.trim().toLowerCase();}))throw Error('pompeii_duplicate');
      if(!sheet)sheet=pompeiiNewSheet_(spreadsheet,'Pompeia',POMPEII_HEADERS_);
      if(!editionSheet)editionSheet=pompeiiNewSheet_(spreadsheet,'Pompeia Edições',POMPEII_EDITION_HEADERS_);
      pompeiiEditionColumns_(editionSheet);
      var now=new Date().toISOString(),date=Utilities.parseDate(e.date,timezone,'yyyy-MM-dd');
      if(!existing){
        var values=e.players.map(function(p){return [e.id,date,pompeiiText_(e.name),p.side,pompeiiText_(p.id),pompeiiText_(p.nick),p.assignment,p.power===null?'':p.power,pompeiiText_(p.troops),''];});
        var start=Math.max(2,sheet.getLastRow()+1);pompeiiSpace_(sheet,start,values.length);
        sheet.getRange(start,10,values.length,1).setBackground('#fff2cc').setFontColor('#1558b0').setNumberFormat('#,##0');
        sheet.getRange(start,2,values.length,1).setNumberFormat('dd/MM/yyyy');sheet.getRange(start,8,values.length,1).setNumberFormat('#,##0');
        sheet.getRange(start,1,values.length,10).setValues(values);
      }
      if(!savedMeta){
        var metaStart=Math.max(2,editionSheet.getLastRow()+1);pompeiiSpace_(editionSheet,metaStart,1);
        editionSheet.getRange(metaStart,2,1,1).setNumberFormat('dd/MM/yyyy');
        editionSheet.getRange(metaStart,4,1,1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
        editionSheet.getRange(metaStart,1,1,9).setValues([[e.id,date,pompeiiText_(e.name),pompeiiText_(e.announcement),now,'',e.players.length,e.opponents==null?'':e.opponents,pompeiiText_(e.opponentAlliance||'')]]);
        pompeiiEditionInputs_(editionSheet,metaStart,1);
        editionSheet.setRowHeight(metaStart,32);
      }
      return json_({ok:true,editionId:e.id,message:'Escalação salva em Pompeia e aviso em Pompeia Edições.'});
    }
    if(input.action!=='pompeii_score')throw Error('pompeii_invalid');
    if(typeof input.editionId!=='string'||typeof input.playerId!=='string'||input.playerId.length>200)throw Error('pompeii_invalid');
    var points=pompeiiPoints_(input.points),expected=pompeiiPoints_(input.expected);
    var found=pompeiiRows_(sheet).filter(function(item){return item.values[0]===input.editionId&&item.values[4]===input.playerId;});
    if(found.length!==1)throw Error('pompeii_not_found');
    var current=pompeiiPoints_(found[0].values[9]);
    if(current===points)return json_({ok:true,message:'Pontuação já salva.'});
    if(current!==expected)throw Error('pompeii_score_conflict');
    sheet.getRange(found[0].row,10).setValue(points===null?'':points);
    return json_({ok:true,message:'Pontuação salva na planilha.'});
  }catch(error){
    var allowed=['pompeii_duplicate','pompeii_conflict','pompeii_score_conflict','pompeii_not_found','pompeii_header','pompeii_invalid'];
    return json_({ok:false,error:allowed.indexOf(error.message)>=0?error.message:'pompeii_sheet_failed'});
  }finally{if(lock)lock.releaseLock();}
}
