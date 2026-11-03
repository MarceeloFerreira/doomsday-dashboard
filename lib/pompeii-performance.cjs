const {norm}=require('./sheet-values.cjs');
function mergePompeiiScores(baseRows,editions,members=[]){
  const rows=[],dates=new Set(),partial=[];
  for(const edition of editions){
    const registered=edition.players.filter(p=>p.points!==null);
    if(registered.length<edition.players.length)partial.push(edition.id);
    dates.add(edition.date);
    for(const p of registered){
      if(!Number.isSafeInteger(p.points)||p.points<0)throw Error('Pontuação inválida na Pompeia.');
      const current=p.id.startsWith('game:')?members.find(m=>String(m.id)===p.id.slice(5)):null;
      rows.push([edition.date,'P',current?.player||p.nick,p.points,'pompeia:'+edition.id,edition.name,edition.finalizedAt||'']);
    }
  }
  // The dedicated sheet is authoritative on its dates. Do not count a manual
  // copy of these Pompeii points in Hist. Pontuações a second time.
  const original=baseRows.filter(r=>!(['p','pompeia'].includes(norm(r[1]))&&dates.has(r[0]))).map(r=>['p','pompeia'].includes(norm(r[1]))?[r[0],'P',...r.slice(2)]:r);
  return {rows:[...original,...rows],partialEditionIds:partial.map(id=>'pompeia:'+id)};
}
module.exports={mergePompeiiScores};
