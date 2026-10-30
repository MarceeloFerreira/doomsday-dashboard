'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import SessionLoading from './SessionLoading';
import RosterActionBar from './RosterActionBar';
import {TROOPS,MODES,listed,selectable,compatible,activeSkills,recommend,normalize} from '../lib/hero-combinations.cjs';
import './heroes.css';

function HeroBadge({hero}){
  return <span className={'hero-avatar hero-avatar-'+(hero.troop==='Infantaria'?'infantry':hero.troop==='Atirador'?'shooter':hero.troop==='Motos'?'rider':'general')} aria-hidden="true">{hero.name.split(' ').slice(0,2).map(s=>s[0]).join('')}</span>;
}

export function HeroCard({hero:h,selected=false,awakened=true,onToggle}){
  const disabled=!selectable(h);
  return <article className={'hero-card'+(selected&&!disabled?' is-selected':'')+(disabled?' is-preview':'')}>
    <label className="hero-card-select">
      <input className="hero-card-input" type="checkbox" checked={selected&&!disabled} disabled={disabled} onChange={()=>{if(!disabled)onToggle(h.id);}} aria-label={'Tenho '+h.name} aria-describedby={disabled?'hero-availability-'+h.id:undefined}/>
      <HeroBadge hero={h}/><span className="hero-card-identity"><strong>{h.name}</strong><small>{h.title}</small></span>
      <span className="hero-card-toggle" aria-hidden="true">{disabled?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6"/></svg>}</span>
    </label>
    <div className="hero-card-tags"><span>{h.troop}</span>{h.tags.slice(1).map(tag=><span key={tag}>{tag}</span>)}</div>
    <div className="hero-card-status">{disabled?<p id={'hero-availability-'+h.id} className="hero-coming-soon">Em breve · ainda indisponível</p>:!h.complete?<p className="hero-partial">Dados parciais · disponível para consulta</p>:selected?<span className="hero-selected-label">No meu elenco</span>:null}</div>
    <details className="hero-skills"><summary>Ver {activeSkills(h,awakened).length} habilidades</summary><div>{activeSkills(h,awakened).map(skill=><section key={skill.id+'-'+skill.slot}><small>{skill.slot} · nível {skill.level}</small><h3>{skill.name||skill.slot}</h3><p>{skill.description||'Descrição ainda não identificada.'}</p></section>)}</div></details>
  </article>;
}

export default function Heroes(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const [troop,setTroop]=useState('Infantaria'),[mode,setMode]=useState('Campo'),[owned,setOwned]=useState([]);
  const [search,setSearch]=useState(''),[onlyOwned,setOnlyOwned]=useState(false),[awakened,setAwakened]=useState(true),[showPairs,setShowPairs]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();let active=true,sequence=0;
    const leave=()=>{if(active){setData(null);setOwned([]);window.location.replace('/membros?destino=herois');}};
    async function load(){try{
      setError('');const r=await fetch('/api/heroes',{cache:'no-store',signal:controller.signal});
      if(r.status===401||r.status===403){leave();return;}
      if(!r.ok)throw Error();const body=await r.json();
      if(body.schemaVersion!==1||!Array.isArray(body.heroes)||body.heroes.some(h=>h.rarity!=='Lendário'))throw Error();
      if(active)setData(body);
    }catch(e){if(active&&e.name!=='AbortError')setError('Não foi possível carregar os heróis. Tente novamente.');}}
    async function verify(){const request=++sequence;try{
      const r=await fetch('/api/members/session',{cache:'no-store',signal:AbortSignal.timeout(20000)});const session=await r.json();
      if(active&&request===sequence&&(!r.ok||!session.authenticated))leave();
    }catch{if(active&&request===sequence){setData(null);setOwned([]);setError('Não foi possível confirmar seu acesso. Atualize a página para tentar novamente.');}}}
    load();const timer=setInterval(verify,30000);
    const visible=()=>{if(document.visibilityState==='visible')verify();};
    window.addEventListener('bope-session-changed',verify);document.addEventListener('visibilitychange',visible);
    return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('bope-session-changed',verify);document.removeEventListener('visibilitychange',visible);};
  },[reload]);
  const heroes=(data?.heroes||[]).filter(listed);
  const selected=owned.filter(id=>heroes.some(h=>h.id===id&&selectable(h)));
  const eligible=heroes.filter(h=>compatible(h,troop));
  const visible=eligible.filter(h=>(!onlyOwned||selected.includes(h.id))&&normalize(h.name+' '+h.nameEn+' '+h.title).includes(normalize(search)));
  const ready=eligible.filter(h=>selected.includes(h.id)&&h.complete);
  const partial=eligible.filter(h=>selected.includes(h.id)&&!h.complete);
  const pairs=useMemo(()=>recommend(data?.heroes||[],owned,{troop,mode,awakened}),[data,owned,troop,mode,awakened]);
  function changeTroop(next){if(next===troop)return;setTroop(next);setOwned([]);setShowPairs(false);setOnlyOwned(false);}
  function comparePairs(){if(ready.length<2)return;setShowPairs(true);requestAnimationFrame(()=>{const target=document.getElementById('hero-pairs-title');if(!target)return;target.focus({preventScroll:true});target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});}
  const toggle=id=>{if(heroes.some(h=>h.id===id&&selectable(h)))setOwned(previous=>previous.includes(id)?previous.filter(i=>i!==id):[...previous,id]);};
  if(!data)return error?<section className="hero-empty"><h1>Heróis</h1><p role="alert">{error}</p><button className="r4-refresh" onClick={()=>setReload(n=>n+1)}>Tentar novamente</button><Link href="/membros">Voltar para minha conta</Link></section>:<SessionLoading label="Carregando seus heróis…"/>;
  return <section className="heroes-page">
    <header className="hero-page-head"><div><p className="brand-eyebrow">Área de membros · Estratégia</p><h1 className="brand-title">Combine seus heróis</h1><p className="brand-sub">Escolha sua tropa, marque os lendários que você possui e explore pares para o seu jeito de jogar.</p></div><span className="hero-edition">Catálogo de heróis<strong>{heroes.length} lendários</strong><small>Revisado em {data.asOf.split('-').reverse().join('/')}</small></span></header>
    <nav className="roster-step-links" aria-label="Etapas para combinar heróis"><a href="#hero-setup-title"><span aria-hidden="true">1</span>Cenário</a><a href="#hero-roster-title"><span aria-hidden="true">2</span>Meu elenco</a><a href="#hero-pairs-title"><span aria-hidden="true">3</span>Combinações</a></nav>
    <div className="hero-workspace">
      <section className="hero-setup" aria-labelledby="hero-setup-title"><div className="hero-section-head"><div><span className="hero-step">01</span><h2 id="hero-setup-title">Monte seu cenário</h2></div><span className="hero-legendary">Somente lendários</span></div>
        <fieldset className="hero-troops"><legend>Qual tropa você usa?</legend>{TROOPS.map(t=><button type="button" key={t} aria-pressed={troop===t} onClick={()=>changeTroop(t)}><span aria-hidden="true">{t==='Infantaria'?'I':t==='Atirador'?'A':'M'}</span>{t}</button>)}</fieldset>
        <div className="hero-scenario"><label>Onde vai jogar?<select value={mode} onChange={e=>setMode(e.target.value)}>{MODES.map(m=><option key={m}>{m}</option>)}</select></label><label className="hero-check"><input type="checkbox" checked={awakened} onChange={e=>setAwakened(e.target.checked)}/><span>Considerar despertar<small>Aplicado a todos os heróis selecionados</small></span></label></div>
        <p className="hero-assumption">Comparação inicial com habilidades no nível máximo. Relíquias e armamentos ainda não entram nas sugestões.</p>
      </section>
      <section className="hero-roster" aria-labelledby="hero-roster-title"><div className="hero-section-head"><div><span className="hero-step">02</span><h2 id="hero-roster-title">Quem está no seu elenco?</h2></div><span className="hero-roster-count" aria-live="polite">{selected.length} selecionados</span></div>
        <p className="hero-section-intro">Especialistas em {troop.toLowerCase()} e heróis com a tag Líder. Ao trocar de tropa, a seleção é limpa para você montar um novo elenco.</p>
        <div className="hero-roster-toolbar"><label className="hero-search"><span className="sr-only">Buscar herói</span><input type="search" placeholder="Buscar herói pelo nome…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="hero-check"><input type="checkbox" checked={onlyOwned} onChange={e=>setOnlyOwned(e.target.checked)}/>Só meu elenco</label></div>
        <div className="hero-selection-actions"><span>{visible.length} heróis nesta lista</span><button onClick={()=>setOwned(previous=>[...new Set([...previous,...visible.filter(h=>h.complete&&selectable(h)).map(h=>h.id)])])}>Selecionar lista</button><button disabled={!owned.length} onClick={()=>{setOwned([]);setShowPairs(false);}}>Limpar seleção</button></div>
        <div className="hero-grid">{visible.map(h=><HeroCard key={h.id} hero={h} selected={selected.includes(h.id)} awakened={awakened} onToggle={toggle}/>)}</div>
        {!visible.length&&<div className="hero-empty"><h3>Nenhum herói nesta busca</h3><p>{onlyOwned?'Desmarque “Só meu elenco” para escolher outros heróis.':'Tente outro nome ou escolha outra tropa.'}</p><button className="r4-refresh" onClick={()=>{setSearch('');setOnlyOwned(false);}}>Mostrar todos desta tropa</button></div>}
      </section>
      <section className="hero-combinations" aria-labelledby="hero-pairs-title"><div className="hero-section-head"><div><span className="hero-step">03</span><h2 id="hero-pairs-title" tabIndex={-1}>Explore suas combinações</h2></div><span className="hero-beta">Primeira versão</span></div>
        <div className="hero-calculate"><div><strong>{ready.length} heróis prontos para comparar em {troop.toLowerCase()}</strong><p>{ready.length<2?'Marque pelo menos dois heróis com dados completos para começar.':`${pairs.length} pares disponíveis no seu elenco para ${mode.toLowerCase()}.`}</p></div><button className="hero-primary" disabled={ready.length<2} onClick={comparePairs}>Ver combinações</button></div>
        {partial.length>0&&<p className="hero-partial" role="status">{partial.map(h=>h.name+' (ID '+h.id+')').join(', ')}: dados parciais; ficam fora das sugestões.</p>}
        <details className="hero-method"><summary>Como as sugestões são ordenadas?</summary><p>Priorizamos a aplicação de estados que o parceiro aproveita, a especialização para o cenário, a afinidade com a tropa e a combinação de dano com resistência. Empates seguem a ordem dos nomes.</p><p>É uma leitura inicial das descrições das habilidades, sem simular dano ou garantir vitória. A ordem de líder e assistente depende também dos talentos e armamentos. Níveis reais, relíquias e o adversário podem mudar a melhor escolha.</p></details>
        {showPairs&&ready.length>=2&&<><p className="hero-pairs-context" role="status">{troop} · {mode} · {awakened?'Com despertar':'Sem despertar'} · mostrando {Math.min(12,pairs.length)} de {pairs.length} pares</p><div className="hero-pair-grid">{pairs.slice(0,12).map((pair,i)=><article className="hero-pair" key={pair.a.id+'-'+pair.b.id}><span className="hero-pair-number">{String(i+1).padStart(2,'0')}</span><div className="hero-pair-names"><HeroBadge hero={pair.a}/><h3>{pair.a.name}<span> + {pair.b.name}</span></h3></div><div className="hero-card-tags">{pair.features.slice(0,5).map(f=><span key={f}>{f}</span>)}</div><ul>{pair.reasons.map(r=><li key={r}>{r}</li>)}</ul><details><summary>Conferir habilidades do par</summary>{[pair.a,pair.b].map(h=><div key={h.id}><h4>{h.name}</h4>{activeSkills(h,awakened).map(s=><p key={s.id+'-'+s.slot}><strong>{s.name}: </strong>{s.description}</p>)}</div>)}</details></article>)}</div></>}
      </section>
    </div><p className="hero-source-note">Revisão do cliente {data.client} · configuração local. A disponibilidade de cada herói depende da sua conta e região.</p>
    <RosterActionBar kind="herois" selectedCount={selected.length} readyCount={ready.length} pairCount={pairs.length} onCompare={comparePairs}/>
  </section>;
}
