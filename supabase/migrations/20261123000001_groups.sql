-- ============================================================================
-- Sobretaula · 1/3 · Perfils, grups, membres, invitacions
--
-- El «tenant» de Sobretaula és el GRUP (Amics, Parella…), mai l'usuari: tota
-- la privadesa es basa en ser membre d'un grup (group_members).
--
-- Regles que segueix tot l'esquema (detall i motius a CLAUDE.md):
--  * Les comprovacions de pertinença passen per funcions SECURITY DEFINER a
--    l'esquema `private` (no exposat per l'API) amb search_path = ''. Una
--    política de group_members que consultés group_members seria recursió.
--  * `(select auth.uid())` i `in (select private.fn())`: Postgres ho avalua un
--    cop per sentència (InitPlan), no per fila.
--  * Una política per operació, totes `to authenticated`. anon no rep res.
--  * El que s'ha de fer en diversos passos atòmics (crear un grup i fer-te'n
--    admin, acceptar una invitació) és una funció RPC; el client no pot
--    inserir pertinences directament.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Utilitats
-- ----------------------------------------------------------------------------

-- updated_at sense confiar en el client.
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Codis llegibles (invitacions, sales): sense caràcters que es confonen
-- (0/O, 1/I). 32 símbols → 256 % 32 = 0, distribució uniforme.
create or replace function private.random_code(p_length int)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(p_length);
  result text := '';
begin
  for i in 0 .. p_length - 1 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return result;
end;
$$;

-- ----------------------------------------------------------------------------
-- Perfils: la cara pública d'una persona dins dels seus grups.
-- Sense FK a auth.users: si algú esborra el compte, el perfil es queda
-- anonimitzat i els seus vots continuen sostenint la història del grup.
-- Sense email: no s'exposa mai a altres usuaris.
-- Es crea a la pantalla de benvinguda (no en un trigger d'alta: una excepció
-- en aquell trigger bloquejaria tots els registres).
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key,
  display_name text not null,
  avatar_url text,
  avatar_emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len check (char_length(btrim(display_name)) between 1 and 40),
  constraint profiles_avatar_emoji_len check (avatar_emoji is null or char_length(avatar_emoji) between 1 and 16),
  constraint profiles_avatar_url_https check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 500))
);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

-- ----------------------------------------------------------------------------
-- Grups i membres
-- ----------------------------------------------------------------------------
create type public.group_role as enum ('admin', 'member');

-- Paleta tancada (pensada per a clar i fosc). Els valors visuals són a
-- src/config/groupColors.ts, tipat a partir d'aquest enum.
create type public.group_color as enum (
  'tomaquet', 'taronja', 'mostassa', 'oliva', 'salvia', 'blau', 'pruna', 'rosa'
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '🍽️',
  color public.group_color not null default 'tomaquet',
  -- Autoria, mai control d'accés.
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_name_len check (char_length(btrim(name)) between 1 and 40),
  constraint groups_emoji_len check (char_length(emoji) between 1 and 16)
);

create trigger groups_touch_updated_at
  before update on public.groups
  for each row execute function private.touch_updated_at();

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
-- La subconsulta de pertinença filtra per user_id a cada petició.
create index group_members_user_id_idx on public.group_members (user_id);

-- Invitacions: un enllaç /unir/<codi>. El codi és llarg (10) perquè dona accés
-- al grup. Revocar = esborrar la fila.
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  code text not null unique,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  max_uses int,
  uses int not null default 0,
  constraint group_invites_code_format check (code ~ '^[A-Z2-9]{10}$'),
  constraint group_invites_max_uses_range check (max_uses is null or max_uses between 1 and 100),
  constraint group_invites_uses_nonneg check (uses >= 0)
);
create index group_invites_group_id_idx on public.group_invites (group_id);

-- Emails que poden crear grups sense haver estat convidats (el primer
-- administrador). No és a `public`: l'API no la veu. S'omple amb SQL (README).
create table private.allowed_emails (
  email text primary key,
  constraint allowed_emails_lowercase check (email = lower(btrim(email)))
);
revoke all on table private.allowed_emails from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;

