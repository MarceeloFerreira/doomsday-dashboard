'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
const routes=[['/calendario','Calendário de Eventos'],['/alianca','Sobre a BoPE'],['/membros','Acesso de Membros'],['/lideranca','Liderança / R4']];
export default function SiteFrame({logo,panels,children}){
  const pathname=usePathname();
  const legacyClass=pathname==='/alianca'?'show-alliance':pathname==='/membros'?'show-members':'';
  return <><nav className="topmenu" aria-label="Navegação principal"><div className="topmenu-inner"><Link href="/calendario" className="topmenu-brand"><img className="topmenu-logo" src={logo} alt=""/><span className="topmenu-brand-text">BoPE - Doomsday</span></Link><div className="topmenu-links">{routes.map(([href,label])=><Link key={href} href={href} className={'topmenu-link'+(pathname===href?' active':'')} aria-current={pathname===href?'page':undefined}>{label}</Link>)}</div></div></nav><main className="wrap"><div className={'legacy-pages '+legacyClass} dangerouslySetInnerHTML={{__html:panels}}/>{children}</main></>;
}
