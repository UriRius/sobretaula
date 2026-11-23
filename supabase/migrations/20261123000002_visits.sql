-- ============================================================================
-- Sobretaula · 2/3 · Restaurants, visites (sales), vots, comentaris, notes
--
-- Regles clau (motius a CLAUDE.md):
--  * EL SECRET DEL VOT ES GARANTEIX AQUÍ, no a la UI. Mentre la sala vota,
--    cadascú només pot llegir els seus vots i el seu comentari. Durant la
--    revelació, la RLS obre cada categoria només quan la revelació hi arriba
--    (així les DevTools no poden avançar-se). Els comentaris, quan es tanca.
--  * Vots i comentaris només s'escriuen per RPC (cast_vote, set_comment), que
--    bloquegen la fila de la visita (FOR SHARE) contra advance_visit (FOR
--    UPDATE): cap vot no pot entrar després de «Revelar».
--  * Les dades que pengen d'una visita porten group_id amb una FK composta
--    (visit_id, group_id) → visits(id, group_id): impossible barrejar grups.
--  * La nota final NO es guarda mai: es calcula amb els pesos de
--    src/config/scoring.ts a partir dels vots. Aquí només hi ha agregats que no
--    depenen dels pesos (visit_category_stats).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Catàleg de restaurants (compartit per deduplicar, visible per grups)
-- ----------------------------------------------------------------------------

-- Clau de comparació: minúscules, sense accents ni espais repetits.
-- «Can Pép  » i «can pep» són el mateix restaurant.
create or replace function private.normalize_key(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, btrim(coalesce(p_text, '')))),
    '\s+', ' ', 'g'
  )
$$;

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  address text,
  -- País ISO (it, jp…), regió espanyola (es-ct, es-pv…) o sense país
  -- (fusio, intl). Llista tancada amb noms a src/config/cuisines.ts.
  cuisine_origin text not null,
  name_key text generated always as (private.normalize_key(name)) stored,
  city_key text generated always as (private.normalize_key(city)) stored,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_name_len check (char_length(btrim(name)) between 1 and 80),
  constraint restaurants_city_len check (city is null or char_length(btrim(city)) between 1 and 60),
  constraint restaurants_address_len check (address is null or char_length(btrim(address)) between 1 and 160),
  constraint restaurants_cuisine_format check (cuisine_origin ~ '^([a-z]{2}(-[a-z]{2,3})?|fusio|intl)$')
);
-- Un sol restaurant per (nom, població) normalitzats: el servidor reaprofita
-- la fitxa en lloc de duplicar-la (create_visit).
create unique index restaurants_identity_idx on public.restaurants (name_key, city_key);

create trigger restaurants_touch_updated_at
  before update on public.restaurants
  for each row execute function private.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Visites (sales de votació)
-- ----------------------------------------------------------------------------

-- L'ordre de l'enum ÉS l'ordre de revelació (i el de src/config/scoring.ts:
-- hi ha un test que ho comprova).
create type public.vote_category as enum ('menjar', 'preu', 'servei', 'espai');

-- voting → revealing (reveal_step 0–3 = categoria que es mostra) → closed
-- (pantalla de nota final; la visita passa a l'historial).
create type public.visit_status as enum ('voting', 'revealing', 'closed');

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  visit_date date not null,
  price_per_person numeric(7, 2),
  host_id uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  room_code text not null unique,
  status public.visit_status not null default 'voting',
  reveal_step smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint visits_price_range check (price_per_person is null or price_per_person between 0 and 10000),
  constraint visits_room_code_format check (room_code ~ '^[A-Z2-9]{5}$'),
  constraint visits_reveal_step_range check (reveal_step between 0 and 3),
  constraint visits_id_group_key unique (id, group_id)
);
create index visits_group_date_idx on public.visits (group_id, visit_date desc);
create index visits_restaurant_idx on public.visits (restaurant_id);

create trigger visits_touch_updated_at
  before update on public.visits
  for each row execute function private.touch_updated_at();

