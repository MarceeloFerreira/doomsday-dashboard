'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect} from 'react';
const routes=[['/calendario','Calendário','Eventos e próximos ciclos','calendar'],['/alianca','Nossa aliança','Conheça a BoPE','shield'],['/membros','Área de membros','Rankings e ferramentas','users'],['/lideranca','Liderança / R4','Performance e metas','chart']];
function Icon({name}){
  const paths={calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/></>,shield:<><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,users:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5"/></>,chart:<><path d="M4 3v17h17M8 15v-4M13 15V7M18 15V4"/></>};
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export default function SiteFrame({logo,panels,children}){
  const pathname=usePathname();
  useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[pathname]);
  const legacyClass=pathname==='/alianca'?'show-alliance':pathname==='/membros'?'show-members':'';
  return <><a className="skip-link" href="#main-content">Ir para o conteúdo</a><nav className="topmenu" aria-label="Navegação principal"><div className="topmenu-inner"><Link href="/calendario" className="topmenu-brand"><img className="topmenu-logo" src={logo} alt="Emblema da aliança BoPE"/><span className="topmenu-brand-text">BoPE<span className="brand-game">Doomsday · Last Survivors</span></span></Link><div className="nav-label">CENTRAL DA ALIANÇA</div><div className="topmenu-links">{routes.map(([href,label,description,icon])=><Link key={href} href={href} className={'topmenu-link'+(pathname===href?' active':'')} aria-current={pathname===href?'page':undefined}><Icon name={icon}/><span>{label}<small>{description}</small></span></Link>)}</div><div className="nav-signature"><span className="nav-signal"/>Juntos, mais fortes.<small>Organização. Estratégia. Aliança.</small></div></div></nav><main id="main-content" className="wrap" tabIndex={-1}><div className={'legacy-pages '+legacyClass} dangerouslySetInnerHTML={{__html:panels}}/>{children}<footer className="site-footer"><span>BoPE <span aria-hidden="true">/</span> Doomsday: Last Survivors</span><span>Uma aliança. Um propósito.</span></footer></main></>;
}
