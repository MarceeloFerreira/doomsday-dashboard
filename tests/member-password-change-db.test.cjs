const {test}=require('node:test');const assert=require('node:assert/strict');const {readFile}=require('node:fs/promises');const path=require('node:path');const {PGlite}=require('@electric-sql/pglite');
test('self-service password RPC enforces ownership, active membership, versioning, revocation, and private grants',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,updated_at timestamptz default now());");
  for(const f of ['20261022_member_accounts.sql','20261102_member_password_change.sql'])await db.exec(await readFile(path.join(__dirname,'../supabase/migrations',f),'utf8'));
  const member='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',hash='a'.repeat(64),otherHash='b'.repeat(64);
  for(const id of [member,other]){
   await db.query("insert into auth.users(id,email,raw_user_meta_data,updated_at) values($1,'m@example.test','{}','2026-11-02')",[id]);
   const player=(await db.query('insert into public.alliance_players(nick) values($1) returning id',[id])).rows[0].id;
   await db.query("update public.member_profiles set status='active',player_id=$2 where id=$1",[id,player]);
  }
  await db.query("insert into public.member_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour'),($3,$4,now()+interval '1 hour'),($5,$2,now()+interval '1 hour')",[hash,member,otherHash,other,'c'.repeat(64)]);
  const begin=(token=hash,stamp='2026-11-02')=>db.query('select public.bope_begin_password_change($1,$2) as id',[token,stamp]);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(begin(),/permission denied/);await db.exec('reset role');}
  await db.exec('set role service_role');
  await assert.rejects(begin('d'.repeat(64)),/login_changed/);await assert.rejects(begin(hash,'2000-01-01'),/login_changed/);
  await db.query("update public.member_profiles set status='inactive' where id=$1",[member]);await assert.rejects(begin(),/login_changed/);
  await db.query("update public.member_profiles set status='active' where id=$1",[member]);
  assert.equal((await begin()).rows[0].id,member);
  assert.equal((await db.query('select reset_pending from public.member_profiles where id=$1',[member])).rows[0].reset_pending,true);
  assert.equal((await db.query('select * from public.member_sessions where user_id=$1',[member])).rows.length,0);
  assert.equal((await db.query('select * from public.member_sessions where user_id=$1',[other])).rows.length,1);
  await assert.rejects(begin(),/login_changed/);
  await assert.rejects(db.query('select public.bope_create_session($1,$2,$3)',[member,'2026-11-02',hash]),/login_changed/);
  const audit=(await db.query("select * from public.member_audit where action='password_change_started'")).rows[0];assert.equal(audit.actor_id,member);assert.equal(audit.target_id,member);assert.deepEqual(audit.details,{});
 }finally{await db.close();}
});