create table public.visit_participants (
  visit_id uuid not null,
  group_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Quantes categories ha votat (0–4). El manté un trigger: els altres veuen
  -- el ✓ sense poder llegir cap vot.
  votes_cast smallint not null default 0,
  joined_at timestamptz not null default now(),
  primary key (visit_id, user_id),
  constraint visit_participants_visit_fk foreign key (visit_id, group_id)
    references public.visits (id, group_id) on delete cascade,
  constraint visit_participants_votes_cast_range check (votes_cast between 0 and 4)
);
create index visit_participants_user_idx on public.visit_participants (user_id);
create index visit_participants_group_idx on public.visit_participants (group_id);

create table public.votes (
  visit_id uuid not null,
  group_id uuid not null,
  user_id uuid not null,
  category public.vote_category not null,
  value smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (visit_id, user_id, category),
  constraint votes_value_range check (value between 1 and 10),
  constraint votes_participant_fk foreign key (visit_id, user_id)
    references public.visit_participants (visit_id, user_id) on delete cascade,
  constraint votes_visit_fk foreign key (visit_id, group_id)
    references public.visits (id, group_id) on delete cascade
);
create index votes_group_idx on public.votes (group_id);
create index votes_user_idx on public.votes (user_id);

create trigger votes_touch_updated_at
  before update on public.votes
  for each row execute function private.touch_updated_at();

-- Un comentari per participant i visita.
create table public.comments (
  visit_id uuid not null,
  group_id uuid not null,
  user_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (visit_id, user_id),
  constraint comments_body_len check (char_length(btrim(body)) between 1 and 280),
  constraint comments_participant_fk foreign key (visit_id, user_id)
    references public.visit_participants (visit_id, user_id) on delete cascade,
  constraint comments_visit_fk foreign key (visit_id, group_id)
    references public.visits (id, group_id) on delete cascade
);
create index comments_group_idx on public.comments (group_id);

create trigger comments_touch_updated_at
  before update on public.comments
  for each row execute function private.touch_updated_at();

-- Notes lliures d'un grup sobre un restaurant (editables per tots els membres).
create table public.group_restaurant_notes (
  group_id uuid not null references public.groups(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  notes text not null default '',
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (group_id, restaurant_id),
  constraint group_restaurant_notes_len check (char_length(notes) <= 2000)
);

create or replace function private.stamp_note_author()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$$;

create trigger group_restaurant_notes_stamp
  before insert or update on public.group_restaurant_notes
  for each row execute function private.stamp_note_author();

alter table public.restaurants enable row level security;
alter table public.visits enable row level security;
alter table public.visit_participants enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.group_restaurant_notes enable row level security;

-- ----------------------------------------------------------------------------
-- Funcions de visibilitat
-- ----------------------------------------------------------------------------

-- Restaurants que coneixen els meus grups. L'autocompletat només ensenya
-- aquests: si veiessis el catàleg sencer, podries deduir on ha anat un amic
-- amb un altre grup.
create or replace function private.visible_restaurant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct v.restaurant_id
  from public.visits v
  where v.group_id in (
    select group_id from public.group_members where user_id = (select auth.uid())
  )
$$;

-- Posició d'una categoria en l'ordre de revelació (0 = menjar).
create or replace function private.category_step(p_category public.vote_category)
returns int
language sql
immutable
set search_path = ''
as $$
  select array_position(enum_range(null::public.vote_category), p_category) - 1
$$;

-- Un vot d'aquesta categoria ja és públic dins el grup?
create or replace function private.vote_is_revealed(p_visit_id uuid, p_category public.vote_category)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.visits v
    where v.id = p_visit_id
      and (
        v.status = 'closed'
        or (v.status = 'revealing' and private.category_step(p_category) <= v.reveal_step)
      )
  )
$$;

create or replace function private.visit_is_closed(p_visit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.visits v where v.id = p_visit_id and v.status = 'closed')
$$;

-- Perfils visibles: qui comparteix grup amb mi, i qui ha participat en
-- visites dels meus grups (encara que ja no en sigui membre).
create or replace function private.visible_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with my_groups as (
    select group_id from public.group_members where user_id = (select auth.uid())
  )
  select gm.user_id from public.group_members gm where gm.group_id in (select group_id from my_groups)
  union
  select vp.user_id from public.visit_participants vp where vp.group_id in (select group_id from my_groups)
$$;

-- ----------------------------------------------------------------------------
-- Polítiques
-- ----------------------------------------------------------------------------

-- restaurants: veig i corregeixo els que coneixen els meus grups. Crear-ne:
-- només dins create_visit (deduplicació al servidor).
create policy "restaurants_select_known" on public.restaurants
  for select to authenticated
  using (id in (select private.visible_restaurant_ids()));

