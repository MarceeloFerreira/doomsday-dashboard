-- Apply once in Supabase SQL Editor. No passwords are stored in these tables.
begin;
create table public.alliance_players (
  id uuid primary key default gen_random_uuid(),
  nick text not null check (length(btrim(nick)) between 1 and 80),
  game_id text check (game_id is null or game_id ~ '^[0-9]{1,30}$'),
  created_at timestamptz not null default now()
);
create unique index alliance_players_nick on public.alliance_players(lower(btrim(nick)));
create unique index alliance_players_game_id on public.alliance_players(game_id) where game_id is not null;
create table public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null check (length(display_name) between 1 and 80),
  role text not null default 'member' check (role in ('member','admin')),
  status text not null default 'pending' check (status in ('pending','active','inactive')),
  player_id uuid unique references public.alliance_players(id),
  reset_pending boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or player_id is not null)
);
create table public.member_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references public.member_profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index member_sessions_user on public.member_sessions(user_id);
create index member_sessions_expiry on public.member_sessions(expires_at);
create table public.member_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references public.member_profiles(id) on delete set null,
  target_id uuid references public.member_profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.alliance_players enable row level security;
alter table public.member_profiles enable row level security;
alter table public.member_sessions enable row level security;
alter table public.member_audit enable row level security;
-- All access goes through the server, which checks live session + membership.
-- Supabase Auth JWTs alone grant no access to application data.
revoke all on public.alliance_players, public.member_profiles, public.member_sessions, public.member_audit from anon, authenticated;
grant all on public.alliance_players, public.member_profiles, public.member_sessions, public.member_audit to service_role;
grant usage, select on sequence public.member_audit_id_seq to service_role;

create function public.bope_profile_on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.member_profiles(id,email,display_name)
  values(new.id,new.email,left(coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'),''),'Novo membro'),80));
  return new;
end;
$$;
revoke all on function public.bope_profile_on_signup() from public, anon, authenticated;
create trigger bope_profile_signup after insert on auth.users for each row execute function public.bope_profile_on_signup();

-- These RPCs accept only hashes of opaque app-session tokens, never client role claims.
-- The transaction lock serializes admin changes, including the last-admin check.
create function public.bope_admin_command(p_token_hash text,p_action text,p_target uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor public.member_profiles; target public.member_profiles; result jsonb; new_role text; new_status text; new_player uuid;
begin
  perform pg_advisory_xact_lock(54120261022);
  select p.* into actor from public.member_profiles p join public.member_sessions s on s.user_id=p.id
    where s.token_hash=p_token_hash and s.expires_at>now() and p.status='active' and p.role='admin' and not p.reset_pending;
  if actor.id is null then raise exception 'admin_required'; end if;
  if p_action='create_player' then
    if length(btrim(coalesce(p_data->>'nick',''))) not between 1 and 80 then raise exception 'invalid_player'; end if;
    insert into public.alliance_players(nick,game_id) values(btrim(p_data->>'nick'),nullif(p_data->>'game_id','')) returning to_jsonb(alliance_players.*) into result;
  else
    select * into target from public.member_profiles where id=p_target for update;
    if target.id is null then raise exception 'member_not_found'; end if;
    if p_action='save_member' then
      if target.reset_pending then raise exception 'reset_in_progress'; end if;
      new_role=p_data->>'role'; new_status=p_data->>'status'; new_player=nullif(p_data->>'player_id','')::uuid;
      if new_role not in ('member','admin') or new_role is null or new_status not in ('pending','active','inactive') or new_status is null then raise exception 'invalid_member'; end if;
      if new_status='active' and new_player is null then raise exception 'player_required'; end if;
      if target.role='admin' and target.status='active' and (new_role<>'admin' or new_status<>'active') and
        not exists(select 1 from public.member_profiles where id<>target.id and role='admin' and status='active' and not reset_pending) then raise exception 'last_admin'; end if;
      update public.member_profiles set role=new_role,status=new_status,player_id=new_player,updated_at=now() where id=target.id returning to_jsonb(member_profiles.*) into result;
      -- Membership and roles are checked live; remove cookies' backing sessions on inactivation too.
      if new_status<>'active' then delete from public.member_sessions where user_id=target.id; end if;
    elsif p_action='begin_password_reset' then
      -- Prevent simultaneous password resets from interleaving updates.
      if target.reset_pending then raise exception 'reset_in_progress'; end if;
      update public.member_profiles set reset_pending=true,updated_at=now() where id=target.id;
      delete from public.member_sessions where user_id=target.id;
      result=jsonb_build_object('id',target.id);
    else raise exception 'invalid_action'; end if;
  end if;
  insert into public.member_audit(actor_id,target_id,action,details) values(actor.id,p_target,p_action,
    case when p_action='save_member' then jsonb_build_object('before',jsonb_build_object('role',target.role,'status',target.status,'player_id',target.player_id),'after',p_data)
    when p_action='create_player' then p_data else '{}'::jsonb end);
  return result;
end;
$$;
revoke all on function public.bope_admin_command(text,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.bope_admin_command(text,text,uuid,jsonb) to service_role;

-- Signup/login rate limits are handled by Supabase Auth. Session creation rechecks
-- the auth user's update timestamp so a reset invalidates a concurrent old login.
create function public.bope_create_session(p_user uuid,p_auth_updated_at timestamptz,p_token_hash text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(54120261022);
  if not exists(select 1 from auth.users u join public.member_profiles p on p.id=u.id
    where u.id=p_user and u.updated_at=p_auth_updated_at and not p.reset_pending) then raise exception 'login_changed'; end if;
  delete from public.member_sessions where expires_at<=now();
  insert into public.member_sessions(token_hash,user_id,expires_at) values(p_token_hash,p_user,now()+interval '8 hours');
end;
$$;
revoke all on function public.bope_create_session(uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.bope_create_session(uuid,timestamptz,text) to service_role;
commit;
