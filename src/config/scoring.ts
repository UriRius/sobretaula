// Model de puntuació: UN sol lloc. Canviar un pes recalcula tot el rànquing
// (la nota final no es guarda mai a la BD: es calcula a partir dels vots).
// Lògica: src/lib/scoring. Tests: tests/unit/scoring.test.ts.

/**
 * Les 4 categories, en ordre de revelació. Ha de coincidir amb l'enum
 * `vote_category` de la BD (hi ha un test que ho comprova).
 */
export const CATEGORIES = ['menjar', 'preu', 'servei', 'espai'] as const

export type Category = (typeof CATEGORIES)[number]

/** Pes de cada categoria a la nota total. Sumen 1. */
export const WEIGHTS: Record<Category, number> = {
  menjar: 0.4,
  preu: 0.25,
  servei: 0.2,
  espai: 0.15,
}

export type Weights = Record<Category, number>

/** Valors de les cartes (enters de l'1 al 10). */
export const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const

/**
 * Desviació estàndard (poblacional) a partir de la qual una categoria va
 * tenir «debat» 🔥.
 */
export const DEBATE_STDDEV_THRESHOLD = 2

/** Visites mínimes en un grup perquè l'índex d'exigència digui alguna cosa. */
export const MIN_VISITS_FOR_EXIGENCY = 3
