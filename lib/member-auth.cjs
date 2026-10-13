const {createHmac,createHash,timingSafeEqual}=require('node:crypto');
const legacyHash='f5f6febf00b865a1b0d2b6e28a082924657c689f63f6d290d436e7de37af3e40';
const secret=()=>process.env.MEMBERS_SESSION_SECRET||process.env.R4_SESSION_SECRET||'';
function configured(){return secret().length>=32&&(!process.env.MEMBERS_PASSWORD||process.env.MEMBERS_PASSWORD.trim().length>0);}
function equal(a,b){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function passwordValid(value){if(!configured()||typeof value!=='string'||value.length>256)return false;const normalized=value.trim().toLowerCase();return process.env.MEMBERS_PASSWORD?equal(normalized,process.env.MEMBERS_PASSWORD.trim().toLowerCase()):equal(createHash('sha256').update(normalized).digest('hex'),legacyHash);}
function sign(payload){return createHmac('sha256',secret()).update('members:'+(process.env.MEMBERS_PASSWORD?createHash('sha256').update(process.env.MEMBERS_PASSWORD.trim().toLowerCase()).digest('hex'):legacyHash)+':'+payload).digest('base64url');}
function issue(now=Date.now()){if(!configured())throw Error('Acesso não configurado');const payload=Buffer.from(JSON.stringify({role:'member',expires:now+8*3600000})).toString('base64url');return payload+'.'+sign(payload);}
function valid(token,now=Date.now()){if(!configured()||typeof token!=='string'||token.length>1024)return false;try{const[p,s,...extra]=token.split('.');if(!p||!s||extra.length||!equal(s,sign(p)))return false;const data=JSON.parse(Buffer.from(p,'base64url').toString());return data.role==='member'&&data.expires>now&&data.expires<=now+8*3600000;}catch{return false;}}
module.exports={configured,passwordValid,issue,valid};
