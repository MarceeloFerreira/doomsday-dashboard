'use client';
import {useEffect,useRef,useState} from 'react';
export default function AccountAccess({session,onSession,onLogout}){
  const [register,setRegister]=useState(false),[email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const [rememberEmail,setRememberEmail]=useState(false);
  const successRef=useRef(null);
  useEffect(()=>{try{const saved=localStorage.getItem('bope-login-email');if(saved){setEmail(saved);setRememberEmail(true);}}catch{}},[]);
  function rememberChanged(checked){setRememberEmail(checked);if(!checked){try{localStorage.removeItem('bope-login-email');}catch{}}}

  useEffect(()=>{if(message)successRef.current?.focus();},[message]);
  async function submit(e){
    e.preventDefault();setError('');setMessage('');
    if(register&&password!==confirm){setError('As senhas precisam ser iguais.');return;}
    setBusy(true);
    try{
      const r=await fetch(register?'/api/members/register':'/api/members/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,displayName:name})});
      const data=await r.json();if(!r.ok)throw Error(data.error||'Não foi possível concluir.');
      try{if(rememberEmail)localStorage.setItem('bope-login-email',email.trim());else localStorage.removeItem('bope-login-email');}catch{}
      setPassword('');setConfirm('');
      if(register){setRegister(false);setMessage(data.message);}else onSession(data);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  if(session?.signedIn&&!session.authenticated)return <section className="r4-login account-access"><p className="brand-eyebrow">BoPE · Sua conta</p><h1 className="brand-title">{session.profile?.status==='inactive'?'Acesso inativo':'Aguardando aprovação'}</h1><p>Olá, {session.profile?.displayName}.</p><p>{session.profile?.status==='inactive'?'Sua conta está sem acesso às funções da aliança. Fale com a liderança se precisar reativá-la.':'A liderança precisa aprovar seu cadastro e vincular a conta ao seu player. Quando isso acontecer, as ferramentas serão liberadas aqui.'}</p><button onClick={onLogout}>Sair da conta</button></section>;
  return <section className="r4-login account-access"><p className="brand-eyebrow">BoPE · Área de membros</p><h1 className="brand-title">{register?'Crie sua conta':'Seu lugar na aliança'}</h1><p>{register?'Depois do cadastro, a liderança aprova seu acesso e vincula você ao seu player.':'Entre para acompanhar seus resultados e usar as ferramentas da aliança.'}</p>
    <div className="account-tabs" role="group" aria-label="Acesso à conta"><button aria-pressed={!register} onClick={()=>{setRegister(false);setError('');}}>Entrar</button><button aria-pressed={register} onClick={()=>{setRegister(true);setError('');}}>Criar conta</button></div>
    {message&&<div className="account-success" role="status" tabIndex={-1} ref={successRef}><span className="account-success-icon" aria-hidden="true">✓</span><div><h2>Conta criada com sucesso!</h2><p>{message}</p></div></div>}
    <form onSubmit={submit} autoComplete="on" id={register?'member-register-form':'member-login-form'}>{register&&<label>Seu nome ou nick<input id="account-nickname" name="nickname" autoComplete="nickname" maxLength={80} value={name} required onChange={e=>setName(e.target.value)}/></label>}<label>E-mail<input id="account-email" name="username" type="email" autoComplete="username" maxLength={254} value={email} required onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input id="account-password" name="password" type="password" autoComplete={register?'new-password':'current-password'} minLength={6} maxLength={128} value={password} required onChange={e=>setPassword(e.target.value)}/></label>{register&&<label>Repita a senha<input id="account-password-confirm" name="password-confirm" type="password" autoComplete="new-password" minLength={6} maxLength={128} value={confirm} required onChange={e=>setConfirm(e.target.value)}/></label>}{!register&&<div className="account-login-help"><label className="account-remember"><input type="checkbox" checked={rememberEmail} onChange={e=>rememberChanged(e.target.checked)}/><span>Lembrar meu e-mail neste dispositivo</span></label><p>Para preencher e-mail e senha nas próximas visitas, aceite salvar a senha quando o navegador oferecer. A senha é guardada pelo gerenciador do navegador.</p></div>}<p className="calendar-note">Use de 6 a 128 caracteres. Se esquecer a senha, fale com a liderança.</p><button disabled={busy||!session?.configured}>{busy?'Aguarde…':register?'Criar minha conta':'Entrar na minha conta'}</button></form>
    {!session?.configured&&<p role="status">O cadastro individual ainda precisa ser configurado no servidor.</p>}{error&&<p className="account-error" role="alert">{error}</p>}
  </section>;
}
