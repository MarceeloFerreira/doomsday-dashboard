(async function(){
  const core=window.CalendarCore;
  const el=id=>document.getElementById(id);
  const fmt=value=>new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeZone:'UTC'}).format(value);
  let data;
  try {
    let response=await fetch('/api/calendar',{cache:'no-store'});
    if(!response.ok)response=await fetch('/data/calendar.json',{cache:'no-store'});
    if(!response.ok) throw Error('HTTP '+response.status);
    data=await response.json();
    if(data.schemaVersion!==1 || !Array.isArray(data.events)) throw Error('Dados inválidos');
  } catch(error) {
    el('calendar-message').textContent='Não foi possível carregar o calendário. Tente atualizar a página.';
    return;
  }
  el('calendar-version').textContent=data.clientVersion+' · build '+data.build+' · patch '+data.patch;
  el('checked-on').textContent=new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Lisbon'}).format(new Date(data.generatedAt));
  el('calendar-message').textContent='Região 541 · horários em UTC. Nomes agrupados; abra os detalhes para consultar as fases. A idade da região não foi confirmada. Janelas calculadas a partir da configuração local; confirme a disponibilidade na sua região.';
  const search=el('calendar-search'),filter=el('calendar-filter'),kind=el('calendar-kind');
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function render(){
    const now=Date.now();
    const rows=data.events.filter(e=>core.regionMatches(e,541)).map(e=>core.windowFor(e,now));
    const counts={active:0,upcoming:0,ended:0};
    for(const status of Object.keys(counts))counts[status]=core.groupRows(rows.filter(r=>r.status===status&&(status!=='ended'||r.endMs>now-7*core.DAY))).length;
    el('stat-ongoing').textContent=counts.active;
    el('stat-upcoming').textContent=counts.upcoming;
    el('stat-ended').textContent=counts.ended;
    const cutoff=now+30*core.DAY;
    const featured=core.groupRows(rows.filter(r=>!r.loopDays && r.status!=='ended' && r.startMs<cutoff));
    const featureRoot=el('calendar-highlights'); featureRoot.replaceChildren();
    featured.slice(0,12).forEach(r=>{
      const card=document.createElement('article'); card.className='card';
      const title=document.createElement('h3'); title.textContent=r.name;
      const detail=document.createElement('p'); detail.textContent=fmt(r.startMs)+' → '+fmt(r.endMs)+' · '+(r.status==='active'?'em andamento':'agendado')+' · '+r.variants.length+' janela(s)';
      card.append(title,detail);featureRoot.append(card);
    });
    el('calendar-freshness').textContent=now-Date.parse(data.generatedAt)>8*core.DAY?'A coleta tem mais de 8 dias. Aguarde a atualização semanal ou execute uma nova coleta.':'Dados coletados recentemente.';
    const filtered=core.groupRows(rows.filter(r=>(!search.value || norm(r.name+' '+r.id).includes(norm(search.value))) && (!filter.value || (filter.value==='recent'?r.status==='ended'&&r.endMs>now-7*core.DAY:r.status===filter.value)) && (!kind.value || (kind.value==='recurring'?r.loopDays>0:!r.loopDays))));
    filtered.sort((a,b)=>({active:0,upcoming:1,ended:2}[a.status]-{active:0,upcoming:1,ended:2}[b.status]) || (a.status==='ended'?b.endMs-a.endMs:a.startMs-b.startMs) || a.id-b.id);
    const fragment=document.createDocumentFragment();
    filtered.forEach(r=>{
      const tr=document.createElement('tr');
      const status=r.status==='active'?'Em andamento · estimado':r.status==='upcoming'?'Agendado · estimado':'Encerrado';
      [r.name+' · IDs '+r.ids.join(', '),fmt(r.startMs)+' → '+fmt(r.endMs),r.loopDays?'A cada '+r.loopDays+' dias':'Data fixa',status].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);});
      const details=document.createElement('details');
      const summary=document.createElement('summary');summary.textContent='Ver janelas, fases e IDs';details.append(summary);
      r.variants.forEach(v=>{const line=document.createElement('p');line.textContent=fmt(v.startMs)+' → '+fmt(v.endMs)+' · '+v.status+' · IDs '+v.ids.join(', ');details.append(line);});
      tr.cells[0].append(details);
      fragment.append(tr);
    });
    el('calendar-rows').replaceChildren(fragment);
    el('calendar-count').textContent=filtered.length+' de '+core.groupRows(rows).length+' eventos · região 541';
    el('clock').textContent=new Intl.DateTimeFormat('pt-PT',{timeStyle:'medium',timeZone:'UTC'}).format(now)+' UTC';
  }
  search.addEventListener('input',render);filter.addEventListener('change',render);kind.addEventListener('change',render);
  render();setInterval(render,60000);
})();
