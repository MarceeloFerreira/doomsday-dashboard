-- Apply once in Supabase SQL Editor before publishing the profile/password UI.
begin;
create function public.bope_begin_password_change(p_token_hash text,p_auth_updated_at timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.member_profiles;
begin
  perform pg_advisory_xact_lock(54120261022);
  select p.* into actor from public.member_profiles p join public.member_sessions s on s.user_id=p.id
    join auth.users u on u.id=p.id
    where s.token_hash=p_token_hash and s.expires_at>now() and p.status='active'
      and p.player_id is not null and not p.reset_pending and u.updated_at=p_auth_updated_at
    for update of p;
  if actor.id is null then raise exception 'login_changed'; end if;
  update public.member_profiles set reset_pending=true,updated_at=now() where id=actor.id;
  delete from public.member_sessions where user_id=actor.id;
  insert into public.member_audit(actor_id,target_id,action) values(actor.id,actor.id,'password_change_started');
  return actor.id;
end;
$$;
revoke all on function public.bope_begin_password_change(text,timestamptz) from public,anon,authenticated;
grant execute on function public.bope_begin_password_change(text,timestamptz) to service_role;
commit;
