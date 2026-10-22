const {test}=require('node:test');
const assert=require('node:assert/strict');
const {playerChoices,occupiedMessage}=require('../lib/roster-players.cjs');
const live=members=>({source:'google-sheets',members,fetchedAt:'2026-10-22T12:00:00Z'});
test('sheet roster supplies selectable players without inserting database rows',()=>{
  const r=playerChoices(live([{player:'Deleti',id:'123'},{player:'Outro',id:'456'}]),[],[]);
  assert.equal(r.rosterAvailable,true);assert.equal(r.players.length,2);assert.equal(r.players[0].nick,'Deleti');assert.ok(r.players[0].id.startsWith('sheet:'));
});
test('renames match by game ID and keep the existing ownership',()=>{
  const r=playerChoices(live([{player:'Deleti',id:'123'}]),[{id:'uuid',nick:'Deleeti',game_id:'123'}],[{id:'account',display_name:'Marcelo',email:'m@example.test',player_id:'uuid'}]);
  assert.equal(r.players.length,1);assert.equal(r.players[0].id,'uuid');assert.equal(r.players[0].nick,'Deleti');assert.equal(r.players[0].owner.id,'account');
});
test('no fuzzy nickname matching and missing old links are preserved explicitly',()=>{
  const r=playerChoices(live([{player:'Deleti',id:''}]),[{id:'old',nick:'Deleeti',game_id:null}],[{id:'a',display_name:'Marcelo',email:'m@example.test',player_id:'old'}]);
  assert.equal(r.players.length,2);assert.equal(r.players.find(p=>p.id==='old').sheetMissing,true);
  assert.equal(r.players.find(p=>p.nick==='Deleti').owner,null);
});
test('case and outer whitespace match while distinct game IDs never collapse',()=>{
  const p=[{id:'old',nick:'Player',game_id:'123'}];
  assert.equal(playerChoices(live([{player:' player ',id:''}]),p,[]).players[0].id,'old');
  assert.notEqual(playerChoices(live([{player:'Player',id:'456'}]),p,[]).players[0].id,'old');
});
test('sheet failures retain database choices with an explicit source warning',()=>{
  const r=playerChoices({source:'snapshot',members:[]},[{id:'old',nick:'Nick'}],[]);
  assert.equal(r.rosterAvailable,false);assert.equal(r.players[0].nick,'Nick');assert.match(r.rosterWarning,/indisponível/);
});
test('duplicate messages identify the owning account',()=>{
  assert.match(occupiedMessage({name:'Outra conta',email:'other@example.test'}),/conta Outra conta \(other@example.test\)/);
});
