'use client';
import {useEffect,useMemo,useState} from 'react';
import PompeiiHistory,{FinalizePompeii} from './PompeiiHistory';
import {ROLES,ASSIGNMENTS,SIDES,buildTeams,movePlayer,assignPlayer,inspectTeams,announcement} from '../lib/pompeii.cjs';
const fmt=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(n);
async function api(input){
  const r=await fetch('/api/r4/pompeii',{cache:'no-store',signal:AbortSignal.timeout(35000),...(input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{})});
  const body=await r.json();if(!r.ok)throw Object.assign(Error(body.error||'Não foi possível carregar a Pompeia.'),{status:r.status});return body;
}
function RoleEditor({player,onSave,disabled}){
  const [roles,setRoles]=useState(player.roles),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const dirty=JSON.stringify(roles)!==JSON.stringify(player.roles);
  async function save(){setBusy(true);setError('');try{await onSave(player.id,roles);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <div className="pompeii-role-editor"><div className="pompeii-role-options">{Object.entries(ROLES).map(([id,label])=><label key={id}><input type="checkbox" checked={roles.includes(id)} disabled={busy||disabled} onChange={e=>setRoles(Object.keys(ROLES).filter(r=>r===id?e.target.checked:roles.includes(r)))}/>{label}</label>)}</div>{dirty&&<button type="button" disabled={busy||disabled} onClick={save}>{busy?'Salvando…':'Salvar funções'}</button>}{!roles.length&&<small>Função ainda não informada</small>}{error&&<small role="alert">{error}</small>}</div>;
}
export default function Pompeii({userId}){
  const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[status,setStatus]=useState('');
  const [historyRevision,setHistoryRevision]=useState(0);
  const [query,setQuery]=useState(''),[selected,setSelected]=useState([]),[teams,setTeams]=useState(null),[opponents,setOpponents]=useState(''),[text,setText]=useState('');
  async function load(){setLoading(true);setError('');try{const result=await api();setData(result);setSelected(old=>old.filter(id=>result.players.some(p=>p.id===id)));setTeams(null);}catch(e){if(e.status===401||e.status===403){setData(null);setTeams(null);setSelected([]);}setError(e.name==='TimeoutError'?'A consulta demorou demais. Tente atualizar novamente.':e.message);}finally{setLoading(false);}}
  useEffect(()=>{let active=true;api().then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  const players=data?.players||[];
  const visible=players.filter(p=>[p.nick,p.gameId||''].some(v=>v.toLowerCase().includes(query.toLowerCase())));
  const included=players.filter(p=>selected.includes(p.id));
  const warnings=teams?inspectTeams(teams,players):[];
  const generated=useMemo(()=>teams?announcement(teams,data?.players||[],opponents).text:'',[teams,data?.players,opponents]);
  useEffect(()=>{setText(generated);},[generated]);
  function select(ids){setSelected(ids);setTeams(null);setStatus('');}
  async function saveRoles(playerId,roles){const result=await api({playerId,roles});setData(old=>({...old,players:old.players.map(p=>p.id===playerId?{...p,roles:result.roles}:p)}));setStatus(result.message);}
  function move(id,side){setTeams(old=>movePlayer(old,id,side));setStatus('Jogador movido. Confira as funções dos dois lados.');}
  function saveDraft(){try{localStorage.setItem('bope-pompeii:'+userId,JSON.stringify({selected,teams,opponents}));setStatus('Rascunho salvo neste navegador para sua conta.');}catch{setError('Não foi possível salvar o rascunho neste navegador.');}}
  function restore(){try{
    const draft=JSON.parse(localStorage.getItem('bope-pompeii:'+userId)||'null');if(!draft){setStatus('Nenhum rascunho salvo neste navegador para sua conta.');return;}
    const ids=Array.isArray(draft.selected)?[...new Set(draft.selected)].filter(id=>players.some(p=>p.id===id)):[];
    const restored=draft.teams;
    const valid=restored&&SIDES.every(s=>Array.isArray(restored[s])&&restored[s].every(e=>e&&ids.includes(e.id)&&Object.hasOwn(ASSIGNMENTS,e.assignment)));
    const entries=valid?SIDES.flatMap(s=>restored[s].map(e=>e.id)):[];
    const complete=valid&&entries.length===ids.length&&new Set(entries).size===entries.length;
    setSelected(ids);setTeams(complete?restored:null);setOpponents(/^[1-9]\d{0,2}$/.test(String(draft.opponents))?String(draft.opponents):'');setStatus('Rascunho restaurado. Confira os inscritos e as funções atuais.');
  }catch{setError('Não foi possível restaurar o rascunho.');}}
  async function copy(){try{await navigator.clipboard.writeText(text);setStatus('Aviso copiado!');}catch{setError('Não foi possível copiar. Selecione o texto do aviso e copie manualmente.');}}
  return <section className="pompeii" aria-busy={loading}>
    <header className="r4-head"><div><p className="brand-eyebrow">Liderança · Planejamento do evento</p><h1 className="brand-title">Calculadora Times da Pompeia</h1><p>Selecione os inscritos, distribua os dois lados e prepare o aviso do jogo.</p></div><button type="button" disabled={loading} onClick={load}>{loading?'Carregando…':'Atualizar membros'}</button></header>
    {error&&<p className="r4-notice" role="alert">{error}</p>}{data?.warning&&<p className="r4-notice" role="status">{data.warning}</p>}{status&&<p className="pompeii-status" role="status">{status}</p>}
    {!data?(loading?<p role="status">Carregando membros e funções…</p>:<button type="button" onClick={load}>Tentar novamente</button>):<>
      <section className="pompeii-panel"><h2>1. Inscritos e funções</h2><p>Lista de contas atuais da aliança, incluindo jogadores sem conta no site. Marque todas as funções que cada pessoa pode assumir e salve. Incubadora é uma responsabilidade adicional: os inscritos marcados nela aparecem no aviso como responsáveis pela captura. Nenhuma função é presumida.</p>
        <div className="pompeii-toolbar"><label>Buscar jogador<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome ou ID"/></label><strong>{selected.length} inscritos de {players.length} jogadores</strong><button type="button" disabled={!data.rosterAvailable} onClick={()=>select([...new Set([...selected,...visible.map(p=>p.id)])])}>Selecionar {query?'resultados':'todos'}</button><button type="button" onClick={()=>select(selected.filter(id=>!visible.some(p=>p.id===id)))}>Desmarcar {query?'resultados':'todos'}</button></div>
        <div className="rot-table-wrap pompeii-roster"><table><thead><tr><th>Inscrito</th><th>Jogador</th><th>Poder / tropa</th><th>Funções no evento</th></tr></thead><tbody>{visible.map(p=><tr key={p.id}><td><input type="checkbox" aria-label={'Inscrever '+p.nick} checked={selected.includes(p.id)} onChange={e=>select(e.target.checked?[...selected,p.id]:selected.filter(id=>id!==p.id))}/></td><td><strong>{p.nick}</strong>{p.gameId&&<small>ID {p.gameId}</small>}</td><td>{p.power==null?'Não informado':fmt(p.power)}<small>{p.troops||'Tropa não informada'}</small></td><td><RoleEditor key={p.id+JSON.stringify(p.roles)} player={p} onSave={saveRoles} disabled={!data.rolesReady}/></td></tr>)}</tbody></table>{!visible.length&&<p>Nenhum jogador encontrado.</p>}</div>
        <p className="calendar-note">As funções salvas ficam disponíveis para a liderança. O equilíbrio usa quantidade, funções salvas e poder atual; não mede a força real em combate. Sem poder informado, o jogador conta na quantidade, mas não na soma de poder.</p>
        <div className="pompeii-toolbar"><button type="button" className="pompeii-primary" disabled={loading||!included.length} onClick={()=>{setTeams(buildTeams(included));setStatus('Equipes calculadas. Revise as funções e ajuste se necessário.');}}>Calcular equipes</button><button type="button" onClick={restore}>Restaurar rascunho</button></div>
      </section>
      {teams&&<><section className="pompeii-panel"><h2>2. Confira e ajuste os lados</h2><p>Cada lado precisa de 1 rally e 2 guarnições: Heliponto e Base de Operações. Arraste os jogadores entre os lados ou use o botão Mover, inclusive no celular. Escolher um novo responsável libera o anterior para campo ou zumbis.</p>
        {included.some(p=>!p.roles.length)&&<p className="r4-notice">Há inscritos sem funções cadastradas. Eles ficam no apoio a zumbis até você definir outra função.</p>}
        {warnings.length>0&&<div className="r4-notice" role="alert"><strong>Pendências para revisar</strong><ul>{warnings.map(w=><li key={w}>{w}</li>)}</ul></div>}
        <div className="pompeii-teams">{SIDES.map(side=>{
          const members=teams[side].map(e=>({...e,player:players.find(p=>p.id===e.id)}));
          return <section key={side} className={'pompeii-team '+side} aria-label={'Equipe '+side} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';}} onDrop={e=>{e.preventDefault();move(e.dataTransfer.getData('text/plain'),side);}}><header><h3>Equipe {side==='verde'?'Verde':'Roxa'}</h3><strong>{members.length} jogadores</strong><p>Poder informado: {fmt(members.reduce((sum,m)=>sum+(m.player?.power||0),0))}</p><small>{members.filter(m=>m.player?.power==null).length} sem poder informado</small></header>
            <div className="pompeii-drop">{members.map(e=><article className="pompeii-player" key={e.id} draggable onDragStart={event=>{event.dataTransfer.setData('text/plain',e.id);event.dataTransfer.effectAllowed='move';}}><strong>{e.player?.nick||'Jogador indisponível'}</strong><small>{e.player?.roles.map(r=>ROLES[r]).join(' · ')||'Sem função cadastrada'} · {e.player?.power==null?'Poder não informado':fmt(e.player.power)}</small><label>Atuação no evento<select value={e.assignment} onChange={event=>setTeams(old=>assignPlayer(old,e.id,event.target.value,players))}>{Object.entries(ASSIGNMENTS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button type="button" aria-label={'Mover '+e.player?.nick+' para equipe '+(side==='verde'?'Roxa':'Verde')} onClick={()=>move(e.id,side==='verde'?'roxa':'verde')}>Mover para {side==='verde'?'Roxa':'Verde'}</button></article>)}{!members.length&&<p>Arraste jogadores para este lado.</p>}</div>
          </section>;
        })}</div>
        <div className="pompeii-toolbar"><button type="button" onClick={saveDraft}>Salvar rascunho neste navegador</button><span className="calendar-note">O rascunho guarda inscritos, lados e funções desta edição. As funções do cadastro são salvas separadamente.</span></div>
      </section>
      <section className="pompeii-panel"><h2>3. Aviso para o jogo</h2><label>Quantidade de adversários (opcional)<input type="number" min="1" max="999" step="1" value={opponents} onChange={e=>setOpponents(e.target.value)} placeholder="Ex.: 24"/></label><p>A lista de zumbis inclui os jogadores de campo e apoio; exclui os responsáveis por rally e guarnições. A lista de Incubadora reúne os inscritos com essa função marcada e pode repetir nomes dos zumbis. Quem luta em campo acompanha o ataque conforme o aviso.</p><label htmlFor="pompeii-announcement">Mensagem editável</label><textarea id="pompeii-announcement" rows={20} value={text} onChange={e=>setText(e.target.value)}/><div className="pompeii-toolbar"><strong className={text.length>1500?'pompeii-limit':''} role="status">{text.length} / 1500 caracteres</strong><button type="button" disabled={!text.trim()||text.length>1500||warnings.length>0} onClick={copy}>Copiar aviso</button><button type="button" onClick={()=>setText(generated)}>Restaurar texto gerado</button></div>{text.length>1500&&<p role="alert">O aviso ultrapassou o limite do jogo. Encurte o texto antes de copiar; nenhum nome será cortado automaticamente.</p>}{warnings.length>0&&<p>Resolva as pendências das equipes para liberar a cópia do aviso.</p>}<p className="calendar-note">Alterações nas equipes, nos adversários ou nas funções do cadastro atualizam o aviso e substituem as edições manuais.</p><FinalizePompeii teams={teams} players={players} text={text} warnings={warnings} opponents={opponents} onSaved={message=>{setStatus(message);setHistoryRevision(n=>n+1);}}/></section></>}
    <PompeiiHistory revision={historyRevision}/></>}
  </section>;
}
