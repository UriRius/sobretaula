// Esborrar el compte (migració 4, delete_my_account): el perfil queda
// anònim, els vots revelats es queden (la història del grup no canvia), els
// comentaris s'esborren, i cap grup no queda sense admin.

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
let asLeaver: Client
let asFriend: Client
let asLoner: Client
let leaver: string
let friend: string
let loner: string
let gShared: string
let gAlone: string
let restaurant: string
let closedVisit: string
let openVisit: string

beforeAll(async () => {
  const stack = getLocalStack()
  admin = adminClient(stack)
  const emails = { leaver: uniqueEmail('leaver'), friend: uniqueEmail('friend'), loner: uniqueEmail('loner') }
  leaver = await createTestUser(admin, emails.leaver, 'Qui marxa')
  friend = await createTestUser(admin, emails.friend, 'Amiga')
  loner = await createTestUser(admin, emails.loner, 'Sol')

  // Qui marxa és l'ÚNIC admin del grup compartit.
  gShared = await createGroup(admin, 'Compartit (test)', [
    { userId: leaver, role: 'admin' },
    { userId: friend, role: 'member' },
  ])
  gAlone = await createGroup(admin, 'Sol (test)', [{ userId: loner, role: 'admin' }])
  restaurant = await createRestaurant(admin, `Restaurant esborrar ${Date.now()}`)
  ;({ visitId: closedVisit } = await createClosedVisit(admin, {
    groupId: gShared,
    restaurantId: restaurant,
    hostId: leaver,
    participants: [leaver, friend],
  }))

  asLeaver = await signIn(stack, emails.leaver)
  asFriend = await signIn(stack, emails.friend)
  asLoner = await signIn(stack, emails.loner)

  // Una sala que encara vota, amb un vot de qui marxa.
  const { data: open, error } = await asFriend.rpc('create_visit', {
    p_group_id: gShared,
    p_restaurant_id: restaurant,
    p_restaurant_name: '',
    p_city: '',
    p_address: '',
    p_cuisine_origin: null as unknown as string,
    p_visit_date: '2026-11-26',
    p_price_per_person: null as unknown as number,
  })
  if (error || !open) throw new Error(`create_visit: ${error?.message}`)
  openVisit = open.id
  await asLeaver.rpc('join_visit', { p_code: open.room_code })
  await asLeaver.rpc('cast_vote', { p_visit_id: openVisit, p_category: 'menjar', p_value: 3 })

  const { error: deleteError } = await asLeaver.rpc('delete_my_account')
  if (deleteError) throw new Error(`delete_my_account: ${deleteError.message}`)
})

afterAll(async () => {
  await cleanup(admin, [gShared, gAlone], [leaver, friend, loner], [restaurant])
})

describe('esborrar el compte', () => {
  it('el perfil queda anònim (i marcat), però existeix', async () => {
    const { data } = await admin.from('profiles').select('*').eq('id', leaver).single()
    expect(data?.deleted_at).not.toBeNull()
    expect(data?.avatar_url).toBeNull()
    expect(data?.avatar_emoji).toBeNull()
    expect(data?.display_name).not.toBe('Qui marxa')
  })

  it('surt de tots els grups, i el grup no es queda sense admin', async () => {
    const { data: memberships } = await admin.from('group_members').select('group_id').eq('user_id', leaver)
    expect(memberships ?? []).toHaveLength(0)
    const { data: heir } = await admin.from('group_members').select('role').eq('group_id', gShared).eq('user_id', friend).single()
    expect(heir?.role).toBe('admin')
  })

  it('els vots de la visita revelada es queden i la resta del grup els veu', async () => {
    const { data } = await asFriend.from('votes').select('user_id').eq('visit_id', closedVisit).eq('user_id', leaver)
    expect(data ?? []).toHaveLength(4)
    // …amb el perfil anònim visible (no «perfil desconegut»).
    const { data: profile } = await asFriend.from('profiles').select('id, deleted_at').eq('id', leaver).single()
    expect(profile?.deleted_at).not.toBeNull()
  })

  it('els comentaris s\'esborren', async () => {
    const { data } = await admin.from('comments').select('user_id').eq('user_id', leaver)
    expect(data ?? []).toHaveLength(0)
  })

  it('surt de les sales que encara voten (el seu vot secret no compta)', async () => {
    const { data: participants } = await admin.from('visit_participants').select('user_id').eq('visit_id', openVisit)
    expect((participants ?? []).map((p) => p.user_id)).toEqual([friend])
    const { data: votes } = await admin.from('votes').select('user_id').eq('visit_id', openVisit)
    expect(votes ?? []).toHaveLength(0)
  })

  it('l\'últim membre d\'un grup s\'emporta el grup', async () => {
    const { error } = await asLoner.rpc('delete_my_account')
    expect(error).toBeNull()
    const { data } = await admin.from('groups').select('id').eq('id', gAlone)
    expect(data ?? []).toHaveLength(0)
  })

  it('ningú no pot posar-se deleted_at a mà (no és una columna editable)', async () => {
    const { error } = await asFriend.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', friend)
    expect(error).not.toBeNull()
  })
})
