'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import MemberAccountActions from './MemberAccountActions';
function Profile({profile,onClose}){
  const dialog=useRef(null);
  const [currentPassword,setCurrent]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{dialog.current.showModal();},[]);
  async function submit(event){
    event.preventDefault();setError('');
    if(password!==confirm){setError('As senhas precisam ser iguais.');return;}
    if(password===currentPassword){setError('Escolha uma senha diferente da atual.');return;}
    setBusy(true);
    try{
      const response=await fetch('/api/members/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,password,confirmPassword:confirm})});
      const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível trocar a senha.');
      setCurrent('');setPassword('');setConfirm('');window.location.assign('/membros?senha=alterada');
    }catch(e){setError(e.message);setBusy(false);}
  }
  return <dialog ref={dialog} className="member-profile-dialog" aria-labelledby="my-profile-title" onCancel={event=>{if(busy)event.preventDefault();}} onClose={onClose}>
    <header><div><p className="brand-eyebrow">Sua conta · BoPE</p><h2 id="my-profile-title">Meu perfil</h2></div><button type="button" className="profile-close" disabled={busy} onClick={()=>dialog.current.close()} aria-label="Fechar meu perfil">×</button></header>
    <dl className="profile-summary"><div><dt>Player</dt><dd>{profile.player?.nick||profile.displayName}</dd></div><div><dt>ID no jogo</dt><dd>{profile.player?.game_id||'Não informado'}</dd></div><div><dt>Na aliança</dt><dd>{profile.role==='admin'?'Administrador · Liderança R4 / R5':'Membro ativo'}</dd></div><div><dt>E-mail da conta</dt><dd>{profile.email}</dd></div></dl>
    <p className="calendar-note">Player incorreto? Fale com a liderança.</p>
    <form onSubmit={submit}><h3>Trocar minha senha</h3><p className="calendar-note">Use de 6 a 128 caracteres. Depois da troca, entre novamente com a nova senha. As sessões abertas serão encerradas.</p>
      <label>Senha atual<input name="current-password" type="password" autoComplete="current-password" required minLength={6} maxLength={128} value={currentPassword} disabled={busy} onChange={e=>setCurrent(e.target.value)}/></label>
      <label>Nova senha<input name="new-password" type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={password} disabled={busy} onChange={e=>setPassword(e.target.value)}/></label>
      <label>Repita a nova senha<input name="confirm-password" type="password" autoComplete="new-password" required minLength={6} maxLength={128} value={confirm} disabled={busy} onChange={e=>setConfirm(e.target.value)}/></label>
      {error&&<p className="account-error" role="alert">{error}</p>}<button className="profile-save" disabled={busy}>{busy?'Alterando senha…':'Salvar nova senha'}</button>
    </form>
  </dialog>;
}
export default function AccountHeader(){
  const pathname=usePathname();
  const [session,setSession]=useState(null),[open,setOpen]=useState(false),[error,setError]=useState('');
  const profileButton=useRef(null);
  useEffect(()=>{setOpen(false);setError('');},[pathname]);
  useEffect(()=>{
    let active=true,sequence=0;
    async function refresh(){const id=++sequence;try{const response=await fetch('/api/members/session',{cache:'no-store',signal:AbortSignal.timeout(20000)});const data=await response.json();if(active&&id===sequence){setSession(response.ok?data:null);if(!response.ok||!data.authenticated)setOpen(false);}}catch{if(active&&id===sequence){setSession(null);setOpen(false);}}}
    refresh();const timer=setInterval(refresh,30000);const focus=()=>{if(document.visibilityState==='visible')refresh();};
    window.addEventListener('bope-session-changed',refresh);document.addEventListener('visibilitychange',focus);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('bope-session-changed',refresh);document.removeEventListener('visibilitychange',focus);};
  },[pathname]);
  useEffect(()=>{
    if(!session?.authenticated||session.mode!=='accounts')return;
    let lastSent=0;
    const controller=new AbortController();
    function activity(){
      if(document.visibilityState!=='visible'||Date.now()-lastSent<300000)return;
      lastSent=Date.now();
      // Telemetry failure must never block member tools or authentication.
      fetch('/api/members/activity',{method:'POST',signal:controller.signal}).catch(()=>{});
    }
    activity();
    document.addEventListener('pointerdown',activity,{passive:true});
    document.addEventListener('keydown',activity);document.addEventListener('scroll',activity,{passive:true,capture:true});
    document.addEventListener('visibilitychange',activity);
    return()=>{controller.abort();document.removeEventListener('pointerdown',activity);document.removeEventListener('keydown',activity);document.removeEventListener('scroll',activity,true);document.removeEventListener('visibilitychange',activity);};
  },[session?.authenticated,session?.mode,session?.profile?.id,pathname]);
  async function logout(){setError('');try{const response=await fetch('/api/members/session',{method:'DELETE'});if(!response.ok)throw Error('Não foi possível sair. Tente novamente.');window.location.assign('/membros');}catch(e){setError(e.message);}}
  if(!session?.authenticated)return null;
  const profile=session.profile,isAdmin=profile?.role==='admin',nick=profile?.player?.nick||profile?.displayName||'Membro da aliança';
  return <><header className="member-account-header"><div className="member-profile"><span className="member-profile-avatar" aria-hidden="true">{nick.slice(0,1).toUpperCase()}</span><div><span className="member-profile-label">Sua conta · BoPE</span><strong className="member-profile-nick">{nick}</strong><span className={'member-profile-role'+(isAdmin?' admin':'')}>{isAdmin?'Administrador · Liderança R4 / R5':'Membro ativo'}</span>{profile&&<span className="member-profile-help">Player incorreto? Fale com a liderança.</span>}</div></div><div ref={profileButton}><MemberAccountActions onLogout={logout} onProfile={session.mode==='accounts'?()=>setOpen(true):undefined}/></div>{error&&<p className="account-error" role="alert">{error}</p>}</header>{open&&profile&&<Profile profile={profile} onClose={()=>{setOpen(false);profileButton.current?.querySelector('.member-profile-trigger')?.focus();}}/>}</>;
}
