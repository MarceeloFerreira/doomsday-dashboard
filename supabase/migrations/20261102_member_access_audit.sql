-- Apply once in the Supabase SQL Editor. Historical logins are not reconstructed.
begin;
create table public.member_access_stats (
  user_id uuid primary key references public.member_profiles(id) on delete cascade,
  monitored_since timestamptz not null default now(),
  login_count bigint not null default 0 check(login_count>=0),
  first_login_at timestamptz,
  last_login_at timestamptz,
  last_activity_at timestamptz
);
alter table public.member_access_stats enable row level security;
revoke all on public.member_access_stats from public,anon,authenticated;
grant select,insert,update,delete on public.member_access_stats to service_role;
insert into public.member_access_stats(user_id) select id from public.member_profiles;

create function public.bope_access_on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.member_access_stats(user_id) values(new.id);
  return new;
end;
$$;
revoke all on function public.bope_access_on_signup() from public,anon,authenticated;
create trigger bope_access_signup after insert on public.member_profiles for each row execute function public.bope_access_on_signup();

-- Only a successfully committed app login creates a session. Reloads and session
-- polling never increment this counter. Pending/inactive sign-ins count as logins too.
create function public.bope_access_on_login() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.member_access_stats set login_count=login_count+1,
    first_login_at=coalesce(first_login_at,now()),
    last_login_at=greatest(last_login_at,now()) where user_id=new.user_id;
  return new;
end;
$$;
revoke all on function public.bope_access_on_login() from public,anon,authenticated;
create trigger bope_access_login after insert on public.member_sessions for each row execute function public.bope_access_on_login();

-- The client reports only visible visits/interactions, not background polling.
-- Resolve ownership from the opaque session, never a client-provided member ID.
create function public.bope_touch_member_activity(p_token_hash text) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.member_access_stats a set last_activity_at=now()
    from public.member_sessions s join public.member_profiles p on p.id=s.user_id
    where a.user_id=p.id and s.token_hash=p_token_hash and s.expires_at>now()
      and p.status='active' and p.player_id is not null and not p.reset_pending
      and (a.last_activity_at is null or a.last_activity_at<=now()-interval '5 minutes');
end;
$$;
revoke all on function public.bope_touch_member_activity(text) from public,anon,authenticated;
grant execute on function public.bope_touch_member_activity(text) to service_role;
commit;
