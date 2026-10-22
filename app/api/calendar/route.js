import {permitted} from '../../../lib/member-access.cjs';
import {getStore} from '@netlify/blobs';
import bundled from '../../../public/data/calendar.json';
import {STORE} from '../../../lib/calendar-data.cjs';
import {createCalendarReader} from '../../../lib/calendar-source.cjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const read=createCalendarReader({openStore:()=>getStore({name:STORE,consistency:'strong'}),fallback:bundled});
export async function GET(request){
  if(!(await permitted(request)))return Response.json({error:'Entre na área de membros.'},{status:401,headers:{'Cache-Control':'private, no-store'}});
  const data=await read();
  return Response.json(data,{headers:{'Cache-Control':'private, no-store','X-Calendar-Source':data.delivery.source}});
}
