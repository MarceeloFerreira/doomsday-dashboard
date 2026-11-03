const {analyzeMembers,editionKey,editionOrder}=require('./member-analysis.cjs');
const {norm}=require('./sheet-values.cjs');
function memberSelection(scores,{player='',event='',period='6',edition='',personal=true}={}){
  let effectiveEdition=edition,lastParticipation=null;
  if(period==='latest'&&!edition){
    const matches=scores.filter(row=>(!event||row[1]===event)&&Number.isFinite(row[3])&&(!personal||(player&&norm(row[2])===norm(player))));
    const order=row=>editionOrder({date:row[0],id:editionKey(row),finalizedAt:row[6]||''});
    const last=matches.reduce((found,row)=>!found||order(row)>order(found)?row:found,null);
    if(!last)return {analysis:analyzeMembers([]),effectiveEdition:'',lastParticipation:null};
    effectiveEdition=editionKey(last);lastParticipation={date:last[0],event:last[1],name:last[5]};
  }
  return {analysis:analyzeMembers(scores,event,period==='latest'?'0':period,effectiveEdition),effectiveEdition,lastParticipation};
}
module.exports={memberSelection};
