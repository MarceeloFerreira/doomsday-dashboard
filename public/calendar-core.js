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
    const end=Math.min(start+duration,limit);
    const status=now>=limit || (!loop && now>=end) ? 'ended' : now<start ? 'upcoming' : 'active';
    return {...event,name:typeof event.name==='string'?event.name.replace(/\bReinos?\b/g,word=>word==='Reinos'?'Regiões':'Região'):event.name,startMs:start,endMs:end,status};
  }
  root.CalendarCore={windowFor,DAY};
  if(typeof module!=='undefined') module.exports=root.CalendarCore;
})(typeof window!=='undefined'?window:globalThis);