create policy "restaurants_update_known" on public.restaurants
  for update to authenticated
  using (id in (select private.visible_restaurant_ids()))
  with check (id in (select private.visible_restaurant_ids()));

-- visits: els membres les veuen. L'amfitrió o un admin en corregeix la data i
-- el preu, i pot cancel·lar (esborrar) una sala que encara vota. L'estat i el
-- pas de revelació només canvien per RPC (advance_visit).
create policy "visits_select_member" on public.visits
  for select to authenticated
  using (group_id in (select private.user_group_ids()));

create policy "visits_update_host_or_admin" on public.visits
  for update to authenticated
  using (
    group_id in (select private.user_group_ids())
    and (host_id = (select auth.uid()) or private.is_group_admin(group_id))
  )
  with check (
    group_id in (select private.user_group_ids())
    and (host_id = (select auth.uid()) or private.is_group_admin(group_id))
  );

create policy "visits_delete_while_voting" on public.visits
  for delete to authenticated
  using (
    status = 'voting'
    and group_id in (select private.user_group_ids())
    and (host_id = (select auth.uid()) or private.is_group_admin(group_id))
  );

-- visit_participants: els membres veuen qui hi ha i quantes categories ha
-- votat. Entrar: RPC join_visit.
create policy "visit_participants_select_member" on public.visit_participants
  for select to authenticated
  using (group_id in (select private.user_group_ids()));

-- votes: EL SECRET. Els meus, sempre; els dels altres, només si la categoria
-- ja s'ha revelat. Escriure: RPC cast_vote.
create policy "votes_select_own_or_revealed" on public.votes
  for select to authenticated
  using (
    group_id in (select private.user_group_ids())
    and (
      user_id = (select auth.uid())
      or private.vote_is_revealed(visit_id, category)
    )
  );

-- comments: el meu, sempre; els dels altres, quan la sala és tancada.
-- Escriure: RPC set_comment.
create policy "comments_select_own_or_closed" on public.comments
  for select to authenticated
  using (
    group_id in (select private.user_group_ids())
    and (
      user_id = (select auth.uid())
      or private.visit_is_closed(visit_id)
    )
  );

-- group_restaurant_notes: tots els membres, sobre restaurants on el grup ha anat.
create policy "group_restaurant_notes_select_member" on public.group_restaurant_notes
  for select to authenticated
  using (group_id in (select private.user_group_ids()));

create policy "group_restaurant_notes_insert_member" on public.group_restaurant_notes
  for insert to authenticated
  with check (
    group_id in (select private.user_group_ids())
    and exists (
      select 1 from public.visits v
      where v.group_id = group_restaurant_notes.group_id
        and v.restaurant_id = group_restaurant_notes.restaurant_id
    )
  );

create policy "group_restaurant_notes_update_member" on public.group_restaurant_notes
  for update to authenticated
  using (group_id in (select private.user_group_ids()))
  with check (
    group_id in (select private.user_group_ids())
    and exists (
      select 1 from public.visits v
      where v.group_id = group_restaurant_notes.group_id
        and v.restaurant_id = group_restaurant_notes.restaurant_id
    )
  );

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

-- votes_cast = nombre de categories votades per aquell participant.
create or replace function private.sync_votes_cast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visit uuid;
  v_user uuid;
begin
  if tg_op = 'DELETE' then
    v_visit := old.visit_id;
    v_user := old.user_id;
  else
    v_visit := new.visit_id;
    v_user := new.user_id;
  end if;

  update public.visit_participants p
    set votes_cast = (
      select count(*) from public.votes vo
      where vo.visit_id = v_visit and vo.user_id = v_user
    )
  where p.visit_id = v_visit and p.user_id = v_user;

  return null;
end;
$$;

create trigger votes_sync_cast
  after insert or delete on public.votes
  for each row execute function private.sync_votes_cast();

-- ----------------------------------------------------------------------------
-- RPC
-- ----------------------------------------------------------------------------

