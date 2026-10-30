export default function SessionLoading({error='',label='Verificando seu acesso…'}){
  return <section className="member-session-loading" aria-busy={!error}>
    {error?<><p role="alert">{error}</p><button className="r4-refresh" onClick={()=>window.location.reload()}>Tentar novamente</button></>:
      <p role="status" aria-live="polite"><span className="r4-spinner" aria-hidden="true"/>{label}</p>}
  </section>;
}
