// El secret del vot, garantit a la BD (criteri d'acceptació 1).
//
// Dos participants voten a la mateixa sala pel camí real de l'app (RPC). Cap
// dels dos pot llegir el vot de l'altre — ni el valor ni el comentari — fins
// que la revelació arriba a aquella categoria. Que no es pugui fer trampa amb
// les DevTools vol dir exactament això: el que retorna l'API.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getLocalStack } from '../helpers/local-stack'
import {
  adminClient,
  CATEGORIES,
  cleanup,
  createGroup,
  createTestUser,
  signIn,
  uniqueEmail,
  type Client,
} from '../helpers/factory'

let admin: Client
let asHost: Client
let asGuest: Client
let asBystander: Client // membre del grup que no ha entrat a la sala
let host: string
let guest: string
let bystander: string
let groupId: string
let visitId: string
let roomCode: string

const HOST_VOTES = { menjar: 9, preu: 4, servei: 8, espai: 6 } as const
const GUEST_VOTES = { menjar: 7, preu: 5, servei: 10, espai: 3 } as const

async function visibleVotes(client: Client) {
  const { data, error } = await client
    .from('votes')
    .select('user_id, category, value')
    .eq('visit_id', visitId)
  if (error) throw new Error(error.message)
  return data ?? []
}

async function advance() {
  const { data, error } = await asHost.rpc('advance_visit', { p_visit_id: visitId })
  if (error) throw new Error(`advance_visit: ${error.message}`)
  return data
}

beforeAll(async () => {
  const stack = getLocalStack()
  admin = adminClient(stack)
  const emails = { host: uniqueEmail('host'), guest: uniqueEmail('guest'), bystander: uniqueEmail('bystander') }
  host = await createTestUser(admin, emails.host, 'Amfitrió')
  guest = await createTestUser(admin, emails.guest, 'Convidat')
  bystander = await createTestUser(admin, emails.bystander, 'Espectador')
  groupId = await createGroup(admin, 'Sala secreta (test)', [
    { userId: host, role: 'member' },
    { userId: guest, role: 'member' },
    { userId: bystander, role: 'admin' },
  ])
  asHost = await signIn(stack, emails.host)
  asGuest = await signIn(stack, emails.guest)
  asBystander = await signIn(stack, emails.bystander)

  const { data: visit, error } = await asHost.rpc('create_visit', {
    p_group_id: groupId,
    p_restaurant_id: null as unknown as string,
    p_restaurant_name: `Restaurant Secret ${Date.now()}`,
    p_city: 'Prova',
    p_address: '',
    p_cuisine_origin: 'jp',
    p_visit_date: '2026-11-23',
    p_price_per_person: 30,
  })
  if (error || !visit) throw new Error(`create_visit: ${error?.message}`)
  visitId = visit.id
  roomCode = visit.room_code

  const joined = await asGuest.rpc('join_visit', { p_code: roomCode.toLowerCase() })
  if (joined.error) throw new Error(`join_visit: ${joined.error.message}`)

  for (const category of CATEGORIES) {
    const a = await asHost.rpc('cast_vote', { p_visit_id: visitId, p_category: category, p_value: HOST_VOTES[category] })
    const b = await asGuest.rpc('cast_vote', { p_visit_id: visitId, p_category: category, p_value: GUEST_VOTES[category] })
    if (a.error || b.error) throw new Error(`cast_vote: ${a.error?.message ?? b.error?.message}`)
  }
  await asHost.rpc('set_comment', { p_visit_id: visitId, p_body: 'El preu, un robatori' })
  await asGuest.rpc('set_comment', { p_visit_id: visitId, p_body: 'Servei de deu' })
}, 90_000)

afterAll(async () => {
  if (!admin) return
  await cleanup(admin, [groupId].filter(Boolean), [host, guest, bystander].filter(Boolean), [])
}, 60_000)

