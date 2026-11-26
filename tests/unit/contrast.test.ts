// Contrast WCAG dels tokens de disseny, en clar i en fosc. Mesurat, no a ull.
// Llegeix src/app/globals.css directament: si algú canvia un color, això ho diu.

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../../src/app/globals.css', import.meta.url), 'utf8')

function block(selector: RegExp): Record<string, string> {
  const match = selector.exec(css)
  if (!match) throw new Error(`No trobo el bloc ${selector}`)
  const start = css.indexOf('{', match.index) + 1
  let depth = 1
  let i = start
  while (depth > 0) {
    if (css[i] === '{') depth++
    if (css[i] === '}') depth--
    i++
  }
  const vars: Record<string, string> = {}
  for (const m of css.slice(start, i - 1).matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) vars[m[1]] = m[2]
  return vars
}

const light = block(/^:root \{/m)
const dark = block(/^:root\[data-theme="dark"\] \{/m)
const darkSystem = block(/^\s+:root:not\(\[data-theme="light"\]\) \{/m)

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

// [primer pla, fons, mínim] — 4.5 text normal, 3 text gran / icones.
const PAIRS: [string, string, number][] = [
  ['heading', 'canvas', 4.5],
  ['body', 'canvas', 4.5],
  ['body', 'surface', 4.5],
  ['label', 'surface', 4.5],
  ['subtle', 'canvas', 4.5],
  ['subtle', 'surface', 4.5],
  ['subtle', 'surface-2', 4.5],
  ['muted', 'surface', 3],
  ['link', 'canvas', 4.5],
  ['link', 'surface', 4.5],
  ['on-primary', 'primary', 4.5],
  ['primary-soft-fg', 'primary-soft', 4.5],
  ['accent-soft-fg', 'accent-soft', 4.5],
  ['on-accent', 'accent', 4.5],
  ['card-ink', 'card-face', 4.5],
  ['success', 'surface', 4.5],
  ['success', 'canvas', 4.5],
]

describe.each([
  ['clar', light],
  ['fosc', dark],
])('contrast en mode %s', (_name, tokens) => {
  it.each(PAIRS)('%s sobre %s ≥ %d:1', (fg, bg, min) => {
    expect(tokens[fg], fg).toBeDefined()
    expect(tokens[bg], bg).toBeDefined()
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min)
  })
})

describe('mode fosc', () => {
  it('el bloc del sistema i el forçat tenen els mateixos valors (CSS no té mixins)', () => {
    expect(darkSystem).toEqual(dark)
  })

  it('el fons no és negre', () => {
    expect(dark.canvas).not.toBe('#000000')
    expect(luminance(dark.canvas)).toBeGreaterThan(0)
  })
})
