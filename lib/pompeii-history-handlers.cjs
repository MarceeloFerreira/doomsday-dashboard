const {sameOrigin}=require('./request-origin.cjs');
const accounts=require('./member-accounts.cjs');
const {body}=require('./account-handlers.cjs');
const {fail,finalizeInput,scoreInput}=require('./pompeii-history.cjs');
function createPompeiiHistoryHandlers({NextResponse,service,sheet}){
  const json=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
  async function run(request,mutate,fn){
    try{
      if(mutate&&!sameOrigin(request))throw fail('Origem inválida.',403);
      if(!accounts.accountMode()||!accounts.configured())throw fail('Entre com uma conta individual de administrador.',503);
      const token=request.cookies.get(accounts.COOKIE)?.value;
      await service.requireSession(token,true);
      return json(await fn(token));
    }catch(e){return json({error:e.safe?e.message:'Não foi possível acessar o histórico da Pompeia. Tente novamente.'},e.status||503);}
  }
  const GET=request=>run(request,false,()=>sheet('pompeii_history'));
  const POST=request=>run(request,true,async token=>{
    const input=await body(request,65536);
    if(input.action==='score')return sheet('pompeii_score',scoreInput(input));
    if(input.action!=='finalize')throw fail('Ação inválida.');
    const roster=await service.pompeiiRoster(token);
    if(!roster.rosterAvailable)throw fail('Atualize os membros antes de finalizar a edição.',503);
    return sheet('pompeii_finalize',{edition:finalizeInput(input,roster.players)});
  });
  return {GET,POST};
}
module.exports={createPompeiiHistoryHandlers};
