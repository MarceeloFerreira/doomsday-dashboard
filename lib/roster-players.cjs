const nickKey=value=>String(value||'').trim().toLowerCase();
const sheetKey=row=>'sheet:'+encodeURIComponent(row.game_id?'id:'+row.game_id:'nick:'+nickKey(row.nick));
function playerChoices(source,players,members){
  const available=source?.source==='google-sheets'&&Array.isArray(source.members)&&source.members.length>0;
  const owners=new Map(members.filter(m=>m.player_id).map(m=>[m.player_id,{id:m.id,name:m.display_name,email:m.email}]));
  if(!available)return {players:players.map(p=>({...p,owner:owners.get(p.id)||null})),rosterAvailable:false,rosterWarning:'A lista atual da planilha está indisponível. Exibindo apenas os players já cadastrados; confira a configuração da planilha e tente atualizar.',rosterFetchedAt:null};
  const choices=[],seen=new Set();
  for(const row of source.members){
    const nick=String(row.player||'').trim();if(!nick)continue;
    const game_id=/^[0-9]{1,30}$/.test(String(row.id||''))?String(row.id):null;
    const match=players.find(p=>game_id&&p.game_id===game_id)||players.find(p=>nickKey(p.nick)===nickKey(nick)&&(!game_id||!p.game_id||p.game_id===game_id));
    const choice={id:match?.id||sheetKey({nick,game_id}),nick,game_id,fromSheet:true,inAlliance:row.inAlliance,owner:match?owners.get(match.id)||null:null};
    if(seen.has(choice.id))continue;seen.add(choice.id);choices.push(choice);
  }
  // Never hide an existing link because a nickname changed without an ID or a
  // source row disappeared. Let the admin explicitly move it to the correct row.
  for(const p of players)if(owners.has(p.id)&&!seen.has(p.id))choices.push({...p,owner:owners.get(p.id),sheetMissing:true});
  choices.sort((a,b)=>a.nick.localeCompare(b.nick,'pt-BR'));
  return {players:choices,rosterAvailable:true,rosterWarning:null,rosterFetchedAt:source.fetchedAt||null};
}
function occupiedMessage(owner){return `Esse jogador já está cadastrado na conta ${owner.name} (${owner.email}). Desvincule-o dessa conta antes de transferi-lo.`;}
module.exports={playerChoices,occupiedMessage,nickKey};
