import {NextResponse} from 'next/server';
import {permitted} from '../../../../lib/member-access.cjs';
import core from '../../../../lib/leadership.cjs';
import {leadershipSource} from '../../../../lib/leadership-source';
import {pompeiiSheet} from '../../../../lib/pompeii-sheet';
import {performanceSource} from '../../../../lib/pompeii-performance.cjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const headers={'Cache-Control':'private, no-store'};
  if(!(await permitted(request,true)))return NextResponse.json({error:'Acesso exclusivo da liderança.'},{status:401,headers});
  const source=await performanceSource(leadershipSource,()=>pompeiiSheet('pompeii_history'));
  const rosterAvailable=source.source==='google-sheets'&&source.members.length>0;
  const scoped=new Map(core.editions(core.eligibleRows(source.rows,source.members)).map(e=>[e.id,e]));
  const events=core.editions(source.rows).map(e=>({...e,...(scoped.get(e.id)||{total:0,records:0}),partial:source.partialEditionIds.includes(e.id)||(e.id===e.date&&(source.conflicts||[]).some(c=>c.date===e.date))}));
  const selected=request.nextUrl.searchParams.get('date')||events[0]?.id;
  const analysis=core.analyze(source.rows,source.members,selected,source.rules,true);
  if(!analysis)return NextResponse.json({error:'Edição não encontrada.'},{status:404,headers});
  analysis.edition.partial=events.find(e=>e.id===selected)?.partial||false;
  if(!rosterAvailable){analysis.summary=null;analysis.edition={...analysis.edition,total:null,records:null};if(analysis.previous)analysis.previous={...analysis.previous,total:null,records:null};}
  return NextResponse.json({events:events.map(e=>rosterAvailable?e:{...e,total:null,records:null}),...analysis,rosterAvailable,rules:source.rules.filter(r=>r.event===analysis.edition.event),rulesStatus:source.rulesStatus,conflicts:(source.conflicts||[]).filter(c=>c.date===selected),source:source.source,fetchedAt:source.fetchedAt,warning:source.warning},{headers});
}
