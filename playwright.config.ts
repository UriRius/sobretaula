import { defineConfig, devices } from '@playwright/test'

// E2E de la sala (tests/e2e): dos mòbils voten a la mateixa sala contra la
// Supabase LOCAL amb les dades de prova (npm run db:reset). Fa servir el
// servidor de desenvolupament si ja està engegat.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    ...devices['Pixel 7'],
    // En local, el Chrome instal·lat (no cal descarregar navegadors).
    channel: process.env.CI ? undefined : 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/entrar',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
