import 'server-only'
import { cache } from 'react'
import { CATEGORIES, type Category } from '@/config/scoring'
import { requireUser } from '@/lib/auth'
import { publicName } from '@/lib/people'
import { getGroup } from '@/lib/queries'
import { statsFromAggregate, weightedScore, type CategoryScores, type CategoryStats, type Vote } from '@/lib/scoring'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// Consultes de visites (sales, rànquing, detall). Totes amb la sessió de
// l'usuari: la RLS decideix què es veu. La nota es calcula aquí amb els pesos
// de src/config/scoring.ts; la BD només dona agregats.

export type VisitStatus = Database['public']['Enums']['visit_status']

export type Restaurant = { id: string; name: string; city: string | null; address: string | null; cuisineOrigin: string }

export type VisitSummary = {
  id: string
  groupId: string
  visitDate: string
  status: VisitStatus
  roomCode: string
  revealStep: number
  hostId: string
  pricePerPerson: number | null
  restaurant: Restaurant
}

export type ScoredVisit = VisitSummary & {
  categories: Record<Category, CategoryStats | null>
  total: number | null
}

const VISIT_COLUMNS =
  'id, group_id, visit_date, status, room_code, reveal_step, host_id, price_per_person, restaurants(id, name, city, address, cuisine_origin)'

type VisitRow = {
  id: string
  group_id: string
  visit_date: string
  status: VisitStatus
  room_code: string
  reveal_step: number
  host_id: string
  price_per_person: number | null
  restaurants: { id: string; name: string; city: string | null; address: string | null; cuisine_origin: string } | null
}

function toSummary(row: VisitRow): VisitSummary[] {
  if (!row.restaurants) return []
  const r = row.restaurants
  return [
    {
      id: row.id,
      groupId: row.group_id,
      visitDate: row.visit_date,
      status: row.status,
      roomCode: row.room_code,
      revealStep: row.reveal_step,
      hostId: row.host_id,
      pricePerPerson: row.price_per_person === null ? null : Number(row.price_per_person),
      restaurant: { id: r.id, name: r.name, city: r.city, address: r.address, cuisineOrigin: r.cuisine_origin },
    },
  ]
}

/** Totes les visites d'un grup (qualsevol estat), les més noves primer. */
export const getGroupVisits = cache(async (groupId: string): Promise<VisitSummary[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_COLUMNS)
    .eq('group_id', groupId)
    .order('visit_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap(toSummary)
})

/** Sales obertes (votant o revelant) d'un grup. */
export async function getOpenRooms(groupId: string): Promise<VisitSummary[]> {
  const visits = await getGroupVisits(groupId)
  return visits.filter((v) => v.status !== 'closed')
}

/**
 * Visites tancades de diversos grups amb les seves notes (mitjanes de la vista
 * visit_category_stats + ponderació a TypeScript).
 */
export const getScoredVisits = cache(async (groupIds: readonly string[]): Promise<ScoredVisit[]> => {
  if (groupIds.length === 0) return []
  const supabase = await createClient()
  const [visitsResult, statsResult] = await Promise.all([
    supabase
      .from('visits')
      .select(VISIT_COLUMNS)
      .in('group_id', [...groupIds])
      .eq('status', 'closed')
      .order('visit_date', { ascending: false }),
    supabase
      .from('visit_category_stats')
      .select('visit_id, category, vote_count, average, stddev, min_value, max_value')
      .in('group_id', [...groupIds]),
  ])
  if (visitsResult.error) throw new Error(visitsResult.error.message)
  if (statsResult.error) throw new Error(statsResult.error.message)

  const statsByVisit = new Map<string, Partial<Record<Category, CategoryStats>>>()
  for (const s of statsResult.data ?? []) {
    if (!s.visit_id || !s.category || s.average === null) continue
    const entry = statsByVisit.get(s.visit_id) ?? {}
    entry[s.category] = statsFromAggregate({
      count: s.vote_count ?? 0,
      average: s.average,
      stddev: s.stddev ?? 0,
      min: s.min_value ?? 0,
      max: s.max_value ?? 0,
    })
    statsByVisit.set(s.visit_id, entry)
  }

  return (visitsResult.data ?? []).flatMap(toSummary).map((visit) => {
    const stats = statsByVisit.get(visit.id) ?? {}
    const categories = Object.fromEntries(CATEGORIES.map((c) => [c, stats[c] ?? null])) as Record<
      Category,
      CategoryStats | null
    >
    const averages: CategoryScores = {}
    for (const c of CATEGORIES) if (stats[c]) averages[c] = stats[c].average
    return { ...visit, categories, total: weightedScore(averages) }
  })
})