-- Crear una sala: restaurant (nou o reaprofitat) + visita + amfitrió, atòmic.
create or replace function public.create_visit(
  p_group_id uuid,
  p_restaurant_id uuid,
  p_restaurant_name text,
  p_city text,
  p_address text,
  p_cuisine_origin text,
  p_visit_date date,
  p_price_per_person numeric
)
returns public.visits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_restaurant_id uuid;
  v_visit public.visits;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_group_id is null or p_group_id not in (select private.user_group_ids()) then
    raise exception 'not_member' using errcode = '42501';
  end if;
  if p_visit_date is null then
    raise exception 'visit_date_required' using errcode = '22023';
  end if;

  if p_restaurant_id is not null then
    if p_restaurant_id not in (select private.visible_restaurant_ids()) then
      raise exception 'restaurant_not_found' using errcode = 'P0002';
    end if;
    v_restaurant_id := p_restaurant_id;
  else
    if nullif(btrim(p_restaurant_name), '') is null then
      raise exception 'restaurant_name_required' using errcode = '22023';
    end if;

    -- Deduplicació: si ja existeix (encara que l'hagi creat un altre grup),
    -- es reaprofita la fitxa sense revelar-ne res més.
    select r.id into v_restaurant_id
    from public.restaurants r
    where r.name_key = private.normalize_key(p_restaurant_name)
      and r.city_key = private.normalize_key(nullif(btrim(p_city), ''));

    if v_restaurant_id is null then
      if p_cuisine_origin is null then
        raise exception 'cuisine_required' using errcode = '22023';
      end if;
      insert into public.restaurants (name, city, address, cuisine_origin, created_by)
        values (
          btrim(p_restaurant_name),
          nullif(btrim(p_city), ''),
          nullif(btrim(p_address), ''),
          p_cuisine_origin,
          v_uid
        )
        returning id into v_restaurant_id;
    end if;
  end if;

  loop
    begin
      insert into public.visits (group_id, restaurant_id, visit_date, price_per_person, host_id, room_code)
        values (p_group_id, v_restaurant_id, p_visit_date, p_price_per_person, v_uid, private.random_code(5))
        returning * into v_visit;
      exit;
    exception when unique_violation then
      -- col·lisió del codi de sala: se'n genera un altre
    end;
  end loop;

  insert into public.visit_participants (visit_id, group_id, user_id)
    values (v_visit.id, v_visit.group_id, v_uid);

  return v_visit;
end;
$$;

-- Entrar a una sala pel codi. Si el codi no existeix o és d'un grup on no ets,
-- la resposta és la mateixa: room_not_found.
create or replace function public.join_visit(p_code text)
returns public.visits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_visit public.visits;
begin
  select * into v_visit
  from public.visits
  where room_code = upper(btrim(p_code))
    and group_id in (select private.user_group_ids());

  if not found then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;

  -- Un cop revelada, s'hi pot mirar però no s'hi pot participar.
  if v_visit.status = 'voting' then
    insert into public.visit_participants (visit_id, group_id, user_id)
      values (v_visit.id, v_visit.group_id, v_uid)
      on conflict (visit_id, user_id) do nothing;
  end if;

  return v_visit;
end;
$$;

-- Comprova que l'usuari actual pot escriure a la sala i la bloqueja en mode
-- compartit fins al final de la transacció (advance_visit la bloqueja en mode
-- exclusiu: un vot no pot colar-se després de «Revelar»).
create or replace function private.lock_voting_visit(p_visit_id uuid)
returns public.visits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_visit public.visits;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_visit
  from public.visits
  where id = p_visit_id
    and group_id in (select private.user_group_ids())
  for share;

  if not found then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;
  if v_visit.status <> 'voting' then
    raise exception 'voting_closed' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from public.visit_participants
    where visit_id = p_visit_id and user_id = v_uid
  ) then
    raise exception 'not_participant' using errcode = '42501';
  end if;

  return v_visit;
end;
$$;

