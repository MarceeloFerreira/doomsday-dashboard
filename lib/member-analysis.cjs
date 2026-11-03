const {norm,date}=require('./sheet-values.cjs');
const LABELS={A:'Arquipélago',G:'Gênesis',I:'Insular',P:'Pompeia'};
const editionKey=row=>row[4]||row[0];
const editionOrder=e=>e.date+'|'+(e.finalizedAt||'')+'|'+(e.id||e.date);
function analyzeMembers(input,event='',limit='6',edition=''){
  const available=input.filter(r=>(!event||r[1]===event)&&(!edition||editionKey(r)===edition));
  const rounds=new Map();
  for(const r of available){const key=editionKey(r);if(!rounds.has(key))rounds.set(key,{id:key,date:r[0],event:r[1],label:r[5]||LABELS[r[1]]||r[1],finalizedAt:r[6]||'',total:0,records:0});}
  let selected=[...rounds.values()].sort((a,b)=>editionOrder(b).localeCompare(editionOrder(a)));
  if(/^\d+$/.test(limit)&&Number(limit)>0)selected=selected.slice(0,Number(limit));
  else if(/^m[123]$/.test(limit)&&selected.length){const end=Date.parse(selected[0].date+'T00:00:00Z');selected=selected.filter(e=>Date.parse(e.date+'T00:00:00Z')>=end-Number(limit[1])*30*86400000);}
  const accepted=new Set(selected.map(e=>e.id)),rows=available.filter(r=>accepted.has(editionKey(r))),players=new Map();
  for(const r of rows){const [d,e,p,points]=r;
    const round=rounds.get(editionKey(r));round.total+=points;round.records++;
    const key=norm(p);if(!players.has(key))players.set(key,{player:p,total:0,records:0,best:0,byEvent:Object.create(null)});const player=players.get(key);player.total+=points;player.records++;player.best=Math.max(player.best,points);if(!player.byEvent[e])player.byEvent[e]={total:0,records:0};player.byEvent[e].total+=points;player.byEvent[e].records++;
  }
  const editions=selected.sort((a,b)=>editionOrder(a).localeCompare(editionOrder(b))).map(r=>({...r,average:r.records?r.total/r.records:0}));
  const ranking=[...players.values()].map(p=>({...p,average:p.total/p.records})).sort((a,b)=>b.total-a.total||a.player.localeCompare(b.player));
  const total=rows.reduce((sum,r)=>sum+r[3],0);
  const eventKinds=new Map([...Object.entries(LABELS),...editions.map(e=>[e.event,Object.hasOwn(LABELS,e.event)?LABELS[e.event]:e.event])]);
  const events=[...eventKinds].map(([event,label])=>{const group=editions.filter(e=>e.event===event);const sum=group.reduce((s,e)=>s+e.total,0),records=group.reduce((s,e)=>s+e.records,0);return {event,label,total:sum,records,editions:group.length,average:records?sum/records:0};}).filter(e=>e.editions);
  return {rows,editions,ranking,events,total,players:ranking.length,average:ranking.length?total/ranking.length:0};
}
function individual(analysis,player){
  const key=norm(player),profile=analysis.ranking.find(p=>norm(p.player)===key);
  const history=analysis.editions.map(e=>{const records=analysis.rows.filter(r=>editionKey(r)===(e.id||e.date));const own=records.find(r=>norm(r[2])===key);return {...e,points:own?.[3]??null,position:own?[...records].sort((a,b)=>b[3]-a[3]||a[2].localeCompare(b[2])).findIndex(r=>norm(r[2])===key)+1:null};});
  return {profile,history};
}
function imageReference(value){
  let url;try{url=new URL(String(value||'').trim());}catch{return null;}
  if(url.protocol!=='https:'||url.username||url.password)return null;
  if(['drive.google.com','docs.google.com'].includes(url.hostname)){const id=url.pathname.match(/\/d\/([\w-]+)/)?.[1]||url.searchParams.get('id');return id&&/^[\w-]{10,200}$/.test(id)?{file:id,image:'/api/members/photos?file='+encodeURIComponent(id)}:null;}
  if(url.hostname==='localhost'||url.hostname.endsWith('.local')||/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)||url.hostname.includes(':'))return null;
  return {file:null,image:url.href};
}
function burntFromSheet(values){
  if(!Array.isArray(values)||!values.length)return {items:[],warning:null};
  const headers=values[0].map(norm),col=name=>headers.indexOf(norm(name));
  const photo=col('Foto'),player=col('Player'),day=col('Data'),caption=col('Legenda'),active=col('Ativo');
  if(photo<0||player<0||active<0)return {items:[],warning:'A aba Queimadinhos precisa das colunas Player, Foto e Ativo.'};
  const items=[];const issues=[];
  for(let i=1;i<values.length;i++){const row=values[i];if(!row.some(v=>String(v??'').trim()))continue;if(!['true','verdadeiro','sim','1'].includes(norm(row[active])))continue;
    const reference=imageReference(row[photo]),name=String(row[player]||'').trim();if(!reference||!name){const reason=!name?'preencha o nome do jogador':String(row[photo]||'').includes('/folders/')?'o link é de uma pasta; copie o link do arquivo da foto':'use o link completo do arquivo; se a célula mostra um nome, atualize a versão do Apps Script';issues.push(`Linha ${i+1}: ${reason}.`);continue;}
    items.push({id:'burnt-'+i,player:name,date:day>=0?date(row[day]):null,caption:caption>=0?String(row[caption]||'').trim().slice(0,500):'',...reference});
  }
  items.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return {items,warning:issues.length?issues.slice(0,3).join(' ')+(issues.length>3?` Mais ${issues.length-3} registros inválidos.`:''):null};
}
module.exports={analyzeMembers,individual,editionKey,editionOrder,imageReference,burntFromSheet,LABELS};
