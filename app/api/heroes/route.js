import {permitted} from '../../../lib/member-access.cjs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
  if(!(await permitted(request)))return Response.json({error:'Entre na área de membros.'},{status:401,headers});
  const data=JSON.parse(await readFile(path.join(process.cwd(),'data','heroes.json'),'utf8'));
  return Response.json(data,{headers});
}
