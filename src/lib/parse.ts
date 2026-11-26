// Lectura de camps de formulari (sense BD). Tests: tests/unit/format.test.ts.

/** «28,50», «28.5», «28 €» → 28.5. Buit → null. Il·legible o fora de rang → undefined. */
export function parsePrice(raw: string): number | null | undefined {
  const cleaned = raw.replace(/€/g, '').replace(/\s/g, '').replace(',', '.')
  if (!cleaned) return null
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(cleaned)) return undefined
  const value = Number(cleaned)
  return value <= 10000 ? value : undefined
}

/** Clau de cerca: minúscules i sense accents («Can Pép» ~ «can pep»), com private.normalize_key. */
export function searchKey(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Un codi de sala escrit a mà o enganxat com a enllaç (…/s/K7QX2). */
export function parseRoomCode(raw: string): string | null {
  const code = (raw.match(/\/s\/([A-Za-z0-9]+)/)?.[1] ?? raw).toUpperCase().replace(/[^A-Z0-9]/g, '')
  return /^[A-Z2-9]{5}$/.test(code) ? code : null
}
