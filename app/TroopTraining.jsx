'use client';
import {useEffect,useState} from 'react';
import training from '../public/troop-training.cjs';
import './troop-training.css';

const {TROOP_TYPES,RESOURCES,DEFAULT_SPEED,MAX_QUANTITY,supremoScores,speedupSeconds,splitMinutes,minutesLabel,calculate,duration}=training;
const STORAGE_KEY='bope:troop-planner:v1';
const savedNumber=value=>typeof value==='string'&&value.length<=32&&/^[0-9.eE+\-]*$/.test(value);
const fmt=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(n);
const decimal=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n);
function NumberField({id,label,value,onChange,max,step=1}){
  return <label className="troop-field" htmlFor={id}><span>{label}</span><input id={id} type="number" inputMode={step===1?'numeric':'decimal'} min="0" max={max} step={step} value={value} onChange={e=>onChange(e.target.value)}/></label>;
}
function TimeValue({seconds}){
  return <span className="troop-time-value"><span>{duration(seconds)}</span><small>{minutesLabel(seconds)}</small></span>;
}
export default function TroopTraining(){
  const [type,setType]=useState('infantry');
  const units=TROOP_TYPES[type].units;
  const typeLabel=TROOP_TYPES[type].label;
  const [operation,setOperation]=useState('training'),[highestTier,setHighestTier]=useState(6);
  const [mode,setMode]=useState('quantity'),[tier,setTier]=useState(6),[quantity,setQuantity]=useState('1000'),[speed,setSpeed]=useState(String(DEFAULT_SPEED));
  const [time,setTime]=useState({days:'1',hours:'0',minutes:'0'});
  const [speedupFormat,setSpeedupFormat]=useState('minutes'),[totalMinutes,setTotalMinutes]=useState('1440');
  const [storageReady,setStorageReady]=useState(false);
  useEffect(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(saved&&saved.version===1){
        if(Object.hasOwn(TROOP_TYPES,saved.type))setType(saved.type);
        const restoredOperation=['training','evolution'].includes(saved.operation)?saved.operation:'training';
        const restoredHighest=Number.isInteger(saved.highestTier)&&saved.highestTier>=2&&saved.highestTier<=6?saved.highestTier:6;
        const restoredTier=Number.isInteger(saved.tier)&&saved.tier>=1&&saved.tier<=6?saved.tier:6;
        setOperation(restoredOperation);setHighestTier(restoredHighest);
        setTier(restoredOperation==='evolution'?Math.min(restoredTier,restoredHighest-1):restoredTier);
        if(['quantity','speedups'].includes(saved.mode))setMode(saved.mode);
        if(['minutes','days'].includes(saved.speedupFormat))setSpeedupFormat(saved.speedupFormat);
        if(savedNumber(saved.quantity))setQuantity(saved.quantity);
        if(savedNumber(saved.speed))setSpeed(saved.speed);
        if(savedNumber(saved.totalMinutes))setTotalMinutes(saved.totalMinutes);
        if(saved.time&&['days','hours','minutes'].every(key=>savedNumber(saved.time[key])))setTime({days:saved.time.days,hours:saved.time.hours,minutes:saved.time.minutes});
      }
    }catch{/* Unavailable storage or damaged saved data must not block the calculator. */}
    setStorageReady(true);
  },[]);
  useEffect(()=>{
    if(!storageReady)return;
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,type,operation,highestTier,mode,tier,quantity,speed,time,speedupFormat,totalMinutes}));
    }catch{/* Keep the calculator usable if the browser blocks storage or its quota is full. */}
  },[storageReady,type,operation,highestTier,mode,tier,quantity,speed,time,speedupFormat,totalMinutes]);
  function changeSpeedupFormat(next){
    try{
      const value=splitMinutes(speedupSeconds({format:speedupFormat,minutes:totalMinutes,time}));
      setTotalMinutes(value.minutes);setTime(value.time);
    }catch{/* Preserve the editable values if the current format is incomplete. */}
    setSpeedupFormat(next);
  }
  const evolving=operation==='evolution';
  const levels=units.filter(unit=>!evolving||unit.tier<highestTier);
  function changeOperation(value){setOperation(value);if(value==='evolution'&&tier>=highestTier)setTier(1);}
  let result,rows=[],typeRows=[],error='';
  try{
    if(speed===''||(mode==='quantity'&&quantity===''))throw Error('Preencha os campos para calcular.');
    const input={type,operation,highestTier,mode,quantity:mode==='quantity'?Number(quantity):0,speed:Number(speed),budget:mode==='speedups'?speedupSeconds({format:speedupFormat,minutes:totalMinutes,time}):0};
    rows=levels.map(unit=>calculate({...input,tier:unit.tier}));
    result=rows.find(row=>row.tier===tier);
    typeRows=Object.entries(TROOP_TYPES).map(([key,info])=>({...calculate({...input,type:key,tier}),label:info.label}));
  }catch(e){error=e.message;}
  const scores=result&&!error?supremoScores(result,mode==='speedups'?speedupSeconds({format:speedupFormat,minutes:totalMinutes,time}):result.usedSeconds):null;
  return <section className="troop-planner" aria-labelledby="troop-planner-title">
    <header className="troop-header"><div><p className="troop-eyebrow">Planeje o crescimento do seu exército</p><h2 id="troop-planner-title">Treinamento e evolução de tropas</h2><p>Transforme seus aceleradores em tropas ou descubra os recursos para alcançar sua meta.</p></div><span className="troop-reference">Tempos base sem bônus</span></header>
    <div className="troop-types" role="group" aria-label="Tipo de tropa">
      {Object.entries(TROOP_TYPES).map(([key,info])=><button key={key} type="button" aria-pressed={type===key} onClick={()=>setType(key)}>{info.label}</button>)}
    </div>
    <div className="troop-layout">
      <section className="troop-input-card" aria-label="Configurar treinamento">
        <div className="troop-operation" role="group" aria-label="Operação"><button type="button" aria-pressed={!evolving} onClick={()=>changeOperation('training')}>Treinar novas tropas</button><button type="button" aria-pressed={evolving} onClick={()=>changeOperation('evolution')}>Evoluir tropas</button></div>
        {evolving&&<><label className="troop-field" htmlFor="troop-highest"><span>Seu maior nível desbloqueado</span><select id="troop-highest" value={highestTier} onChange={e=>{const value=Number(e.target.value);setHighestTier(value);if(tier>=value)setTier(value-1);}}>{units.filter(unit=>unit.tier>1).map(unit=><option key={unit.tier} value={unit.tier}>T{unit.tier}</option>)}</select></label><p className="troop-evolution-note">Todas as tropas selecionadas evoluem para T{highestTier}. O custo e o tempo são a diferença entre o nível de destino e o de origem. Um recurso que não é exigido no destino tem custo adicional zero, sem reembolso.</p></>}
        <div className="troop-mode" role="group" aria-label="Calcular a partir de">
          <button type="button" aria-pressed={mode==='quantity'} onClick={()=>setMode('quantity')}>Quantidade de tropas</button>
          <button type="button" aria-pressed={mode==='speedups'} onClick={()=>setMode('speedups')}>Aceleradores disponíveis</button>
        </div>
        <fieldset className="troop-tiers"><legend>{evolving?`Nível de origem · ${typeLabel}`:`Nível · ${typeLabel}`}</legend><div>{levels.map(unit=><button key={unit.tier} type="button" aria-pressed={tier===unit.tier} className={'troop-tier troop-tier-'+unit.tier} onClick={()=>setTier(unit.tier)}>T{unit.tier}</button>)}</div></fieldset>
        {mode==='quantity'?<NumberField id="troop-quantity" label={evolving?'Quantas tropas você quer evoluir?':'Quantas tropas você quer treinar?'} value={quantity} onChange={setQuantity} max={MAX_QUANTITY}/>:<fieldset className="troop-time"><legend>Quanto tempo de aceleradores você tem?</legend>
          <div className="troop-speedup-format" role="group" aria-label="Formato dos aceleradores"><button type="button" aria-pressed={speedupFormat==='minutes'} onClick={()=>changeSpeedupFormat('minutes')}>Em minutos</button><button type="button" aria-pressed={speedupFormat==='days'} onClick={()=>changeSpeedupFormat('days')}>Em dias, horas e minutos</button></div>
          {speedupFormat==='minutes'?<><NumberField id="troop-total-minutes" label="Total de minutos de aceleradores" value={totalMinutes} onChange={setTotalMinutes}/><p className="troop-help">Digite o total inteiro de minutos, sem vírgula, ponto ou a letra m. Exemplo: se o jogo mostra 191,498m, preencha 191498. A vírgula no jogo separa os milhares; não indica uma fração de minuto.</p></>:<div className="troop-time-fields">{[['days','Dias'],['hours','Horas'],['minutes','Minutos']].map(([key,label])=><NumberField key={key} id={'troop-time-'+key} label={label} value={time[key]} onChange={value=>setTime(previous=>({...previous,[key]:value}))}/>)}</div>}
        </fieldset>}
        <NumberField id="troop-speed" label="Sua velocidade de treinamento (%)" value={speed} onChange={setSpeed} step={0.1} max={10000}/>
        <p className="troop-help">Informe o bônus exibido no jogo: por exemplo, +97,3% corresponde a 97,3 neste campo.</p><p className="troop-help">Suas escolhas e valores ficam salvos neste navegador para a próxima visita.</p>
      </section>
      <section className="troop-results" aria-label="Resultado do treinamento" aria-live="polite" aria-atomic="true">
        {error?<p className="troop-error" role="status">{error}</p>:<>
          <div className="troop-main-result"><span>{typeLabel} {evolving?`T${tier} → T${highestTier}`:`T${tier}`} · {mode==='quantity'?'sua meta':'com seus aceleradores'}</span><strong>{fmt(result.troops)}</strong><span>tropas {mode==='quantity'?'para':'que você pode'} {evolving?'evoluir':'treinar'}</span></div>
          <div className="troop-resource-grid">{RESOURCES.map(([key,label])=><div key={key}><span>{label}</span><strong>{fmt(result[key])}</strong></div>)}</div>
          <dl className="troop-time-summary"><div><dt>{mode==='quantity'?'Tempo de aceleradores necessário':'Aceleradores utilizados'}</dt><dd><TimeValue seconds={result.requiredSeconds}/></dd></div>{mode==='speedups'&&<div><dt>Saldo de aceleradores</dt><dd><TimeValue seconds={result.remainingSeconds}/></dd></div>}<div><dt>Tempo por tropa</dt><dd>{decimal(result.secondsPerTroop)}s</dd></div></dl>
          <p className="troop-help">{mode==='speedups'?`O resultado considera apenas tropas inteiras e o tempo disponível. Você também precisa dos recursos acima.${evolving?' A quantidade final depende de quantas tropas de origem você possui.':''}`:`O tempo mostrado corresponde à soma ${evolving?'da evolução':'do treinamento'} dessas tropas, antes de descontar espera natural.`}</p>
          <section className="troop-supremo" aria-labelledby="troop-supremo-title">
            <h3 id="troop-supremo-title">Pontuação no Supremo</h3>
            <article className={'troop-score-phase troop-day1'+(scores.excess>0?' is-over-limit':'')}>
              <h4>Dia 1 · Uso de aceleradores</h4>
              <span className="troop-score-caption">Pontuação calculada com seus aceleradores</span>
              <strong className="troop-score-number">{fmt(scores.raw)} <small>pontos</small></strong>
              {scores.excess>0&&<div className="troop-limit-alert" role="status"><strong>Limite do Dia 1 ultrapassado</strong><p>{fmt(scores.excess)} pontos acima do teto. Essa parte não entra na pontuação do evento.</p></div>}
              <dl className="troop-day1-totals"><div><dt>Pontos que contam no Dia 1</dt><dd>{fmt(scores.credited)}</dd></div><div><dt>Limite da categoria de aceleradores</dt><dd>{fmt(scores.cap)}</dd></div></dl>
              <p className="troop-help">{fmt(scores.minutes)} minutos × 250 pontos por minuto. O teto é atingido com 400.000 minutos de aceleradores; usar mais não aumenta os pontos desta categoria.</p>
              <p className="troop-help">{mode==='speedups'?'Usa o total de aceleradores que você informou, incluindo a sobra do treinamento.':'Considera usar aceleradores em todo o tempo necessário para esta quantidade de tropas.'} O tempo que passa naturalmente não gera esses pontos.</p>
            </article>
            <article className="troop-score-phase"><h4>Dia 3 · Treinamento de tropas e roleta</h4><strong className="troop-score-number">{fmt(result.troops*(training.SUPREMO_TROOP_POINTS[result.targetTier]-(evolving?training.SUPREMO_TROOP_POINTS[tier]:0)))} <small>pontos</small></strong><p className="troop-help">{fmt(result.troops)} tropas × {evolving?`(${training.SUPREMO_TROOP_POINTS[result.targetTier]} − ${training.SUPREMO_TROOP_POINTS[tier]})`:training.SUPREMO_TROOP_POINTS[tier]} pontos {evolving?'pela diferença entre os níveis':'por tropa'}. Pontos pelas tropas {evolving?'evoluídas':'treinadas'} e concluídas no Dia 3. Giros de roleta não estão incluídos.</p></article>
            <p className="troop-help troop-score-note">Compare em qual dia usar seus recursos: no Dia 3, você pontua pelas tropas concluídas; no Dia 1, pelos aceleradores usados. Cada valor representa um cenário, sem somar os dois.</p>
          </section>
        </>}
      </section>
    </div>
    <section className="troop-comparison" aria-labelledby="troop-type-comparison-title"><header><h3 id="troop-type-comparison-title">Compare os tipos de tropa</h3><p>{mode==='speedups'?'Quanto você consegue com os mesmos aceleradores em cada tipo.':'Recursos para a mesma quantidade em cada tipo.'} {evolving?`Evolução de T${tier} para T${highestTier}.`:`Treinamento de T${tier}.`} Cada linha é uma alternativa independente.</p></header>
      <div className="troop-table-scroll"><table><thead><tr><th scope="col">Tipo</th><th scope="col">Tropas</th>{RESOURCES.map(([key,label])=><th scope="col" key={key}>{label}</th>)}<th scope="col">Tempo utilizado</th>{mode==='speedups'&&<th scope="col">Saldo</th>}</tr></thead><tbody>{typeRows.map(row=><tr key={row.type} className={row.type===type?'is-selected':''}><th scope="row"><button type="button" aria-pressed={row.type===type} onClick={()=>setType(row.type)}>{row.label}</button></th><td>{fmt(row.troops)}</td>{RESOURCES.map(([key])=><td key={key}>{fmt(row[key])}</td>)}<td><TimeValue seconds={row.requiredSeconds}/></td>{mode==='speedups'&&<td><TimeValue seconds={row.remainingSeconds}/></td>}</tr>)}</tbody></table></div>
    </section>
    <section className="troop-comparison" aria-labelledby="troop-comparison-title"><header><h3 id="troop-comparison-title">{evolving?`Compare as evoluções para T${highestTier}`:'Compare os seis níveis'}</h3><p>{mode==='quantity'?'A mesma quantidade de tropas em cada alternativa.':'O mesmo tempo de aceleradores em cada alternativa; são opções, não uma soma.'}</p></header>
      <div className="troop-table-scroll"><table><thead><tr><th scope="col">{typeLabel}</th><th scope="col">Tropas</th><th scope="col">Tomate</th><th scope="col">Madeira</th><th scope="col">Aço</th><th scope="col">Petróleo</th><th scope="col">Tempo utilizado</th>{mode==='speedups'&&<th scope="col">Saldo</th>}</tr></thead><tbody>{rows.map(row=><tr key={row.tier} className={row.tier===tier?'is-selected':''}><th scope="row"><button type="button" aria-pressed={row.tier===tier} onClick={()=>setTier(row.tier)}>{evolving?`T${row.tier} → T${highestTier}`:`T${row.tier}`}</button></th><td>{fmt(row.troops)}</td><td>{fmt(row.tomato)}</td><td>{fmt(row.wood)}</td><td>{fmt(row.steel)}</td><td>{fmt(row.oil)}</td><td><TimeValue seconds={row.requiredSeconds}/></td>{mode==='speedups'&&<td><TimeValue seconds={row.remainingSeconds}/></td>}</tr>)}</tbody></table></div>
    </section>
    <details className="troop-source"><summary>Custos de referência por tropa</summary><p>Tempos base de {typeLabel.toLowerCase()}, sem bônus de velocidade. O tempo final é o tempo base dividido por (1 + velocidade / 100). Recursos não mudam ao alterar a velocidade.</p><div className="troop-table-scroll"><table><thead><tr><th scope="col">Nível</th><th scope="col">Tempo</th><th scope="col">Tomate</th><th scope="col">Madeira</th><th scope="col">Aço</th><th scope="col">Petróleo</th></tr></thead><tbody>{units.map(unit=><tr key={unit.tier}><th scope="row">T{unit.tier}</th><td>{duration(unit.seconds)}</td><td>{fmt(unit.tomato)}</td><td>{fmt(unit.wood)}</td><td>{fmt(unit.steel||0)}</td><td>{fmt(unit.oil)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
