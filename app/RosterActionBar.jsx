'use client';
export default function RosterActionBar({kind='herois',selectedCount,readyCount,pairCount,onCompare,emptyMessage}){
  if(!selectedCount)return null;
  const beasts=kind==='bestas';
  const label=selectedCount===1?(beasts?'besta selecionada':'herói selecionado'):(beasts?'bestas selecionadas':'heróis selecionados');
  return <aside className="roster-action-bar" aria-label={beasts?'Resumo das bestas selecionadas':'Resumo dos heróis selecionados'}>
    <div><strong>{selectedCount} {label}</strong><small>{readyCount<2?'Selecione pelo menos 2 com dados completos.':pairCount===0?(emptyMessage||'Nenhuma dupla disponível com esta seleção.'):`${pairCount} ${pairCount===1?'esquadrão':'esquadrões'} sem repetir ${beasts?'bestas':'heróis'} ${pairCount===1?'disponível':'disponíveis'}`}</small></div>
    <button type="button" className="hero-primary" disabled={readyCount<2||pairCount===0} onClick={onCompare}>Ver combinações <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12h14m-5-5 5 5-5 5"/></svg></button>
  </aside>;
}