-- ----------------------------------------------------------------------------
-- Funcions de pertinença: l'única porta a group_members des de RLS.
-- ----------------------------------------------------------------------------
create or replace function private.user_group_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select group_id
  from public.group_members
  where user_id = (select auth.uid())
$$;

create or replace function private.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id = (select auth.uid())
      and role = 'admin'
  )
$$;

-- Pot fer servir l'app (crear grups): ja és membre d'algun grup, o el seu
-- email (verificat) és a la llista de permesos.
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from public.group_members where user_id = (select auth.uid())
    )
    or exists (
      select 1
      from auth.users u
      join private.allowed_emails ae on ae.email = lower(u.email)
      where u.id = (select auth.uid())
        and u.email_confirmed_at is not null
    )
$$;

-- Perfils que pot veure l'usuari actual (a part del seu): qui comparteix un
-- grup amb ell. La migració 2 hi afegeix qui ha votat en visites dels seus
-- grups (perquè un exmembre continuï tenint nom a l'historial).
create or replace function private.visible_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select gm.user_id
  from public.group_members gm
  where gm.group_id in (
    select group_id from public.group_members where user_id = (select auth.uid())
  )
$$;

-- ----------------------------------------------------------------------------
-- Polítiques
-- ----------------------------------------------------------------------------

-- profiles: el meu i els visibles; només escric el meu.
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or id in (select private.visible_profile_ids())
  );

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- Sense DELETE: esborrar el compte anonimitza el perfil (funció de servidor).

-- groups: els membres el veuen; només els admins el modifiquen.
-- Sense INSERT (RPC create_group) ni DELETE (fora de la v1).
create policy "groups_select_member" on public.groups
  for select to authenticated
  using (id in (select private.user_group_ids()));

create policy "groups_update_admin" on public.groups
  for update to authenticated
  using (private.is_group_admin(id))
  with check (private.is_group_admin(id));

-- group_members: els membres veuen la llista; els admins canvien rols i
-- treuen membres, però MAI la seva pròpia fila (ni autopromocionar-se ni
-- deixar el grup sense admin). Entrar: RPC accept_invite. Sortir: RPC
-- leave_group.
create policy "group_members_select" on public.group_members
  for select to authenticated
  using (group_id in (select private.user_group_ids()));

create policy "group_members_update_admin" on public.group_members
  for update to authenticated
  using (
    private.is_group_admin(group_id)
    and user_id <> (select auth.uid())
  )
  with check (
    private.is_group_admin(group_id)
    and user_id <> (select auth.uid())
  );

create policy "group_members_delete_admin" on public.group_members
  for delete to authenticated
  using (
    private.is_group_admin(group_id)
    and user_id <> (select auth.uid())
  );

-- group_invites: només els admins les veuen i les revoquen (DELETE). Crear:
-- RPC create_invite. Consultar-ne una pel codi: RPC invite_preview.
create policy "group_invites_select_admin" on public.group_invites
  for select to authenticated
  using (private.is_group_admin(group_id));

create policy "group_invites_delete_admin" on public.group_invites
  for delete to authenticated
  using (private.is_group_admin(group_id));

-- ----------------------------------------------------------------------------
-- RPC
-- Errors: `raise exception '<codi>'` amb un codi estable que la UI tradueix
-- (src/i18n/ca.ts → errors). Mai text per a l'usuari aquí.
-- ----------------------------------------------------------------------------

