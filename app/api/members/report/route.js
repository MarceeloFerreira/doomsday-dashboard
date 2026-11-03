import {NextResponse} from 'next/server';
import {permitted} from '../../../../lib/member-access.cjs';
import {leadershipSource} from '../../../../lib/leadership-source';
import {pompeiiSheet} from '../../../../lib/pompeii-sheet';
import {mergePompeiiScores} from '../../../../lib/pompeii-performance.cjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request){
  const headers={'Cache-Control':'private, no-store'};
  if(!(await permitted(request)))return NextResponse.json({error:'Entre na área de membros.'},{status:401,headers});
  const [source,history]=await Promise.all([leadershipSource(),pompeiiSheet('pompeii_history').then(data=>({data})).catch(()=>({warning:'Não foi possível atualizar os pontos da Pompeia. Confira a implantação do Apps Script e tente atualizar novamente.'}))]);
  let scores=source.rows,partialEditionIds=[],pompeiiWarning=history.warning||null;
  if(history.data){try{const merged=mergePompeiiScores(source.rows,history.data.editions,source.members);scores=merged.rows;partialEditionIds=merged.partialEditionIds;}catch{pompeiiWarning='Os pontos da Pompeia precisam de revisão na planilha; os demais eventos continuam disponíveis.';}}
  const warning=[source.source==='snapshot'?'Não foi possível atualizar a planilha. Exibindo o histórico salvo; tente novamente em instantes.':null,pompeiiWarning].filter(Boolean).join(' ')||null;
  return NextResponse.json({scores,source:source.source,fetchedAt:source.fetchedAt,warning,pompeiiAvailable:!pompeiiWarning,partialEditionIds,partialDates:[...new Set((source.conflicts||[]).map(c=>c.date))]},{headers});
}