/** Els vots que puc veure de les visites de diversos grups (RLS: tancades = tots). */
export type VisibleVote = Vote & { visitId: string; groupId: string }

export const getVisibleVotes = cache(async (groupIds: readonly string[]): Promise<VisibleVote[]> => {
  if (groupIds.length === 0) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('votes')
    .select('visit_id, group_id, user_id, category, value')
    .in('group_id', [...groupIds])
  if (error) throw new Error(error.message)
  return (data ?? []).map((v) => ({
    visitId: v.visit_id,
    groupId: v.group_id,
    userId: v.user_id,
    category: v.category,
    value: v.value,
  }))
})

/** Restaurants que coneixen els meus grups (per a l'autocompletat). */
export async function getKnownRestaurants(): Promise<Restaurant[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, city, address, cuisine_origin')
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => ({ id: r.id, name: r.name, city: r.city, address: r.address, cuisineOrigin: r.cuisine_origin }))
}

// ---------------------------------------------------------------------------
// Persones (membres i exmembres que hi van votar)
// ---------------------------------------------------------------------------

export type RoomPerson = { id: string; name: string; avatarUrl: string | null; avatarEmoji: string | null }

/** Els membres d'un grup i, a més, qualsevol altra persona d'aquestes ids. */
export async function getPeople(groupId: string, extraIds: readonly string[] = []): Promise<RoomPerson[]> {
  const group = await getGroup(groupId)
  const people = new Map<string, RoomPerson>(
    (group?.members ?? []).map((m) => [
      m.userId,
      { id: m.userId, name: m.profile.display_name, avatarUrl: m.profile.avatar_url, avatarEmoji: m.profile.avatar_emoji },
    ]),
  )
  const missing = [...new Set(extraIds)].filter((id) => !people.has(id))
  if (missing.length) {
    const supabase = await createClient()
    const { data } = await supabase.from('profiles').select('id, display_name, avatar_url, avatar_emoji, deleted_at').in('id', missing)
    for (const p of data ?? []) {
      people.set(p.id, { id: p.id, name: publicName(p), avatarUrl: p.avatar_url, avatarEmoji: p.avatar_emoji })
    }
  }
  return [...people.values()]
}

// ---------------------------------------------------------------------------
// Detall d'una visita
// ---------------------------------------------------------------------------

export type VisitDetail = {
  visit: VisitSummary
  /** Tancada: nota i agregats. Oberta: null. */
  scored: ScoredVisit | null
  /** Totes les visites tancades del grup (posicions i altres visites). */
  groupVisits: ScoredVisit[]
  votes: Vote[]
  comments: { userId: string; body: string }[]
  notes: string
  people: RoomPerson[]
}

