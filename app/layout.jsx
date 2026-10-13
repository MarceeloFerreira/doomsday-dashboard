import './globals.css';
import './r4.css';
import './design-system.css';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import Script from 'next/script';
import SiteFrame from './SiteFrame';
export const metadata={title:'BoPE - Doomsday',description:'Calendário de eventos e dashboard da aliança BoPE.'};
export default async function Layout({children}){
  const read=name=>readFile(path.join(process.cwd(),'legacy',name),'utf8');
  const [nav,panels]=await Promise.all([read('navigation.html'),read('panels.html')]);
  const logo=nav.match(/class="topmenu-logo"\s+src="([^"]+)"/)?.[1]||'';
  return <html lang="pt"><body><SiteFrame logo={logo} panels={panels}>{children}</SiteFrame><Script src="/members.js" strategy="afterInteractive"/></body></html>;
}
