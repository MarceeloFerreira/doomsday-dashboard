const {test}=require('node:test');const assert=require('node:assert/strict');const {readFile}=require('node:fs/promises');const path=require('node:path');const {PGlite}=require('@electric-sql/pglite');
test('access audit counts only committed logins and validates/throttles activity without losing history on logout',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,updated_at timestamptz default now());");
  await db.exec(await readFile(path.join(__dirname,'../supabase/migrations/20261022_member_accounts.sql'),'utf8'));
  const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',hash='a'.repeat(64),second='b'.repeat(64);
  await db.query("insert into auth.users(id,email,raw_user_meta_data,updated_at) values($1,'test@example.test','{}','2026-11-02')",[id]);
  // A pre-migration session is not reconstructed as a historical login.
  await db.query("insert into public.member_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[hash,id]);
  await db.exec(await readFile(path.join(__dirname,'../supabase/migrations/20261102_member_access_audit.sql'),'utf8'));
  const stats=async user=>(await db.query('select * from public.member_access_stats where user_id=$1',[user||id])).rows[0];
  assert.equal(Number((await stats()).login_count),0);assert.equal((await stats()).last_login_at,null);
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'other@example.test','{}')",[other]);assert.equal(Number((await stats(other)).login_count),0);
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);await assert.rejects(db.query('select * from public.member_access_stats'),/permission denied/);
   await assert.rejects(db.query("update public.member_access_stats set login_count=100"),/permission denied/);
   await assert.rejects(db.query('select public.bope_touch_member_activity($1)',[hash]),/permission denied/);await db.exec('reset role');
  }
  await db.exec('set role service_role');
  const touch=(token=hash)=>db.query('select public.bope_touch_member_activity($1)',[token]);
  await touch();assert.equal((await stats()).last_activity_at,null); // Pending membership cannot report tool use.
  const player=(await db.query("insert into public.alliance_players(nick) values('Tester') returning id")).rows[0].id;
  await db.query("update public.member_profiles set status='active',player_id=$2 where id=$1",[id,player]);
  await touch('c'.repeat(64));assert.equal((await stats()).last_activity_at,null);
  await touch();const first=(await stats()).last_activity_at;assert.ok(first);assert.equal(Number((await stats()).login_count),0);
  await db.query("update public.member_access_stats set last_activity_at=now()-interval '1 minute' where user_id=$1",[id]);const recent=(await stats()).last_activity_at;
  await touch();assert.equal((await stats()).last_activity_at.getTime(),recent.getTime());
  await db.query("update public.member_access_stats set last_activity_at=now()-interval '6 minutes' where user_id=$1",[id]);await touch();assert.ok((await stats()).last_activity_at>recent);
  await db.query("update public.member_profiles set reset_pending=true where id=$1",[id]);await db.query("update public.member_access_stats set last_activity_at=null where user_id=$1",[id]);await touch();assert.equal((await stats()).last_activity_at,null);
  await db.query("update public.member_profiles set reset_pending=false where id=$1",[id]);
  await db.query("update public.member_sessions set expires_at=now()-interval '1 minute' where token_hash=$1",[hash]);await touch();assert.equal((await stats()).last_activity_at,null);
  // Logins are counted at session creation, including pending/inactive sign-ins.
  await db.query('select public.bope_create_session($1,$2,$3)',[id,'2026-11-02',second]);let row=await stats();assert.equal(Number(row.login_count),1);assert.ok(row.first_login_at);assert.ok(row.last_login_at);
  await assert.rejects(db.query('select public.bope_create_session($1,$2,$3)',[id,'2026-11-02',second]),/duplicate key/);assert.equal(Number((await stats()).login_count),1);
  await db.query('select public.bope_create_session($1,$2,$3)',[id,'2026-11-02',hash]);assert.equal(Number((await stats()).login_count),2);
  await db.query('select * from public.member_sessions');await touch();await touch();assert.equal(Number((await stats()).login_count),2);
  assert.equal(Number((await stats(other)).login_count),0);
  await db.query('delete from public.member_sessions where user_id=$1',[id]);assert.equal(Number((await stats()).login_count),2);assert.ok((await stats()).last_login_at);
 }finally{await db.close();}
});
