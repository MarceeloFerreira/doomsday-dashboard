const {analyzeMembers,individual}=require('./member-analysis.cjs');
const {norm}=require('./sheet-values.cjs');
function memberProgress(scores,player,analysis,edition=''){
  const personal=individual(analysis,player);
  // Each comparison uses exactly the editions where this player has a record.
  // Missing records never become zero and never inflate/depress an average.
  const breakdown=analysis.events.map(event=>{
    const own=personal.history.filter(e=>e.event===event.event&&e.points!==null);
    const total=own.reduce((s,e)=>s+e.points,0);
    return {...event,ownRecords:own.length,ownAverage:own.length?total/own.length:null,peerAverage:own.length?own.reduce((s,e)=>s+e.average,0)/own.length:null};
  });
  const focus=edition?personal.history.find(e=>e.date===edition):personal.history.filter(e=>e.points!==null).at(-1);
  const priorRows=focus?scores.filter(r=>r[0]<focus.date&&r[1]===focus.event&&norm(r[2])===norm(player)).sort((a,b)=>b[0].localeCompare(a[0])):[];
  const previous=priorRows[0]?{date:priorRows[0][0],points:priorRows[0][3]}:null;
  const delta=focus?.points!==null&&focus?.points!==undefined&&previous?focus.points-previous.points:null;
  const deltaPercent=delta!==null&&previous.points>0?delta/previous.points*100:null;
  // With a single edition selected, retain context from earlier editions of
  // that same event; never include editions after the selected date.
  const trend=edition&&focus?individual(analyzeMembers(scores,focus.event,'0'),player).history.filter(e=>e.date<=focus.date).slice(-8):personal.history;
  const best=personal.history.filter(e=>e.points!==null).reduce((result,e)=>!result||e.points>result.points?e:result,null);
  return {personal,breakdown,focus,previous,delta,deltaPercent,trend,best};
}
module.exports={memberProgress};
