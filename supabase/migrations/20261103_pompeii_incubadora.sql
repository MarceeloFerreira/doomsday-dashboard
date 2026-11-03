-- Add the optional Incubadora responsibility without changing existing roles.
begin;
alter table public.alliance_players drop constraint if exists alliance_players_pompeii_roles_check;
alter table public.alliance_players add constraint alliance_players_pompeii_roles_check
  check (pompeii_roles <@ array['rally','guarnicao','campo','incubadora']::text[] and cardinality(pompeii_roles)<=4);
create or replace function public.bope_save_pompeii_roles(p_token_hash text,p_nick text,p_game_id text,p_roles text[])
returns void language plpgsql security definer set search_path='' as $$
declare actor uuid; player public.alliance_players;
begin
  perform pg_advisory_xact_lock(54120261022);
  select p.id into actor from public.member_profiles p join public.member_sessions s on s.user_id=p.id
    where s.token_hash=p_token_hash and s.expires_at>now() and p.status='active' and p.role='admin' and p.player_id is not null and not p.reset_pending;
  if actor is null then raise exception 'admin_required'; end if;
  if p_roles is null or cardinality(p_roles)>4 or not(p_roles <@ array['rally','guarnicao','campo','incubadora']::text[]) or array_position(p_roles,null) is not null
    or cardinality(p_roles)<>(select count(distinct r) from unnest(p_roles) r) then raise exception 'invalid_roles'; end if;
  if length(btrim(coalesce(p_nick,''))) not between 1 and 80 or (p_game_id is not null and p_game_id !~ '^[0-9]{1,30}$') then raise exception 'invalid_player'; end if;
  if p_game_id is not null then select * into player from public.alliance_players where game_id=p_game_id; end if;
  if player.id is null then
    select * into player from public.alliance_players where lower(btrim(nick))=lower(btrim(p_nick));
    if player.id is not null and player.game_id is not null and p_game_id is not null and player.game_id<>p_game_id then raise exception 'player_conflict'; end if;
  end if;
  if player.id is null then
    insert into public.alliance_players(nick,game_id,pompeii_roles) values(btrim(p_nick),p_game_id,p_roles) returning * into player;
  else
    update public.alliance_players set pompeii_roles=p_roles,game_id=coalesce(game_id,p_game_id) where id=player.id;
  end if;
  insert into public.member_audit(actor_id,action,details) values(actor,'pompeii_roles_saved',jsonb_build_object('player_id',player.id,'roles',p_roles));
end;
$$;
revoke all on function public.bope_save_pompeii_roles(text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.bope_save_pompeii_roles(text,text,text,text[]) to service_role;
commit;
