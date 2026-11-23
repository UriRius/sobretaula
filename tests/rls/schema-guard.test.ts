// Guarda d'esquema: les regles que TOTA migració ha de complir, comprovades
// contra el catàleg de Postgres (no taula per taula).
//
// isolation.test.ts prova les taules per a les quals algú ha escrit test.
// Aquesta és la xarxa de sota: pregunta a Postgres què EXISTEIX, així que una
// taula nova amb RLS oblidat, una vista sense security_invoker o un `grant …
// to anon` fallen aquí abans d'arribar a producció.

import { beforeAll, describe, expect, it } from 'vitest'
import { getLocalStack, queryLocalDb } from '../helpers/local-stack'

interface Relation { name: string; kind: 'r' | 'p' | 'v' | 'm'; rls: boolean; opts: string[] | null }
interface AnonGrant { name: string; privilege: string }
interface Policy { tablename: string; policyname: string; roles: string }
interface Fn { name: string; definer: boolean; config: string[] | null; anon_exec: boolean; public_exec: boolean }
interface Published { tablename: string }
interface Grant { grant: string }

// Permisos EXACTES de l'usuari amb sessió. Al núvol, cada taula nova neix amb
// TOTS els permisos; les migracions fan `revoke all` i donen només això. Una
// taula nova o un permís nou s'han d'afegir aquí a consciència.
const AUTHENTICATED_GRANTS = [
  'comments:SELECT',
  'group_invites:DELETE',
  'group_invites:SELECT',
  'group_members.role:UPDATE',
  'group_members:DELETE',
  'group_members:SELECT',
  'group_restaurant_notes:INSERT',
  'group_restaurant_notes:SELECT',
  'group_restaurant_notes:UPDATE',
  'groups.color:UPDATE',
  'groups.emoji:UPDATE',
  'groups.name:UPDATE',
  'groups:SELECT',
  'profiles.avatar_emoji:UPDATE',
  'profiles.avatar_url:UPDATE',
  'profiles.display_name:UPDATE',
  'profiles:INSERT',
  'profiles:SELECT',
  'restaurants.address:UPDATE',
  'restaurants.city:UPDATE',
  'restaurants.cuisine_origin:UPDATE',
  'restaurants.name:UPDATE',
  'restaurants:SELECT',
  'visit_category_stats:SELECT',
  'visit_participants:SELECT',
  'visits.price_per_person:UPDATE',
  'visits.visit_date:UPDATE',
  'visits:DELETE',
  'visits:SELECT',
  'votes:SELECT',
]

let relations: Relation[]
let anonGrants: AnonGrant[]
let policies: Policy[]
let functions: Fn[]
let published: Published[]
let authenticatedGrants: Grant[]

beforeAll(() => {
  getLocalStack() // mateixa guarda de localhost que la resta de la suite

  relations = queryLocalDb<Relation>(`
    select c.relname as name, c.relkind as kind, c.relrowsecurity as rls, c.reloptions as opts
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
  `)
  anonGrants = queryLocalDb<AnonGrant>(`
    select table_name as name, privilege_type as privilege
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'
    union all
    select table_name, 'column:' || column_name || ':' || privilege_type
    from information_schema.column_privileges
    where table_schema = 'public' and grantee = 'anon'
  `)
  policies = queryLocalDb<Policy>(`
    select tablename, policyname, roles::text as roles
    from pg_policies where schemaname in ('public', 'realtime')
  `)
  functions = queryLocalDb<Fn>(`
    select n.nspname || '.' || p.proname as name, p.prosecdef as definer, p.proconfig as config,
           has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
           exists (
             select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
             where a.grantee = 0 and a.privilege_type = 'EXECUTE'
           ) as public_exec
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
  `)
  published = queryLocalDb<Published>(`
    select tablename from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
  `)
  // Permisos de taula + permisos de columna que NO vinguin d'un permís de
  // taula sencera (column_privileges també llista els heretats).
  authenticatedGrants = queryLocalDb<Grant>(`
    select t.table_name || ':' || t.privilege_type as grant
    from information_schema.role_table_grants t
    where t.table_schema = 'public' and t.grantee = 'authenticated'
    union
    select c.table_name || '.' || c.column_name || ':' || c.privilege_type
    from information_schema.column_privileges c
    where c.table_schema = 'public' and c.grantee = 'authenticated'
      and not exists (
        select 1 from information_schema.role_table_grants t
        where t.table_schema = 'public' and t.grantee = 'authenticated'
          and t.table_name = c.table_name and t.privilege_type = c.privilege_type
      )
  `)
}, 60_000)

describe('guarda d\'esquema', () => {
  it('ha trobat l\'esquema (la consulta al catàleg funciona)', () => {
    expect(relations.map((r) => r.name)).toContain('votes')
    expect(functions.map((f) => f.name)).toContain('private.user_group_ids')
  })

  it('tota taula de public té RLS', () => {
    const tables = relations.filter((r) => r.kind === 'r' || r.kind === 'p')
    expect(tables.filter((t) => !t.rls).map((t) => t.name)).toEqual([])
  })

  it('tota vista de public és security_invoker, i no hi ha vistes materialitzades', () => {
    expect(relations.filter((r) => r.kind === 'm').map((r) => r.name)).toEqual([])
    const unsafe = relations
      .filter((r) => r.kind === 'v')
      .filter((v) => !(v.opts ?? []).some((o) => /^security_invoker=(true|on|1)$/i.test(o)))
    expect(unsafe.map((v) => v.name)).toEqual([])
  })

  it('anon no té cap privilegi sobre cap taula, vista ni columna de public', () => {
    expect(anonGrants.map((g) => `${g.name}:${g.privilege}`)).toEqual([])
  })

  it('l\'usuari amb sessió té EXACTAMENT els permisos previstos (ni TRUNCATE, ni UPDATE de l\'estat de la sala…)', () => {
    expect(authenticatedGrants.map((g) => g.grant).sort()).toEqual([...AUTHENTICATED_GRANTS].sort())
  })

  it('tota política és to authenticated', () => {
    const loose = policies.filter((p) => p.roles !== '{authenticated}')
    expect(loose.map((p) => `${p.tablename}.${p.policyname} → ${p.roles}`)).toEqual([])
  })

  it('tota funció SECURITY DEFINER fixa search_path', () => {
    const unpinned = functions
      .filter((f) => f.definer)
      .filter((f) => !(f.config ?? []).some((c) => c.startsWith('search_path=')))
    expect(unpinned.map((f) => f.name)).toEqual([])
  })

  it('anon no pot executar cap funció de public ni private, i PUBLIC tampoc', () => {
    expect(functions.filter((f) => f.anon_exec).map((f) => f.name)).toEqual([])
    expect(functions.filter((f) => f.public_exec).map((f) => f.name)).toEqual([])
  })

  it('vots i comentaris no es publiquen MAI per Realtime', () => {
    const tables = published.map((p) => p.tablename)
    expect(tables).not.toContain('votes')
    expect(tables).not.toContain('comments')
    expect(tables.sort()).toEqual(['visit_participants', 'visits'])
  })
})
