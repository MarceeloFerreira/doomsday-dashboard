const {norm}=require('./sheet-values.cjs');
function pompeiiPlayers(source,profiles){
  if(source?.source!=='google-sheets'||!source.members?.length)return [];
  return source.members.filter(p=>p.inAlliance===true&&p.type==='conta').map(row=>{
    const gameId=/^[0-9]{1,30}$/.test(String(row.id||''))?String(row.id):null;
    const profile=profiles.find(p=>gameId&&p.game_id===gameId)||profiles.find(p=>norm(p.nick)===norm(row.player)&&(!gameId||!p.game_id||p.game_id===gameId));
    return {id:gameId?'game:'+gameId:'nick:'+norm(row.player),nick:row.player,gameId,power:row.power,troops:row.troops,roles:profile?.pompeii_roles||[]};
  }).sort((a,b)=>a.nick.localeCompare(b.nick,'pt-BR'));
}
module.exports={pompeiiPlayers};
