import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Llança-ho amb `npm run test:*` (scripts/vitest.mjs): a Windows, un camí
// `c:\…` en minúscula fa que Vitest es carregui dues vegades.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // La suite RLS comparteix una sola BD local: millor en sèrie.
    fileParallelism: false,
    testTimeout: 20_000,
  },
})
