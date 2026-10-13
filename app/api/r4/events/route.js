import {NextResponse} from 'next/server';
import auth from '../../../../lib/r4-auth.cjs';
import core from '../../../../lib/leadership.cjs';
import {leadershipSource} from '../../../../lib/leadership-source';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const headers={'Cache-Control':'private, no-store'};
  if(!auth.valid(request.cookies.get('bope_r4')?.value))return NextResponse.json({error:'Acesso exclusivo da liderança.'},{status:401,headers});
  const source=await leadershipSource();const events=core.editions(source.rows).map(e=>({...e,partial:(source.conflicts||[]).some(c=>c.date===e.date)}));
  const selected=request.nextUrl.searchParams.get('date')||events[0]?.date;
  const analysis=core.analyze(source.rows,source.members,selected);
  if(!analysis)return NextResponse.json({error:'Edição não encontrada.'},{status:404,headers});
  return NextResponse.json({events,...analysis,conflicts:(source.conflicts||[]).filter(c=>c.date===selected),source:source.source,fetchedAt:source.fetchedAt,warning:source.warning},{headers});
}
