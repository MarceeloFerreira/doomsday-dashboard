'use client';
import {useEffect,useState} from 'react';
import core from '../public/calendar-core';
import './calendar.css';

const {windowFor,regionMatches,groupRows,windowSummary,timingFor,remainingLabel,DAY}=core;
const format=value=>new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeStyle:'short',timeZone:'UTC'}).format(value);
const shortDate=value=>new Intl.DateTimeFormat('pt-PT',{day:'2-digit',month:'short',timeZone:'UTC'}).format(value);
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const stateLabel=r=>r.status==='active'?'Em andamento':r.status==='upcoming'?'Agendado':'Encerrado';
const cadence=r=>r.loopDays===1?'Diário':r.loopDays?`A cada ${r.loopDays} dias`:'Data fixa';
const scope=r=>[r.kingdomIds?.length?'Região incluída na lista do evento':'Sem restrição explícita de região',r.serverDay?'a partir do dia '+r.serverDay:'',r.serverDayEnd?'até o dia '+r.serverDayEnd:'',Object.keys(r.conditions||{}).length?'outras condições de participação':''].filter(Boolean).join(' · ');

function Status({event}){
  return <span className={'cal-status cal-status-'+event.status}>{event.status==='active'&&<i className="cal-live-dot" aria-hidden="true"/>}{stateLabel(event)}</span>;
}

function Countdown({event,now}){
  const timing=timingFor(event,now);
  if(event.status==='ended')return <span className="cal-countdown">Janela encerrada</span>;
  return <span className={'cal-countdown'+(timing.ending?' cal-countdown-urgent':'')}>
    {timing.ending&&<span aria-hidden="true">◷ </span>}
    {event.status==='upcoming'?'Começa em ':timing.phase?'Uma janela termina em ':'Janela termina em '}
    <b>{remainingLabel(timing.remaining)}</b>
  </span>;
}

function EventCard({event,now,description,onOpen}){
  const timing=timingFor(event,now);
  return <article className={'cal-event-card'+(event.status==='active'?' is-live':'')+(timing.ending?' is-ending':'')}>
    <div className="cal-card-top"><Status event={event}/><span className="cal-cadence">{cadence(event)}</span></div>
    <h3>{event.name}</h3>
    <p className="cal-description">{description||'Consulte as janelas e as condições de participação nos detalhes deste evento.'}</p>
    <div className="cal-card-dates"><span aria-hidden="true">▤</span> {shortDate(event.startMs)} <span aria-hidden="true">→</span> {shortDate(event.endMs)} <small>UTC</small></div>
    <div className="cal-card-bottom">
      <Countdown event={event} now={now}/>
      {event.status==='active'&&<div className="cal-progress" role="progressbar" aria-label={'Progresso da janela de '+event.name} aria-valuenow={Math.round(timing.progress)} aria-valuemin={0} aria-valuemax={100}><span style={{width:timing.progress+'%'}}/></div>}
      <div className="cal-card-foot"><small>{event.variants.length>1?'Janelas: '+windowSummary(event):'Disponibilidade estimada'}</small><a href="#event-catalog" onClick={()=>onOpen(event.name)}>Ver evento <span aria-hidden="true">↗</span></a></div>
    </div>
  </article>;
}

