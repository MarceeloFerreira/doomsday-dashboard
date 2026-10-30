import {permitted} from '../../../lib/member-access.cjs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
  if(!(await permitted(request)))return Response.json({error:'Entre na área de membros.'},{status:401,headers});
  const data=JSON.parse(await readFile(path.join(process.cwd(),'data','beasts.json'),'utf8'));
  const chips=JSON.parse(await readFile(path.join(process.cwd(),'data','beast-chips.json'),'utf8'));
  if(chips.schemaVersion!==1||chips.manifest!==data.manifest)return Response.json({error:'O catálogo de chips precisa acompanhar a revisão das bestas.'},{status:503,headers});
  return Response.json({...data,chips},{headers});
}
