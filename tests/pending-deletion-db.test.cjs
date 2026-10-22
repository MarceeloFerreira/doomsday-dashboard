const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {tokenHash}=require('../lib/member-accounts.cjs');
test('pending deletion locks approval, protects previous members, and preserves audit after Auth deletion',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb,updated_at timestamptz default now());`);
  for(const file of ['20261022_member_accounts.sql','20261022_pending_request_deletion.sql'])await db.exec(await readFile(path.join(__dirname,'../supabase/migrations',file),'utf8'));
  const admin='11111111-1111-4111-8111-111111111111',pending='22222222-2222-4222-8222-222222222222',approved='33333333-3333-4333-8333-333333333333',hash=tokenHash('a'.repeat(64)),memberHash=tokenHash('b'.repeat(64));
  for(const id of [admin,pending,approved])await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')",[id,id+'@example.test']);
  const player=(await db.query("insert into public.alliance_players(nick) values('Admin') returning id")).rows[0].id;
  await db.query("update public.member_profiles set role='admin',status='active',player_id=$2 where id=$1",[admin,player]);
  for(const [token,id]of [[hash,admin],[memberHash,pending]])await db.query("insert into public.member_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[token,id]);
  const prepare=(id,email=id+'@example.test',token=hash)=>db.query('select public.bope_prepare_pending_deletion($1,$2,$3)',[token,id,email]);
  for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(prepare(pending),/permission denied/);await db.exec('reset role');}
  await db.exec('set role service_role');
  await assert.rejects(prepare(pending,pending+'@example.test',memberHash),/admin_required/);
  await assert.rejects(prepare(admin),/pending_only/);
  await assert.rejects(prepare(pending,'stale@example.test'),/confirmation_changed/);
  const command=(id,status)=>db.query("select public.bope_admin_command($1,'save_member',$2,$3)",[hash,id,JSON.stringify({role:'member',status,player_id:player})]);
  const approvedPlayer=(await db.query("select public.bope_admin_command($1,'create_player',null,$2) result",[hash,JSON.stringify({nick:'Approved'})])).rows[0].result.id;
  await db.query("select public.bope_admin_command($1,'save_member',$2,$3)",[hash,approved,JSON.stringify({role:'member',status:'active',player_id:approvedPlayer})]);
  await assert.rejects(prepare(approved),/pending_only/);
  await db.query("select public.bope_admin_command($1,'save_member',$2,$3)",[hash,approved,JSON.stringify({role:'member',status:'pending'})]);
  await assert.rejects(prepare(approved),/pending_only/);
  await prepare(pending);
  assert.deepEqual((await db.query('select reset_pending,deletion_pending from public.member_profiles where id=$1',[pending])).rows[0],{reset_pending:true,deletion_pending:true});
  assert.equal((await db.query('select * from public.member_sessions where user_id=$1',[pending])).rows.length,0);
  await assert.rejects(command(pending,'active'),/reset_in_progress/);
  await db.exec('reset role');const authTime=(await db.query('select updated_at from auth.users where id=$1',[pending])).rows[0].updated_at;await db.exec('set role service_role');
  await assert.rejects(db.query('select public.bope_create_session($1,$2,$3)',[pending,authTime,memberHash]),/login_changed/);
  // Retrying after an Auth service failure is allowed without duplicate audits.
  await prepare(pending);assert.equal((await db.query("select * from public.member_audit where action='pending_deletion_requested'")).rows.length,1);
  await db.exec('reset role');await db.query('delete from auth.users where id=$1',[pending]);
  assert.equal((await db.query('select * from public.member_profiles where id=$1',[pending])).rows.length,0);
  const audit=(await db.query("select target_id,details from public.member_audit where action='pending_deletion_requested'")).rows[0];assert.equal(audit.target_id,null);assert.equal(audit.details.account_id,pending);
  await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')",[pending,pending+'@example.test']);assert.equal((await db.query('select status from public.member_profiles where id=$1',[pending])).rows[0].status,'pending');
  await db.query("update public.member_sessions set expires_at=now()-interval '1 second' where token_hash=$1",[hash]);await assert.rejects(prepare(pending),/admin_required/);
 }finally{await db.close();}
});
