'use client';
import {useState} from 'react';
import {chartAnalysis} from '../lib/r4-analytics.cjs';
const fmt=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(n);
const compact=n=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(n);
const date=s=>s.split('-').reverse().join('/');
const pct=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n)+'%';
const colors={met:'var(--ok)',below:'var(--accent)',unknown:'var(--dim)'};
const labels={met:'Meta atingida',below:'Abaixo da meta',unknown:'Sem avaliação'};
export default function LeadershipCharts({data,rows,onDate,onPlayer,onStatus,status,filtered}){
  const [metric,setMetric]=useState('total');
  const {total,evaluated,counts,top,scale,attention,goalScale,history,median,concentration,goalRate}=chartAnalysis(data,rows);
  const historyValue=e=>metric==='records'?e.records:metric==='average'?(e.records?e.total/e.records:0):e.total;
  const max=Math.max(1,...history.map(historyValue));
  const chart={left:62,right:590,top:26,bottom:182};
  const coords=history.map((e,i)=>({e,x:history.length>1?chart.left+i*(chart.right-chart.left)/(history.length-1):326,y:chart.bottom-historyValue(e)/max*(chart.bottom-chart.top)}));
  const points=coords.map(p=>p.x+','+p.y).join(' ');
  let accumulated=0;
  const segments=Object.entries(counts).map(([key,count])=>{const length=rows.length?count/rows.length*100:0;const result={key,count,length,offset:accumulated};accumulated+=length;return result;});
  const metricName={total:'Pontuação total',average:'Média por jogador',records:'Jogadores com registro'};
  return <section className="r4-analysis" aria-labelledby="r4-analysis-title">
    <header className="r4-section-heading"><div><p className="brand-eyebrow">Leitura da edição</p><h2 id="r4-analysis-title">Visão para decidir</h2><p>{filtered?'Os filtros abaixo estão aplicados aos gráficos de jogadores e à tabela.':'Gráficos de jogadores e tabela mostram todos os registros desta edição.'} O histórico compara edições completas do mesmo evento.</p></div><span className="r4-scope-chip">{rows.length} jogadores na análise</span></header>
    <div className="r4-insights">
      <article><span>Concentração no top 5</span><strong>{concentration===null?'—':pct(concentration)}</strong><p>Parcela dos pontos que veio dos cinco primeiros jogadores da seleção.</p></article>
      <article><span>Pontuação mediana</span><strong>{median===null?'—':compact(median)}</strong><p>Valor central da pontuação dos jogadores selecionados.</p></article>
      <article><span>Cobertura de metas</span><strong>{evaluated.length} <small>/ {rows.length}</small></strong><p>{!rows.length?'Nenhum jogador para estes filtros.':counts.unknown?`${counts.unknown} jogadores sem avaliação. Confira o cadastro ou as regras do evento.`:'Todos os jogadores da seleção têm uma meta calculada.'}</p></article>
    </div>
    <div className="r4-chart-grid">
      <article className="r4-chart-card">
        <header><div><h3>Evolução do evento</h3><p>Até oito edições de {data.edition.label}, até a data selecionada.</p></div></header>
        <div className="r4-metric-tabs" role="group" aria-label="Métrica do histórico">{Object.entries(metricName).map(([key,label])=><button key={key} aria-pressed={metric===key} onClick={()=>setMetric(key)}>{label}</button>)}</div>
        <svg className="r4-history-chart" viewBox="0 0 620 230" role="img" aria-label={`${metricName[metric]} nas últimas ${history.length} edições de ${data.edition.label}. Valores e seleção de edição disponíveis abaixo.`}>
          {[0,.25,.5,.75,1].map(f=><g key={f}><line x1={chart.left} x2={chart.right} y1={chart.bottom-f*(chart.bottom-chart.top)} y2={chart.bottom-f*(chart.bottom-chart.top)} stroke="var(--border)" strokeDasharray="3 5"/><text x={chart.left-10} y={chart.bottom-f*(chart.bottom-chart.top)+4} textAnchor="end">{compact(max*f)}</text></g>)}
          {coords.length>1&&<><polygon points={`${coords[0].x},${chart.bottom} ${points} ${coords.at(-1).x},${chart.bottom}`} fill="var(--ops)" opacity=".08"/><polyline points={points} fill="none" stroke="var(--ops)" strokeWidth="2.5"/></>}
          {coords.map(({e,x,y})=><g key={e.date}><circle cx={x} cy={y} r="5" fill={e.date===data.edition.date?'var(--ops-strong)':'var(--surface)'} stroke="var(--ops)" strokeWidth="2"><title>{date(e.date)}: {fmt(historyValue(e))}</title></circle><text x={x} y="214" textAnchor="middle">{date(e.date).slice(0,5)}</text></g>)}
        </svg>
        {history.length<2&&<p className="r4-chart-note">Uma edição disponível. A tendência aparece quando houver outras edições deste evento.</p>}
        <div className="r4-history-values" aria-label="Valores do histórico">{history.map(e=><button key={e.date} aria-label={`${date(e.date)}: ${metricName[metric]}, ${fmt(historyValue(e))}${e.partial?' · resultado parcial':''}`} onClick={()=>onDate(e.date)} aria-current={e.date===data.edition.date?'true':undefined}><span>{date(e.date)}{e.partial?' *':''}</span><strong>{compact(historyValue(e))}</strong></button>)}</div>
        <p className="r4-chart-note">Selecione uma data acima para abrir a edição. “Jogadores com registro” inclui registros com zero pontos. {history.some(e=>e.partial)&&' * Edição com registros conflitantes excluídos: resultado parcial.'}</p>
      </article>
      <article className="r4-chart-card">
        <header><div><h3>Cumprimento das metas</h3><p>Identifique quem atingiu a meta e quem precisa de acompanhamento.</p></div></header>
        <div className="r4-goal-distribution"><div className="r4-donut"><svg viewBox="0 0 160 160" role="img" aria-label={Object.entries(counts).map(([key,n])=>`${labels[key]}: ${n}`).join('. ')}><circle cx="80" cy="80" r="62" fill="none" stroke="var(--border)" strokeWidth="14"/>{segments.filter(s=>s.length>0).map(s=><circle key={s.key} cx="80" cy="80" r="62" fill="none" stroke={colors[s.key]} strokeWidth="14" pathLength="100" strokeDasharray={`${s.length} ${100-s.length}`} strokeDashoffset={-s.offset} transform="rotate(-90 80 80)"/>)}</svg><div><strong>{goalRate===null?'—':pct(goalRate)}</strong><small>dos avaliados<br/>atingiram a meta</small></div></div><div className="r4-chart-legend">{Object.entries(labels).map(([key,label])=><button key={key} onClick={()=>onStatus(status===key?'':key)} aria-pressed={status===key}><i style={{background:colors[key]}}/><span>{label}</span><strong>{counts[key]}</strong></button>)}</div></div>
        <p className="r4-chart-note">A taxa considera apenas os jogadores com meta calculada. “Sem avaliação” não indica meta atingida nem falha. Clique em uma categoria para filtrar.</p>
      </article>
      <article className="r4-chart-card">
        <header><div><h3>Quem mais pontuou</h3><p>Os dez maiores resultados da seleção, em uma escala comum.</p></div></header>
        <div className="r4-bar-list">{top.map(r=><button className="r4-bar-row" key={r.player} onClick={()=>onPlayer(r.player)} aria-label={`Ver ${r.player} na tabela: ${fmt(r.points)} pontos${r.minimum!==null?', meta '+fmt(r.minimum):''}`}><span className="r4-bar-label">{r.player}<strong>{compact(r.points)}</strong></span><span className="r4-bar-track"><span className="r4-bar-fill" style={{width:(r.points>0?Math.max(.3,r.points/scale*100):0)+'%',background:'var(--ops)'}}/>{r.minimum!==null&&<span className="r4-goal-tick" style={{left:r.minimum/scale*100+'%'}}/>}</span></button>)}</div>
        {!top.length&&<p className="r4-chart-empty">Nenhum jogador para estes filtros.</p>}
        <p className="r4-chart-note"><span className="r4-key-tick"/> A marca vertical indica a meta individual, quando disponível. Clique no jogador para encontrá-lo na tabela.</p>
      </article>
      <article className="r4-chart-card">
        <header><div><h3>Onde focar o acompanhamento</h3><p>Até doze jogadores com menor percentual de cumprimento da meta.</p></div></header>
        <div className="r4-bar-list">{attention.map(r=><button className="r4-bar-row" key={r.player} onClick={()=>onPlayer(r.player)} aria-label={`Ver ${r.player} na tabela: ${pct(r.percent)} da meta`}><span className="r4-bar-label">{r.player}<strong style={{color:colors[r.status]}}>{pct(r.percent)}</strong></span><span className="r4-bar-track"><span className="r4-bar-fill" style={{width:Math.min(200,r.percent)/goalScale*100+'%',background:colors[r.status]}}/><span className="r4-goal-tick" style={{left:100/goalScale*100+'%'}}/></span></button>)}</div>
        {!attention.length&&<p className="r4-chart-empty">{rows.length?'Não há metas calculadas para esta seleção. As metas dependem das tropas, do poder na planilha e de uma regra para o evento.':'Nenhum jogador para estes filtros.'}</p>}
        <p className="r4-chart-note"><span className="r4-key-tick"/> A referência é 100% da meta. Barras limitadas a 200%; o percentual escrito mostra o valor completo. As metas usam o poder e a tropa atuais.</p>
      </article>
    </div>
  </section>;
}
