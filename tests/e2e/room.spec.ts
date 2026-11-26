// La sala, de punta a punta, amb dos mòbils (criteris d'acceptació):
//  1. Cap dels dos pot veure el vot de l'altre (ni a la pantalla ni a les
//     respostes de la xarxa) fins que es revela.
//  2. El «Següent» de l'amfitrió arriba a l'altre mòbil en menys d'1 s.
//
// Requereix la Supabase local amb les dades de prova (npm run db:reset) i
// l'app en marxa (Playwright l'engega si no ho està): npm run test:e2e

import { expect, test, type Browser, type Page } from '@playwright/test'
import { adminClient } from '../helpers/factory'
import { getLocalStack } from '../helpers/local-stack'

const AMICS = '10000000-0000-4000-a000-000000000001'
const ORIOL = '00000000-0000-4000-a000-000000000001'
const PITI = '00000000-0000-4000-a000-000000000002'
const CATEGORIES = ['Menjar', 'Preu', 'Servei', 'Espai'] as const
const ORIOL_VOTES = [8, 6, 7, 5]
const PITI_VOTES = [9, 2, 10, 6]
const MAX_SYNC_MS = 1000
// Esperes que NO mesuren latència (el primer cop, el servidor de
// desenvolupament compila les rutes).
const SLOW = { timeout: 20_000 }

const restaurant = `E2E ${Date.now()}`

async function phone(browser: Browser, user: string, next: string): Promise<Page> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`)
  await page.getByRole('button', { name: new RegExp(`^${user}$`, 'i') }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/entrar'))
  return page
}

/** Tots els vots que arriben a aquest mòbil per l'API de Supabase. */
function recordVotes(page: Page) {
  const seen: { user_id: string; category: string; value: number }[] = []
  page.on('response', async (response) => {
    if (!response.url().includes('/rest/v1/votes')) return
    try {
      const body = await response.json()
      if (Array.isArray(body)) seen.push(...body)
    } catch {
      // resposta sense cos (p. ex. 204)
    }
  })
  return seen
}

async function vote(page: Page, values: number[]) {
  for (const [i, category] of CATEGORIES.entries()) {
    await page.getByRole('radio', { name: `${category}: ${values[i]}` }).click()
    await expect(page.getByRole('radio', { name: `${category}: ${values[i]}` })).toHaveAttribute('aria-checked', 'true')
  }
}

test.afterAll(async () => {
  // Les dades de prova han de quedar com estaven (el rànquing local en depèn).
  const admin = adminClient(getLocalStack())
  const { data } = await admin.from('restaurants').select('id').eq('name', restaurant)
  const ids = (data ?? []).map((r) => r.id)
  if (ids.length) {
    await admin.from('visits').delete().in('restaurant_id', ids)
    await admin.from('restaurants').delete().in('id', ids)
  }
})

test('dos mòbils: vot secret i revelació sincronitzada', async ({ browser }) => {
  // L'Oriol obre la sala.
  const oriol = await phone(browser, 'oriol', `/g/${AMICS}/sala/nova`)
  await oriol.getByLabel('Restaurant').fill(restaurant)
  await oriol.locator('select#cuisine').selectOption('it')
  await oriol.getByRole('button', { name: 'Obre la sala' }).click()
  await oriol.waitForURL(/\/s\/[A-Z2-9]{5}$/, SLOW)
  const code = oriol.url().split('/s/')[1]

  // En Piti hi entra amb l'enllaç.
  const piti = await phone(browser, 'piti', `/s/${code}`)
  const pitiSaw = recordVotes(piti)
  const oriolSaw = recordVotes(oriol)
  await expect(oriol.getByText('Piti', { exact: true })).toBeVisible(SLOW)

  await vote(oriol, ORIOL_VOTES)
  await vote(piti, PITI_VOTES)
  // L'Oriol veu el ✓ d'en Piti (però no el valor).
  await expect(oriol.locator('li', { hasText: 'Piti' }).getByText('Ha votat')).toBeAttached(SLOW)

  // Cap vot de l'altre ha viatjat per la xarxa mentre es votava.
  await piti.reload()
  await oriol.reload()
  await expect(piti.getByRole('radio', { name: 'Espai: 6' })).toHaveAttribute('aria-checked', 'true', SLOW)
  expect(pitiSaw.filter((v) => v.user_id === ORIOL)).toEqual([])
  expect(oriolSaw.filter((v) => v.user_id === PITI)).toEqual([])
  // …i tampoc a la pàgina que dona el servidor.
  expect(await piti.content()).not.toContain(ORIOL_VOTES.join(','))

  // Revelar i «Següent»: cada pas arriba al mòbil d'en Piti en < 1 s.
  oriol.on('dialog', (dialog) => dialog.accept())
  const buttons = ['Revelar', 'Següent', 'Següent', 'Següent']
  for (const [i, category] of CATEGORIES.entries()) {
    const started = Date.now()
    await oriol.getByRole('button', { name: buttons[i] }).click()
    await piti.locator('li[aria-current=step]', { hasText: category }).waitFor({ timeout: 5000 })
    expect(Date.now() - started, `${category} ha trigat massa`).toBeLessThan(MAX_SYNC_MS)

    // Ara sí: en Piti veu el vot de l'Oriol d'aquesta categoria, i cap més.
    const card = piti.getByRole('listitem').filter({ hasText: 'Oriol' })
    await expect(card.getByText(String(ORIOL_VOTES[i]), { exact: true }).first()).toBeVisible()
    const oriolVisible = pitiSaw.filter((v) => v.user_id === ORIOL).map((v) => v.category)
    expect(new Set(oriolVisible)).toEqual(new Set(['menjar', 'preu', 'servei', 'espai'].slice(0, i + 1)))
  }

  // Nota final: 0,4·8,5 + 0,25·4 + 0,2·8,5 + 0,15·5,5 = 6,925 → 6,9
  const started = Date.now()
  await oriol.getByRole('button', { name: 'Nota final' }).click()
  await expect(piti.getByText('Nota final')).toBeVisible({ timeout: 5000 })
  expect(Date.now() - started).toBeLessThan(MAX_SYNC_MS)
  await expect(piti.getByText('6,9', { exact: true }).first()).toBeVisible()
})
