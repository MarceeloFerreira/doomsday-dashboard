function securityHeaders(development=false){
  // SSG/App Router hydration requires inline scripts. Event-handler attributes,
  // external scripts, frames, plugins and off-origin API connections are blocked.
  const csp=["default-src 'self'","base-uri 'self'","object-src 'none'","frame-ancestors 'none'","form-action 'self'",`script-src 'self' 'unsafe-inline'${development?" 'unsafe-eval'":''}`,"script-src-attr 'none'","style-src 'self' 'unsafe-inline' https://fonts.googleapis.com","font-src 'self' https://fonts.gstatic.com","img-src 'self' data: https:",`connect-src 'self'${development?' ws: wss:':''}`].join('; ');
  return [
    {key:'Content-Security-Policy',value:csp},
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'no-referrer'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), payment=()'},
  ];
}
module.exports={securityHeaders};
