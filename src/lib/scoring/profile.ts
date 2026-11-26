// Estadístiques d'una persona (perfil) i rànquing d'exigència d'un grup.
// Pures: reben les visites (amb tots els vots que la RLS deixa veure a qui
// mira) i no saben res de la BD. Si una visita no hi és, no compta.

import { CATEGORIES, WEIGHTS, type Category, type Weights } from '@/config/scoring'
import { categoryGenerosity, exigency, exigencyDiffs, mostGenerousCategory, type Exigency } from './exigency'
import { personalScore, scoreVisit, type CategoryScores, type Vote } from './visit'

export type VisitWithVotes = { id: string; restaurantId: string; votes: readonly Vote[] }

export type HistoryEntry<T> = {
  visit: T
  /** Els vots de la persona en aquesta visita. */
  votes: Partial<Record<Category, number>>
  personal: number | null
  group: number | null
}

export type ProfileStats<T> = {
  /** Visites on ha votat alguna categoria. */
  visits: number
  restaurants: number
  /** Mitjana dels seus vots a cada categoria. */
  categoryAverages: CategoryScores
  /** Mitjana de les seves notes ponderades. */
  average: number | null
  exigency: Exigency
  generosity: Partial<Record<Category, number>>
  mostGenerous: Category | null
  best: HistoryEntry<T> | null
  worst: HistoryEntry<T> | null
  /** Les més noves primer, si l'entrada ja hi venia ordenada. */
  history: HistoryEntry<T>[]
}

export function profileStats<T extends VisitWithVotes>(
  userId: string,
  visits: readonly T[],
  weights: Weights = WEIGHTS,
): ProfileStats<T> {
  const voted = visits.filter((v) => v.votes.some((vote) => vote.userId === userId))

  const history: HistoryEntry<T>[] = voted.map((visit) => {
    const mine = visit.votes.filter((v) => v.userId === userId)
    return {
      visit,
      votes: Object.fromEntries(mine.map((v) => [v.category, v.value])),
      personal: personalScore(mine, weights),
      group: scoreVisit(visit.votes, weights).total,
    }
  })

  const categoryAverages: CategoryScores = {}
  for (const category of CATEGORIES) {
    const values = history.flatMap((h) => (h.votes[category] === undefined ? [] : [h.votes[category]]))
    if (values.length) categoryAverages[category] = values.reduce((s, v) => s + v, 0) / values.length
  }

  const scored = history.filter((h): h is HistoryEntry<T> & { personal: number } => h.personal !== null)
  const average = scored.length ? scored.reduce((s, h) => s + h.personal, 0) / scored.length : null
  // Empat: la visita més recent (la primera de la llista).
  const best = scored.reduce<(typeof scored)[number] | null>((b, h) => (b === null || h.personal > b.personal ? h : b), null)
  const worst = scored.reduce<(typeof scored)[number] | null>((w, h) => (w === null || h.personal < w.personal ? h : w), null)

  const generosity = categoryGenerosity(userId, voted)

  return {
    visits: voted.length,
    restaurants: new Set(voted.map((v) => v.restaurantId)).size,
    categoryAverages,
    average,
    exigency: exigency(exigencyDiffs(userId, voted, weights)),
    generosity,
    mostGenerous: mostGenerousCategory(generosity),
    best,
    worst: worst && best && worst.visit.id !== best.visit.id ? worst : null,
    history,
  }
}

export type MemberExigency = { userId: string } & Exigency

/**
 * Rànquing «més exigent ↔ més generós» d'un grup: del valor més baix al més
 * alt. Qui no arriba al mínim de visites va al final, sense valor.
 */
export function exigencyRanking(
  userIds: readonly string[],
  visits: readonly { votes: readonly Vote[] }[],
  weights: Weights = WEIGHTS,
): MemberExigency[] {
  const rows = userIds.map((userId) => ({ userId, ...exigency(exigencyDiffs(userId, visits, weights)) }))
  return rows.sort((a, b) => {
    if (a.value === null || b.value === null) return a.value === null ? (b.value === null ? b.visits - a.visits : 1) : -1
    return a.value - b.value
  })
}
