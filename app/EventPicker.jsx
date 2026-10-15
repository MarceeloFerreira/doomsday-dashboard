'use client';
import {useState} from 'react';
const shortDate=s=>s?.split('-').reverse().join('/');
export default function EventPicker({data,loading,onDate}){
  const [kind,setKind]=useState('');
  const events=(data?.events||[]).filter(e=>!kind||e.event===kind);
  const selected=data?.edition;
  const index=events.findIndex(e=>e.date===selected?.date);
  const kinds=Array.from(new Map((data?.events||[]).map(e=>[e.event,e.label])).entries());
  function changeKind(value){setKind(value);const first=data?.events.find(e=>!value||e.event===value);if(value&&selected?.event!==value&&first)onDate(first.date);}
  return <section className="r4-event-picker" aria-labelledby="r4-picker-title">
    <header><div><p className="brand-eyebrow">O ponto de partida da análise</p><h2 id="r4-picker-title">Qual edição vamos analisar?</h2><p>Escolha o evento e a data para ver os resultados da aliança.</p></div><span className="r4-picker-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4m8-4v4M3 11h18m-11 5 2 2 4-4"/></svg></span></header>
    <div className="r4-event-types" role="group" aria-label="Selecionar tipo de evento"><button disabled={!data||loading} aria-pressed={!kind} onClick={()=>changeKind('')}>Todos os eventos</button>{kinds.map(([key,label])=><button key={key} disabled={loading} aria-pressed={kind===key} onClick={()=>changeKind(key)}>{label}</button>)}</div>
    <div className="r4-edition-controls"><label htmlFor="r4-event-edition">Edição do evento<select id="r4-event-edition" disabled={!data||loading} value={selected?.date||''} onChange={e=>onDate(e.target.value)}>{!data&&<option value="">{loading?'Carregando eventos…':'Eventos indisponíveis'}</option>}{!events.some(e=>e.date===selected?.date)&&selected&&<option value={selected.date}>{shortDate(selected.date)} · {selected.label}</option>}{events.map(e=><option key={e.date} value={e.date}>{shortDate(e.date)} · {e.label} · {data.rosterAvailable===false?'cadastro indisponível':e.records+' jogadores'}{e.partial?' · parcial':''}</option>)}</select></label><div className="r4-edition-arrows"><button disabled={loading||index<0||index>=events.length-1} onClick={()=>onDate(events[index+1].date)} aria-label="Abrir edição anterior">← Anterior</button><button disabled={loading||index<=0} onClick={()=>onDate(events[index-1].date)} aria-label="Abrir edição mais recente">Mais recente →</button></div></div>
    {selected&&<div className="r4-selected-edition"><span>{selected.label}</span><strong>{shortDate(selected.date)}</strong><small>{data.rosterAvailable===false?'Cadastro indisponível':selected.records+' jogadores com registro'} · {kind?'navegando neste tipo de evento':'navegando em todos os eventos'}</small></div>}
  </section>;
}
