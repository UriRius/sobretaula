// Llança Vitest des del camí canònic del projecte.
//
// A Windows, si la terminal obre el projecte com a `c:\…` (minúscula, com fa
// VS Code), Vitest es carrega des de `c:\…` però els tests l'importen des de
// `C:\…`: dues còpies del mòdul i «failed to find the current suite». Aquí es
// torna a llançar amb el camí real (realpath.native) com a directori de treball.
import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = realpathSync.native(fileURLToPath(new URL('..', import.meta.url)))
const bin = join(root, 'node_modules', 'vitest', 'vitest.mjs')
const result = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { cwd: root, stdio: 'inherit' })
process.exit(result.status ?? 1)
