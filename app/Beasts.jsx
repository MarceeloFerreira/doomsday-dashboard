'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import SessionLoading from './SessionLoading';
import RosterActionBar from './RosterActionBar';
import {normalize} from '../lib/hero-combinations.cjs';
import {ELEMENTS,MODES,ROLES,listed,roleSkills,recommend} from '../lib/beast-combinations.cjs';
import './heroes.css';
import './beasts.css';
import {CHIP_PROFILES,FOCUS_LABELS,TIER_LABELS,suggestChips} from '../lib/beast-chips.cjs';

export function ChipSuggestion({plan}){
  if(!plan)return <p className="beast-chip-note">Sugestão de chips indisponível para este par.</p>;
  return <details className="beast-chip-suggestion">
    <summary>Chips sugeridos · {plan.summary}</summary>
    <div className="beast-chip-duo">{[plan.leader,plan.support].map(p=><section className="beast-chip-build" key={p.role} aria-label={'Chips de '+p.role.toLowerCase()+': '+p.name}>
      <header><span>{p.role}</span><h4>{p.name}</h4><small>{p.element} · foco em {FOCUS_LABELS[p.focus]}</small></header>
      <p className="beast-chip-reason">{p.reason}</p>
      {p.groups.map(g=><div className="beast-chip-group" key={g.setId}>
        <div className="beast-chip-group-head"><strong>{g.pieces} × {g.name}</strong><span className={'beast-chip-tier beast-chip-tier-'+g.tier}>{TIER_LABELS[g.tier]}</span></div>
        <p className="beast-chip-slots">{g.slots.length===6?'As seis posições':g.slots.length===4?'Braços + pernas':'Cérebro + coluna'}</p>
        <details className="beast-chip-effects"><summary>Peças e efeitos desta matriz</summary>
          <ul>{g.chips.map(c=><li key={c.id}>{c.name}</li>)}</ul>
          {g.effects.map(e=><div key={e.id}><strong>{e.pieces} peças · {e.stars}★</strong><p>{e.description}</p>{e.roleSkills.filter(s=>s.description!==e.description).map(s=><p key={s.id}>{s.description}</p>)}</div>)}
        </details>
      </div>)}
      {p.warnings.map(w=><p className="beast-chip-note" key={w}>{w}</p>)}
    </section>)}</div>
    <p className="beast-chip-note">Atributos dos chips da suporte seguem a taxa de Herança da sua conta. As matrizes ativadas nela também se aplicam à líder.</p>
    {plan.notes.map(note=><p className="beast-chip-note" key={note}>{note}</p>)}
    <p className="beast-chip-note">Efeitos apresentados no ranque inicial (0★). As peças precisam cumprir o ranque exigido pelo patamar. Roxos e lendários pertencem a matrizes distintas: uma peça dourada solta não completa a matriz roxa.</p>
  </details>;
}
function ChipReference({catalog}){
  if(!catalog)return null;
  return <details className="beast-chip-reference"><summary>Conheça as matrizes e os tipos de chips</summary>
    <p>Roxos (Elite) e lendários permitem montar quatro chips nos membros e dois no cérebro/coluna. Os OC, também chamados de soberbos, têm uma família de seis posições por elemento, com patamares de 2, 4 e 6 peças.</p>
    <div className="beast-chip-reference-grid">{ELEMENTS.map(element=><section key={element}><h3>{element==='Físico'?'Besta Física':'Besta de '+element}</h3>
      {Object.entries(FOCUS_LABELS).map(([focus,label])=>{
        const sets=catalog.sets.filter(s=>s.element===element&&s.tier==='purple'&&s.focus===focus);
        return <p key={focus}><strong>{label}</strong><span>{sets.sort((a,b)=>b.slots.length-a.slots.length).map(s=>s.slots.length+' × '+s.name).join(' + ')}</span></p>;
      })}
      <p><strong>Lendários</strong><span>{catalog.sets.filter(s=>s.element===element&&s.tier==='legendary').map(s=>s.name).join(' · ')}</span></p>
      <p><strong>OC / soberbo</strong><span>{catalog.sets.find(s=>s.element===element&&s.tier==='oc')?.name}{element==='Físico'?' · bônus de 4/6 peças em invasão ou guarnição':''}</span></p>
    </section>)}</div>
  </details>;
}


