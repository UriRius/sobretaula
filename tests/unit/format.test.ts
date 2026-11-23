import { describe, expect, it } from 'vitest'
import { formatDayLong, formatDayShort, formatEuros, formatScore } from '@/lib/format'
import { safeNext } from '@/lib/safeNext'
import { errorMessage } from '@/lib/errors'
import { ca } from '@/i18n/ca'

describe('format', () => {
  it('notes amb un decimal i coma', () => {
    expect(formatScore(7.84)).toBe('7,8')
    expect(formatScore(8)).toBe('8,0')
    expect(formatScore(9.95)).toBe('10,0')
  })

  it('euros a la catalana', () => {
    expect(formatEuros(28)).toMatch(/^28\s?€$/)
    expect(formatEuros(27.5)).toMatch(/^27,5\s?€$/)
  })

  it('els dies no es desplacen per la zona horària', () => {
    expect(formatDayLong('2026-01-01')).toBe('1 de gener del 2026')
    expect(formatDayLong('2026-11-07')).toBe('7 de novembre del 2026')
  })

  it('data curta: sense any si és l\'any de referència', () => {
    expect(formatDayShort('2026-11-07', 2026)).toBe('7 de nov.')
    expect(formatDayShort('2025-10-11', 2026)).toMatch(/2025/)
  })
})

describe('safeNext (redireccions)', () => {
  it('només rutes internes', () => {
    expect(safeNext('/unir/ABC')).toBe('/unir/ABC')
    expect(safeNext('https://dolent.com')).toBe('/')
    expect(safeNext('//dolent.com')).toBe('/')
    expect(safeNext('/\\dolent.com')).toBe('/')
    expect(safeNext(null)).toBe('/')
  })
})

describe('errors de la BD', () => {
  it('es tradueixen; mai es mostra el text cru', () => {
    expect(errorMessage({ message: 'invite_expired' })).toBe(ca.errors.invite_expired)
    expect(errorMessage({ message: 'duplicate key value violates unique constraint "x"' })).toBe(ca.errors.generic)
    expect(errorMessage(null)).toBe(ca.errors.generic)
  })
})
