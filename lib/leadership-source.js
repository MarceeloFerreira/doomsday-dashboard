import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import core from './leadership.cjs';
import {unstable_cache} from 'next/cache';

const live=unstable_cache(async()=>{
  const url=new URL(process.env.GOOGLE_SHEETS_SCRIPT_URL);
  if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec'))throw Error('URL do Apps Script inválida.');
  const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:process.env.GOOGLE_SHEETS_SCRIPT_TOKEN}),signal:AbortSignal.timeout(15000),cache:'no-store'});
  if(!response.ok)throw Error('Falha ao ler o Apps Script.');
  const data=await response.json();
  if(!data.ok||data.sheetId!==707290562||!Array.isArray(data.values))throw Error('Apps Script sem resposta válida para Hist. Pontuações.');
  const rows=core.scoresFromSheet(data.values),parsed=core.membersFromSheet(data.members?.values);
  return {rows,members:parsed.members,source:'google-sheets',fetchedAt:data.fetchedAt,warning:parsed.warning};
},['r4-scores-v1'],{revalidate:300});

export async function leadershipSource(){
  if(process.env.GOOGLE_SHEETS_SCRIPT_URL&&process.env.GOOGLE_SHEETS_SCRIPT_TOKEN){
    try{return await live();}catch{return snapshot('A leitura da planilha falhou. Exibindo o histórico salvo no projeto; as metas não estão atualizadas.');}
  }
  return snapshot('A conexão com o Apps Script ainda não está configurada. Exibindo o histórico salvo no projeto.');
}
async function snapshot(warning){
  const original=JSON.parse(await readFile(path.join(process.cwd(),'data/scores-snapshot.json'),'utf8'));
  const grouped=new Map();for(const row of original){const key=row[0]+'|'+core.norm(row[2]);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(row);}
  const conflicts=[...grouped.values()].filter(v=>v.length>1).map(v=>({date:v[0][0],player:v[0][2],points:v.map(r=>r[3])}));
  const rows=[...grouped.values()].filter(v=>v.length===1).map(v=>v[0]);
  core.validateScores(rows);
  return {rows,members:[],source:'snapshot',fetchedAt:null,warning,conflicts};
}
