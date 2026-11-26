import { describe, expect, it } from 'vitest'
import { CATEGORIES, WEIGHTS, type Category, type Weights } from '@/config/scoring'
import {
  categoryGenerosity,
  categoryStats,
  exigency,
  exigencyDiffs,
  exigencyRanking,
  mostGenerousCategory,
  periodPositions,
  personalScore,
  profileStats,
  rank,
  rankPeriod,
  roundScore,
  scoreVisit,
  weightedScore,
  type Vote,
} from '@/lib/scoring'
import { defaultVisitDate, isDay, shiftMonth } from '@/lib/dates'
import { formatOrdinal, formatScore, formatSignedScore } from '@/lib/format'
import { parsePrice, parseRoomCode, searchKey } from '@/lib/parse'
import { Constants } from '@/types/database'

/** Vots d'una persona: [menjar, preu, servei, espai] (null = no ha votat). */
function votesOf(userId: string, values: (number | null)[]): Vote[] {
  return CATEGORIES.flatMap((category, i) => (values[i] === null ? [] : [{ userId, category, value: values[i] }]))
}

describe('configuració', () => {
  it("l'ordre de les categories és el de l'enum de la BD (ordre de revelació)", () => {
    expect([...CATEGORIES]).toEqual([...Constants.public.Enums.vote_category])
  })

  it('els pesos sumen 1', () => {
    const sum = CATEGORIES.reduce((s, c) => s + WEIGHTS[c], 0)
    expect(sum).toBeCloseTo(1, 10)
  })
})

describe('nota d\'una categoria', () => {
  it('és la mitjana (no la moda)', () => {
    expect(categoryStats([7, 7, 10])?.average).toBeCloseTo(8, 10)
  })

  it('dispersió: desviació estàndard poblacional, 🔥 només per sobre de 2', () => {
    const calm = categoryStats([5, 9])!
    expect(calm.stddev).toBeCloseTo(2, 10) // poblacional; la mostral seria 2,83
    expect(calm.debate).toBe(false)
    const heated = categoryStats([3, 9])!
    expect(heated.stddev).toBeCloseTo(3, 10)
    expect(heated.debate).toBe(true)
    expect(heated).toMatchObject({ min: 3, max: 9, count: 2 })
  })

  it('una sola persona: sense dispersió', () => {
    expect(categoryStats([6])).toMatchObject({ average: 6, stddev: 0, debate: false })
    expect(categoryStats([])).toBeNull()
  })
})

describe('nota ponderada', () => {
  it('Σ pes × mitjana', () => {
    const total = weightedScore({ menjar: 8, preu: 6, servei: 7, espai: 5 })!
    expect(total).toBeCloseTo(0.4 * 8 + 0.25 * 6 + 0.2 * 7 + 0.15 * 5, 10)
    expect(formatScore(total)).toBe('6,9')
  })

  it('sense alguna categoria no hi ha nota', () => {
    expect(weightedScore({ menjar: 8, preu: 6, servei: 7 })).toBeNull()
  })

  it('vots incomplets: compten a la categoria, però sense nota personal', () => {
    const votes = [...votesOf('anna', [8, 6, 7, 5]), ...votesOf('biel', [10, null, null, null])]
    const score = scoreVisit(votes)
    expect(score.categories.menjar?.average).toBe(9)
    expect(score.categories.preu?.average).toBe(6)
    expect(score.personal.get('anna')).toBeCloseTo(6.85, 10)
    expect(score.personal.get('biel')).toBeNull()
    expect(score.total).toBeCloseTo(0.4 * 9 + 0.25 * 6 + 0.2 * 7 + 0.15 * 5, 10)
  })

  it('si una categoria no té cap vot, la visita no té nota', () => {
    const votes = votesOf('anna', [8, 6, 7, null])
    expect(scoreVisit(votes).total).toBeNull()
    expect(personalScore(votes)).toBeNull()
  })
})

describe('rànquing', () => {
  it('ordena per la nota visible i els empatats comparteixen posició', () => {
    const ranked = rank(
      [
        { id: 'a', s: 7.96 },
        { id: 'b', s: 8.04 }, // 8,0 i 8,0: empat
        { id: 'c', s: 9.1 },
        { id: 'd', s: 6 },
        { id: 'e', s: null },
      ],
      (x) => x.s,
    )
    expect(ranked.map((r) => [r.item.id, r.position, r.score])).toEqual([
      ['c', 1, 9.1],
      ['a', 2, 8],
      ['b', 2, 8],
      ['d', 4, 6],
    ])
  })

  it('el desempat només canvia l\'ordre, no la posició', () => {
    const ranked = rank(
      [
        { id: 'vell', s: 8, date: '2026-01-01' },
        { id: 'nou', s: 8, date: '2026-05-01' },
      ],
      (x) => x.s,
      (a, b) => b.date.localeCompare(a.date),
    )
    expect(ranked.map((r) => [r.item.id, r.position])).toEqual([
      ['nou', 1],
      ['vell', 1],
    ])
  })

  it('canviar un pes reordena el rànquing sense tocar la BD (només els vots)', () => {
    // A: cuina boníssima, la resta fluixa. B: tot el contrari.
    const visits = [
      { id: 'A', votes: votesOf('x', [9, 5, 5, 5]) },
      { id: 'B', votes: votesOf('x', [5, 9, 9, 9]) },
    ]
    const order = (weights: Weights) =>
      rank(visits, (v) => scoreVisit(v.votes, weights).total).map((r) => r.item.id)

    expect(order(WEIGHTS)).toEqual(['B', 'A'])
    const foodie: Weights = { menjar: 0.7, preu: 0.1, servei: 0.1, espai: 0.1 }
    expect(order(foodie)).toEqual(['A', 'B'])
  })

  it('format i rànquing arrodoneixen igual (cap fila diu 7,8 si el rànquing diu 7,9)', () => {
    for (const value of [7.85, 6.85, 8.05, 9.95, 4.45]) {
      expect(formatScore(value)).toBe(formatScore(roundScore(value)))
    }
    expect(formatScore(7.85)).toBe('7,9')
  })
})

