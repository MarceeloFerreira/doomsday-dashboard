import {getStore} from '@netlify/blobs';
import bundled from '../../../public/data/calendar.json';
import {STORE} from '../../../lib/calendar-data.cjs';
import {createCalendarReader} from '../../../lib/calendar-source.cjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const read=createCalendarReader({openStore:()=>getStore({name:STORE,consistency:'strong'}),fallback:bundled});
export async function GET(){
  const data=await read();
  return Response.json(data,{headers:{'Cache-Control':'no-store','X-Calendar-Source':data.delivery.source}});
}
