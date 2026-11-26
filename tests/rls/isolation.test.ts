// Aïllament entre grups — la frontera de privadesa del producte.
//
// El cas del document: l'Ana és a «Amics» i a «Parella». L'Amic només és a
// «Amics»; la Parella només a «Parella». L'Amic no ha de poder veure NI TOCAR
// res de «Parella» per cap camí del client (taules, vista, RPC), ni tan sols
// a través de la persona que comparteixen.
//
// Les proves negatives d'escriptura comproven DADES, no l'absència d'error:
// PostgREST respon èxit amb 0 files a un UPDATE/DELETE filtrat per RLS.
// Després de cada intent bloquejat es torna a llegir com a admin.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getLocalStack } from '../helpers/local-stack'
import {
  adminClient,
  anonClient,
  cleanup,
  createClosedVisit,
  createGroup,
  createRestaurant,
  createTestUser,
  signIn,
  uniqueEmail,
  type Client,
} from '../helpers/factory'

let admin: Client
let anon: Client
let asAna: Client
let asAmic: Client
let asParella: Client
let asOutsider: Client

let ana: string
let amic: string
let parella: string
let outsider: string

let gAmics: string
let gParella: string

let rAmics: string // només hi ha anat Amics
let rParella: string // només hi ha anat Parella
let rShared: string // hi han anat tots dos grups

let vAmics: { visitId: string; roomCode: string }
let vParella: { visitId: string; roomCode: string }
let parellaInviteCode: string

beforeAll(async () => {
  const stack = getLocalStack()
  admin = adminClient(stack)
  anon = anonClient(stack)

  const emails = {
    ana: uniqueEmail('ana'),
    amic: uniqueEmail('amic'),
    parella: uniqueEmail('parella'),
    outsider: uniqueEmail('outsider'),
  }
  ana = await createTestUser(admin, emails.ana, 'Ana')
  amic = await createTestUser(admin, emails.amic, 'Amic')
  parella = await createTestUser(admin, emails.parella, 'Parella')
  outsider = await createTestUser(admin, emails.outsider, 'Outsider')

  gAmics = await createGroup(admin, 'Amics (test)', [
    { userId: ana, role: 'admin' },
    { userId: amic, role: 'member' },
  ])
  gParella = await createGroup(admin, 'Parella (test)', [
    { userId: ana, role: 'admin' },
    { userId: parella, role: 'member' },
  ])

  rAmics = await createRestaurant(admin, `Restaurant Amics ${Date.now()}`)
  rParella = await createRestaurant(admin, `Restaurant Parella ${Date.now()}`, 'fr')
  rShared = await createRestaurant(admin, `Restaurant Compartit ${Date.now()}`, 'it')

  vAmics = await createClosedVisit(admin, { groupId: gAmics, restaurantId: rAmics, hostId: ana, participants: [ana, amic] })
  vParella = await createClosedVisit(admin, {
    groupId: gParella,
    restaurantId: rParella,
    hostId: ana,
    participants: [ana, parella],
    value: 9,
  })
  await createClosedVisit(admin, { groupId: gAmics, restaurantId: rShared, hostId: amic, participants: [ana, amic] })
  await createClosedVisit(admin, { groupId: gParella, restaurantId: rShared, hostId: parella, participants: [ana, parella] })

  await admin.from('group_restaurant_notes').insert([
    { group_id: gAmics, restaurant_id: rShared, notes: 'nota dels amics' },
    { group_id: gParella, restaurant_id: rShared, notes: 'nota de la parella' },
  ])

  asAna = await signIn(stack, emails.ana)
  asAmic = await signIn(stack, emails.amic)
  asParella = await signIn(stack, emails.parella)
  asOutsider = await signIn(stack, emails.outsider)

  const { data: invite, error } = await asAna.rpc('create_invite', { p_group_id: gParella })
  if (error || !invite) throw new Error(`create_invite: ${error?.message}`)
  parellaInviteCode = invite.code
}, 90_000)

