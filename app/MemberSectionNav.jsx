'use client';
import Link from 'next/link';
const sections=[
  {id:'calendario',href:'/calendario',label:'Calendário',description:'Eventos e próximos ciclos',icon:'calendar'},
  {id:'desempenho',label:'Desempenho',description:'Seus resultados e os da aliança',icon:'chart'},
  {id:'supremo',label:'Cálculos do Supremo',description:'Planeje seus pontos no evento',icon:'calculator'},
  {id:'util',label:'Utilitários',description:'Ferramentas para sua evolução',icon:'tools'},
  {id:'lideranca',label:'Eventos e metas',description:'Resultados e objetivos do time',icon:'shield',admin:true},
  {id:'gestao',label:'Membros e acessos',description:'Cadastros, vínculos e permissões',icon:'users',admin:true}
];
function Icon({name}){
  const paths={calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/></>,chart:<><path d="M4 3v17h17M8 15v-4M13 15V7M18 15V4"/></>,calculator:<><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h1M12 11h1M16 11h.1M8 15h1M12 15h1M16 15h.1M8 18h1M12 18h1M16 18h.1"/></>,tools:<><path d="m14 6 4 4M4 20l9-9M16 3l5 5-4 4-5-5 4-4ZM4 16l4 4"/></>,shield:<><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,users:<><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5"/></>};
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export default function MemberSectionNav({isAdmin,selected,pendingCount=0}){
  const active=sections.some(s=>s.id===selected)?selected:null;
  const links=admin=>sections.filter(s=>Boolean(s.admin)===admin).map(s=><Link href={s.href||'/membros?aba='+s.id} prefetch={false} key={s.id} className={'topmenu-link'+(active===s.id?' active':'')} aria-current={active===s.id?'page':undefined} aria-label={isAdmin&&s.id==='gestao'&&pendingCount>0?`${s.label}, ${pendingCount} ${pendingCount===1?'pedido pendente':'pedidos pendentes'}`:undefined}><Icon name={s.icon}/><span>{s.label}<small>{s.description}</small></span>{isAdmin&&s.id==='gestao'&&pendingCount>0&&<span className="nav-pending-badge" title={`${pendingCount} ${pendingCount===1?'pedido aguardando aprovação':'pedidos aguardando aprovação'}`} aria-hidden="true">{pendingCount>99?'99+':pendingCount}</span>}</Link>);
  return <nav className={'member-section-nav'+(isAdmin?' with-admin':'')} aria-label="Seções da área de membros"><div className="member-section-group"><span className="nav-label member-section-label">Membros</span><div>{links(false)}</div></div>{isAdmin&&<div className="member-section-group member-section-admin"><span className="nav-label member-section-label">Liderança</span><div>{links(true)}</div></div>}</nav>;
}
