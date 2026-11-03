const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {readFile}=require('node:fs/promises');
const {join}=require('node:path');
test('Pompeii roles persist for players without accounts and require a live administrator',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,updated_at timestamptz default now());');
    for(const file of ['20261022_member_accounts.sql','20261103_pompeii_roles.sql'])await db.exec(await readFile(join(__dirname,'../supabase/migrations',file),'utf8'));
    const admin='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222';
    await db.query("insert into auth.users(id,email) values($1,'a@example.test'),($2,'m@example.test')",[admin,member]);
    await db.exec("insert into public.alliance_players(nick) values('Admin'),('Member');");
    await db.query("update public.member_profiles set status='active',role='admin',player_id=(select id from public.alliance_players where nick='Admin') where id=$1",[admin]);
    await db.query("update public.member_profiles set status='active',player_id=(select id from public.alliance_players where nick='Member') where id=$1",[member]);
    const hash='a'.repeat(64),mh='b'.repeat(64);
    await db.query("insert into public.member_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour'),($3,$4,now()+interval '1 hour')",[hash,admin,mh,member]);
    const save=(token,nick='Player',game='123',roles=['rally'])=>db.query('select public.bope_save_pompeii_roles($1,$2,$3,$4)',[token,nick,game,roles]);
    for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(save(hash),/permission denied/);await db.exec('reset role');}
    await db.exec('set role service_role');
    await assert.rejects(save(mh),/admin_required/);
    await save(hash);await save(hash,'Changed nickname','123',['guarnicao','campo']);
    const result=await db.query("select * from public.alliance_players where game_id='123'");
    assert.equal(result.rows.length,1);assert.deepEqual(result.rows[0].pompeii_roles,['guarnicao','campo']);
    await assert.rejects(save(hash,'Player','999'),/player_conflict/);
    await assert.rejects(save(hash,'Bad','222',['admin']),/invalid_roles/);
    await assert.rejects(save(hash,'Bad','222',['rally','rally']),/invalid_roles/);
    await save(hash,'No game ID',null,['campo']);await save(hash,'No game ID',null,[]);
    assert.equal((await db.query("select * from public.alliance_players where nick='No game ID'")).rows.length,1);
    assert.equal((await db.query("select * from public.member_audit where action='pompeii_roles_saved'")).rows.length,4);
    await db.exec('reset role');
    await db.exec(await readFile(join(__dirname,'../supabase/migrations/20261103_pompeii_incubadora.sql'),'utf8'));
    await db.exec('set role service_role');
    assert.deepEqual((await db.query("select pompeii_roles from public.alliance_players where game_id='123'")).rows[0].pompeii_roles,['guarnicao','campo']);
    await save(hash,'Player','123',['rally','guarnicao','campo','incubadora']);
    assert.deepEqual((await db.query("select pompeii_roles from public.alliance_players where game_id='123'")).rows[0].pompeii_roles,['rally','guarnicao','campo','incubadora']);
    await assert.rejects(save(hash,'Bad','222',['incubadora','admin']),/invalid_roles/);
    await db.query("update public.member_profiles set status='inactive' where id=$1",[admin]);await assert.rejects(save(hash),/admin_required/);
  }finally{await db.close();}
});
