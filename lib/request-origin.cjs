// Netlify may expose an internal HTTP URL to the handler. Trust the deployment
// URL supplied by the platform, never a caller-supplied forwarded host.
function origin(value){
  try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.origin:null;}catch{return null;}
}
function sameOrigin(request){
  const supplied=request.headers.get('origin');
  if(!supplied||origin(supplied)!==supplied)return false;
  if(request.headers.get('sec-fetch-site')==='cross-site')return false;
  const allowed=[origin(request.url),origin(process.env.APP_ORIGIN),origin(process.env.URL)].filter(Boolean);
  if(allowed.includes(supplied))return true;
  // Next dev can reconstruct its internal URL as localhost even when the
  // browser connects to 127.0.0.1. Accept only loopback aliases, on the exact
  // same protocol and port, and only in development. Forwarded hosts do not
  // participate in this decision; cross-site requests were rejected above.
  if(process.env.NODE_ENV!=='development')return false;
  try{
    const target=new URL(request.url),source=new URL(supplied);
    const loopback=new Set(['localhost','127.0.0.1','[::1]']);
    return loopback.has(target.hostname)&&loopback.has(source.hostname)&&target.protocol===source.protocol&&target.port===source.port;
  }catch{return false;}
}
function secureCookie(request){return origin(request.headers.get('origin'))?.startsWith('https://')||origin(request.url)?.startsWith('https://')||false;}
module.exports={sameOrigin,secureCookie};
