const {norm,date}=require('./sheet-values.cjs');
const LABELS={A:'Arquipélago',G:'Gênesis',I:'Insular'};
function analyzeMembers(input,event='',limit='6'){
  const available=input.filter(r=>!event||r[1]===event);
  let dates=[...new Set(available.map(r=>r[0]))].sort().reverse();
  if(/^\d+$/.test(limit)&&Number(limit)>0)dates=dates.slice(0,Number(limit));
  else if(/^m[123]$/.test(limit)&&dates.length){const end=Date.parse(dates[0]+'T00:00:00Z');dates=dates.filter(d=>Date.parse(d+'T00:00:00Z')>=end-Number(limit[1])*30*86400000);}
  const accepted=new Set(dates),rows=available.filter(r=>accepted.has(r[0]));
  const rounds=new Map(),players=new Map();
  for(const[d,e,p,points]of rows){
    if(!rounds.has(d))rounds.set(d,{date:d,event:e,label:LABELS[e]||e,total:0,records:0});const round=rounds.get(d);round.total+=points;round.records++;
    const key=norm(p);if(!players.has(key))players.set(key,{player:p,total:0,records:0,best:0,byEvent:{}});const player=players.get(key);player.total+=points;player.records++;player.best=Math.max(player.best,points);if(!player.byEvent[e])player.byEvent[e]={total:0,records:0};player.byEvent[e].total+=points;player.byEvent[e].records++;
  }
  const editions=[...rounds.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(r=>({...r,average:r.records?r.total/r.records:0}));
  const ranking=[...players.values()].map(p=>({...p,average:p.total/p.records})).sort((a,b)=>b.total-a.total||a.player.localeCompare(b.player));
  const total=rows.reduce((sum,r)=>sum+r[3],0);
  const events=Object.entries(LABELS).map(([event,label])=>{const group=editions.filter(e=>e.event===event);const sum=group.reduce((s,e)=>s+e.total,0),records=group.reduce((s,e)=>s+e.records,0);return {event,label,total:sum,records,editions:group.length,average:records?sum/records:0};}).filter(e=>e.editions);
  return {rows,editions,ranking,events,total,players:ranking.length,average:ranking.length?total/ranking.length:0};
}
function individual(analysis,player){
  const key=norm(player),profile=analysis.ranking.find(p=>norm(p.player)===key);
  const history=analysis.editions.map(e=>{const records=analysis.rows.filter(r=>r[0]===e.date);const own=records.find(r=>norm(r[2])===key);return {...e,points:own?.[3]??null,position:own?[...records].sort((a,b)=>b[3]-a[3]||a[2].localeCompare(b[2])).findIndex(r=>norm(r[2])===key)+1:null};});
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
  if(photo<0||player<0)return {items:[],warning:'A aba Queimadinhos precisa das colunas Player e Foto.'};
  const items=[];let invalid=0;
  for(let i=1;i<values.length;i++){const row=values[i];if(!row.some(v=>String(v??'').trim()))continue;if(active>=0&&['false','falso','nao','0'].includes(norm(row[active])))continue;
    const reference=imageReference(row[photo]),name=String(row[player]||'').trim();if(!reference||!name){invalid++;continue;}
    items.push({id:'burnt-'+i,player:name,date:day>=0?date(row[day]):null,caption:caption>=0?String(row[caption]||'').trim().slice(0,500):'',...reference});
  }
  items.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return {items,warning:invalid?`${invalid} registros sem jogador ou link de foto válido foram ignorados.`:null};
}
module.exports={analyzeMembers,individual,imageReference,burntFromSheet,LABELS};
