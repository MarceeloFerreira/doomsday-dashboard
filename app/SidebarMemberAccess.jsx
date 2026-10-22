'use client';
import {useEffect,useState} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import Link from 'next/link';
import MemberSectionNav from './MemberSectionNav';
export default function SidebarMemberAccess(){
  const pathname=usePathname(),params=useSearchParams();
  const [session,setSession]=useState(null),[pendingCount,setPendingCount]=useState(null);
  const isAdmin=Boolean(session?.authenticated&&session.mode==='accounts'&&session.profile?.role==='admin');
  useEffect(()=>{
    let active=true,sequence=0;
    async function refresh(){const request=++sequence;try{const r=await fetch('/api/members/session',{cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await r.json();if(active&&request===sequence)setSession(r.ok?data:null);}catch{if(active&&request===sequence)setSession(null);}}
    refresh();const timer=setInterval(refresh,30000);
    const focus=()=>{if(document.visibilityState==='visible')refresh();};
    window.addEventListener('bope-session-changed',refresh);document.addEventListener('visibilitychange',focus);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('bope-session-changed',refresh);document.removeEventListener('visibilitychange',focus);};
  },[pathname]);
  useEffect(()=>{
    if(!isAdmin){setPendingCount(null);return;}
    let active=true,sequence=0;
    async function refreshCount(){const request=++sequence;try{const r=await fetch('/api/members/pending',{cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await r.json();if(active&&request===sequence)setPendingCount(r.ok&&Number.isSafeInteger(data.pending)?data.pending:null);}catch{if(active&&request===sequence)setPendingCount(null);}}
    refreshCount();const timer=setInterval(refreshCount,30000);const focus=()=>{if(document.visibilityState==='visible')refreshCount();};
    window.addEventListener('bope-members-changed',refreshCount);document.addEventListener('visibilitychange',focus);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('bope-members-changed',refreshCount);document.removeEventListener('visibilitychange',focus);};
  },[isAdmin,session?.profile?.id]);
  if(!session)return null;
  if(!session.authenticated)return <div className="sidebar-member-login"><Link href="/membros" className={'topmenu-link'+(pathname==='/membros'?' active':'')} aria-current={pathname==='/membros'?'page':undefined}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-3-5"/></svg><span>Área de membros<small>Entre para acessar suas ferramentas</small></span></Link></div>;
  return <div className="sidebar-member-access"><MemberSectionNav isAdmin={isAdmin} pendingCount={pendingCount} selected={pathname==='/calendario'?'calendario':pathname==='/membros'?(params.get('aba')||'desempenho'):'none'}/></div>;
}
