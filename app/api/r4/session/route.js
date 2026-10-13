import {NextResponse} from 'next/server';
import auth from '../../../../lib/r4-auth.cjs';
export const runtime='nodejs';
const cookieName='bope_r4';
const failures=new Map();
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
function sameOrigin(request){return request.headers.get('origin')===new URL(request.url).origin;}
export async function GET(request){return json({authenticated:auth.valid(request.cookies.get(cookieName)?.value),configured:auth.configured()});}
export async function POST(request){
  if(!sameOrigin(request))return json({error:'Origem inválida.'},403);
  if(!auth.configured())return json({error:'A liderança ainda não foi configurada no servidor.'},503);
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
  result.cookies.set(cookieName,auth.issue(),{httpOnly:true,secure:new URL(request.url).protocol==='https:',sameSite:'strict',path:'/',maxAge:8*3600});return result;
}
export async function DELETE(request){if(!sameOrigin(request))return json({error:'Origem inválida.'},403);const result=json({authenticated:false});result.cookies.set(cookieName,'',{httpOnly:true,sameSite:'strict',path:'/',maxAge:0});return result;}
