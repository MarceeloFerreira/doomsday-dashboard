const {analyzeMembers}=require('./member-analysis.cjs');
const {norm}=require('./sheet-values.cjs');
function memberSelection(scores,{player='',event='',period='6',edition='',personal=true}={}){
  let effectiveEdition=edition,lastParticipation=null;
  if(period==='latest'&&!edition){
    const matches=scores.filter(row=>(!event||row[1]===event)&&Number.isFinite(row[3])&&(!personal||(player&&norm(row[2])===norm(player))));
    const last=matches.reduce((found,row)=>!found||row[0]>found[0]?row:found,null);
    if(!last)return {analysis:analyzeMembers([]),effectiveEdition:'',lastParticipation:null};
    effectiveEdition=last[0];lastParticipation={date:last[0],event:last[1]};
  }
  return {analysis:analyzeMembers(scores,event,period==='latest'?'0':period,effectiveEdition),effectiveEdition,lastParticipation};
}
module.exports={memberSelection};