-- Votar (o canviar el vot). p_value null = treure el vot d'aquesta categoria.
create or replace function public.cast_vote(
  p_visit_id uuid,
  p_category public.vote_category,
  p_value int
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_visit public.visits;
begin
  v_visit := private.lock_voting_visit(p_visit_id);

  if p_value is null then
    delete from public.votes
    where visit_id = p_visit_id and user_id = v_uid and category = p_category;
    return;
  end if;

  if p_value not between 1 and 10 then
    raise exception 'invalid_vote' using errcode = '22023';
  end if;

  insert into public.votes (visit_id, group_id, user_id, category, value)
    values (p_visit_id, v_visit.group_id, v_uid, p_category, p_value)
    on conflict (visit_id, user_id, category)
    do update set value = excluded.value;
end;
$$;

-- El comentari del participant. Text buit = esborrar-lo.
create or replace function public.set_comment(p_visit_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_visit public.visits;
begin
  v_visit := private.lock_voting_visit(p_visit_id);

  if nullif(btrim(p_body), '') is null then
    delete from public.comments where visit_id = p_visit_id and user_id = v_uid;
    return;
  end if;

  insert into public.comments (visit_id, group_id, user_id, body)
    values (p_visit_id, v_visit.group_id, v_uid, btrim(p_body))
    on conflict (visit_id, user_id)
    do update set body = excluded.body;
end;
$$;

-- «Revelar» i «Següent». Només l'amfitrió o un admin del grup.
--   voting       → revealing, pas 0 (cal com a mínim un vot a cada categoria)
--   revealing n  → revealing n+1
--   revealing 3  → closed (pantalla de nota final)
create or replace function public.advance_visit(p_visit_id uuid)
returns public.visits
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_visit public.visits;
begin
  select * into v_visit
  from public.visits
  where id = p_visit_id
    and group_id in (select private.user_group_ids())
  for update;

  if not found then
    raise exception 'room_not_found' using errcode = 'P0002';
  end if;
  if v_visit.host_id <> v_uid and not private.is_group_admin(v_visit.group_id) then
    raise exception 'not_host' using errcode = '42501';
  end if;

  if v_visit.status = 'voting' then
    if (
      select count(distinct category) from public.votes where visit_id = p_visit_id
    ) < array_length(enum_range(null::public.vote_category), 1) then
      raise exception 'missing_votes' using errcode = 'P0001';
    end if;
    update public.visits
      set status = 'revealing', reveal_step = 0
      where id = p_visit_id
      returning * into v_visit;
  elsif v_visit.status = 'revealing' then
    if v_visit.reveal_step < array_length(enum_range(null::public.vote_category), 1) - 1 then
      update public.visits
        set reveal_step = reveal_step + 1
        where id = p_visit_id
        returning * into v_visit;
    else
      update public.visits
        set status = 'closed', closed_at = now()
        where id = p_visit_id
        returning * into v_visit;
    end if;
  else
    raise exception 'already_closed' using errcode = 'P0001';
  end if;

  return v_visit;
end;
$$;

-- ----------------------------------------------------------------------------
-- Agregats que no depenen dels pesos, per visita tancada i categoria.
-- La nota ponderada es calcula a src/lib/scoring amb src/config/scoring.ts.
-- security_invoker: respecta la RLS de qui consulta.
-- ----------------------------------------------------------------------------
create view public.visit_category_stats
with (security_invoker = true)
as
select
  v.id as visit_id,
  v.group_id,
  vo.category,
  count(*)::int as vote_count,
  avg(vo.value)::float8 as average,
  stddev_pop(vo.value)::float8 as stddev,
  min(vo.value)::int as min_value,
  max(vo.value)::int as max_value
from public.visits v
join public.votes vo on vo.visit_id = v.id
where v.status = 'closed'
group by v.id, v.group_id, vo.category;

-- ----------------------------------------------------------------------------
-- Permisos. Primer `revoke all` (al núvol, les taules noves neixen amb tots
-- els permisos per a anon i authenticated); després, només el que cal.
-- ----------------------------------------------------------------------------
revoke all on table
  public.restaurants, public.visits, public.visit_participants, public.votes,
  public.comments, public.group_restaurant_notes, public.visit_category_stats
  from anon, authenticated;

grant select on table public.restaurants to authenticated;
grant update (name, city, address, cuisine_origin) on table public.restaurants to authenticated;

grant select, delete on table public.visits to authenticated;
grant update (visit_date, price_per_person) on table public.visits to authenticated;

grant select on table public.visit_participants to authenticated;
grant select on table public.votes to authenticated;
grant select on table public.comments to authenticated;
grant select, insert, update on table public.group_restaurant_notes to authenticated;
grant select on table public.visit_category_stats to authenticated;

grant all on table
  public.restaurants, public.visits, public.visit_participants, public.votes,
  public.comments, public.group_restaurant_notes
  to service_role;
grant select on table public.visit_category_stats to service_role;
