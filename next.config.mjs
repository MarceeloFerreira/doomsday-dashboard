import {securityHeaders} from './lib/security-headers.cjs';
export default {
  poweredByHeader:false,
  async headers(){return [{source:'/:path*',headers:securityHeaders(process.env.NODE_ENV==='development')}];}
};