export default function Calendar(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[now,setNow]=useState(null);
  const [region,setRegion]=useState('541'),[search,setSearch]=useState(''),[filter,setFilter]=useState('current'),[kind,setKind]=useState(''),[spotlight,setSpotlight]=useState('active');
  useEffect(()=>{
    const controller=new AbortController();
    let pending=false,loaded=false;
    async function refresh(){
      if(pending||controller.signal.aborted)return;
      pending=true;
      try{
        let response=await fetch('/api/calendar',{cache:'no-store',signal:controller.signal});
        if(!response.ok&&!loaded)response=await fetch('/data/calendar.json',{cache:'no-store',signal:controller.signal});
        if(!response.ok)throw Error('HTTP '+response.status);
        const next=await response.json();
        if(next.schemaVersion!==1||!Array.isArray(next.events)||!next.events.length)throw Error('Dados inválidos');
        setData(next);setNow(Date.now());loaded=true;
        setError(next.delivery?.degraded?'A atualização está temporariamente indisponível. Exibindo a última coleta disponível.':'');
      }catch(error){
        if(error.name!=='AbortError')setError(loaded?'Não foi possível verificar novas datas. O calendário anterior continua disponível.':'Não foi possível carregar o calendário. Atualize a página para tentar novamente.');
      }finally{pending=false;}
    }
    refresh();
    const timer=setInterval(()=>{setNow(Date.now());if(document.visibilityState==='visible')refresh();},60000);
    const onVisible=()=>{if(document.visibilityState==='visible')refresh();};
    document.addEventListener('visibilitychange',onVisible);
    return ()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
  },[]);
  const rows=data&&now?data.events.filter(e=>regionMatches(e,region)).map(e=>windowFor(e,now)):[];
  const families=groupRows(rows);
  const descriptions=new Map(rows.filter(r=>r.description).map(r=>[r.sourceKey,r.description]));
  const endingNames=new Set(families.filter(r=>timingFor(r,now).ending).map(r=>r.name));
  const counts={active:0,upcoming:0,recent:0,ending:endingNames.size};
  counts.active=groupRows(rows.filter(r=>r.status==='active')).length;
  counts.upcoming=groupRows(rows.filter(r=>r.status==='upcoming')).length;
  counts.recent=groupRows(rows.filter(r=>r.status==='ended'&&r.endMs>now-7*DAY)).length;
  const spotlightRows=groupRows(rows.filter(r=>r.status===spotlight&&(spotlight==='active'||r.startMs<now+30*DAY)))
    .sort((a,b)=>spotlight==='active'?(Number(timingFor(b,now).ending)-Number(timingFor(a,now).ending)||Number(Boolean(b.description))-Number(Boolean(a.description))||timingFor(a,now).remaining-timingFor(b,now).remaining):a.startMs-b.startMs);
  const ordered=spotlight==='active'?[...spotlightRows.filter(r=>timingFor(r,now).ending).slice(0,2),...spotlightRows.filter(r=>!r.loopDays),...spotlightRows]:spotlightRows;
  const highlights=[...new Map(ordered.map(r=>[r.name,r])).values()].slice(0,6);
  const filtered=groupRows(rows.filter(r=>
    (!search||normalize(r.name+' '+r.id).includes(normalize(search)))&&
    (!filter||(filter==='current'?r.status!=='ended':filter==='recent'?r.status==='ended'&&r.endMs>now-7*DAY:filter==='ending'?r.status==='active'&&r.endMs>now&&r.endMs-now<=2*DAY:r.status===filter))&&
    (!kind||(kind==='recurring'?r.loopDays>0:!r.loopDays))));
  if(filter==='ending')filtered.sort((a,b)=>timingFor(a,now).remaining-timingFor(b,now).remaining);
  const openEvent=name=>{setSearch(name);setFilter('current');setKind('');};
  const reset=()=>{setSearch('');setFilter('current');setKind('');};
  const fresh=data&&now-Date.parse(data.generatedAt)<=8*DAY;

  return <div className="calendar-page">
    <header className="top"><div className="top-inner"><div>
      <p className="brand-eyebrow">Doomsday: Last Survivors · radar de eventos</p>
      <h1 className="brand-title">Calendário de eventos</h1>
      <p className="brand-sub">Prepare a próxima jogada. Acompanhe os eventos, explore as recompensas e não perca o fim de uma janela.</p>
      <div className="cal-context"><span className="cal-region">◎ {region?'Região '+region:'Todas as regiões'}</span><span>Horários em UTC · datas estimadas</span></div>
    </div><div className="status-block"><div className="clock">{now?new Intl.DateTimeFormat('pt-PT',{timeStyle:'medium',timeZone:'UTC'}).format(now)+' UTC':'Carregando…'}</div>
      <div className="refresh-note">Cliente <b>{data?`${data.clientVersion} · build ${data.build} · patch ${data.patch}`:'—'}</b></div>
      <div className="refresh-note">Coleta: <b>{data?new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Lisbon'}).format(new Date(data.generatedAt)):'—'}</b></div>
      <div className="refresh-note">Novas datas: <b>verificação automática a cada minuto</b></div>
      <span className={'cal-freshness'+(fresh?'':' is-stale')}>{data?(fresh?'● Coleta recente':'◷ Nova coleta necessária'):'A ler calendário…'}</span>
    </div></div></header>
    {error&&<p className="calendar-note" role="alert">{error}</p>}

    <div className="stats cal-stats">
      {[['active','Em andamento','ok','Janelas abertas agora'],['ending','Terminam em até 48h','warn','Priorize os últimos objetivos'],['upcoming','Agendados','ops','Planeje os próximos ciclos'],['recent','Encerrados na semana','dim','Consulte o histórico']].map(([key,label,color,hint])=>
        <button type="button" className={'stat cal-stat'+(filter===key?' is-selected':'')} key={key} onClick={()=>{setFilter(filter===key?'current':key);setSearch('');setKind('');}} aria-pressed={filter===key}>
          <span className="cal-stat-title">{label}<span aria-hidden="true">↗</span></span><span className={'n '+color}>{data?counts[key]:'—'}</span><span className="cal-stat-hint">{hint}</span>
        </button>)}
    </div>

    {data&&counts.ending>0&&<div className="cal-alert"><span className="cal-alert-icon" aria-hidden="true">◷</span><div><b>De olho no relógio</b><p>{counts.ending} evento{counts.ending===1?' tem':'s têm'} uma janela a terminar nas próximas 48 horas.</p></div><a href="#event-catalog" onClick={()=>{setFilter('ending');setSearch('');setKind('');}}>Ver prazos <span aria-hidden="true">→</span></a></div>}

    <section className="group" aria-labelledby="cal-spotlight-title"><div className="group-head cal-section-head"><div><p className="cal-eyebrow">Seu próximo objetivo</p><h2 id="cal-spotlight-title">No radar</h2></div><div className="cal-segments" aria-label="Eventos em destaque">
      <button type="button" aria-pressed={spotlight==='active'} onClick={()=>setSpotlight('active')}>A acontecer <span>{data?counts.active:'—'}</span></button>
      <button type="button" aria-pressed={spotlight==='upcoming'} onClick={()=>setSpotlight('upcoming')}>A seguir</button>
    </div></div>
    <div className="calendar-highlights cal-cards">{highlights.map(r=><EventCard key={r.name} event={r} now={now} description={r.description||descriptions.get(r.sourceKey)} onOpen={openEvent}/>)}</div>
    {!data&&!error&&<div className="cal-empty" role="status">A preparar o radar de eventos…</div>}
    {data&&!highlights.length&&<div className="cal-empty">{spotlight==='active'?'Nenhuma janela em andamento nesta seleção.':'Nenhuma janela agendada nos próximos 30 dias.'}</div>}
    {data&&highlights.length>0&&<a className="cal-view-all" href="#event-catalog" onClick={()=>{setFilter(spotlight);setSearch('');setKind('');}}>Explorar todos os eventos {spotlight==='active'?'em andamento':'agendados'} <span aria-hidden="true">↓</span></a>}
    </section>

    <section className="group" id="event-catalog" aria-labelledby="cal-catalog-title"><div className="group-head"><div><p className="cal-eyebrow">Explore o calendário</p><h2 id="cal-catalog-title">Todos os eventos</h2></div><span className="group-count" aria-live="polite">{filtered.length} de {families.length} eventos</span></div>
      <div className="calendar-filters"><select aria-label="Região do calendário" value={region} onChange={e=>setRegion(e.target.value)}><option value="541">Região 541</option><option value="">Todas as regiões</option></select>
        <input aria-label="Buscar evento" placeholder="Buscar evento ou ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select aria-label="Estado do evento" value={filter} onChange={e=>setFilter(e.target.value)}><option value="current">Atuais e próximos</option><option value="active">Em andamento</option><option value="ending">Terminam em até 48h</option><option value="upcoming">Agendados</option><option value="recent">Encerrados na semana</option><option value="">Todo o histórico</option></select>
        <select aria-label="Tipo de evento" value={kind} onChange={e=>setKind(e.target.value)}><option value="">Todos os tipos</option><option value="fixed">Data fixa</option><option value="recurring">Rotativos</option></select>
      </div>
      <div className="rot-table-wrap"><table className="rot-table"><thead><tr><th>Evento</th><th>Janela UTC</th><th>Cadência</th><th>Estado e prazo</th></tr></thead><tbody>{filtered.map(r=><tr key={r.name} className={timingFor(r,now).ending?'cal-row-ending':''}>
        <td className="name"><strong>{r.name}</strong>{(r.description||descriptions.get(r.sourceKey))&&<p className="cal-description cal-table-description">{r.description||descriptions.get(r.sourceKey)}</p>}<small className="calendar-id">Janelas: {windowSummary(r)}</small></td>
        <td className="window">{format(r.startMs)} → {format(r.endMs)}<details className="calendar-variants"><summary>{r.variants.length>1?'Explorar janelas e fases':'Ver detalhes do evento'}</summary>{r.variants.map(v=><div className="calendar-variant" key={v.key}><b>{format(v.startMs)} → {format(v.endMs)}</b><div>{stateLabel(v)} · {cadence(v)}</div><small>{scope(v)}</small><small className="calendar-id">IDs: {v.ids.join(', ')}</small></div>)}</details></td>
        <td>{r.variants.some(v=>v.loopDays!==r.loopDays)?'Cadências diferentes':cadence(r)}</td>
        <td><Status event={r}/><Countdown event={r} now={now}/>{r.variants.some(v=>v.status!==r.status)&&<small className="calendar-id">Outras fases nos detalhes</small>}</td>
      </tr>)}</tbody></table></div>
      {data&&!filtered.length&&<div className="cal-empty"><b>Nenhum evento encontrado.</b><p>Experimente outro nome ou ajuste os filtros.</p><button type="button" onClick={reset}>Limpar filtros</button></div>}
      <details className="cal-source-note"><summary>Sobre as datas e a disponibilidade</summary><p>Horários em UTC, com término exclusivo. As descrições são trechos da localização do jogo. As janelas são estimativas dos arquivos locais e devem ser confirmadas no jogo. {region?'O filtro da região '+region+' exclui listas explícitas incompatíveis. ':''}A idade da região e outras condições de participação não foram confirmadas.</p><p>Cada nome aparece uma vez. As fases e os IDs ficam nos detalhes. Um nome pode ter janelas ativas e futuras; o alerta de 48 horas considera o próximo término de uma janela em andamento, sem significar o encerramento de todo o evento. Eventos ocultos, descontinuados e sem data absoluta e sistemas permanentes foram excluídos.</p></details>
    </section>
  </div>;
}
