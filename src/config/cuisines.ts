// Origen de la cuina: llista tancada. El codi es guarda a
// restaurants.cuisine_origin (CHECK de format a la BD).
//   - país ISO 3166-1 (it, jp, pe…)
//   - regió espanyola ISO 3166-2 (es-ct, es-pv, es-ga…): es guarda la regió
//     encara que avui només la catalana tingui bandera pròpia
//   - sense país: fusio, intl
//
// Regla de bandera (flagFor): catalana → senyera; resta d'Espanya → bandera
// espanyola; resta del món → la del país; sense país → globus.

export type CuisineGroup = 'catalunya' | 'espanya' | 'mon' | 'sense'

export type Cuisine = { code: string; name: string; group: CuisineGroup }

export const CUISINES: Cuisine[] = [
  { code: 'es-ct', name: 'Catalana', group: 'catalunya' },

  { code: 'es', name: 'Espanyola', group: 'espanya' },
  { code: 'es-an', name: 'Andalusa', group: 'espanya' },
  { code: 'es-ar', name: 'Aragonesa', group: 'espanya' },
  { code: 'es-as', name: 'Asturiana', group: 'espanya' },
  { code: 'es-ib', name: 'Balear', group: 'espanya' },
  { code: 'es-pv', name: 'Basca', group: 'espanya' },
  { code: 'es-cn', name: 'Canària', group: 'espanya' },
  { code: 'es-cb', name: 'Càntabra', group: 'espanya' },
  { code: 'es-cl', name: 'Castellana', group: 'espanya' },
  { code: 'es-cm', name: 'Castellanomanxega', group: 'espanya' },
  { code: 'es-ex', name: 'Extremenya', group: 'espanya' },
  { code: 'es-ga', name: 'Gallega', group: 'espanya' },
  { code: 'es-md', name: 'Madrilenya', group: 'espanya' },
  { code: 'es-mc', name: 'Murciana', group: 'espanya' },
  { code: 'es-nc', name: 'Navarresa', group: 'espanya' },
  { code: 'es-ri', name: 'Riojana', group: 'espanya' },
  { code: 'es-vc', name: 'Valenciana', group: 'espanya' },

  { code: 'de', name: 'Alemanya', group: 'mon' },
  { code: 'us', name: 'Americana', group: 'mon' },
  { code: 'ar', name: 'Argentina', group: 'mon' },
  { code: 'be', name: 'Belga', group: 'mon' },
  { code: 'br', name: 'Brasilera', group: 'mon' },
  { code: 'gb', name: 'Britànica', group: 'mon' },
  { code: 'co', name: 'Colombiana', group: 'mon' },
  { code: 'kr', name: 'Coreana', group: 'mon' },
  { code: 'cu', name: 'Cubana', group: 'mon' },
  { code: 'et', name: 'Etíop', group: 'mon' },
  { code: 'ph', name: 'Filipina', group: 'mon' },
  { code: 'fr', name: 'Francesa', group: 'mon' },
  { code: 'ge', name: 'Georgiana', group: 'mon' },
  { code: 'gr', name: 'Grega', group: 'mon' },
  { code: 'in', name: 'Índia', group: 'mon' },
  { code: 'id', name: 'Indonèsia', group: 'mon' },
  { code: 'il', name: 'Israeliana', group: 'mon' },
  { code: 'it', name: 'Italiana', group: 'mon' },
  { code: 'jp', name: 'Japonesa', group: 'mon' },
  { code: 'lb', name: 'Libanesa', group: 'mon' },
  { code: 'ma', name: 'Marroquina', group: 'mon' },
  { code: 'mx', name: 'Mexicana', group: 'mon' },
  { code: 'np', name: 'Nepalesa', group: 'mon' },
  { code: 'pk', name: 'Pakistanesa', group: 'mon' },
  { code: 'pe', name: 'Peruana', group: 'mon' },
  { code: 'ir', name: 'Persa', group: 'mon' },
  { code: 'pt', name: 'Portuguesa', group: 'mon' },
  { code: 'ru', name: 'Russa', group: 'mon' },
  { code: 'sn', name: 'Senegalesa', group: 'mon' },
  { code: 'sy', name: 'Síria', group: 'mon' },
  { code: 'th', name: 'Tailandesa', group: 'mon' },
  { code: 'tr', name: 'Turca', group: 'mon' },
  { code: 've', name: 'Veneçolana', group: 'mon' },
  { code: 'vn', name: 'Vietnamita', group: 'mon' },
  { code: 'cn', name: 'Xinesa', group: 'mon' },

  { code: 'fusio', name: 'Fusió', group: 'sense' },
  { code: 'intl', name: 'Internacional', group: 'sense' },
]

const BY_CODE = new Map(CUISINES.map((c) => [c.code, c]))

export function cuisineName(code: string): string {
  return BY_CODE.get(code)?.name ?? code
}

export type FlagKind =
  | { kind: 'senyera' }
  | { kind: 'country'; country: string }
  | { kind: 'globe' }

/** La bandera que es dibuixa per a un codi d'origen. */
export function flagFor(code: string): FlagKind {
  if (code === 'es-ct') return { kind: 'senyera' }
  if (code === 'es' || code.startsWith('es-')) return { kind: 'country', country: 'es' }
  if (code === 'fusio' || code === 'intl' || !/^[a-z]{2}$/.test(code)) return { kind: 'globe' }
  return { kind: 'country', country: code }
}
