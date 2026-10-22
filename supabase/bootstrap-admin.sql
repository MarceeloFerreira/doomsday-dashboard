-- Run in Supabase SQL Editor AFTER registering your own account on the site.
-- Replace these example values. This script only creates the first active admin.
begin;
do $$
declare account_id uuid; player uuid;
  admin_email text := 'SEU_EMAIL_AQUI';
  player_nick text := 'SEU_NICK_AQUI';
begin
  perform pg_advisory_xact_lock(54120261022);
  if admin_email='SEU_EMAIL_AQUI' or player_nick='SEU_NICK_AQUI' then raise exception 'Preencha seu e-mail e nick antes de executar.'; end if;
  if exists(select 1 from public.member_profiles where role='admin' and status='active') then raise exception 'Já existe administrador. Use a gestão de membros.'; end if;
  select id into account_id from public.member_profiles where lower(email)=lower(btrim(admin_email));
  if account_id is null then raise exception 'Cadastre sua conta no site primeiro.'; end if;
  select id into player from public.alliance_players where lower(btrim(nick))=lower(btrim(player_nick));
  if player is null then insert into public.alliance_players(nick) values(btrim(player_nick)) returning id into player; end if;
  update public.member_profiles set role='admin',status='active',player_id=player,updated_at=now() where id=account_id;
  insert into public.member_audit(actor_id,target_id,action) values(account_id,account_id,'bootstrap_admin');
end;
$$;
commit;
