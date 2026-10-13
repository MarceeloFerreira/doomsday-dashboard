function chartAnalysis(data,rows){
  const ranked=rows.slice().sort((a,b)=>b.points-a.points||a.player.localeCompare(b.player));
  const total=ranked.reduce((sum,r)=>sum+r.points,0);
  const evaluated=ranked.filter(r=>r.minimum!==null);
  const counts=Object.fromEntries(['met','below','unknown'].map(key=>[key,ranked.filter(r=>r.status===key).length]));
  const top=ranked.slice(0,10),scale=Math.max(1,...top.map(r=>Math.max(r.points,r.minimum||0)));
  const attention=evaluated.slice().sort((a,b)=>a.percent-b.percent).slice(0,12);
  const goalScale=Math.max(100,...attention.map(r=>Math.min(r.percent,200)));
  const history=data.events.filter(e=>e.event===data.edition.event&&e.date<=data.edition.date).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).reverse();
  const top5=ranked.slice(0,5).reduce((sum,r)=>sum+r.points,0);
  const median=ranked.length?(ranked.length%2?ranked[Math.floor(ranked.length/2)].points:(ranked[ranked.length/2-1].points+ranked[ranked.length/2].points)/2):null;
  return {total,evaluated,counts,top,scale,attention,goalScale,history,median,concentration:total?top5/total*100:null,goalRate:evaluated.length?counts.met/evaluated.length*100:null};
}
module.exports={chartAnalysis};