describe('mentre es vota', () => {
  it('cadascú només llegeix els seus vots', async () => {
    const asG = await visibleVotes(asGuest)
    expect(asG.map((v) => v.user_id)).toEqual([guest, guest, guest, guest])
    const asH = await visibleVotes(asHost)
    expect(asH.every((v) => v.user_id === host)).toBe(true)
    expect(asH).toHaveLength(4)
  })

  it('un membre que no ha entrat no en veu cap', async () => {
    expect(await visibleVotes(asBystander)).toHaveLength(0)
  })

  it('tothom veu QUI ha votat (✓), però no el valor', async () => {
    const { data } = await asGuest.from('visit_participants').select('user_id, votes_cast').eq('visit_id', visitId)
    const cast = Object.fromEntries((data ?? []).map((p) => [p.user_id, p.votes_cast]))
    expect(cast).toEqual({ [host]: 4, [guest]: 4 })
  })

  it('els comentaris dels altres també són secrets', async () => {
    const { data } = await asGuest.from('comments').select('user_id, body').eq('visit_id', visitId)
    expect(data).toEqual([{ user_id: guest, body: 'Servei de deu' }])
  })

  it('la vista d\'estadístiques no diu res d\'una sala oberta', async () => {
    const { data } = await asGuest.from('visit_category_stats').select('category').eq('visit_id', visitId)
    expect(data ?? []).toHaveLength(0)
  })

  it('es pot canviar el vot; els altres continuen sense veure\'l', async () => {
    await asGuest.rpc('cast_vote', { p_visit_id: visitId, p_category: 'menjar', p_value: 8 })
    await asGuest.rpc('cast_vote', { p_visit_id: visitId, p_category: 'menjar', p_value: GUEST_VOTES.menjar })
    const asH = await visibleVotes(asHost)
    expect(asH.some((v) => v.user_id === guest)).toBe(false)
  })

  it('un membre que no ha entrat no pot votar; i ningú no pot escriure vots directament', async () => {
    const { error } = await asBystander.rpc('cast_vote', { p_visit_id: visitId, p_category: 'menjar', p_value: 1 })
    expect(error?.message).toBe('not_participant')
    const direct = await asGuest
      .from('votes')
      .update({ value: 1 })
      .eq('visit_id', visitId)
      .eq('user_id', host)
      .select()
    expect(direct.data ?? []).toHaveLength(0)
    const { data } = await admin.from('votes').select('value').eq('visit_id', visitId).eq('user_id', host).eq('category', 'menjar').single()
    expect(data!.value).toBe(HOST_VOTES.menjar)
  })

  it('només l\'amfitrió (o un admin) pot revelar; el client no pot canviar l\'estat directament', async () => {
    const { error } = await asGuest.rpc('advance_visit', { p_visit_id: visitId })
    expect(error?.message).toBe('not_host')
    const direct = await asHost.from('visits').update({ status: 'closed' } as never).eq('id', visitId)
    expect(direct.error).not.toBeNull()
    const { data } = await admin.from('visits').select('status').eq('id', visitId).single()
    expect(data!.status).toBe('voting')
  })
})

describe('revelació categoria per categoria', () => {
  it('Revelar: el convidat veu el MENJAR de l\'amfitrió, però res més', async () => {
    const visit = await advance()
    expect(visit).toMatchObject({ status: 'revealing', reveal_step: 0 })
    const othersVotes = (await visibleVotes(asGuest)).filter((v) => v.user_id === host)
    expect(othersVotes).toEqual([{ user_id: host, category: 'menjar', value: HOST_VOTES.menjar }])
  })

  it('ja no es pot votar ni comentar', async () => {
    const vote = await asGuest.rpc('cast_vote', { p_visit_id: visitId, p_category: 'espai', p_value: 10 })
    const comment = await asGuest.rpc('set_comment', { p_visit_id: visitId, p_body: 'canvio d\'opinió' })
    expect(vote.error?.message).toBe('voting_closed')
    expect(comment.error?.message).toBe('voting_closed')
    const { data } = await admin.from('votes').select('value').eq('visit_id', visitId).eq('user_id', guest).eq('category', 'espai').single()
    expect(data!.value).toBe(GUEST_VOTES.espai)
  })

  it('una sala en revelació no es pot cancel·lar', async () => {
    await asHost.from('visits').delete().eq('id', visitId)
    const { data } = await admin.from('visits').select('id').eq('id', visitId)
    expect(data ?? []).toHaveLength(1)
  })

  it('qui entra tard pot mirar però no participar', async () => {
    const { data, error } = await asBystander.rpc('join_visit', { p_code: roomCode })
    expect(error).toBeNull()
    expect(data!.status).toBe('revealing')
    const { data: participants } = await admin.from('visit_participants').select('user_id').eq('visit_id', visitId)
    expect((participants ?? []).map((p) => p.user_id)).not.toContain(bystander)
  })

  it('cada «Següent» obre exactament una categoria més', async () => {
    for (const [step, open] of [
      [1, ['menjar', 'preu']],
      [2, ['menjar', 'preu', 'servei']],
      [3, ['menjar', 'preu', 'servei', 'espai']],
    ] as const) {
      const visit = await advance()
      expect(visit).toMatchObject({ status: 'revealing', reveal_step: step })
      const othersCategories = (await visibleVotes(asGuest)).filter((v) => v.user_id === host).map((v) => v.category).sort()
      expect(othersCategories).toEqual([...open].sort())
      const comments = await asGuest.from('comments').select('user_id').eq('visit_id', visitId)
      expect(comments.data ?? []).toHaveLength(1)
    }
  })

  it('l\'últim «Següent» tanca la sala: tot és visible, també els comentaris i les estadístiques', async () => {
    const visit = await advance()
    expect(visit).toMatchObject({ status: 'closed' })
    expect(await visibleVotes(asGuest)).toHaveLength(8)
    expect(await visibleVotes(asBystander)).toHaveLength(8)
    const comments = await asGuest.from('comments').select('user_id').eq('visit_id', visitId)
    expect(comments.data ?? []).toHaveLength(2)
    const { data: stats } = await asGuest
      .from('visit_category_stats')
      .select('category, average, vote_count')
      .eq('visit_id', visitId)
    const menjar = (stats ?? []).find((s) => s.category === 'menjar')
    expect(menjar).toMatchObject({ vote_count: 2, average: (HOST_VOTES.menjar + GUEST_VOTES.menjar) / 2 })
  })

  it('una sala tancada no es pot tornar a avançar', async () => {
    const { error } = await asHost.rpc('advance_visit', { p_visit_id: visitId })
    expect(error?.message).toBe('already_closed')
  })
})

