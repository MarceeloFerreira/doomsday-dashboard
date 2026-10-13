const {createHmac,timingSafeEqual}=require('node:crypto');
function configured(){return typeof process.env.R4_PASSWORD==='string'&&process.env.R4_PASSWORD.length>=12&&typeof process.env.R4_SESSION_SECRET==='string'&&process.env.R4_SESSION_SECRET.length>=32;}
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function passwordValid(password){return configured()&&typeof password==='string'&&equal(password,process.env.R4_PASSWORD);}
function signature(value){return createHmac('sha256',process.env.R4_SESSION_SECRET).update('r4:'+process.env.R4_PASSWORD+':'+value).digest('base64url');}
function issue(now=Date.now()){if(!configured())throw Error('R4 não configurado');const payload=Buffer.from(JSON.stringify({role:'r4',expires:now+8*3600000})).toString('base64url');return payload+'.'+signature(payload);}
function valid(token,now=Date.now()){
  if(!configured()||typeof token!=='string'||token.length>1024)return false;
  try{const [payload,sig,...extra]=token.split('.');if(extra.length||!payload||!sig||!equal(sig,signature(payload)))return false;const data=JSON.parse(Buffer.from(payload,'base64url').toString());return data.role==='r4'&&Number.isFinite(data.expires)&&data.expires>now&&data.expires<=now+8*3600000;}catch{return false;}
}
module.exports={configured,passwordValid,issue,valid};
