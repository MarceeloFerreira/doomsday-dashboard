import {NextResponse} from 'next/server';
import {permitted} from './lib/member-access.cjs';
export async function proxy(request){
  if(await permitted(request))return NextResponse.next();
  if(request.nextUrl.pathname==='/data/calendar.json')return NextResponse.json({error:'Entre na área de membros.'},{status:401,headers:{'Cache-Control':'private, no-store'}});
  const url=new URL('/membros',request.url);url.searchParams.set('destino','calendario');
  return NextResponse.redirect(url);
}
export const config={matcher:['/calendario','/data/calendar.json']};