describe('regles de la sala', () => {
  it('no es pot revelar si alguna categoria no té cap vot', async () => {
    const { data: visit } = await asHost.rpc('create_visit', {
      p_group_id: groupId,
      p_restaurant_id: null as unknown as string,
      p_restaurant_name: `Restaurant Incomplet ${Date.now()}`,
      p_city: '',
      p_address: '',
      p_cuisine_origin: 'it',
      p_visit_date: '2026-11-23',
      p_price_per_person: null as unknown as number,
    })
    await asHost.rpc('cast_vote', { p_visit_id: visit!.id, p_category: 'menjar', p_value: 8 })
    const { error } = await asHost.rpc('advance_visit', { p_visit_id: visit!.id })
    expect(error?.message).toBe('missing_votes')
  })

  it('un admin del grup pot fer avançar la sala d\'un altre', async () => {
    const { data: visit } = await asHost.rpc('create_visit', {
      p_group_id: groupId,
      p_restaurant_id: null as unknown as string,
      p_restaurant_name: `Restaurant Admin ${Date.now()}`,
      p_city: '',
      p_address: '',
      p_cuisine_origin: 'pe',
      p_visit_date: '2026-11-23',
      p_price_per_person: null as unknown as number,
    })
    for (const category of CATEGORIES) {
      await asHost.rpc('cast_vote', { p_visit_id: visit!.id, p_category: category, p_value: 6 })
    }
    const { data, error } = await asBystander.rpc('advance_visit', { p_visit_id: visit!.id })
    expect(error).toBeNull()
    expect(data!.status).toBe('revealing')
  })

  it('el restaurant es reaprofita si ja existeix (mateix nom i població, sense accents ni majúscules)', async () => {
    const name = `Can Prova ${Date.now()}`
    const first = await asHost.rpc('create_visit', {
      p_group_id: groupId,
      p_restaurant_id: null as unknown as string,
      p_restaurant_name: name,
      p_city: 'Gràcia',
      p_address: '',
      p_cuisine_origin: 'es-ct',
      p_visit_date: '2026-11-23',
      p_price_per_person: null as unknown as number,
    })
    const second = await asGuest.rpc('create_visit', {
      p_group_id: groupId,
      p_restaurant_id: null as unknown as string,
      p_restaurant_name: `  ${name.toUpperCase()} `,
      p_city: 'gracia',
      p_address: '',
      p_cuisine_origin: 'it',
      p_visit_date: '2026-11-23',
      p_price_per_person: null as unknown as number,
    })
    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(second.data!.restaurant_id).toBe(first.data!.restaurant_id)
  })

  it('el codi de sala té 5 caràcters llegibles', () => {
    expect(roomCode).toMatch(/^[A-HJ-NP-Z2-9]{5}$/)
  })
})
