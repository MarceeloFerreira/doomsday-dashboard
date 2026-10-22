import {NextResponse} from 'next/server';
import {permitted} from '../../../../lib/member-access.cjs';
import {leadershipSource} from '../../../../lib/leadership-source';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const headers={'Cache-Control':'private, no-store'};
  if(!(await permitted(request)))return NextResponse.json({error:'Entre na área de membros.'},{status:401,headers});
  const source=await leadershipSource();
  return NextResponse.json({scores:source.rows,source:source.source,fetchedAt:source.fetchedAt,warning:source.source==='snapshot'?'Não foi possível atualizar a planilha. Exibindo o histórico salvo; tente novamente em instantes.':null,partialDates:[...new Set((source.conflicts||[]).map(c=>c.date))]},{headers});
}
