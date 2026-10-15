/**
 * BoPE: leitura da aba Hist. Pontuações para o servidor Next.js.
 * Não modifica a planilha.
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
  try { input = JSON.parse(e.postData.contents); }
  catch (error) { return json_({ok:false,error:'invalid_request'}); }
  var token = PropertiesService.getScriptProperties().getProperty('DASHBOARD_TOKEN');
  var supplied = typeof input.token === 'string' ? input.token : '';
  if (!token || token.length < 32 || !supplied || !constantTimeEqual_(token, supplied)) {
    return json_({ok:false,error:'unauthorized'});
  }
  try {
    var spreadsheet = SpreadsheetApp.openById('1V2w4mNnAFZNncsheQI0HvXYSpwlWXm0YF5wJVwygIk8');
    if (input.action === 'photo') return photo_(spreadsheet, input.file);
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
  var listed=photo>=0&&values.slice(1).some(function(row){var state=active>=0?String(row[active]).trim().toLowerCase():'';return ['false','falso','não','nao','0'].indexOf(state)<0&&driveId_(row[photo])===fileId;});
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
