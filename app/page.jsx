import {readFile} from 'node:fs/promises';
import path from 'node:path';
import Calendar from './Calendar';
import Leadership from './Leadership';
import Script from 'next/script';
export default async function Page(){
  const read=name=>readFile(path.join(process.cwd(),'legacy',name),'utf8');
  const [nav,panels]=await Promise.all([read('navigation.html'),read('panels.html')]);
  return <><div dangerouslySetInnerHTML={{__html:nav}}/><main className="wrap"><div id="tab-events" className="tab-panel active" role="tabpanel"><Calendar/></div><div dangerouslySetInnerHTML={{__html:panels}}/><div id="tab-r4" className="tab-panel" role="tabpanel"><Leadership/></div></main><Script src="/members.js" strategy="afterInteractive"/></>;
}
