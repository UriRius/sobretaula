-- ============================================================================
-- Sobretaula · 5 · Esborrar visites tancades
--
-- Regles (CLAUDE.md, «Model de dades» i registre de decisions):
--  * L'amfitrió o un admin del grup poden esborrar una visita TANCADA (una de
--    prova, una duplicada…) des del rànquing, a més de cancel·lar una sala que
--    encara vota. Mai durant la revelació: hi ha mòbils mirant-la en directe.
--  * Vots, participants i comentaris hi van en cascada (FK de la migració 2).
--  * Quan un grup ja no té cap visita a un restaurant, les notes del grup
--    sobre aquell restaurant també se'n van: sense visita no es poden veure
--    ni escriure (la política d'INSERT ja ho exigia).
--  * Quan cap grup no té cap visita a un restaurant, la fitxa del catàleg
--    també se'n va: ja no la veia ningú (visible_restaurant_ids) i, si es
--    quedés, create_visit la reaprofitaria (amb la cuina i l'adreça velles)
--    en tornar a escriure el mateix nom.
--  * La neteja la fa un trigger, no l'app: així val per a tots els camins
--    (esborrar des del rànquing, cancel·lar una sala, esborrar un grup).
-- Additiva excepte la política de DELETE de visits, que se substitueix.
-- ============================================================================

drop policy "visits_delete_while_voting" on public.visits;

create policy "visits_delete_host_or_admin" on public.visits
  for delete to authenticated
  using (
    status in ('voting', 'closed')
    and group_id in (select private.user_group_ids())
    and (host_id = (select auth.uid()) or private.is_group_admin(group_id))
  );

-- AFTER ROW: dins d'un DELETE de diverses files (p. ex. el d'un grup en
-- cascada), el trigger veu totes les files ja esborrades per la sentència.
create or replace function private.cleanup_after_visit_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.visits v
    where v.group_id = old.group_id and v.restaurant_id = old.restaurant_id
  ) then
    delete from public.group_restaurant_notes n
    where n.group_id = old.group_id and n.restaurant_id = old.restaurant_id;
  end if;

  if not exists (select 1 from public.visits v where v.restaurant_id = old.restaurant_id) then
    delete from public.restaurants r where r.id = old.restaurant_id;
  end if;

  return null;
end;
$$;

-- Només la crida el trigger (que no comprova EXECUTE en disparar-se).
revoke execute on function private.cleanup_after_visit_delete() from public, anon, authenticated;

create trigger visits_cleanup_after_delete
  after delete on public.visits
  for each row execute function private.cleanup_after_visit_delete();

-- El que ja havia quedat orfe abans d'aquesta migració (sales cancel·lades,
-- grups esborrats). Ningú no ho podia veure.
delete from public.group_restaurant_notes n
where not exists (
  select 1 from public.visits v
  where v.group_id = n.group_id and v.restaurant_id = n.restaurant_id
);

delete from public.restaurants r
where not exists (select 1 from public.visits v where v.restaurant_id = r.id);
