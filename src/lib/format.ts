// Format de xifres i dates en català. UN sol lloc (no es formata enlloc més).
// Dates de la BD: 'YYYY-MM-DD' (dies, sense hora ni zona horària).

import { roundScore } from '@/lib/scoring/visit'

const LOCALE = 'ca'

const score1 = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const euros = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2, minimumFractionDigits: 0 })

/** Una nota amb un decimal: 7,8 (arrodonida igual que el rànquing). */
export function formatScore(value: number): string {
  return score1.format(roundScore(value))
}

/** Una diferència amb signe: +0,4 · −0,8 · 0,0 (signe menys de debò). */
export function formatSignedScore(value: number): string {
  const rounded = roundScore(value)
  if (rounded === 0) return score1.format(0)
  return `${rounded > 0 ? '+' : '−'}${score1.format(Math.abs(rounded))}`
}

/** Posició en un rànquing: 1r, 2n, 3r, 4t, 5è… */
export function formatOrdinal(n: number): string {
  const suffix = n === 1 || n === 3 ? 'r' : n === 2 ? 'n' : n === 4 ? 't' : 'è'
  return `${n}${suffix}`
}

export function formatEuros(value: number): string {
  return euros.format(value)
}

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  // Migdia UTC: cap zona horària el pot moure de dia.
  return new Date(Date.UTC(y, m - 1, d, 12))
}

const longDay = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortDay = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const shortDayYear = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** «7 de novembre de 2026» */
export function formatDayLong(day: string): string {
  return longDay.format(parseDay(day))
}

/** «7 de nov.» (o amb l'any si no és l'any de referència) */
export function formatDayShort(day: string, referenceYear = new Date().getUTCFullYear()): string {
  const date = parseDay(day)
  return (date.getUTCFullYear() === referenceYear ? shortDay : shortDayYear).format(date)
}

const monthYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' })
const monthOnly = new Intl.DateTimeFormat(LOCALE, { month: 'long', timeZone: 'UTC' })

/** «novembre del 2026» (a partir de '2026-11') */
export function formatMonth(month: string): string {
  return monthYear.format(parseDay(`${month}-01`))
}

/** «novembre» (a partir de '2026-11') */
export function formatMonthName(month: string): string {
  return monthOnly.format(parseDay(`${month}-01`))
}

/** Un instant (timestamptz) com a dia curt, a l'hora de Barcelona. */
export function formatInstantShort(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' }).format(new Date(iso))
}
