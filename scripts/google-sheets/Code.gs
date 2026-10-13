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
    var sheet = spreadsheet.getSheets().filter(function(s){return s.getSheetId() === 707290562;})[0];
    if (!sheet || sheet.getName() !== 'Hist. Pontuações') {
      return json_({ok:false,error:'sheet_not_found'});
    }
    var values = sheet.getDataRange().getDisplayValues();
    var memberName = PropertiesService.getScriptProperties().getProperty('MEMBER_SHEET_NAME') || 'MembrosAlianca';
    var membersSheet = spreadsheet.getSheetByName(memberName);
    var members = membersSheet ? {sheet:membersSheet.getName(),values:membersSheet.getDataRange().getDisplayValues()} : null;
    return json_({ok:true,schemaVersion:1,sheet:sheet.getName(),sheetId:sheet.getSheetId(),
      fetchedAt:new Date().toISOString(),spreadsheetTimezone:spreadsheet.getParent().getSpreadsheetTimeZone(),values:values,members:members});
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
