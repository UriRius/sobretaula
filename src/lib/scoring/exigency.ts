// Índex d'exigència i generositat per categoria.
//
// Exigència = la teva nota ponderada menys la de LA RESTA del grup a les
// mateixes visites (en una parella, incloure't dividiria la diferència per
// dos). Negatiu = més exigent; positiu = més generós. Mínim de visites a
// src/config/scoring.ts.
//
// «Tots els grups» = la mitjana de totes les diferències, que és el mateix
// que la mitjana de cada grup ponderada pel nombre de visites.

import { CATEGORIES, MIN_VISITS_FOR_EXIGENCY, WEIGHTS, type Category, type Weights } from '@/config/scoring'
import { categoryAverages, categoryStats, personalScore, weightedScore, type Vote } from './visit'

export type VisitVotes = { votes: readonly Vote[] }

/**
 * Una diferència per cada visita on la persona té nota personal (va votar les
 * 4 categories) i la resta té nota (hi ha vots dels altres a les 4).
 */
export function exigencyDiffs(userId: string, visits: readonly VisitVotes[], weights: Weights = WEIGHTS): number[] {
  const diffs: number[] = []
  for (const visit of visits) {
    const mine = personalScore(
      visit.votes.filter((v) => v.userId === userId),
      weights,
    )
    if (mine === null) continue
    const others = weightedScore(
      categoryAverages(visit.votes.filter((v) => v.userId !== userId)),
      weights,
    )
    if (others === null) continue
    diffs.push(mine - others)
  }
  return diffs
}

export type Exigency = {
  /** Mitjana de les diferències; null si no arriba al mínim de visites. */
  value: number | null
  visits: number
}

export function exigency(diffs: readonly number[]): Exigency {
  const visits = diffs.length
  if (visits < MIN_VISITS_FOR_EXIGENCY) return { value: null, visits }
  return { value: diffs.reduce((s, d) => s + d, 0) / visits, visits }
}

/**
 * Per categoria: de mitjana, quant per sobre (o per sota) de la resta vota la
 * persona. Només compta les visites on tots dos (ella i la resta) hi han votat.
 */
export function categoryGenerosity(userId: string, visits: readonly VisitVotes[]): Partial<Record<Category, number>> {
  const diffs = Object.fromEntries(CATEGORIES.map((c) => [c, [] as number[]])) as Record<Category, number[]>
  for (const visit of visits) {
    for (const category of CATEGORIES) {
      const mine = visit.votes.find((v) => v.userId === userId && v.category === category)
      if (!mine) continue
      const others = categoryStats(
        visit.votes.filter((v) => v.userId !== userId && v.category === category).map((v) => v.value),
      )
      if (!others) continue
      diffs[category].push(mine.value - others.average)
    }
  }
  const out: Partial<Record<Category, number>> = {}
  for (const category of CATEGORIES) {
    const list = diffs[category]
    if (list.length) out[category] = list.reduce((s, d) => s + d, 0) / list.length
  }
  return out
}

/** La categoria on la persona és més generosa respecte de la resta (null si no n'hi ha cap). */
export function mostGenerousCategory(generosity: Partial<Record<Category, number>>): Category | null {
  let best: Category | null = null
  for (const category of CATEGORIES) {
    const value = generosity[category]
    if (value === undefined) continue
    if (best === null || value > (generosity[best] ?? -Infinity)) best = category
  }
  return best
}
