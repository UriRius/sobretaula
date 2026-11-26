-- ============================================================================
-- Sobretaula · 4 · Esborrar el compte
--
-- Regles (CLAUDE.md, «Seguretat» i registre de decisions):
--  * El perfil NO s'esborra: s'anonimitza (sense nom propi ni avatar) i es
--    marca amb deleted_at. La UI hi posa «Antic membre» (src/i18n/ca.ts).
--  * Els vots de les visites revelades es queden: si no, el rànquing i la
--    història dels grups canviarien.
--  * Els comentaris (text lliure que pot identificar) s'esborren.
--  * Les sales que encara voten: se'n surt (amb els vots, que encara són
--    secrets i no han comptat mai).
--  * Grups: si era l'últim membre, el grup s'esborra (ja no el veu ningú). Si
--    era l'únic admin, ho passa a ser qui fa més temps que hi és.
--  * Les dades d'accés (auth.users, amb l'email) les esborra el servidor amb
--    la clau secreta just després (src/app/actions/account.ts).
-- Additiva: una columna nova i una funció.
-- ============================================================================

alter table public.profiles add column deleted_at timestamptz;

comment on column public.profiles.deleted_at is
  'Compte esborrat: perfil anonimitzat. La UI mostra «Antic membre».';

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_group record;
  v_heir uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  for v_group in
    select gm.group_id, gm.role from public.group_members gm where gm.user_id = v_uid
  loop
    if not exists (
      select 1 from public.group_members
      where group_id = v_group.group_id and user_id <> v_uid
    ) then
      -- Últim membre: el grup (i la seva història) ja no el veu ningú.
      delete from public.groups where id = v_group.group_id;
    elsif v_group.role = 'admin' and not exists (
      select 1 from public.group_members
      where group_id = v_group.group_id and user_id <> v_uid and role = 'admin'
    ) then
      select user_id into v_heir
      from public.group_members
      where group_id = v_group.group_id and user_id <> v_uid
      order by joined_at, user_id
      limit 1;
      update public.group_members set role = 'admin'
        where group_id = v_group.group_id and user_id = v_heir;
    end if;
  end loop;

  delete from public.group_members where user_id = v_uid;

  -- Sales que encara voten: fora (vots i comentari hi van en cascada).
  delete from public.visit_participants vp
  using public.visits v
  where vp.visit_id = v.id and vp.user_id = v_uid and v.status = 'voting';

  delete from public.comments where user_id = v_uid;

  -- Autoria: ja no apunta a ningú.
  update public.groups set created_by = null where created_by = v_uid;
  update public.group_invites set created_by = null where created_by = v_uid;
  update public.restaurants set created_by = null where created_by = v_uid;
  -- (group_restaurant_notes.updated_by es queda: apunta al perfil anònim.)

  -- '—' no es mostra mai: la UI mira deleted_at i hi posa el seu text.
  update public.profiles
    set display_name = '—', avatar_url = null, avatar_emoji = null, deleted_at = coalesce(deleted_at, now())
    where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.delete_my_account() to service_role;
