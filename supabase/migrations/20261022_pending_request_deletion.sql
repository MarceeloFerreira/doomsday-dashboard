-- Run once in the Supabase SQL Editor after the member accounts migration.
-- This only installs the feature; it does not delete any existing account.
begin;
alter table public.member_profiles add column if not exists deletion_pending boolean not null default false;
create or replace function public.bope_prepare_pending_deletion(p_token_hash text,p_target uuid,p_email text)
returns void language plpgsql security definer set search_path='' as $$
declare actor public.member_profiles; target public.member_profiles;
begin
  perform pg_advisory_xact_lock(54120261022);
  select p.* into actor from public.member_profiles p join public.member_sessions s on s.user_id=p.id
    where s.token_hash=p_token_hash and s.expires_at>now() and p.status='active' and p.role='admin' and not p.reset_pending;
  if actor.id is null then raise exception 'admin_required'; end if;
  select * into target from public.member_profiles where id=p_target for update;
  if target.id is null then raise exception 'member_not_found'; end if;
  if target.id=actor.id or target.role<>'member' or target.status<>'pending' then raise exception 'pending_only'; end if;
  if lower(target.email) is distinct from lower(btrim(p_email)) then raise exception 'confirmation_changed'; end if;
  -- A previously approved/inactivated account must keep its history, even if
  -- someone later changes its status back to pending.
  if exists(select 1 from public.member_audit where target_id=target.id and action='save_member' and
    (details->'before'->>'status' in ('active','inactive') or details->'after'->>'status' in ('active','inactive'))) then raise exception 'pending_only'; end if;
  if target.reset_pending and not target.deletion_pending then raise exception 'reset_in_progress'; end if;
  update public.member_profiles set reset_pending=true,deletion_pending=true,updated_at=now() where id=target.id;
  delete from public.member_sessions where user_id=target.id;
  if not target.deletion_pending then
    insert into public.member_audit(actor_id,target_id,action,details) values(actor.id,target.id,'pending_deletion_requested',jsonb_build_object('account_id',target.id,'display_name',target.display_name,'email',target.email));
  end if;
end;
$$;
revoke all on function public.bope_prepare_pending_deletion(text,uuid,text) from public,anon,authenticated;
grant execute on function public.bope_prepare_pending_deletion(text,uuid,text) to service_role;
commit;
