import {NextResponse} from 'next/server';
import auth from '../../../../lib/r4-auth.cjs';
import core from '../../../../lib/leadership.cjs';
import {leadershipSource} from '../../../../lib/leadership-source';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const headers={'Cache-Control':'private, no-store'};
  if(!auth.valid(request.cookies.get('bope_r4')?.value))return NextResponse.json({error:'Acesso exclusivo da liderança.'},{status:401,headers});
  const source=await leadershipSource();
  const rosterAvailable=source.source==='google-sheets'&&source.members.length>0;
  const scoped=new Map(core.editions(core.eligibleRows(source.rows,source.members)).map(e=>[e.date,e]));
  const events=core.editions(source.rows).map(e=>({...e,...(scoped.get(e.date)||{total:0,records:0}),partial:(source.conflicts||[]).some(c=>c.date===e.date)}));
  const selected=request.nextUrl.searchParams.get('date')||events[0]?.date;
  const analysis=core.analyze(source.rows,source.members,selected,source.rules,true);
  if(!analysis)return NextResponse.json({error:'Edição não encontrada.'},{status:404,headers});
  if(!rosterAvailable){analysis.summary=null;analysis.edition={...analysis.edition,total:null,records:null};if(analysis.previous)analysis.previous={...analysis.previous,total:null,records:null};}
  return NextResponse.json({events:events.map(e=>rosterAvailable?e:{...e,total:null,records:null}),...analysis,rosterAvailable,rules:source.rules.filter(r=>r.event===analysis.edition.event),rulesStatus:source.rulesStatus,conflicts:(source.conflicts||[]).filter(c=>c.date===selected),source:source.source,fetchedAt:source.fetchedAt,warning:source.warning},{headers});
}