afterAll(async () => {
  if (!admin) return
  await cleanup(admin, [gAmics, gParella].filter(Boolean), [ana, amic, parella, outsider].filter(Boolean), [
    rAmics,
    rParella,
    rShared,
  ].filter(Boolean))
}, 60_000)

// ---------------------------------------------------------------------------
// Lectura: l'Amic no veu res de Parella
// ---------------------------------------------------------------------------
describe('l\'Amic no pot llegir res de «Parella»', () => {
  it('veu el seu grup però no Parella', async () => {
    const { data } = await asAmic.from('groups').select('id')
    const ids = (data ?? []).map((g) => g.id)
    expect(ids).toContain(gAmics)
    expect(ids).not.toContain(gParella)
  })

  it('no veu cap pertinença de Parella (ni la de l\'Ana)', async () => {
    const { data } = await asAmic.from('group_members').select('group_id, user_id').eq('group_id', gParella)
    expect(data ?? []).toHaveLength(0)
    const anaRows = await asAmic.from('group_members').select('group_id').eq('user_id', ana)
    expect((anaRows.data ?? []).map((r) => r.group_id)).toEqual([gAmics])
  })

  it('no veu cap visita, participant, vot ni comentari de Parella', async () => {
    for (const table of ['visits', 'visit_participants', 'votes', 'comments'] as const) {
      const { data, error } = await asAmic.from(table).select('group_id').eq('group_id', gParella)
      expect(error, table).toBeNull()
      expect(data ?? [], table).toHaveLength(0)
    }
  })

  it('no veu les estadístiques de Parella (vista)', async () => {
    const { data } = await asAmic.from('visit_category_stats').select('visit_id').eq('group_id', gParella)
    expect(data ?? []).toHaveLength(0)
    const own = await asAmic.from('visit_category_stats').select('visit_id').eq('visit_id', vAmics.visitId)
    expect(own.data ?? []).toHaveLength(4)
  })

  it('no veu els vots de l\'Ana a Parella, encara que l\'Ana sigui al seu grup', async () => {
    const { data } = await asAmic.from('votes').select('visit_id').eq('user_id', ana)
    const visits = new Set((data ?? []).map((v) => v.visit_id))
    expect(visits.has(vParella.visitId)).toBe(false)
    expect(visits.has(vAmics.visitId)).toBe(true)
  })

  it('no veu les notes de Parella sobre el restaurant compartit', async () => {
    const { data } = await asAmic.from('group_restaurant_notes').select('group_id, notes').eq('restaurant_id', rShared)
    expect((data ?? []).map((n) => n.notes)).toEqual(['nota dels amics'])
  })

  it('no veu les invitacions de Parella', async () => {
    const { data } = await asAmic.from('group_invites').select('id').eq('group_id', gParella)
    expect(data ?? []).toHaveLength(0)
  })

  it('catàleg: veu els restaurants del seu grup, no el que només coneix Parella', async () => {
    const { data } = await asAmic.from('restaurants').select('id')
    const ids = (data ?? []).map((r) => r.id)
    expect(ids).toContain(rAmics)
    expect(ids).toContain(rShared)
    expect(ids).not.toContain(rParella)
  })

  it('perfils: veu l\'Ana (comparteixen grup), no la Parella', async () => {
    const { data } = await asAmic.from('profiles').select('id')
    const ids = (data ?? []).map((p) => p.id)
    expect(ids).toContain(ana)
    expect(ids).not.toContain(parella)
  })

  it('i a l\'inrevés: la Parella no veu res d\'Amics', async () => {
    for (const table of ['visits', 'votes', 'comments', 'group_members'] as const) {
      const { data } = await asParella.from(table).select('group_id').eq('group_id', gAmics)
      expect(data ?? [], table).toHaveLength(0)
    }
    const { data } = await asParella.from('restaurants').select('id')
    const ids = (data ?? []).map((r) => r.id)
    expect(ids).toContain(rParella)
    expect(ids).not.toContain(rAmics)
  })

  it('l\'Ana veu els dos grups (control positiu)', async () => {
    const { data } = await asAna.from('groups').select('id')
    const ids = (data ?? []).map((g) => g.id)
    expect(ids).toEqual(expect.arrayContaining([gAmics, gParella]))
    const votes = await asAna.from('votes').select('visit_id').eq('visit_id', vParella.visitId)
    expect(votes.data ?? []).toHaveLength(8)
  })
})

