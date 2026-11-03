const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildTeams,inspectTeams,movePlayer,assignPlayer,announcement,validateRoles}=require('../lib/pompeii.cjs');
const {pompeiiPlayers}=require('../lib/pompeii-roster.cjs');
const player=(id,roles,power=100)=>({id:String(id),nick:'Jogador '+id,roles,power});
const eligible=()=>[player(1,['rally'],1000),player(2,['rally'],900),...Array.from({length:4},(_,i)=>player(i+3,['guarnicao'],800-i*100)),...Array.from({length:7},(_,i)=>player(i+7,['campo'],400-i*10))];
test('balances thirteen players with one rally and two garrisons on each side',()=>{
  const players=eligible(),teams=buildTeams(players);
  assert.equal(inspectTeams(teams,players).length,0);
  assert.deepEqual([teams.verde.length,teams.roxa.length].sort(),[6,7]);
  const ids=[...teams.verde,...teams.roxa].map(e=>e.id);
  assert.equal(new Set(ids).size,13);assert.equal(ids.length,13);
  for(const side of ['verde','roxa'])for(const role of ['rally','heliponto','base'])assert.equal(teams[side].filter(e=>e.assignment===role).length,1);
  const sum=side=>teams[side].reduce((s,e)=>s+players.find(p=>p.id===e.id).power,0);
  assert.ok(Math.abs(sum('verde')-sum('roxa'))<=400);
  assert.deepEqual(buildTeams(players),teams);
});
test('matching preserves scarce capabilities when the strongest player has multiple roles',()=>{
  const players=[player(1,['rally','guarnicao'],1000),player(2,['rally'],900),...Array.from({length:4},(_,i)=>player(i+3,['guarnicao'],500-i*50))];
  const teams=buildTeams(players);assert.deepEqual(inspectTeams(teams,players),[]);
  assert.equal([...teams.verde,...teams.roxa].find(e=>e.id==='1').assignment,'rally');
});
test('missing specialists remain unfilled and unknown power does not create NaN',()=>{
  const players=[player(1,[],null),player(2,['campo'],null),player(3,['rally'],50)];
  const teams=buildTeams(players),warnings=inspectTeams(teams,players);
  assert.equal(warnings.filter(w=>w.includes('defina 1')).length,5);
  assert.ok(!JSON.stringify(teams).includes('NaN'));
  assert.equal([...teams.verde,...teams.roxa].find(e=>e.id==='1').assignment,'zumbis');
});
test('manual movements preserve unique players and report vacancies and invalid capabilities',()=>{
  const players=eligible(),teams=buildTeams(players),id=teams.verde.find(e=>e.assignment==='rally').id;
  const moved=movePlayer(teams,id,'roxa');
  assert.equal(moved.verde.some(e=>e.id===id),false);assert.equal(moved.roxa.filter(e=>e.id===id).length,1);
  assert.ok(inspectTeams(moved,players).some(w=>w.includes('Verde: defina 1 responsável por Rally')));
  assert.equal(teams.verde.some(e=>e.id===id),true);
  const field=teams.verde.find(e=>e.assignment==='campo');
  const assigned=assignPlayer(teams,field.id,'rally',players);
  assert.equal(assigned.verde.filter(e=>e.assignment==='rally').length,1);
  assert.ok(inspectTeams(assigned,players).some(w=>w.includes('não consta')));
  assert.equal(movePlayer(teams,'absent','verde'),teams);
});
test('notice excludes rally/garrisons from zombies and respects the game limit for the supplied roster',()=>{
  const names=['Tata','Ayon','Gus','Ka','Dara','Dziro','Nato','Deleti','Toni','Girl On Fire','Daiane','Caslu','Horacio'];
  const players=eligible().map((p,i)=>({...p,nick:names[i]})),teams=buildTeams(players),notice=announcement(teams,players,24);
  assert.ok(notice.length<=1500);assert.equal(notice.overLimit,false);
  assert.match(notice.text,/24 adversários contra 13/);assert.doesNotMatch(notice.text,/\p{Extended_Pictographic}/u);
  const zombies=notice.text.match(/Zumbis: (.*)\./)[1].split(', ');
  for(const e of [...teams.verde,...teams.roxa])assert.equal(zombies.includes(players.find(p=>p.id===e.id).nick),['campo','zumbis'].includes(e.assignment));
  assert.doesNotMatch(announcement(teams,players,'-5').text,/Pareamento/);
  const enormous=players.map(p=>({...p,nick:'N'.repeat(80)+p.id}));
  assert.equal(announcement(teams,enormous).overLimit,true);
  for(const p of enormous)assert.ok(announcement(teams,enormous).text.includes(p.nick));
});
test('roster includes current players without accounts and keeps functions tied to game ID',()=>{
  const source={source:'google-sheets',members:[{player:'Novo nick',id:'123',type:'conta',inAlliance:true,power:100},{player:'Sem conta',id:'456',type:'conta',inAlliance:true},{player:'Farm',type:'farm',inAlliance:true},{player:'Saiu',type:'conta',inAlliance:false}]};
  const players=pompeiiPlayers(source,[{nick:'Nick antigo',game_id:'123',pompeii_roles:['rally']}]);
  assert.equal(players.length,2);assert.deepEqual(players.find(p=>p.gameId==='123').roles,['rally']);assert.deepEqual(players.find(p=>p.gameId==='456').roles,[]);
  assert.deepEqual(pompeiiPlayers({source:'unavailable'},[]),[]);
  assert.deepEqual(validateRoles(['campo','rally']),['rally','campo']);
  for(const roles of [null,['admin'],['rally','rally'],['__proto__']])assert.throws(()=>validateRoles(roles));
});

