import {NextResponse} from 'next/server';
import auth from '../../../../lib/member-auth.cjs';
import {sameOrigin,secureCookie} from '../../../../lib/request-origin.cjs';
export const runtime='nodejs';
const cookieName='bope_member';
const failures=new Map();
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request){return json({authenticated:auth.valid(request.cookies.get(cookieName)?.value),configured:auth.configured()});}
export async function POST(request){
  if(!sameOrigin(request))return json({error:'Origem inválida.'},403);
  if(!auth.configured())return json({error:'A área de membros ainda não foi configurada no servidor.'},503);
  if(Number(request.headers.get('content-length')||0)>4096)return json({error:'Requisição inválida.'},400);
  const key=request.headers.get('x-nf-client-connection-ip')||'local';
  const now=Date.now();const attempt=failures.get(key);
  if(attempt&&attempt.until>now&&attempt.count>=10)return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
  let data;try{data=await request.json();}catch{return json({error:'Requisição inválida.'},400);}
  if(!auth.passwordValid(data.password)){
    if(failures.size>2000)for(const[k,v]of failures)if(v.until<=now)failures.delete(k);
    failures.set(key,{count:attempt?.until>now?attempt.count+1:1,until:attempt?.until>now?attempt.until:now+15*60000});
    return json({error:'Senha incorreta.'},401);
  }
  failures.delete(key);const result=json({authenticated:true});
  result.cookies.set(cookieName,auth.issue(),{httpOnly:true,secure:secureCookie(request),sameSite:'strict',path:'/',maxAge:8*3600});return result;
}
export async function DELETE(request){if(!sameOrigin(request))return json({error:'Origem inválida.'},403);const result=json({authenticated:false});result.cookies.set(cookieName,'',{httpOnly:true,secure:secureCookie(request),sameSite:'strict',path:'/',maxAge:0});return result;}