// ---------------------------------------------------------------------------
// El perfil de l'Ana vist per l'Amic (src/lib/profile.ts). Les mateixes
// consultes que fa la pantalla, però demanant també Parella a propòsit (com
// si algú escrivís ?grup=<id de Parella> a l'adreça).
// ---------------------------------------------------------------------------
describe('el perfil de l\'Ana, vist per l\'Amic, no diu res de «Parella»', () => {
  const both = () => [gAmics, gParella]

  it('grups de l\'Ana: només el compartit', async () => {
    const { data } = await asAmic.from('group_members').select('group_id').eq('user_id', ana)
    expect((data ?? []).map((m) => m.group_id)).toEqual([gAmics])
  })

  it('visites, notes i vots de l\'Ana: només d\'Amics', async () => {
    const visits = await asAmic.from('visits').select('group_id').in('group_id', both())
    expect(new Set((visits.data ?? []).map((v) => v.group_id))).toEqual(new Set([gAmics]))
    const stats = await asAmic.from('visit_category_stats').select('group_id').in('group_id', both())
    expect(new Set((stats.data ?? []).map((s) => s.group_id))).toEqual(new Set([gAmics]))
    const votes = await asAmic.from('votes').select('group_id, visit_id').eq('user_id', ana).in('group_id', both())
    expect(new Set((votes.data ?? []).map((v) => v.group_id))).toEqual(new Set([gAmics]))
    expect((votes.data ?? []).some((v) => v.visit_id === vParella.visitId)).toBe(false)
  })

  it('comentaris de l\'Ana: només d\'Amics', async () => {
    const { data } = await asAmic.from('comments').select('group_id').eq('user_id', ana)
    expect(new Set((data ?? []).map((c) => c.group_id))).toEqual(new Set([gAmics]))
  })
})

