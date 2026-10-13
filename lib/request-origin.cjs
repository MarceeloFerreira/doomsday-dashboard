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
  return allowed.includes(supplied);
}
function secureCookie(request){return origin(request.headers.get('origin'))?.startsWith('https://')||origin(request.url)?.startsWith('https://')||false;}
module.exports={sameOrigin,secureCookie};
