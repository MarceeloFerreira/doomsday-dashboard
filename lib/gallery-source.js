import 'server-only';
import {requestSheet} from './sheet-request.cjs';
import {timedReader} from './ttl-cache.cjs';
import {burntFromSheet} from './member-analysis.cjs';
const read=timedReader(async()=>{
  const url=new URL(process.env.GOOGLE_SHEETS_SCRIPT_URL?.trim());
  if(url.protocol!=='https:'||url.hostname!=='script.google.com'||!url.pathname.endsWith('/exec')||!process.env.GOOGLE_SHEETS_SCRIPT_TOKEN)throw Error('Configuração indisponível');
  let response=await requestSheet(fetch,url,process.env.GOOGLE_SHEETS_SCRIPT_TOKEN.trim(),{action:'gallery'});
  if(!response.ok)throw Error('Leitura indisponível');
  let data=await response.json();
  // Older deployments do not yet have the minimal gallery action.
  if(data.error==='invalid_request'){response=await requestSheet(fetch,url,process.env.GOOGLE_SHEETS_SCRIPT_TOKEN.trim());if(!response.ok)throw Error('Leitura indisponível');data=await response.json();}
  if(!data.ok)throw Error('Leitura indisponível');
  const parsed=burntFromSheet(data.burnt?.values);
  return {gallery:parsed.items.map(item=>({...item,image:item.file?'/api/queimadinhos/photos/'+encodeURIComponent(item.file):item.image})),available:true,configured:Boolean(data.burnt),warning:parsed.warning,fetchedAt:data.fetchedAt||new Date().toISOString()};
},15000);
export async function gallerySource(){try{return await read();}catch{return {gallery:[],available:false,configured:false,warning:'Não foi possível atualizar a galeria. Tente novamente em instantes.',fetchedAt:null};}}
