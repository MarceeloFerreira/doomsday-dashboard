import {NextResponse} from 'next/server';
import {permitted} from '../../../../lib/member-access.cjs';
import {leadershipSource} from '../../../../lib/leadership-source';
import {pompeiiSheet} from '../../../../lib/pompeii-sheet';
import {performanceSource} from '../../../../lib/pompeii-performance.cjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const headers={'Cache-Control':'private, no-store'};
  if(!(await permitted(request)))return NextResponse.json({error:'Entre na área de membros.'},{status:401,headers});
  const source=await performanceSource(leadershipSource,()=>pompeiiSheet('pompeii_history'));
  return NextResponse.json({scores:source.rows,source:source.source,fetchedAt:source.fetchedAt,warning:source.warning,pompeiiAvailable:source.pompeiiAvailable,partialEditionIds:source.partialEditionIds,partialDates:[...new Set((source.conflicts||[]).map(c=>c.date))]},{headers});
}
