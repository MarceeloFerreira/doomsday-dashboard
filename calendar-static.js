(async function(){
  const core=window.CalendarCore;
  const el=id=>document.getElementById(id);
  const fmt=value=>new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeZone:'UTC'}).format(value);
  let data;
  try {
    const response=await fetch('public/data/calendar.json',{cache:'no-store'});
    if(!response.ok) throw Error('HTTP '+response.status);
    data=await response.json();
    if(data.schemaVersion!==1 || !Array.isArray(data.events)) throw Error('Dados inválidos');
  } catch(error) {
    el('calendar-message').textContent='Não foi possível carregar o calendário. Tente atualizar a página.';
    return;
  }
  el('calendar-version').textContent=data.clientVersion+' · build '+data.build+' · patch '+data.patch;
  el('checked-on').textContent=new Intl.DateTimeFormat('pt-PT',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Lisbon'}).format(new Date(data.generatedAt));
  el('calendar-message').textContent='Horários do calendário em UTC. Janelas calculadas a partir da configuração local; confirme a disponibilidade na sua região.';
  const search=el('calendar-search'),filter=el('calendar-filter'),kind=el('calendar-kind');
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function render(){
    const now=Date.now();
    const rows=data.events.map(e=>core.windowFor(e,now));
    const counts={active:0,upcoming:0,ended:0};
    rows.forEach(r=>{if(r.status==='ended'){if(r.endMs>now-7*core.DAY)counts.ended++;}else counts[r.status]++;});
    el('stat-ongoing').textContent=counts.active;
    el('stat-upcoming').textContent=counts.upcoming;
    el('stat-ended').textContent=counts.ended;
    const cutoff=now+30*core.DAY;
    const featured=rows.filter(r=>!r.loopDays && r.status!=='ended' && r.startMs<cutoff).sort((a,b)=>a.startMs-b.startMs);
    const featureRoot=el('calendar-highlights'); featureRoot.replaceChildren();
    featured.slice(0,12).forEach(r=>{
      const card=document.createElement('article'); card.className='card';
      const title=document.createElement('h3'); title.textContent=r.name;
      const detail=document.createElement('p'); detail.textContent=fmt(r.startMs)+' → '+fmt(r.endMs)+' · '+(r.status==='active'?'em andamento':'agendado')+' · ID '+r.id;
      card.append(title,detail);featureRoot.append(card);
    });
    el('calendar-freshness').textContent=now-Date.parse(data.generatedAt)>8*core.DAY?'A coleta tem mais de 8 dias. Aguarde a atualização semanal ou execute uma nova coleta.':'Dados coletados recentemente.';
    const filtered=rows.filter(r=>(!search.value || norm(r.name+' '+r.id).includes(norm(search.value))) && (!filter.value || (filter.value==='recent'?r.status==='ended'&&r.endMs>now-7*core.DAY:r.status===filter.value)) && (!kind.value || (kind.value==='recurring'?r.loopDays>0:!r.loopDays)));
    filtered.sort((a,b)=>({active:0,upcoming:1,ended:2}[a.status]-{active:0,upcoming:1,ended:2}[b.status]) || (a.status==='ended'?b.endMs-a.endMs:a.startMs-b.startMs) || a.id-b.id);
    const fragment=document.createDocumentFragment();
    filtered.forEach(r=>{
      const tr=document.createElement('tr');
      const status=r.status==='active'?'Em andamento · estimado':r.status==='upcoming'?'Agendado · estimado':'Encerrado';
      [r.name+' · ID '+r.id,fmt(r.startMs)+' → '+fmt(r.endMs),r.loopDays?'A cada '+r.loopDays+' dias':'Data fixa',status].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);});
      fragment.append(tr);
    });
    el('calendar-rows').replaceChildren(fragment);
    el('calendar-count').textContent=filtered.length+' de '+rows.length+' registros do cliente';
    el('clock').textContent=new Intl.DateTimeFormat('pt-PT',{timeStyle:'medium',timeZone:'UTC'}).format(now)+' UTC';
  }
  search.addEventListener('input',render);filter.addEventListener('change',render);kind.addEventListener('change',render);
  render();setInterval(render,60000);
})();
