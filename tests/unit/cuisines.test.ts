import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CUISINES, cuisineName, flagFor } from '@/config/cuisines'

describe('bandera de cada origen', () => {
  it('cuina catalana → senyera', () => {
    expect(flagFor('es-ct')).toEqual({ kind: 'senyera' })
  })

  it('resta d\'Espanya → bandera espanyola (però es guarda la regió)', () => {
    for (const code of ['es', 'es-pv', 'es-ga', 'es-an', 'es-vc']) {
      expect(flagFor(code)).toEqual({ kind: 'country', country: 'es' })
    }
  })

  it('resta del món → la del país', () => {
    expect(flagFor('it')).toEqual({ kind: 'country', country: 'it' })
    expect(flagFor('jp')).toEqual({ kind: 'country', country: 'jp' })
  })

  it('sense país clar → globus', () => {
    expect(flagFor('fusio')).toEqual({ kind: 'globe' })
    expect(flagFor('intl')).toEqual({ kind: 'globe' })
  })
})

describe('llista de cuines', () => {
  it('els codis són únics i compleixen el CHECK de la BD', () => {
    const codes = CUISINES.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) expect(code).toMatch(/^([a-z]{2}(-[a-z]{2,3})?|fusio|intl)$/)
  })

  it('cada país té el seu SVG a flag-icons', () => {
    for (const { code } of CUISINES) {
      const flag = flagFor(code)
      if (flag.kind !== 'country') continue
      const svg = new URL(`../../node_modules/flag-icons/flags/4x3/${flag.country}.svg`, import.meta.url)
      expect(existsSync(svg), `${code} → ${flag.country}.svg`).toBe(true)
    }
  })

  it('els noms són en català', () => {
    expect(cuisineName('es-ct')).toBe('Catalana')
    expect(cuisineName('es-pv')).toBe('Basca')
    expect(cuisineName('fusio')).toBe('Fusió')
  })
})
