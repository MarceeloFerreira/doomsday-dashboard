'use client';
import {useState} from 'react';
function Icon({children,className=''}){return <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;}
export default function MemberAccountActions({onLogout}){
  const [leaving,setLeaving]=useState(false);
  async function leave(){setLeaving(true);try{await onLogout();}finally{setLeaving(false);}}
  return <div className="member-account-actions">
    <button type="button" className="member-action member-logout" disabled={leaving} onClick={leave}><Icon><path d="M9 5H5v14h4M14 8l4 4-4 4M9 12h12"/></Icon><span>{leaving?'Saindo…':'Sair da conta'}</span></button>
  </div>;
}