test('large notices compact the strategy while preserving all players',()=>{
  const players=eligible().map(p=>({...p,nick:'Nome muito comprido '+p.id}));
  for(let i=14;i<=26;i++)players.push({...player(i,['campo'],200),nick:'Jogador '+i});
  const notice=announcement(buildTeams(players),players,30);
  assert.equal(notice.overLimit,false);
  for(const p of players)assert.ok(notice.text.includes(p.nick));
});

test('Incubadora is an additional saved capability and its selected players appear below zombies',()=>{
 const players=eligible();players[6]={...players[6],nick:'Ka',roles:['campo','incubadora']};players[7]={...players[7],nick:'Girl On Fire',roles:['campo','incubadora']};
 const teams=buildTeams(players),notice=announcement(teams,players);
 const incubators=notice.text.match(/Incubadora: ([^\n]+)\./)[1];
 assert.ok(incubators.includes('Ka'));assert.ok(incubators.includes('Girl On Fire'));assert.ok(incubators.includes(' e '));
 assert.match(notice.text,/Zumbis: [^\n]+\.\nIncubadora: /);
 assert.match(notice.text.match(/Zumbis: (.*)/)[1],/Ka/);assert.match(notice.text.match(/Zumbis: (.*)/)[1],/Girl On Fire/);
 assert.equal(teams.verde.filter(e=>players.find(p=>p.id===e.id).roles.includes('incubadora')).length,1);
 assert.equal(teams.roxa.filter(e=>players.find(p=>p.id===e.id).roles.includes('incubadora')).length,1);
 assert.deepEqual(inspectTeams(teams,players),[]);assert.equal(notice.overLimit,false);
 const withoutGirl={...teams,verde:teams.verde.filter(e=>e.id!==players[7].id),roxa:teams.roxa.filter(e=>e.id!==players[7].id)};
 assert.match(announcement(withoutGirl,players).text,/Incubadora: Ka\./);
 assert.match(announcement(buildTeams(eligible()),eligible()).text,/Incubadora: A definir\./);
 assert.deepEqual(validateRoles(['incubadora','campo','guarnicao','rally']),['rally','guarnicao','campo','incubadora']);
});