function BeastBadge({beast}){
  const tone={Fogo:'fire','Água':'water',Grama:'grass','Físico':'physical'}[beast.element];
  return <span className={'hero-avatar beast-avatar beast-avatar-'+tone} aria-hidden="true">{beast.name.split(' ').filter(s=>!['de','do','da','das','dos'].includes(s)).slice(0,2).map(s=>s[0]).join('')}</span>;
}
export function BeastCard({beast,selected=false,role='Líder',onToggle}){
  const skills=roleSkills(beast,role),special=beast.skills.Especial||[];
  const typeLabel={Fogo:'Besta de Fogo','Água':'Besta de Água',Grama:'Besta de Grama','Físico':'Besta Física'}[beast.element];
  return <article className={'hero-card beast-card'+(selected?' is-selected':'')}>
    <label className="hero-card-select"><input className="hero-card-input" type="checkbox" checked={selected} onChange={()=>onToggle(beast.id)} aria-label={'Tenho '+beast.name}/><BeastBadge beast={beast}/><span className="hero-card-identity"><strong>{beast.name}</strong><small>{typeLabel}</small></span><span className="hero-card-toggle" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6"/></svg></span></label>
    {(!beast.complete||selected)&&<div className="hero-card-status">{!beast.complete?<p className="hero-partial">Dados parciais · disponível para consulta</p>:selected?<span className="hero-selected-label">No meu elenco</span>:null}</div>}
    <details className="hero-skills"><summary>Ver {skills.length} habilidades de {role.toLowerCase()}</summary><div>{skills.map(s=><section key={s.id}><small>{s.slot} · nível {s.level}</small><h3>{s.name}</h3><p>{s.description}</p></section>)}{special.map(s=><section key={s.id}><small>Especial · apenas consulta nesta versão</small><h3>{s.name}</h3><p>{s.description}</p></section>)}</div></details>
  </article>;
}
export default function Beasts(){
  const [data,setData]=useState(null),[error,setError]=useState(''),[reload,setReload]=useState(0);
  const [mode,setMode]=useState('Campo'),[enemyElement,setEnemyElement]=useState(''),[role,setRole]=useState('Líder');
  const [owned,setOwned]=useState([]),[search,setSearch]=useState(''),[element,setElement]=useState(''),[onlyOwned,setOnlyOwned]=useState(false),[showPairs,setShowPairs]=useState(false);
  const [chipProfile,setChipProfile]=useState('purple'),[chipBudget,setChipBudget]=useState(4),[chipFocus,setChipFocus]=useState('auto'),[chipLegendaryBudget,setChipLegendaryBudget]=useState(0);
  useEffect(()=>{
    let active=true,sequence=0;
    const leave=()=>{if(active){setData(null);setOwned([]);window.location.replace('/membros?destino=bestas');}};
    async function load(){try{
      setError('');const r=await fetch('/api/beasts',{cache:'no-store',signal:AbortSignal.timeout(20000)});
      if(!active)return;if(r.status===401||r.status===403){leave();return;}
      if(!r.ok)throw Error();const body=await r.json();if(!active)return;
      if(body.schemaVersion!==1||!Array.isArray(body.beasts)||!body.beasts.length||body.beasts.some(b=>!listed(b)))throw Error();
      setData(body);
    }catch{if(active)setError('Não foi possível carregar as bestas. Tente novamente.');}}
    async function verify(){const request=++sequence;try{
      const r=await fetch('/api/members/session',{cache:'no-store',signal:AbortSignal.timeout(20000)}),session=await r.json();
      if(active&&request===sequence&&(!r.ok||!session.authenticated))leave();
    }catch{if(active&&request===sequence){setData(null);setOwned([]);setError('Não foi possível confirmar seu acesso. Atualize a página para tentar novamente.');}}}
    load();const timer=setInterval(verify,30000),visible=()=>{if(document.visibilityState==='visible')verify();};
    window.addEventListener('bope-session-changed',verify);document.addEventListener('visibilitychange',visible);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('bope-session-changed',verify);document.removeEventListener('visibilitychange',visible);};
  },[reload]);
  const beasts=(data?.beasts||[]).filter(listed);
  const selected=owned.filter(id=>beasts.some(b=>b.id===id));
  const visible=beasts.filter(b=>(!element||b.element===element)&&(!onlyOwned||selected.includes(b.id))&&normalize(b.name+' '+b.nameEn).includes(normalize(search)));
  const ready=beasts.filter(b=>selected.includes(b.id)&&b.complete);
  const pairs=useMemo(()=>recommend(data?.beasts||[],owned,{mode,enemyElement}),[data,owned,mode,enemyElement]);
  function comparePairs(){if(ready.length<2)return;setShowPairs(true);requestAnimationFrame(()=>{const target=document.getElementById('beast-pairs-title');if(!target)return;target.focus({preventScroll:true});target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});}
  const toggle=id=>{if(beasts.some(b=>b.id===id))setOwned(previous=>previous.includes(id)?previous.filter(x=>x!==id):[...previous,id]);};
  if(!data)return error?<section className="hero-empty"><h1>Bestas</h1><p role="alert">{error}</p><button className="r4-refresh" onClick={()=>setReload(n=>n+1)}>Tentar novamente</button><Link href="/membros">Voltar para minha conta</Link></section>:<SessionLoading label="Carregando suas bestas…"/>;
  return <section className="heroes-page beasts-page">
    <header className="hero-page-head"><div><p className="brand-eyebrow">Área de membros · Estratégia</p><h1 className="brand-title">Bestas lendárias</h1><p className="brand-sub">Marque as bestas que você possui e compare as combinações de líder e suporte para cada cenário.</p></div><span className="hero-edition">Catálogo de bestas<strong>{beasts.length} lendárias</strong><small>Revisado em {data.asOf.split('-').reverse().join('/')}</small></span></header>
    <nav className="roster-step-links" aria-label="Etapas para combinar bestas"><a href="#beast-setup-title"><span aria-hidden="true">1</span>Cenário</a><a href="#beast-roster-title"><span aria-hidden="true">2</span>Meu elenco</a><a href="#beast-pairs-title"><span aria-hidden="true">3</span>Combinações</a></nav>
    <div className="hero-workspace">
      <section className="hero-setup" aria-labelledby="beast-setup-title"><div className="hero-section-head"><div><span className="hero-step">01</span><h2 id="beast-setup-title">Monte seu cenário</h2></div><span className="hero-legendary">Somente lendárias</span></div>
        <div className="beast-context"><label>Onde vai jogar?<select value={mode} onChange={e=>setMode(e.target.value)}>{MODES.map(m=><option key={m}>{m}</option>)}</select></label><label>Elemento da besta inimiga<select value={enemyElement} onChange={e=>setEnemyElement(e.target.value)}><option value="">Não informado</option>{ELEMENTS.map(e=><option key={e}>{e}</option>)}</select></label></div>
        <fieldset className="beast-role-tabs"><legend>Habilidades exibidas nos cards</legend>{ROLES.map(r=><button type="button" key={r} aria-pressed={role===r} onClick={()=>setRole(r)}>{r}</button>)}</fieldset>
        <p className="hero-assumption">Duplas comparadas com as habilidades da classe máxima. Os chips são sugeridos separadamente, conforme função, gatilho e limite de peças. Potencial e habilidades especiais ainda ficam fora da comparação.</p>
        <fieldset className="beast-chip-settings"><legend>Planeje seus chips</legend>
          <p>Comece com roxos e escolha quanto quer investir em cada dupla.</p>
          <div className="beast-chip-profiles">{CHIP_PROFILES.map(p=><button type="button" key={p.id} aria-pressed={chipProfile===p.id} onClick={()=>{setChipProfile(p.id);setChipBudget(p.id==='oc'?6:4);}}><strong>{p.name}</strong><span>{p.description}</span></button>)}</div>
          <div className="beast-chip-controls">
            {chipProfile!=='purple'&&<label>Limite de peças {chipProfile==='oc'?'OC / soberbas':'lendárias'} por dupla<select value={chipBudget} onChange={e=>setChipBudget(Number(e.target.value))}>{[0,2,4,6,8,10,12].map(n=><option key={n} value={n}>{n} peças{n===0?' · manter roxos':''}</option>)}</select></label>}
            {chipProfile==='oc'&&<label>Lendários para completar a dupla<select value={chipLegendaryBudget} onChange={e=>setChipLegendaryBudget(Number(e.target.value))}>{[0,2,4,6,8,10,12].map(n=><option key={n} value={n}>{n===0?'Completar com roxos':n+' peças lendárias'}</option>)}</select></label>}
            <label>Prioridade dos chips<select value={chipFocus} onChange={e=>setChipFocus(e.target.value)}><option value="auto">Automática por função</option>{Object.entries(FOCUS_LABELS).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
          </div>
          <p className="beast-chip-note">Cada sugestão distribui até 12 peças entre líder e suporte. As duplas são alternativas: para usar várias ao mesmo tempo, reserve cópias próprias. Confira se possui os nomes, elementos, posições e ranques indicados; o limite acima é para planejamento.</p>
        </fieldset>
        <ChipReference catalog={data.chips}/>
      </section>
      <section className="hero-roster" aria-labelledby="beast-roster-title"><div className="hero-section-head"><div><span className="hero-step">02</span><h2 id="beast-roster-title">Quais bestas você possui?</h2></div><span className="hero-roster-count" aria-live="polite">{selected.length} selecionadas</span></div>
        <p className="hero-section-intro">Você pode combinar elementos diferentes. Os filtros ajudam a encontrar as bestas e mantêm a seleção do elenco.</p>
        <div className="hero-roster-toolbar beast-roster-toolbar"><label className="hero-search"><span className="sr-only">Buscar besta</span><input type="search" placeholder="Buscar besta pelo nome…" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="beast-element-filter"><span className="sr-only">Filtrar bestas por elemento</span><select value={element} onChange={e=>setElement(e.target.value)}><option value="">Todos os elementos</option>{ELEMENTS.map(e=><option key={e}>{e}</option>)}</select></label><label className="hero-check"><input type="checkbox" checked={onlyOwned} onChange={e=>setOnlyOwned(e.target.checked)}/>Só meu elenco</label></div>
        <div className="hero-selection-actions"><span>{visible.length} bestas nesta lista</span><button onClick={()=>setOwned(previous=>[...new Set([...previous,...visible.filter(b=>b.complete).map(b=>b.id)])])}>Selecionar lista</button><button disabled={!selected.length} onClick={()=>{setOwned([]);setShowPairs(false);}}>Limpar seleção</button></div>
        <div className="hero-grid">{visible.map(b=><BeastCard key={b.id} beast={b} selected={selected.includes(b.id)} role={role} onToggle={toggle}/>)}</div>
        {!visible.length&&<div className="hero-empty"><h3>Nenhuma besta nesta busca</h3><p>Tente outro nome ou amplie os filtros.</p><button className="r4-refresh" onClick={()=>{setSearch('');setElement('');setOnlyOwned(false);}}>Mostrar todas as bestas</button></div>}
      </section>
      <section className="hero-combinations" aria-labelledby="beast-pairs-title"><div className="hero-section-head"><div><span className="hero-step">03</span><h2 id="beast-pairs-title" tabIndex={-1}>Combine líder e suporte</h2></div><span className="hero-beta">Primeira versão</span></div>
        <div className="hero-calculate"><div><strong>{ready.length} bestas prontas para comparar</strong><p>{ready.length<2?'Marque pelo menos duas bestas para começar.':`${pairs.length} combinações de líder e suporte disponíveis em ${mode.toLowerCase()}.`}</p></div><button className="hero-primary" disabled={ready.length<2} onClick={comparePairs}>Ver combinações</button></div>
        <details className="hero-method"><summary>Como as sugestões são ordenadas?</summary><p>Cada par tem uma besta líder e outra de suporte. Priorizamos estados que a parceira aproveita, efeitos contra o elemento inimigo informado, efeitos do cenário e mecanismos compartilhados. Os conjuntos de habilidades de cada função ficam separados. O plano de chips complementa cada dupla; mudar o investimento não reordena as duplas.</p><p>É uma leitura inicial das descrições, sem simular dano ou garantir vitória. Ao deixar o inimigo como “Não informado”, os bônus condicionados ao elemento dele ficam fora da análise. O par invertido é avaliado separadamente.</p></details>
        {showPairs&&ready.length>=2&&<><p className="hero-pairs-context" role="status">{mode} · inimigo: {enemyElement||'não informado'} · mostrando {Math.min(12,pairs.length)} de {pairs.length} combinações</p><div className="hero-pair-grid">{pairs.slice(0,12).map((pair,i)=>{const chipPlan=suggestChips(pair,data.chips,{profile:chipProfile,budget:chipBudget,legendaryBudget:chipLegendaryBudget,mode,focus:chipFocus});return <article className="hero-pair beast-pair" key={pair.leader.id+'-'+pair.support.id}><span className="hero-pair-number">{String(i+1).padStart(2,'0')}</span><div className="beast-pair-members">{[[pair.leader,'Líder'],[pair.support,'Suporte']].map(([b,r])=><div key={r}><BeastBadge beast={b}/><span><small>{r}</small><h3>{b.name}</h3></span></div>)}</div><div className="hero-card-tags">{pair.mechanisms.slice(0,5).map(m=><span key={m}>{m}</span>)}</div><ul>{pair.reasons.map(r=><li key={r}>{r}</li>)}</ul><ChipSuggestion plan={chipPlan}/><details><summary>Conferir habilidades do par</summary>{[[pair.leader,'Líder'],[pair.support,'Suporte']].map(([b,r])=><div key={r}><h4>{b.name} · {r}</h4>{roleSkills(b,r).map(s=><p key={s.id}><strong>{s.name}: </strong>{s.description}</p>)}</div>)}</details></article>;})}</div></>}
      </section>
    </div><p className="hero-source-note">Revisão do cliente {data.client} · configuração local. Selecione apenas as bestas disponíveis na sua conta.</p>
    <RosterActionBar kind="bestas" selectedCount={selected.length} readyCount={ready.length} pairCount={pairs.length} onCompare={comparePairs}/>
  </section>;
}
