'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ASSIGNMENTS} from '../lib/pompeii.cjs';
import {historyStats} from '../lib/pompeii-history.cjs';
const fmt=n=>n===null?'—':new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(n);
export async function historyApi(input){
  const response=await fetch('/api/r4/pompeii/history',{cache:'no-store',signal:AbortSignal.timeout(35000),...(input?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}:{})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível acessar o histórico.');return data;
}
export function FinalizePompeii({teams,players,text,warnings,opponents,onSaved}){
  const [date,setDate]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Lisbon',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  const [opponentAlliance,setOpponentAlliance]=useState('');
  const [name,setName]=useState('Pompeia'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
  const attempt=useRef(null);
  const payload=JSON.stringify({date,name,teams,opponents,opponentAlliance,announcement:text,roster:players.map(p=>({id:p.id,roles:p.roles}))});
  async function finalize(){
    setBusy(true);setError('');
    try{
      if(attempt.current?.payload!==payload)attempt.current={payload,id:crypto.randomUUID()};
      const result=await historyApi({action:'finalize',id:attempt.current.id,date,name,teams,opponents:opponents===''?null:Number(opponents),opponentAlliance,announcement:text});
      setSaved(payload);onSaved(result.message);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <section className="pompeii-finalize"><h3>Finalizar escalação</h3><p>Salve os times e funções em Pompeia e o aviso em Pompeia Edições, na mesma planilha. Depois, preencha os pontos por jogador aqui ou diretamente na planilha. Alterações no cadastro não mudam a escalação já salva.</p><div className="pompeii-toolbar"><label>Data da edição<input type="date" required value={date} disabled={busy} onChange={e=>setDate(e.target.value)}/></label><label>Nome da edição<input maxLength={80} required value={name} disabled={busy} onChange={e=>setName(e.target.value)} placeholder="Ex.: Pompeia da manhã"/></label><label>Aliança adversária (opcional)<input maxLength={80} value={opponentAlliance} disabled={busy} onChange={e=>setOpponentAlliance(e.target.value)} placeholder="Tag ou nome da aliança"/></label><button type="button" className="pompeii-primary" disabled={busy||warnings.length>0||text.length>1500||!text.trim()||!date||!name.trim()||saved===payload} onClick={finalize}>{busy?'Salvando na planilha…':saved===payload?'Escalação salva':'Finalizar e salvar na planilha'}</button></div>{error&&<p className="r4-notice" role="alert">{error}</p>}</section>;
}
function ScoreEditor({editionId,player,onSaved}){
  const [value,setValue]=useState(player.points===null?'':String(player.points)),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const points=value.trim()===''?null:Number(value),changed=points!==player.points;
  async function save(e){e.preventDefault();setBusy(true);setError('');try{await historyApi({action:'score',editionId,playerId:player.id,points,expected:player.points});onSaved(points);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <form className="pompeii-score" onSubmit={save}><input type="number" min="0" max={Number.MAX_SAFE_INTEGER} step="1" aria-label={'Pontos de '+player.nick} value={value} onChange={e=>setValue(e.target.value)} disabled={busy} placeholder="Não informado"/><button type="submit" disabled={busy||!changed||points!==null&&(!Number.isSafeInteger(points)||points<0)}>{busy?'Salvando…':'Salvar'}</button>{error&&<small role="alert">{error}</small>}</form>;
}
export default function PompeiiHistory({revision}){
  const [editions,setEditions]=useState([]),[selected,setSelected]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
  async function load(isActive=()=>true){setLoading(true);try{const data=await historyApi();if(isActive()){setEditions(data.editions);setError('');}}catch(e){if(isActive())setError(e.message);}finally{if(isActive())setLoading(false);}}
  useEffect(()=>{let active=true;load(()=>active);return()=>{active=false;};},[revision]);
  const edition=editions.find(e=>e.id===selected)||editions[0];
  const stats=useMemo(()=>historyStats(editions),[editions]);
  function saveScore(playerId,points){setEditions(old=>old.map(e=>e.id===edition.id?{...e,players:e.players.map(p=>p.id===playerId?{...p,points}:p)}:e));}
  return <section className="pompeii-panel"><header className="r4-head"><div><h2>Histórico e pontuações</h2><p>Escalações finalizadas na aba Pompeia, com os avisos em Pompeia Edições. Pontos em branco significam que ainda não foram informados.</p></div><button type="button" disabled={loading} onClick={()=>load()}>{loading?'Carregando…':'Atualizar histórico'}</button></header>{error&&<p className="r4-notice" role="alert">{error}</p>}
    {edition?<><label>Edição salva<select value={edition.id} onChange={e=>setSelected(e.target.value)}>{editions.map(e=><option key={e.id} value={e.id}>{e.date.split('-').reverse().join('/')} · {e.name} · {e.players.length} jogadores</option>)}</select></label>
      <p className="calendar-note">Resultado: <strong>{edition.result||'Não informado'}</strong> · Participantes: <strong>{edition.participants??edition.players.length}</strong> · Oponentes: <strong>{edition.opponents??'Não informado'}</strong> · Aliança adversária: <strong>{edition.opponentAlliance||'Não informada'}</strong>. Preencha o resultado e eventuais ajustes nas quantidades na aba Pompeia Edições.</p><div className="pompeii-history-summary">{['verde','roxa'].map(side=>{const members=edition.players.filter(p=>p.side===side),scored=members.filter(p=>p.points!==null);return <div key={side}><h3>{side==='verde'?'Verde':'Roxa'}</h3><strong>{scored.length?fmt(scored.reduce((sum,p)=>sum+p.points,0)):'Aguardando pontos'}</strong><p>{scored.length} de {members.length} pontuações preenchidas</p></div>;})}</div>
      <div className="rot-table-wrap"><table><thead><tr><th>Jogador</th><th>Lado</th><th>Atuação na edição</th><th>Pontos</th></tr></thead><tbody>{edition.players.map(p=><tr key={edition.id+p.id}><td><strong>{p.nick}</strong></td><td>{p.side==='verde'?'Verde':'Roxa'}</td><td>{ASSIGNMENTS[p.assignment]||p.assignment}</td><td><ScoreEditor key={edition.id+p.id+String(p.points)} editionId={edition.id} player={p} onSaved={points=>saveScore(p.id,points)}/></td></tr>)}</tbody></table></div>
      <details className="pompeii-saved-notice"><summary>Aviso salvo com esta edição</summary><pre>{edition.announcement}</pre></details>
      <h3>Acompanhamento dos jogadores</h3><p>Acumulado das edições salvas. A média considera somente pontuações preenchidas, incluindo zero.</p><div className="rot-table-wrap"><table><thead><tr><th>Jogador</th><th>Edições</th><th>Pontos preenchidos</th><th>Total</th><th>Média</th></tr></thead><tbody>{stats.map(p=><tr key={p.id}><td>{p.nick}</td><td>{p.editions}</td><td>{p.records}</td><td>{p.records?fmt(p.total):'—'}</td><td>{fmt(p.average)}</td></tr>)}</tbody></table></div>
    </>:!loading&&!error&&<p>Nenhuma escalação finalizada ainda. Finalize os times para criar a primeira edição na planilha.</p>}
  </section>;
}
