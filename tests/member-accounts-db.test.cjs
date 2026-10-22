const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const {tokenHash}=require('../lib/member-accounts.cjs');
test('PostgreSQL membership lifecycle and privilege boundaries',async t=>{
  const db=new PGlite();
  try{
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,updated_at timestamptz default now());`);
    await db.exec(await readFile(path.join(__dirname,'../supabase/migrations/20261022_member_accounts.sql'),'utf8'));
    const admin='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
    const adminHash=tokenHash('a'.repeat(64)),memberHash=tokenHash('b'.repeat(64));
    for(const [id,name]of [[admin,'Admin'],[member,'Membro'],[other,'Outro']])await db.query('insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)',[id,name+'@example.test',JSON.stringify({display_name:name,role:'admin',status:'active'})]);
    const row=async sql=>(await db.query(sql)).rows[0];
    const command=(action,target,data={})=>db.query('select public.bope_admin_command($1,$2,$3,$4) as result',[adminHash,action,target,JSON.stringify(data)]);
    await t.test('signup metadata cannot approve or promote the new account',async()=>{
      const p=await row(`select role,status,player_id from public.member_profiles where id='${member}'`);
      assert.deepEqual(p,{role:'member',status:'pending',player_id:null});
    });
    await db.query("insert into public.alliance_players(nick) values('Admin Player')");
    await db.query("update public.member_profiles set role='admin',status='active',player_id=(select id from public.alliance_players limit 1) where id=$1",[admin]);
    await db.query("insert into public.member_sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[adminHash,admin]);
    await t.test('public and authenticated clients cannot read private data or call privileged RPCs',async()=>{
      for(const role of ['anon','authenticated']){
        await db.exec(`set role ${role}`);
        for(const table of ['alliance_players','member_profiles','member_sessions','member_audit'])await assert.rejects(db.query('select * from public.'+table),/permission denied/);
        await assert.rejects(command('create_player',null,{nick:'Attack'}),/permission denied/);
        await assert.rejects(db.query('select public.bope_create_session($1,now(),$2)',[member,memberHash]),/permission denied/);
        await db.exec('reset role');
      }
    });
    await db.exec('set role service_role');
    await t.test('pending and ordinary members cannot perform leadership mutations',async()=>{
      await assert.rejects(db.query('select public.bope_admin_command($1,$2,$3,$4)',[memberHash,'save_member',member,JSON.stringify({role:'admin',status:'active'})]),/admin_required/);
    });
    let player;
    await t.test('approval requires a player and a player can be linked to one account only',async()=>{
      await assert.rejects(command('save_member',member,{role:'member',status:'active'}),/player_required/);
      const created=await command('create_player',null,{nick:'Player Membro',game_id:'123456'});player=created.rows[0].result.id;
      await command('save_member',member,{role:'member',status:'active',player_id:player});
      await assert.rejects(command('save_member',other,{role:'member',status:'active',player_id:player}),/duplicate key/);
      await assert.rejects(command('create_player',null,{nick:' player membro '}),/duplicate key/);
    });
    await t.test('sessions are issued only for the current Auth identity timestamp',async()=>{
      await assert.rejects(db.query('select public.bope_create_session($1,$2,$3)',[member,'2000-01-01',memberHash]),/login_changed/);
      await db.exec('reset role');const u=await row(`select updated_at from auth.users where id='${member}'`);await db.exec('set role service_role');
      await db.query('select public.bope_create_session($1,$2,$3)',[member,u.updated_at,memberHash]);
    });
    await t.test('ordinary active members still cannot grant themselves administrator access',async()=>{
      await assert.rejects(db.query('select public.bope_admin_command($1,$2,$3,$4)',[memberHash,'save_member',member,JSON.stringify({role:'admin',status:'active',player_id:player})]),/admin_required/);
    });
    await t.test('inactivation removes sessions and preserves player linkage and audit history',async()=>{
      await command('save_member',member,{role:'member',status:'inactive',player_id:player});
      assert.equal((await db.query('select * from public.member_sessions where user_id=$1',[member])).rows.length,0);
      const p=(await db.query('select * from public.member_profiles where id=$1',[member])).rows[0];assert.equal(p.player_id,player);assert.equal(p.status,'inactive');
      assert.ok((await db.query('select * from public.member_audit where target_id=$1',[member])).rows.length>=2);
      await command('save_member',member,{role:'member',status:'active',player_id:player});
    });
    await t.test('the last administrator cannot be demoted or inactivated',async()=>{
      for(const change of [{role:'member',status:'active'},{role:'admin',status:'inactive'}])await assert.rejects(command('save_member',admin,{...change,player_id:(await db.query('select player_id from public.member_profiles where id=$1',[admin])).rows[0].player_id}),/last_admin/);
    });
    await t.test('password reset blocks login and records no password data',async()=>{
      await command('begin_password_reset',member);
      assert.equal((await db.query('select reset_pending from public.member_profiles where id=$1',[member])).rows[0].reset_pending,true);
      await db.exec('reset role');const u=await row(`select updated_at from auth.users where id='${member}'`);await db.exec('set role service_role');
      await assert.rejects(db.query('select public.bope_create_session($1,$2,$3)',[member,u.updated_at,memberHash]),/login_changed/);
      const audit=(await db.query("select details from public.member_audit where action='begin_password_reset'")).rows[0];assert.deepEqual(audit.details,{});
    });
    await t.test('an expired administrator session cannot mutate the database',async()=>{
      await db.query("update public.member_sessions set expires_at=now()-interval '1 second' where token_hash=$1",[adminHash]);
      await assert.rejects(command('create_player',null,{nick:'Expired'}),/admin_required/);
    });
  }finally{await db.close();}
});
