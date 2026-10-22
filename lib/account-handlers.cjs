const {sameOrigin,secureCookie}=require('./request-origin.cjs');
const accounts=require('./member-accounts.cjs');
async function body(request){
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))throw accounts.failure('Requisição inválida.');
  if(!request.body)throw accounts.failure('Requisição vazia.');
  const reader=request.body.getReader();const parts=[];let length=0;
  try{
    while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192){await reader.cancel();throw accounts.failure('Requisição muito grande.',413);}parts.push(Buffer.from(value));}
    let result;try{result=JSON.parse(Buffer.concat(parts).toString());}catch{throw accounts.failure('Dados inválidos.');}
    if(!result||typeof result!=='object'||Array.isArray(result))throw accounts.failure('Dados inválidos.');
    return result;
  }finally{reader.releaseLock();}
}
function createAccountHandlers({NextResponse,service=accounts.createAccounts()}={}){
  const json=(data,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
  const cookie=request=>request.cookies.get(accounts.COOKIE)?.value;
  const options=(request,maxAge)=>({httpOnly:true,secure:secureCookie(request),sameSite:'strict',path:'/',maxAge});
  async function run(request,mutate,fn){
    try{
      if(mutate&&!sameOrigin(request))throw accounts.failure('Origem inválida.',403);
      if(!accounts.accountMode()||!accounts.configured())throw accounts.failure('As contas individuais ainda precisam ser configuradas.',503);
      return await fn();
    }catch(error){return json({mode:'accounts',configured:accounts.configured(),error:error.safe?error.message:'Não foi possível concluir a operação. Tente novamente.'},error.status||503);}
  }
  function state(p){return {mode:'accounts',configured:true,signedIn:Boolean(p),authenticated:accounts.canAccess(p),profile:accounts.publicProfile(p)};}
  const GET=request=>run(request,false,async()=>json(state((await service.session(cookie(request)))?.profile)));
  const POST=request=>run(request,true,async()=>{
    const result=await service.login(await body(request));const response=json(state(result.profile));
    response.cookies.set(accounts.COOKIE,result.token,options(request,accounts.MAX_AGE));
    // The shared member/leadership passwords no longer authorize account-mode requests.
    for(const name of ['bope_member','bope_r4'])response.cookies.set(name,'',options(request,0));
    return response;
  });
  const DELETE=request=>run(request,true,async()=>{await service.logout(cookie(request));const response=json(state(null));response.cookies.set(accounts.COOKIE,'',options(request,0));return response;});
  const REGISTER=request=>run(request,true,async()=>json(await service.register(await body(request)),201));
  const LIST=request=>run(request,false,async()=>json(await service.list(cookie(request))));
  const PENDING=request=>run(request,false,async()=>json(await service.pendingCount(cookie(request))));
  const MANAGE=request=>run(request,true,async()=>json(await service.command(cookie(request),await body(request))));
  return {GET,POST,DELETE,REGISTER,LIST,MANAGE,PENDING};
}
module.exports={createAccountHandlers,body};
