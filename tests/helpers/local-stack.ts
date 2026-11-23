import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface LocalStack {
  url: string
  publishableKey: string
  secretKey: string
}

// GUARDA DE SEGURETAT: la suite RLS crea usuaris i escriu dades. No ha de
// córrer MAI contra un projecte real. Sense opció per saltar-s'ho, a propòsit.
function assertLocal(url: string): void {
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(url)) {
    throw new Error(`Em nego a córrer els tests RLS contra una Supabase que no és local: ${url}`)
  }
}

function parseStatusEnv(output: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/)
    if (m) vars[m[1]] = m[2]
  }
  return vars
}

let cached: LocalStack | undefined

export function getLocalStack(): LocalStack {
  if (cached) return cached

  // CI o variables explícites…
  const envUrl = process.env.SUPABASE_URL
  const envPublishable = process.env.SUPABASE_PUBLISHABLE_KEY
  const envSecret = process.env.SUPABASE_SECRET_KEY
  if (envUrl && envPublishable && envSecret) {
    assertLocal(envUrl)
    cached = { url: envUrl, publishableKey: envPublishable, secretKey: envSecret }
    return cached
  }

  // …o directament de la Supabase local.
  const output = execSync('npx supabase status -o env', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const vars = parseStatusEnv(output)
  const url = vars.API_URL
  const publishableKey = vars.PUBLISHABLE_KEY
  const secretKey = vars.SECRET_KEY
  if (!url || !publishableKey || !secretKey) {
    throw new Error(
      `No he pogut llegir les claus de 'supabase status -o env' (claus: ${Object.keys(vars).join(', ')}). ` +
        'La Supabase local està engegada? (npm run db:start)',
    )
  }
  assertLocal(url)
  cached = { url, publishableKey, secretKey }
  return cached
}

/**
 * Consulta de NOMÉS LECTURA al catàleg de la BD LOCAL. Passa per un fitxer
 * perquè escapar SQL per a cmd.exe i sh alhora no val la pena.
 *
 * `supabase db query -o json` té DUES formes de sortida: un array de files, o
 * `{ boundary, rows, warning }` quan detecta un agent d'IA a l'entorn.
 * S'accepten totes dues.
 */
export function queryLocalDb<T>(sql: string): T[] {
  const dir = mkdtempSync(join(tmpdir(), 'sobretaula-sql-'))
  try {
    const file = join(dir, 'query.sql')
    writeFileSync(file, sql)
    const output = execSync(`npx supabase db query --local -f "${file}" -o json`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const start = output.search(/[[{]/)
    if (start < 0) throw new Error(`supabase db query no ha retornat JSON: ${output.slice(0, 200)}`)
    const parsed: unknown = JSON.parse(output.slice(start))
    if (Array.isArray(parsed)) return parsed as T[]
    const rows = (parsed as { rows?: unknown }).rows
    if (Array.isArray(rows)) return rows as T[]
    throw new Error(`Sortida inesperada de supabase db query: ${output.slice(0, 200)}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
