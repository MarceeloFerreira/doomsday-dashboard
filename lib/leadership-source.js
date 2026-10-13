import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import core from './leadership.cjs';
import {unstable_cache} from 'next/cache';
function failure(message){const error=new Error(message);error.safeMessage=message;return error;}

const live=unstable_cache(async()=>{
  let url;try{url=new URL(process.env.GOOGLE_SHEETS_SCRIPT_URL.trim());}catch{throw failure('URL do Apps Script inválida.');}
  if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec'))throw failure('A URL do Apps Script deve terminar em /exec.');
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:process.env.GOOGLE_SHEETS_SCRIPT_TOKEN.trim()}),signal:AbortSignal.timeout(25000),cache:'no-store'});
  if(!response.ok)throw failure('O Google recusou a leitura (HTTP '+response.status+'). Verifique o acesso da implantação.');
  let data;try{data=await response.json();}catch{throw failure('O Google retornou uma página em vez dos dados. Verifique o acesso da implantação sem login Google.');}
  if(!data.ok){
    const messages={unauthorized:'A chave de acesso ao Apps Script foi recusada. Confira GOOGLE_SHEETS_SCRIPT_TOKEN no contexto de produção.',sheet_read_failed:'O Apps Script falhou ao ler a planilha. Verifique a versão corrigida do script.',sheet_not_found:'A aba Hist. Pontuações não foi encontrada pelo Apps Script.',use_post:'A implantação do Apps Script usa uma versão incompatível do script.'};
    throw failure(messages[data.error]||'O Apps Script não retornou dados válidos.');
  }
  if(data.sheetId!==707290562||!Array.isArray(data.values))throw failure('A resposta não contém o histórico de pontuações esperado.');
  let rows,parsed;
  try{rows=core.scoresFromSheet(data.values);parsed=core.membersFromSheet(data.members?.values);}catch(error){throw failure('Formato da planilha: '+error.message);}
  return {rows,members:parsed.members,source:'google-sheets',fetchedAt:data.fetchedAt,warning:parsed.warning};
},['r4-scores-v2'],{revalidate:300});

export async function leadershipSource(){
  if(process.env.GOOGLE_SHEETS_SCRIPT_URL&&process.env.GOOGLE_SHEETS_SCRIPT_TOKEN){
    try{return await live();}catch(error){
      const reason=error.safeMessage||(['TimeoutError','AbortError'].includes(error.name)?'O Google demorou demais para responder.':'Falha de conexão entre o servidor e o Google.');
      return snapshot('A leitura da planilha falhou. '+reason+' Exibindo o histórico salvo no projeto; as metas não estão atualizadas.');
    }
  }
  const missing=['GOOGLE_SHEETS_SCRIPT_URL','GOOGLE_SHEETS_SCRIPT_TOKEN'].filter(key=>!process.env[key]);
  return snapshot('Variáveis indisponíveis no servidor: '+missing.join(', ')+'. Verifique o escopo Functions e faça um novo deploy. Exibindo o histórico salvo no projeto.');
}
async function snapshot(warning){
  const original=JSON.parse(await readFile(path.join(process.cwd(),'data/scores-snapshot.json'),'utf8'));
  const grouped=new Map();for(const row of original){const key=row[0]+'|'+core.norm(row[2]);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);}
  const conflicts=[...grouped.values()].filter(v=>v.length>1).map(v=>({date:v[0][0],player:v[0][2],points:v.map(r=>r[3])}));
  const rows=[...grouped.values()].filter(v=>v.length===1).map(v=>v[0]);
  core.validateScores(rows);
  return {rows,members:[],source:'snapshot',fetchedAt:null,warning,conflicts};
}
