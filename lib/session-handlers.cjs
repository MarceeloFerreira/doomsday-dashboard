const {sameOrigin,secureCookie}=require('./request-origin.cjs');
const {isIP}=require('node:net');
const WINDOW=15*60000,MAX_KEYS=2000,MAX_BODY=4096;
async function credentials(request){
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return null;
  const declared=Number(request.headers.get('content-length')||0);
  if(!Number.isFinite(declared)||declared<0||declared>MAX_BODY||!request.body)return null;
  const reader=request.body.getReader(),parts=[];let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();return null;}parts.push(Buffer.from(value));}
    const data=JSON.parse(Buffer.concat(parts,size).toString('utf8'));
    return data&&typeof data==='object'&&!Array.isArray(data)&&typeof data.password==='string'&&data.password.length<=256?data:null;
  }catch{return null;}finally{reader.releaseLock();}
}
function createSessionHandlers({auth,cookieName,unconfigured,NextResponse}){
  const failures=new Map();
  const json=(body,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
  function options(request,maxAge){return {httpOnly:true,secure:secureCookie(request),sameSite:'strict',path:'/',maxAge};}
  async function GET(request){return json({authenticated:auth.valid(request.cookies.get(cookieName)?.value),configured:auth.configured()});}
  async function POST(request){
    if(!sameOrigin(request))return json({error:'Origem inválida.'},403);
    if(!auth.configured())return json({error:unconfigured},503);
    const now=Date.now();for(const [key,value]of failures)if(value.until<=now)failures.delete(key);
    // Netlify sets this connection-IP header. Never use arbitrary forwarded hosts/IP lists.
    const ip=request.headers.get('x-nf-client-connection-ip');const key=isIP(ip||'')?ip:'local';
    const attempt=failures.get(key);
    if((attempt&&attempt.count>=10)||(!attempt&&failures.size>=MAX_KEYS))return json({error:'Muitas tentativas. Aguarde 15 minutos.'},429);
    const data=await credentials(request);if(!data)return json({error:'Requisição inválida.'},400);
    if(!auth.passwordValid(data.password)){
      failures.set(key,{count:(attempt?.count||0)+1,until:attempt?.until||now+WINDOW});
      return json({error:'Senha incorreta.'},401);
    }
    failures.delete(key);const result=json({authenticated:true});result.cookies.set(cookieName,auth.issue(),options(request,8*3600));return result;
  }
  async function DELETE(request){if(!sameOrigin(request))return json({error:'Origem inválida.'},403);const result=json({authenticated:false});result.cookies.set(cookieName,'',options(request,0));return result;}
  return {GET,POST,DELETE};
}
module.exports={createSessionHandlers};