// ---------------------------------------------------------------------------
// Escriptura: l'Amic no pot tocar res de Parella
// ---------------------------------------------------------------------------
describe('l\'Amic no pot escriure res a «Parella»', () => {
  it('no pot reanomenar Parella', async () => {
    await asAmic.from('groups').update({ name: 'pres per l\'Amic' }).eq('id', gParella)
    const { data } = await admin.from('groups').select('name').eq('id', gParella).single()
    expect(data!.name).toBe('Parella (test)')
  })

  it('no pot treure ningú de Parella', async () => {
    await asAmic.from('group_members').delete().eq('group_id', gParella)
    const { data } = await admin.from('group_members').select('user_id').eq('group_id', gParella)
    expect(data ?? []).toHaveLength(2)
  })

  it('no pot crear invitacions ni revocar les de Parella', async () => {
    const created = await asAmic.rpc('create_invite', { p_group_id: gParella })
    expect(created.error?.message).toBe('not_admin')
    await asAmic.from('group_invites').delete().eq('code', parellaInviteCode)
    const { data } = await admin.from('group_invites').select('id').eq('code', parellaInviteCode)
    expect(data ?? []).toHaveLength(1)
  })

  it('no pot modificar ni esborrar visites de Parella', async () => {
    await asAmic.from('visits').update({ price_per_person: 1 }).eq('id', vParella.visitId)
    await asAmic.from('visits').delete().eq('id', vParella.visitId)
    const { data } = await admin.from('visits').select('price_per_person').eq('id', vParella.visitId).single()
    expect(data).not.toBeNull()
    expect(data!.price_per_person).toBeNull()
  })

  it('no pot crear una sala a Parella', async () => {
    const { error } = await asAmic.rpc('create_visit', {
      p_group_id: gParella,
      p_restaurant_id: rShared,
      p_restaurant_name: '',
      p_city: '',
      p_address: '',
      p_cuisine_origin: 'it',
      p_visit_date: '2026-11-23',
      p_price_per_person: 10,
    })
    expect(error?.message).toBe('not_member')
  })

  it('no pot entrar a una sala de Parella amb el codi (mateixa resposta que un codi inexistent)', async () => {
    const theirs = await asAmic.rpc('join_visit', { p_code: vParella.roomCode })
    const nonexistent = await asAmic.rpc('join_visit', { p_code: 'ZZZZZ' })
    expect(theirs.error?.message).toBe('room_not_found')
    expect(nonexistent.error?.message).toBe('room_not_found')
  })

  it('no pot votar ni comentar en una visita de Parella', async () => {
    const vote = await asAmic.rpc('cast_vote', { p_visit_id: vParella.visitId, p_category: 'menjar', p_value: 1 })
    const comment = await asAmic.rpc('set_comment', { p_visit_id: vParella.visitId, p_body: 'hola' })
    expect(vote.error?.message).toBe('room_not_found')
    expect(comment.error?.message).toBe('room_not_found')
    const { data } = await admin.from('votes').select('value').eq('visit_id', vParella.visitId)
    expect((data ?? []).every((v) => v.value === 9)).toBe(true)
  })

  it('no pot escriure notes de Parella ni moure-hi les seves', async () => {
    const insert = await asAmic
      .from('group_restaurant_notes')
      .insert({ group_id: gParella, restaurant_id: rShared, notes: 'intrús' })
    expect(insert.error).not.toBeNull()
    await asAmic.from('group_restaurant_notes').update({ notes: 'canviat' }).eq('group_id', gParella)
    await asAmic.from('group_restaurant_notes').update({ group_id: gParella }).eq('group_id', gAmics)
    const { data } = await admin
      .from('group_restaurant_notes')
      .select('group_id, notes')
      .eq('restaurant_id', rShared)
    const byGroup = Object.fromEntries((data ?? []).map((n) => [n.group_id, n.notes]))
    expect(byGroup).toEqual({ [gAmics]: 'nota dels amics', [gParella]: 'nota de la parella' })
  })

  it('no pot corregir un restaurant que només coneix Parella', async () => {
    await asAmic.from('restaurants').update({ name: 'pirata' }).eq('id', rParella)
    const { data } = await admin.from('restaurants').select('name').eq('id', rParella).single()
    expect(data!.name).not.toBe('pirata')
  })

  it('no pot escriure directament a vots, comentaris ni participants (només per RPC)', async () => {
    const vote = await asAmic
      .from('votes')
      .insert({ visit_id: vAmics.visitId, group_id: gAmics, user_id: amic, category: 'menjar', value: 1 })
    const participant = await asAmic
      .from('visit_participants')
      .insert({ visit_id: vParella.visitId, group_id: gParella, user_id: amic })
    expect(vote.error).not.toBeNull()
    expect(participant.error).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Rols dins d'un grup
// ---------------------------------------------------------------------------
describe('rols i pertinença', () => {
  it('un membre no es pot fer admin ni treure l\'admin', async () => {
    await asAmic.from('group_members').update({ role: 'admin' }).eq('group_id', gAmics).eq('user_id', amic)
    await asAmic.from('group_members').delete().eq('group_id', gAmics).eq('user_id', ana)
    const { data } = await admin.from('group_members').select('user_id, role').eq('group_id', gAmics).order('role')
    expect(data).toEqual([
      { user_id: ana, role: 'admin' },
      { user_id: amic, role: 'member' },
    ])
  })

  it('l\'admin no pot tocar la seva pròpia fila', async () => {
    await asAna.from('group_members').update({ role: 'member' }).eq('group_id', gAmics).eq('user_id', ana)
    const { data } = await admin.from('group_members').select('role').eq('group_id', gAmics).eq('user_id', ana).single()
    expect(data!.role).toBe('admin')
  })

  it('l\'últim admin no pot sortir del grup', async () => {
    const { error } = await asAna.rpc('leave_group', { p_group_id: gAmics })
    expect(error?.message).toBe('last_admin')
  })

  it('un membre no pot crear invitacions', async () => {
    const { error } = await asAmic.rpc('create_invite', { p_group_id: gAmics })
    expect(error?.message).toBe('not_admin')
  })
})

// ---------------------------------------------------------------------------
// Algú sense grups ni permís
// ---------------------------------------------------------------------------
describe('usuari sense invitació', () => {
  it('no veu res i no pot crear grups', async () => {
    for (const table of ['groups', 'group_members', 'visits', 'votes', 'comments', 'restaurants'] as const) {
      const { data } = await asOutsider.from(table).select('*', { head: false }).limit(1)
      expect(data ?? [], table).toHaveLength(0)
    }
    const { data: canCreate } = await asOutsider.rpc('can_create_groups')
    expect(canCreate).toBe(false)
    const { error } = await asOutsider.rpc('create_group', { p_name: 'Meu', p_emoji: '🍕', p_color: 'blau' })
    expect(error?.message).toBe('not_allowed')
  })

  it('veu la previsualització d\'una invitació sense veure\'n els membres', async () => {
    const { data } = await asOutsider.rpc('invite_preview', { p_code: parellaInviteCode })
    expect(data).toHaveLength(1)
    expect(data![0]).toMatchObject({ group_id: gParella, member_count: 2, is_member: false, status: 'valid' })
    const members = await asOutsider.from('group_members').select('user_id').eq('group_id', gParella)
    expect(members.data ?? []).toHaveLength(0)
  })

  it('en acceptar la invitació entra a Parella i ja la veu (i pot crear grups)', async () => {
    const { data: groupId, error } = await asOutsider.rpc('accept_invite', { p_code: parellaInviteCode })
    expect(error).toBeNull()
    expect(groupId).toBe(gParella)
    const { data } = await asOutsider.from('visits').select('id').eq('group_id', gParella)
    expect((data ?? []).length).toBeGreaterThan(0)
    const { data: canCreate } = await asOutsider.rpc('can_create_groups')
    expect(canCreate).toBe(true)
    // …però continua sense veure res d'Amics
    const amics = await asOutsider.from('visits').select('id').eq('group_id', gAmics)
    expect(amics.data ?? []).toHaveLength(0)
  })

  it('acceptar-la un altre cop no gasta usos', async () => {
    await asOutsider.rpc('accept_invite', { p_code: parellaInviteCode })
    const { data } = await admin.from('group_invites').select('uses').eq('code', parellaInviteCode).single()
    expect(data!.uses).toBe(1)
  })

  it('una invitació inexistent o caducada no deixa entrar', async () => {
    const missing = await asAmic.rpc('accept_invite', { p_code: 'NOEXISTEIX' })
    expect(missing.error?.message).toBe('invite_not_found')

    const { data: expired } = await admin
      .from('group_invites')
      .insert({ group_id: gParella, code: 'CADUCADA22', expires_at: '2020-01-01' })
      .select('code')
      .single()
    const result = await asAmic.rpc('accept_invite', { p_code: expired!.code })
    expect(result.error?.message).toBe('invite_expired')
    const { data } = await admin.from('group_members').select('user_id').eq('group_id', gParella).eq('user_id', amic)
    expect(data ?? []).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// anon (la clau publicable sense sessió)
// ---------------------------------------------------------------------------
describe('anon', () => {
  it('no veu res de cap taula ni vista', async () => {
    const tables = [
      'profiles', 'groups', 'group_members', 'group_invites', 'restaurants', 'group_restaurant_notes',
      'visits', 'visit_participants', 'votes', 'comments', 'visit_category_stats',
    ] as const
    for (const table of tables) {
      const { data } = await anon.from(table as 'votes').select('*').limit(1)
      expect(data ?? [], table).toHaveLength(0)
    }
  })

  it('no pot cridar cap RPC', async () => {
    const preview = await anon.rpc('invite_preview', { p_code: parellaInviteCode })
    const create = await anon.rpc('create_group', { p_name: 'x', p_emoji: 'x', p_color: 'blau' })
    expect(preview.error).not.toBeNull()
    expect(create.error).not.toBeNull()
  })
})
