import {NextResponse} from 'next/server';
import auth from '../../../../lib/member-auth.cjs';
import gallery from '../../../../lib/member-analysis.cjs';
import {leadershipSource} from '../../../../lib/leadership-source';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const headers={'Cache-Control':'private, no-store'};
  if(!auth.valid(request.cookies.get('bope_member')?.value))return NextResponse.json({error:'Entre na área de membros.'},{status:401,headers});
  const source=await leadershipSource();
  const burnt=gallery.burntFromSheet(source.burnt?.values);
  return NextResponse.json({scores:source.rows,source:source.source,fetchedAt:source.fetchedAt,warning:source.source==='snapshot'?'Não foi possível atualizar a planilha. Exibindo o histórico salvo; tente novamente em instantes.':null,partialDates:[...new Set((source.conflicts||[]).map(c=>c.date))],gallery:burnt.items,galleryWarning:burnt.warning,galleryConfigured:Boolean(source.burnt),galleryAvailable:source.source==='google-sheets'},{headers});
}
