// Mitjanes, dispersió i ponderació d'una visita. Funcions pures: els pesos
// arriben de src/config/scoring.ts (o d'un test) i mai de la BD.

import { CATEGORIES, DEBATE_STDDEV_THRESHOLD, WEIGHTS, type Category, type Weights } from '@/config/scoring'

export type Vote = { userId: string; category: Category; value: number }

export type CategoryStats = {
  count: number
  /** Nota de la categoria = mitjana dels vots (no la moda). */
  average: number
  /** Desviació estàndard poblacional. */
  stddev: number
  min: number
  max: number
  /** 🔥: la dispersió supera el llindar de debat. */
  debate: boolean
}

export type CategoryScores = Partial<Record<Category, number>>

/**
 * La nota que es veu: un decimal. Els rànquings i els empats es decideixen
 * amb aquesta, i `formatScore` arrodoneix igual (mai «7,8» en una fila i
 * «7,9» en una altra per a la mateixa nota).
 */
export function roundScore(value: number): number {
  return Math.round(value * 10) / 10
}

export function categoryStats(values: readonly number[]): CategoryStats | null {
  if (values.length === 0) return null
  const count = values.length
  const average = values.reduce((sum, v) => sum + v, 0) / count
  const variance = values.reduce((sum, v) => sum + (v - average) ** 2, 0) / count
  const stddev = Math.sqrt(variance)
  return {
    count,
    average,
    stddev,
    min: Math.min(...values),
    max: Math.max(...values),
    debate: stddev > DEBATE_STDDEV_THRESHOLD,
  }
}

/**
 * Els agregats que ja calcula la BD (vista visit_category_stats) com a
 * CategoryStats: el llindar de debat és aquí, no a l'SQL.
 */
export function statsFromAggregate(row: {
  count: number
  average: number
  stddev: number
  min: number
  max: number
}): CategoryStats {
  return { ...row, debate: row.stddev > DEBATE_STDDEV_THRESHOLD }
}

/** Σ pes × nota de cada categoria. null si en falta alguna. */
export function weightedScore(scores: CategoryScores, weights: Weights = WEIGHTS): number | null {
  let total = 0
  for (const category of CATEGORIES) {
    const score = scores[category]
    if (score === undefined) return null
    total += weights[category] * score
  }
  return total
}

/** Vots agrupats per categoria. */
export function valuesByCategory(votes: readonly Vote[]): Record<Category, number[]> {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c, [] as number[]])) as Record<Category, number[]>
  for (const vote of votes) out[vote.category].push(vote.value)
  return out
}

/** Mitjana de cada categoria que té vots. */
export function categoryAverages(votes: readonly Vote[]): CategoryScores {
  const byCategory = valuesByCategory(votes)
  const out: CategoryScores = {}
  for (const category of CATEGORIES) {
    const stats = categoryStats(byCategory[category])
    if (stats) out[category] = stats.average
  }
  return out
}

/**
 * Nota ponderada personal: només si la persona ha votat les 4 categories
 * (amb vots incomplets, els seus vots compten a la mitjana del grup però ella
 * no té nota personal).
 */
export function personalScore(votes: readonly Vote[], weights: Weights = WEIGHTS): number | null {
  const scores: CategoryScores = {}
  for (const vote of votes) scores[vote.category] = vote.value
  return weightedScore(scores, weights)
}

export type VisitScore = {
  categories: Record<Category, CategoryStats | null>
  /** Σ pes × mitjana. null si alguna categoria no té cap vot. */
  total: number | null
  /** Nota personal de cada participant (null si no va votar les 4). */
  personal: Map<string, number | null>
}

export function scoreVisit(votes: readonly Vote[], weights: Weights = WEIGHTS): VisitScore {
  const byCategory = valuesByCategory(votes)
  const categories = Object.fromEntries(
    CATEGORIES.map((c) => [c, categoryStats(byCategory[c])]),
  ) as Record<Category, CategoryStats | null>

  const averages: CategoryScores = {}
  for (const c of CATEGORIES) if (categories[c]) averages[c] = categories[c].average

  const byUser = new Map<string, Vote[]>()
  for (const vote of votes) {
    const list = byUser.get(vote.userId) ?? []
    list.push(vote)
    byUser.set(vote.userId, list)
  }
  const personal = new Map<string, number | null>()
  for (const [userId, userVotes] of byUser) personal.set(userId, personalScore(userVotes, weights))

  return { categories, total: weightedScore(averages, weights), personal }
}