describe('índex d\'exigència', () => {
  const visit = (mine: (number | null)[], ...others: (number | null)[][]) => ({
    votes: [votesOf('jo', mine), ...others.map((o, i) => votesOf(`altre${i}`, o))].flat(),
  })

  it('es compara amb la resta del grup, no amb el grup sencer (parella)', () => {
    const diffs = exigencyDiffs('jo', [visit([6, 6, 6, 6], [8, 8, 8, 8])])
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toBeCloseTo(-2, 10) // incloent-me seria −1
  })

  it('cal un mínim de 3 visites', () => {
    const two = exigencyDiffs('jo', [visit([6, 6, 6, 6], [7, 7, 7, 7]), visit([6, 6, 6, 6], [7, 7, 7, 7])])
    expect(exigency(two)).toEqual({ value: null, visits: 2 })
    const three = [...two, ...exigencyDiffs('jo', [visit([9, 9, 9, 9], [7, 7, 7, 7])])]
    const result = exigency(three)
    expect(result.visits).toBe(3)
    expect(result.value).toBeCloseTo((-1 - 1 + 2) / 3, 10)
  })

  it('només compten les visites on tinc nota personal i la resta també', () => {
    const diffs = exigencyDiffs('jo', [
      visit([6, 6, 6, null], [8, 8, 8, 8]), // jo incomplet
      visit([6, 6, 6, 6]), // sol
      visit([6, 6, 6, 6], [8, 8, 8, 8], [10, null, null, null]), // la resta: mitjana per categoria
    ])
    expect(diffs).toHaveLength(1)
    expect(diffs[0]).toBeCloseTo(6 - (0.4 * 9 + 0.6 * 8), 10)
  })

  it('«tots els grups» = mitjana ponderada pel nombre de visites de cada grup', () => {
    const groupA = [-1, -1, -1, -1] // 4 visites, −1
    const groupB = [2, 2, 2] // 3 visites, +2
    const all = exigency([...groupA, ...groupB]).value!
    expect(all).toBeCloseTo((4 * -1 + 3 * 2) / 7, 10)
  })

  it('categoria on és més generós', () => {
    const visits = [visit([7, 9, 5, 6], [7, 6, 6, 6]), visit([8, 8, 6, 6], [8, 6, 7, 6])]
    const generosity = categoryGenerosity('jo', visits)
    expect(generosity.preu).toBeCloseTo(2.5, 10)
    expect(generosity.servei).toBeCloseTo(-1, 10)
    expect(mostGenerousCategory(generosity)).toBe<Category>('preu')
    expect(mostGenerousCategory({})).toBeNull()
  })
})

describe('dates de les visites (hora de Barcelona)', () => {
  it('per defecte avui; entre les 00:00 i les 05:00, ahir', () => {
    expect(defaultVisitDate(new Date('2026-11-26T10:00:00Z'))).toBe('2026-11-26')
    expect(defaultVisitDate(new Date('2026-11-26T23:30:00Z'))).toBe('2026-11-26') // 00:30 del 27
    expect(defaultVisitDate(new Date('2026-07-10T02:30:00Z'))).toBe('2026-07-09') // 04:30 d'estiu
    expect(defaultVisitDate(new Date('2026-07-10T03:30:00Z'))).toBe('2026-07-10') // 05:30
    expect(defaultVisitDate(new Date('2026-01-01T01:00:00Z'))).toBe('2025-12-31')
  })

  it('mesos i dies', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(isDay('2026-02-29')).toBe(false)
    expect(isDay('2028-02-29')).toBe(true)
  })
})

describe('format de rànquing', () => {
  it('ordinals en català', () => {
    expect([1, 2, 3, 4, 5, 11].map(formatOrdinal)).toEqual(['1r', '2n', '3r', '4t', '5è', '11è'])
  })

  it('diferències amb signe', () => {
    expect(formatSignedScore(-0.84)).toBe('−0,8')
    expect(formatSignedScore(0.36)).toBe('+0,4')
    expect(formatSignedScore(0.04)).toBe('0,0')
  })
})

