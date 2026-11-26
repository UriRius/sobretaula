// Dies, mesos i anys de Sobretaula, sempre a l'hora de Barcelona (el servidor
// de Vercel va en UTC). Les visites es guarden com a dia 'YYYY-MM-DD'.

const TIME_ZONE = 'Europe/Madrid'

const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
})

function localParts(now: Date) {
  const get = (type: string) => Number(parts.formatToParts(now).find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Hora límit: un sopar que acaba a la 1 de la matinada és del dia abans. */
const LATE_NIGHT_UNTIL_HOUR = 5

/** Data per defecte d'una visita nova: avui, o ahir si són entre les 00:00 i les 05:00. */
export function defaultVisitDate(now: Date = new Date()): string {
  const { year, month, day, hour } = localParts(now)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  if (hour < LATE_NIGHT_UNTIL_HOUR) date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

/** Avui a Barcelona: 'YYYY-MM-DD'. */
export function today(now: Date = new Date()): string {
  const { year, month, day } = localParts(now)
  return `${year}-${pad(month)}-${pad(day)}`
}

/** El mes en curs: 'YYYY-MM'. */
export function currentMonth(now: Date = new Date()): string {
  return today(now).slice(0, 7)
}

/** 'YYYY-MM' desplaçat n mesos. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const index = y * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

export function isMonth(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function isYear(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}$/.test(value)
}

export function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}