create or replace function public.create_group(
  p_name text,
  p_emoji text,
  p_color public.group_color
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_required' using errcode = 'P0001';
  end if;
  if not private.is_active_user() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  insert into public.groups (name, emoji, color, created_by)
    values (btrim(p_name), coalesce(nullif(btrim(p_emoji), ''), '🍽️'), p_color, v_uid)
    returning id into v_group_id;

  insert into public.group_members (group_id, user_id, role)
    values (v_group_id, v_uid, 'admin');

  return v_group_id;
end;
$$;

create or replace function public.create_invite(
  p_group_id uuid,
  p_max_uses int default null,
  p_valid_days int default 7
)
returns public.group_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.group_invites;
begin
  if not private.is_group_admin(p_group_id) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if p_valid_days is null or p_valid_days not between 1 and 30 then
    raise exception 'invalid_validity' using errcode = '22023';
  end if;

  loop
    begin
      insert into public.group_invites (group_id, code, created_by, expires_at, max_uses)
        values (
          p_group_id,
          private.random_code(10),
          (select auth.uid()),
          now() + make_interval(days => p_valid_days),
          p_max_uses
        )
        returning * into v_invite;
      return v_invite;
    exception when unique_violation then
      -- col·lisió de codi (improbable): se'n genera un altre
    end;
  end loop;
end;
$$;

-- Què hi ha darrere d'un codi, per a la pantalla «T'han convidat a…».
-- Retorna 0 files si el codi no existeix. No revela membres ni dades.
create or replace function public.invite_preview(p_code text)
returns table (
  group_id uuid,
  group_name text,
  group_emoji text,
  group_color public.group_color,
  member_count int,
  is_member boolean,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.name,
    g.emoji,
    g.color,
    (select count(*)::int from public.group_members m where m.group_id = g.id),
    exists (
      select 1 from public.group_members m
      where m.group_id = g.id and m.user_id = (select auth.uid())
    ),
    case
      when i.expires_at < now() then 'expired'
      when i.max_uses is not null and i.uses >= i.max_uses then 'used_up'
      else 'valid'
    end
  from public.group_invites i
  join public.groups g on g.id = i.group_id
  where i.code = upper(btrim(p_code))
    and (select auth.uid()) is not null
$$;

-- Acceptar una invitació (el pas de consentiment: el fa la persona convidada).
create or replace function public.accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_invite public.group_invites;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile_required' using errcode = 'P0001';
  end if;

  select * into v_invite
  from public.group_invites
  where code = upper(btrim(p_code))
  for update;

  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  -- Ja n'és membre: no gasta cap ús.
  if exists (
    select 1 from public.group_members
    where group_id = v_invite.group_id and user_id = v_uid
  ) then
    return v_invite.group_id;
  end if;

  if v_invite.expires_at < now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;
  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    raise exception 'invite_used_up' using errcode = 'P0001';
  end if;

  insert into public.group_members (group_id, user_id, role)
    values (v_invite.group_id, v_uid, 'member');

  update public.group_invites set uses = uses + 1 where id = v_invite.id;

  return v_invite.group_id;
end;
$$;

-- Sortir d'un grup. L'últim admin ha de nomenar-ne un altre abans; l'últim
-- membre no en pot sortir (el grup quedaria orfe). Els seus vots es queden.
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.group_role;
begin
  select role into v_role
  from public.group_members
  where group_id = p_group_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'not_member' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id <> v_uid
  ) then
    raise exception 'last_member' using errcode = 'P0001';
  end if;

  if v_role = 'admin' and not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id <> v_uid and role = 'admin'
  ) then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = v_uid;
end;
$$;

-- Pot crear grups l'usuari actual? (per a la pantalla de benvinguda)
create or replace function public.can_create_groups()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_user()
$$;

-- ----------------------------------------------------------------------------
-- Permisos. RLS filtra DAMUNT del grant. authenticated + service_role, mai
-- anon. Columnes: només les que el client pot canviar de debò.
--
-- Primer `revoke all`: al núvol, Supabase dona per defecte TOTS els permisos
-- (fins i tot TRUNCATE, que no passa per RLS) a anon i authenticated sobre
-- cada taula nova. Un GRANT per columna no serveix de res si al damunt hi ha
-- un UPDATE de taula sencera.
-- ----------------------------------------------------------------------------
revoke all on table public.profiles, public.groups, public.group_members, public.group_invites
  from anon, authenticated;

grant select, insert on table public.profiles to authenticated;
grant update (display_name, avatar_url, avatar_emoji) on table public.profiles to authenticated;

grant select on table public.groups to authenticated;
grant update (name, emoji, color) on table public.groups to authenticated;

grant select, delete on table public.group_members to authenticated;
grant update (role) on table public.group_members to authenticated;

grant select, delete on table public.group_invites to authenticated;

grant all on table public.profiles, public.groups, public.group_members, public.group_invites
  to service_role;
