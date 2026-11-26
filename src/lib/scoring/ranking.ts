// Rànquing: ordena per la nota que es veu (un decimal) i els empatats
// comparteixen posició (1, 2, 2, 4). Les entrades sense nota no hi surten.

import { roundScore } from './visit'

export type Ranked<T> = { item: T; score: number; position: number }

export function rank<T>(
  items: readonly T[],
  scoreOf: (item: T) => number | null,
  /** Ordre dins d'un empat (no canvia la posició). Per defecte, el d'entrada. */
  tieBreak?: (a: T, b: T) => number,
): Ranked<T>[] {
  const scored = items.flatMap((item, index) => {
    const raw = scoreOf(item)
    return raw === null ? [] : [{ item, index, score: roundScore(raw) }]
  })
  scored.sort((a, b) => b.score - a.score || (tieBreak ? tieBreak(a.item, b.item) : 0) || a.index - b.index)

  const out: Ranked<T>[] = []
  for (let i = 0; i < scored.length; i++) {
    const { item, score } = scored[i]
    const position = i > 0 && score === out[i - 1].score ? out[i - 1].position : i + 1
    out.push({ item, score, position })
  }
  return out
}

/** Posició d'una entrada dins d'un rànquing (null si no hi és). */
export function positionOf<T>(ranked: readonly Ranked<T>[], match: (item: T) => boolean): number | null {
  return ranked.find((r) => match(r.item))?.position ?? null
}

export type DatedScore = { id: string; visitDate: string; total: number | null }

/** Les visites més noves primer dins d'un empat. */
export const newestFirst = (a: { visitDate: string }, b: { visitDate: string }) => b.visitDate.localeCompare(a.visitDate)

/** Rànquing d'un període: 'YYYY-MM' (mes), 'YYYY' (any) o null (històric). */
export function rankPeriod<T extends DatedScore>(visits: readonly T[], period: string | null): Ranked<T>[] {
  const inPeriod = period ? visits.filter((v) => v.visitDate.startsWith(period)) : visits
  return rank(inPeriod, (v) => v.total, newestFirst)
}

/** On queda una visita al rànquing del seu mes i del seu any. */
export function periodPositions<T extends DatedScore>(
  visits: readonly T[],
  visit: DatedScore,
): { month: number | null; year: number | null } {
  const all = visits.some((v) => v.id === visit.id) ? visits : [...visits, visit]
  const match = (v: DatedScore) => v.id === visit.id
  return {
    month: positionOf(rankPeriod(all, visit.visitDate.slice(0, 7)), match),
    year: positionOf(rankPeriod(all, visit.visitDate.slice(0, 4)), match),
  }
}