export async function getVisitDetail(groupId: string, visitId: string): Promise<VisitDetail | null> {
  const [visits, groupVisits] = await Promise.all([getGroupVisits(groupId), getScoredVisits([groupId])])
  const visit = visits.find((v) => v.id === visitId)
  if (!visit) return null

  const supabase = await createClient()
  const [votesResult, commentsResult, notesResult] = await Promise.all([
    supabase.from('votes').select('user_id, category, value').eq('visit_id', visitId),
    supabase.from('comments').select('user_id, body, created_at').eq('visit_id', visitId).order('created_at'),
    supabase
      .from('group_restaurant_notes')
      .select('notes')
      .eq('group_id', groupId)
      .eq('restaurant_id', visit.restaurant.id)
      .maybeSingle(),
  ])
  const votes = (votesResult.data ?? []).map((v) => ({ userId: v.user_id, category: v.category, value: v.value }))
  const comments = (commentsResult.data ?? []).map((c) => ({ userId: c.user_id, body: c.body }))
  const people = await getPeople(groupId, [...votes.map((v) => v.userId), ...comments.map((c) => c.userId), visit.hostId])

  return {
    visit,
    scored: groupVisits.find((v) => v.id === visitId) ?? null,
    groupVisits,
    votes,
    comments,
    notes: notesResult.data?.notes ?? '',
    people,
  }
}

// ---------------------------------------------------------------------------
// Sala
// ---------------------------------------------------------------------------

export type RoomParticipant = { userId: string; votesCast: number; joinedAt: string }

export type RoomInitial = {
  visit: VisitSummary
  group: { id: string; name: string; emoji: string; color: Database['public']['Enums']['group_color'] }
  me: { id: string; isAdmin: boolean }
  people: RoomPerson[]
  participants: RoomParticipant[]
  votes: Vote[]
  myComment: string
}

/** Tot el que la sala necessita per pintar-se d'entrada. null si no hi tinc accés. */
export async function getRoom(code: string): Promise<RoomInitial | null> {
  const user = await requireUser()
  const supabase = await createClient()
  const { data: row, error } = await supabase.from('visits').select(VISIT_COLUMNS).eq('room_code', code).maybeSingle()
  if (error) throw new Error(error.message)
  const visit = row ? toSummary(row)[0] : undefined
  if (!visit) return null

  const group = await getGroup(visit.groupId)
  if (!group) return null

  const [participantsResult, votesResult, commentResult] = await Promise.all([
    supabase.from('visit_participants').select('user_id, votes_cast, joined_at').eq('visit_id', visit.id).order('joined_at'),
    supabase.from('votes').select('user_id, category, value').eq('visit_id', visit.id),
    supabase.from('comments').select('body').eq('visit_id', visit.id).eq('user_id', user.id).maybeSingle(),
  ])

  const participants = (participantsResult.data ?? []).map((p) => ({
    userId: p.user_id,
    votesCast: p.votes_cast,
    joinedAt: p.joined_at,
  }))

  // Algú que ja no és al grup però hi va votar continua tenint nom.
  const people = await getPeople(visit.groupId, participants.map((p) => p.userId))

  return {
    visit,
    group: { id: group.id, name: group.name, emoji: group.emoji, color: group.color },
    me: { id: user.id, isAdmin: group.role === 'admin' },
    people,
    participants,
    votes: (votesResult.data ?? []).map((v) => ({ userId: v.user_id, category: v.category, value: v.value })),
    myComment: commentResult.data?.body ?? '',
  }
}

/** Les visites tancades amb tots els seus vots visibles (perfils, exigència). */
export async function getVisitsWithVotes(groupIds: readonly string[]) {
  const [visits, votes] = await Promise.all([getScoredVisits(groupIds), getVisibleVotes(groupIds)])
  const byVisit = new Map<string, Vote[]>()
  for (const v of votes) {
    const list = byVisit.get(v.visitId) ?? []
    list.push({ userId: v.userId, category: v.category, value: v.value })
    byVisit.set(v.visitId, list)
  }
  return visits.map((visit) => ({ ...visit, restaurantId: visit.restaurant.id, votes: byVisit.get(visit.id) ?? [] }))
}

export type VisitWithVotes = Awaited<ReturnType<typeof getVisitsWithVotes>>[number]
