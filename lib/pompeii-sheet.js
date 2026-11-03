import 'server-only';
import {requestSheet} from './sheet-request.cjs';
import {fail} from './pompeii-history.cjs';
export async function pompeiiSheet(action,payload={}){
  let url;try{url=new URL(process.env.GOOGLE_SHEETS_SCRIPT_URL?.trim());}catch{throw fail('Configure a integração com a planilha para usar o histórico da Pompeia.',503);}
  if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec')||!process.env.GOOGLE_SHEETS_SCRIPT_TOKEN)throw fail('Confira a configuração da integração com a planilha.',503);
  const response=await requestSheet(fetch,url,process.env.GOOGLE_SHEETS_SCRIPT_TOKEN.trim(),{action,...payload});
  if(!response.ok)throw fail('Não foi possível acessar o histórico da planilha agora.',503);
  let data;try{data=await response.json();}catch{throw fail('A planilha não retornou dados válidos.',503);}
  if(!data.ok){
    const errors={pompeii_duplicate:['Já existe uma edição com esta data e nome. Consulte o histórico ou use outro nome para uma nova edição.',409],invalid_request:['Atualize a implantação do Apps Script para habilitar o histórico da Pompeia.',503],pompeii_conflict:['Esta edição já foi salva com outra escalação. Atualize o histórico.',409],pompeii_score_conflict:['A pontuação mudou na planilha ou por outro administrador. Atualize o histórico antes de salvar.',409],pompeii_not_found:['Edição ou jogador não encontrado na planilha. Atualize o histórico.',404],pompeii_header:['Confira os cabeçalhos das abas Pompeia e Pompeia Edições. As colunas de identificação não devem ser alteradas.',409],pompeii_invalid:['Os dados da Pompeia são inválidos. Confira a edição e os jogadores.',400],pompeii_sheet_failed:['Não foi possível gravar ou ler as abas da Pompeia. Confira a implantação e as permissões do Apps Script.',503]};
    throw fail(...(errors[data.error]||['Não foi possível acessar o histórico da Pompeia na planilha.',503]));
  }
  return data;
}
