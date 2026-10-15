(function(root){
  const DAY=86400000;
  function windowFor(event, now=Date.now()) {
    const anchor=Date.parse(event.start);
    const duration=event.durationDays*DAY;
    const loop=event.loopDays*DAY;
    const limit=event.end ? Date.parse(event.end) : Infinity;
    let start=anchor;
    if(loop && now>=anchor) {
      start=anchor+Math.floor((now-anchor)/loop)*loop;
      if(now>=Math.min(start+duration,limit)) start+=loop;
    }
    // A cap can fall in the gap before the next recurrence. Keep the final
    // actual occurrence instead of returning an inverted, imaginary window.
    if(loop && start>=limit && limit>anchor) start=anchor+Math.floor((limit-anchor-1)/loop)*loop;
    const end=Math.min(start+duration,limit);
    const status=now>=limit || (now>=end && (!loop || start+loop>=limit)) ? 'ended' : now<start ? 'upcoming' : 'active';
    return {...event,name:typeof event.name==='string'?event.name.replace(/\bReinos?\b/g,word=>word==='Reinos'?'Regiões':'Região'):event.name,startMs:start,endMs:end,status};
  }
  const compare=(a,b)=>({active:0,upcoming:1,ended:2}[a.status]-{active:0,upcoming:1,ended:2}[b.status])||(a.status==='ended'?b.endMs-a.endMs:a.startMs-b.startMs)||a.id-b.id;
  function regionMatches(event,region){
    return !region || !event.kingdomIds?.length || event.kingdomIds.includes(Number(region));
  }
  function groupRows(rows){
    const families=new Map();
    for(const row of [...rows].sort(compare)){
      let family=families.get(row.name);
      if(!family){family={...row,variants:[],ids:[]};families.set(row.name,family);}
      if(!family.description && row.description && row.sourceKey===family.sourceKey)family.description=row.description;
      family.ids.push(row.id);
      // Fold identical calendar windows, preserving every underlying ID.
      // Different dates, cadence or eligibility remain inspectable variants.
      const key=JSON.stringify([row.sourceKey,row.startMs,row.endMs,row.durationDays,row.loopDays,row.end,row.crossServer,[...(row.kingdomIds||[])].sort((a,b)=>a-b),row.serverDay,row.serverDayEnd,row.conditions||{}]);
      const variant=family.variants.find(v=>v.key===key);
      if(variant)variant.ids.push(row.id);
      else family.variants.push({...row,key,ids:[row.id]});
    }
    return [...families.values()].sort(compare);
  }
  function windowSummary(group){
    return [['active','em andamento'],['upcoming','futura'],['ended','encerrada']]
      .map(([status,label])=>{const count=group.variants.filter(v=>v.status===status).length;return count?count+' '+label+(status!=='active'&&count!==1?'s':''):'';})
      .filter(Boolean).join(' · ');
  }
  function timingFor(group,now){
    const active=group.variants.filter(v=>v.status==='active').sort((a,b)=>a.endMs-b.endMs);
    const window=active[0]||group.variants.find(v=>v.status==='upcoming')||group;
    const remaining=window.status==='active'?window.endMs-now:window.status==='upcoming'?window.startMs-now:0;
    return {window,remaining,ending:window.status==='active'&&remaining>0&&remaining<=2*DAY,
      phase:active.some(v=>v.endMs>window.endMs)||group.variants.some(v=>v.status==='upcoming'),
      progress:window.status==='active'?Math.max(0,Math.min(100,100*(now-window.startMs)/(window.endMs-window.startMs))):window.status==='ended'?100:0};
  }
  function remainingLabel(ms){
    const minutes=Math.max(1,Math.ceil(ms/60000));
    if(minutes<60)return minutes+' min';
    const hours=Math.floor(minutes/60),rest=minutes%60;
    if(hours<48)return hours+'h'+(rest?' '+rest+'min':'');
    const days=Math.floor(hours/24);
    return days+'d'+(hours%24?' '+hours%24+'h':'');
  }
  root.CalendarCore={windowFor,regionMatches,groupRows,windowSummary,timingFor,remainingLabel,compare,DAY};
  if(typeof module!=='undefined') module.exports=root.CalendarCore;
})(typeof window!=='undefined'?window:globalThis);