describe('posició al rànquing del mes i de l\'any', () => {
  const v = (id: string, visitDate: string, total: number | null) => ({ id, visitDate, total })
  const visits = [
    v('a', '2026-11-02', 8.1),
    v('b', '2026-11-20', 7.2),
    v('c', '2026-03-10', 9.0),
    v('d', '2025-11-15', 9.9), // un altre any
  ]

  it('compta només les del mateix mes i any', () => {
    expect(periodPositions(visits, visits[1])).toEqual({ month: 2, year: 3 })
    expect(periodPositions(visits, visits[0])).toEqual({ month: 1, year: 2 })
  })

  it('una visita que encara no és a la llista (sala acabada de tancar)', () => {
    expect(periodPositions(visits, v('nova', '2026-11-26', 8.5))).toEqual({ month: 1, year: 2 })
  })

  it('sense nota, sense posició', () => {
    expect(periodPositions(visits, v('x', '2026-11-26', null))).toEqual({ month: null, year: null })
  })

  it('rankPeriod: mes, any o històric', () => {
    expect(rankPeriod(visits, '2026-11').map((r) => r.item.id)).toEqual(['a', 'b'])
    expect(rankPeriod(visits, '2026').map((r) => r.item.id)).toEqual(['c', 'a', 'b'])
    expect(rankPeriod(visits, null).map((r) => r.item.id)).toEqual(['d', 'c', 'a', 'b'])
  })
})

describe('perfil', () => {
  const visit = (id: string, restaurantId: string, mine: (number | null)[], ...others: (number | null)[][]) => ({
    id,
    restaurantId,
    votes: [votesOf('jo', mine), ...others.map((o, i) => votesOf(`altre${i}`, o))].flat(),
  })
  const visits = [
    visit('v1', 'r1', [9, 9, 9, 9], [7, 7, 7, 7]),
    visit('v2', 'r1', [5, 5, 5, 5], [7, 7, 7, 7]),
    visit('v3', 'r2', [8, null, null, null], [6, 6, 6, 6]),
    visit('v4', 'r3', [null, null, null, null], [6, 6, 6, 6]), // no hi va votar
  ]
  const stats = profileStats('jo', visits)

  it('compta visites i restaurants on ha votat', () => {
    expect(stats.visits).toBe(3)
    expect(stats.restaurants).toBe(2)
    expect(stats.history.map((h) => h.visit.id)).toEqual(['v1', 'v2', 'v3'])
  })

  it('mitjanes: per categoria (tots els vots) i global (notes personals)', () => {
    expect(stats.categoryAverages.menjar).toBeCloseTo((9 + 5 + 8) / 3, 10)
    expect(stats.categoryAverages.preu).toBeCloseTo(7, 10)
    expect(stats.average).toBeCloseTo(7, 10)
  })

  it('curiositats: el més alt, el més baix i on és més generós', () => {
    expect(stats.best?.visit.id).toBe('v1')
    expect(stats.worst?.visit.id).toBe('v2')
    expect(stats.mostGenerous).toBe('menjar') // +2 de mitjana (v1 +2, v2 −2, v3 +2)
  })

  it('la seva nota i la del grup a cada visita', () => {
    const v1 = stats.history[0]
    expect(v1.personal).toBeCloseTo(9, 10)
    expect(v1.group).toBeCloseTo(8, 10)
    expect(stats.history[2].personal).toBeNull()
  })

  it('rànquing d\'exigència: del més exigent al més generós; sense mínim, al final', () => {
    const groupVisits = [
      visit('a', 'r', [6, 6, 6, 6], [8, 8, 8, 8], [7, 7, 7, 7]),
      visit('b', 'r', [6, 6, 6, 6], [8, 8, 8, 8], [7, 7, 7, 7]),
      visit('c', 'r', [6, 6, 6, 6], [8, 8, 8, 8], [null, null, null, null]),
    ]
    const ranking = exigencyRanking(['altre0', 'jo', 'altre1'], groupVisits)
    expect(ranking.map((r) => r.userId)).toEqual(['jo', 'altre0', 'altre1'])
    expect(ranking[0].value).toBeLessThan(0)
    expect(ranking[1].value).toBeGreaterThan(0)
    expect(ranking[2]).toMatchObject({ value: null, visits: 2 })
  })
})

describe('lectura de formularis', () => {
  it('preu', () => {
    expect(parsePrice('28,50')).toBe(28.5)
    expect(parsePrice('28.5 €')).toBe(28.5)
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('vint')).toBeUndefined()
    expect(parsePrice('-3')).toBeUndefined()
    expect(parsePrice('20000')).toBeUndefined()
  })

  it('codi de sala escrit o enganxat', () => {
    expect(parseRoomCode('k7qx2')).toBe('K7QX2')
    expect(parseRoomCode('https://sobretaula-self.vercel.app/s/K7QX2')).toBe('K7QX2')
    expect(parseRoomCode('K7QX')).toBeNull()
    expect(parseRoomCode('O0I1L')).toBeNull() // caràcters que no fem servir
  })

  it('cerca sense accents ni majúscules', () => {
    expect(searchKey('  Can  Pép ')).toBe('can pep')
  })
})
