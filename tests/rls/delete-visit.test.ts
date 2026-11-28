// Esborrar una visita tancada (migració 5): només l'amfitrió o un admin del
// grup. Se'n van els vots, els comentaris i els participants; les notes del
// grup, si ja no hi té cap altra visita; i la fitxa del restaurant, si ja no
// hi ha anat cap grup. Mai res d'un altre grup.
// (Que no es pot esborrar durant la revelació: vote-secrecy.test.ts. Que un
// altre grup no pot: isolation.test.ts.)

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getLocalStack } from '../helpers/local-stack'
import {
  adminClient,
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
let asHost: Client
let asMember: Client
let asAdmin: Client
let asOutsider: Client
let host: string
let member: string
let groupAdmin: string
let outsider: string
let gMain: string
let gOther: string
let rOnly: string // només hi ha anat gMain, un cop
let rShared: string // hi han anat gMain i gOther
let rTwice: string // gMain hi ha anat dues vegades
let vOnly: string
let vShared: string
let vTwiceA: string
let vTwiceB: string
let vOther: string

async function exists(table: 'visits' | 'restaurants', id: string) {
  const { data } = await admin.from(table).select('id').eq('id', id)
  return (data ?? []).length === 1
}

async function notes(groupId: string, restaurantId: string) {
  const { data } = await admin
    .from('group_restaurant_notes')
    .select('notes')
    .eq('group_id', groupId)
    .eq('restaurant_id', restaurantId)
  return data ?? []
}

async function countFor(table: 'votes' | 'comments' | 'visit_participants', visitId: string) {
  const { count } = await admin.from(table).select('*', { count: 'exact', head: true }).eq('visit_id', visitId)
  return count ?? 0
}

beforeAll(async () => {
  const stack = getLocalStack()
  admin = adminClient(stack)
  const emails = {
    host: uniqueEmail('del-host'),
    member: uniqueEmail('del-member'),
    admin: uniqueEmail('del-admin'),
    outsider: uniqueEmail('del-outsider'),
  }
  host = await createTestUser(admin, emails.host, 'Amfitrió')
  member = await createTestUser(admin, emails.member, 'Membre')
  groupAdmin = await createTestUser(admin, emails.admin, 'Admin')
  outsider = await createTestUser(admin, emails.outsider, 'Un altre grup')

  gMain = await createGroup(admin, 'Esborrar visites (test)', [
    { userId: host, role: 'member' },
    { userId: member, role: 'member' },
    { userId: groupAdmin, role: 'admin' },
  ])
  gOther = await createGroup(admin, 'Un altre grup (test)', [{ userId: outsider, role: 'admin' }])

  const stamp = Date.now()
  rOnly = await createRestaurant(admin, `Prova única ${stamp}`)
  rShared = await createRestaurant(admin, `Prova compartida ${stamp}`)
  rTwice = await createRestaurant(admin, `Prova dues vegades ${stamp}`)

  const participants = [host, member, groupAdmin]
  ;({ visitId: vOnly } = await createClosedVisit(admin, { groupId: gMain, restaurantId: rOnly, hostId: host, participants }))
  ;({ visitId: vShared } = await createClosedVisit(admin, { groupId: gMain, restaurantId: rShared, hostId: member, participants }))
  ;({ visitId: vTwiceA } = await createClosedVisit(admin, { groupId: gMain, restaurantId: rTwice, hostId: host, participants }))
  ;({ visitId: vTwiceB } = await createClosedVisit(admin, { groupId: gMain, restaurantId: rTwice, hostId: host, participants }))
  ;({ visitId: vOther } = await createClosedVisit(admin, { groupId: gOther, restaurantId: rShared, hostId: outsider, participants: [outsider] }))

  const { error } = await admin.from('group_restaurant_notes').insert([
    { group_id: gMain, restaurant_id: rOnly, notes: 'Notes de la única' },
    { group_id: gMain, restaurant_id: rShared, notes: 'Notes de la compartida' },
    { group_id: gMain, restaurant_id: rTwice, notes: 'Notes de la repetida' },
    { group_id: gOther, restaurant_id: rShared, notes: 'Notes de l\'altre grup' },
  ])
  if (error) throw new Error(`notes: ${error.message}`)

  asHost = await signIn(stack, emails.host)
  asMember = await signIn(stack, emails.member)
  asAdmin = await signIn(stack, emails.admin)
  asOutsider = await signIn(stack, emails.outsider)
})

afterAll(async () => {
  await cleanup(admin, [gMain, gOther], [host, member, groupAdmin, outsider], [rOnly, rShared, rTwice])
})

describe('qui pot esborrar una visita tancada', () => {
  it('un membre que no n\'és l\'amfitrió ni admin, no', async () => {
    const { data } = await asMember.from('visits').delete().eq('id', vOnly).select('id')
    expect(data ?? []).toHaveLength(0)
    expect(await exists('visits', vOnly)).toBe(true)
  })

  it('l\'amfitrió, sí: vots, comentaris i participants fora; el restaurant i les notes també', async () => {
    const { data, error } = await asHost.from('visits').delete().eq('id', vOnly).select('id')
    expect(error).toBeNull()
    expect(data ?? []).toHaveLength(1)
    expect(await exists('visits', vOnly)).toBe(false)
    expect(await countFor('votes', vOnly)).toBe(0)
    expect(await countFor('comments', vOnly)).toBe(0)
    expect(await countFor('visit_participants', vOnly)).toBe(0)
    // Ja no hi havia anat ningú més: fora del catàleg.
    expect(await exists('restaurants', rOnly)).toBe(false)
    expect(await notes(gMain, rOnly)).toHaveLength(0)
  })

  it('un admin, sí, encara que no en sigui l\'amfitrió', async () => {
    const { data } = await asAdmin.from('visits').delete().eq('id', vShared).select('id')
    expect(data ?? []).toHaveLength(1)
    expect(await exists('visits', vShared)).toBe(false)
  })
})

describe('el que no és del grup no es toca', () => {
  it('el restaurant que coneix un altre grup es queda, amb la seva visita i les seves notes', async () => {
    expect(await exists('restaurants', rShared)).toBe(true)
    expect(await exists('visits', vOther)).toBe(true)
    expect(await countFor('votes', vOther)).toBe(4)
    expect(await notes(gOther, rShared)).toEqual([{ notes: 'Notes de l\'altre grup' }])
    const { data } = await asOutsider.from('restaurants').select('id').eq('id', rShared)
    expect(data ?? []).toHaveLength(1)
  })

  it('el grup que l\'ha esborrada perd les seves notes i ja no veu el restaurant', async () => {
    expect(await notes(gMain, rShared)).toHaveLength(0)
    const { data } = await asHost.from('restaurants').select('id').eq('id', rShared)
    expect(data ?? []).toHaveLength(0)
  })

  it('si el grup hi ha anat més vegades, el restaurant i les notes es queden', async () => {
    const { data } = await asHost.from('visits').delete().eq('id', vTwiceA).select('id')
    expect(data ?? []).toHaveLength(1)
    expect(await exists('visits', vTwiceB)).toBe(true)
    expect(await exists('restaurants', rTwice)).toBe(true)
    expect(await notes(gMain, rTwice)).toEqual([{ notes: 'Notes de la repetida' }])
  })
})

describe('cancel·lar una sala que vota', () => {
  it('no deixa la fitxa del restaurant nou al catàleg', async () => {
    const name = `Prova cancel·lada ${Date.now()}`
    const { data: visit, error } = await asHost.rpc('create_visit', {
      p_group_id: gMain,
      p_restaurant_id: null as unknown as string,
      p_restaurant_name: name,
      p_city: 'Prova',
      p_address: '',
      p_cuisine_origin: 'it',
      p_visit_date: '2026-11-27',
      p_price_per_person: null as unknown as number,
    })
    if (error || !visit) throw new Error(`create_visit: ${error?.message}`)
    const { data } = await asHost.from('visits').delete().eq('id', visit.id).select('id')
    expect(data ?? []).toHaveLength(1)
    expect(await exists('restaurants', visit.restaurant_id)).toBe(false)
  })
})
