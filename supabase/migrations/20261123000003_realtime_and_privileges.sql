-- ============================================================================
-- Sobretaula · 3/3 · Temps real i permisos de funcions
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Temps real
--  * Postgres Changes de visits (estat, pas de revelació) i visit_participants
--    (qui entra, qui ha votat). Realtime aplica la RLS de cada subscriptor.
--  * votes i comments NO es publiquen MAI. Quan canvia el pas de revelació,
--    cada mòbil torna a llegir els vots i la RLS li dona només el que toca.
--  * Presència en un canal privat `visit:<id>`: només hi entren membres del
--    grup de la visita (RLS sobre realtime.messages).
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.visits, public.visit_participants;

create or replace function private.can_access_visit_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_visit_id uuid;
begin
  if p_topic is null or p_topic !~ '^visit:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_visit_id := substring(p_topic from 7)::uuid;
  return exists (
    select 1
    from public.visits v
    join public.group_members gm on gm.group_id = v.group_id
    where v.id = v_visit_id
      and gm.user_id = (select auth.uid())
  );
end;
$$;

create policy "visit_room_receive" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension in ('presence', 'broadcast')
    and private.can_access_visit_topic((select realtime.topic()))
  );

create policy "visit_room_send" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension in ('presence', 'broadcast')
    and private.can_access_visit_topic((select realtime.topic()))
  );

-- ----------------------------------------------------------------------------
-- Permisos de funcions. Per defecte Postgres dona EXECUTE a PUBLIC (i per
-- tant a anon): es treu de tot arreu i es dona només el que cal.
-- ----------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon;

-- Funcions que les polítiques RLS criden amb els drets de qui consulta (i
-- normalize_key, que calcula columnes generades en corregir un restaurant).
grant execute on function
  private.user_group_ids(),
  private.is_group_admin(uuid),
  private.visible_profile_ids(),
  private.visible_restaurant_ids(),
  private.vote_is_revealed(uuid, public.vote_category),
  private.visit_is_closed(uuid),
  private.can_access_visit_topic(text),
  private.normalize_key(text)
  to authenticated;

-- RPC del client.
grant execute on function
  public.create_group(text, text, public.group_color),
  public.create_invite(uuid, int, int),
  public.invite_preview(text),
  public.accept_invite(text),
  public.leave_group(uuid),
  public.can_create_groups(),
  public.create_visit(uuid, uuid, text, text, text, text, date, numeric),
  public.join_visit(text),
  public.cast_vote(uuid, public.vote_category, int),
  public.set_comment(uuid, text),
  public.advance_visit(uuid)
  to authenticated;

grant execute on all functions in schema public to service_role;
grant execute on all functions in schema private to service_role;

-- ----------------------------------------------------------------------------
-- anon no té res a public: la clau publicable viatja dins l'app i els
-- escàners la fan servir per bolcar tot el que pugui llegir.
-- tests/rls/schema-guard.test.ts falla si una migració futura ho trenca.
-- ----------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon;
