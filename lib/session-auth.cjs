const {createHmac,createHash,timingSafeEqual}=require('node:crypto');
const SESSION_MS=8*3600000;
// Shared implementation; role and password are part of the signature so a
// member cookie can never authorize R4, even when the signing key is shared.
function createSessionAuth({role,passwordKey,secretKeys}){
  const password=()=>process.env[passwordKey]||'';
  const secret=()=>secretKeys.map(key=>process.env[key]).find(Boolean)||'';
  const hash=value=>createHash('sha256').update(value).digest();
  const equal=(a,b)=>timingSafeEqual(hash(a),hash(b));
  const configured=()=>password().trim().length>=12&&password().length<=256&&secret().trim().length>=32;
  const signature=value=>createHmac('sha256',secret()).update(role+':'+hash(password()).toString('hex')+':'+value).digest('base64url');
  function passwordValid(value){return configured()&&typeof value==='string'&&value.length<=256&&equal(value,password());}
  function issue(now=Date.now()){
    if(!configured())throw Error('Acesso não configurado');
    const payload=Buffer.from(JSON.stringify({role,expires:now+SESSION_MS})).toString('base64url');
    return payload+'.'+signature(payload);
  }
  function valid(token,now=Date.now()){
    if(!configured()||typeof token!=='string'||token.length>1024)return false;
    try{
      const [payload,sig,...extra]=token.split('.');
      if(extra.length||!payload||!sig||!equal(sig,signature(payload)))return false;
      const data=JSON.parse(Buffer.from(payload,'base64url').toString());
      return data.role===role&&Number.isFinite(data.expires)&&data.expires>now&&data.expires<=now+SESSION_MS;
    }catch{return false;}
  }
  return {configured,passwordValid,issue,valid};
}
module.exports={createSessionAuth};
