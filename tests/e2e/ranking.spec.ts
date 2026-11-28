// Esborrar una visita des del rànquing, mantenint-la premuda (amb tocs de
// debò, no clics): s'obre el full sense navegar al detall, «Cancel·la» no
// toca res, i «Esborra la visita» la fa desaparèixer (de la BD també, amb el
// restaurant, que no coneixia ningú més). Qui no n'és l'amfitrió ni admin no
// veu el full. (Les regles de la BD: tests/rls/delete-visit.test.ts.)
//
// Requereix la Supabase local amb les dades de prova (npm run db:reset).

import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'
import { adminClient, createClosedVisit, createRestaurant } from '../helpers/factory'
import { getLocalStack } from '../helpers/local-stack'

const AMICS = '10000000-0000-4000-a000-000000000001'
const ORIOL = '00000000-0000-4000-a000-000000000001' // admin d'Amics
const PITI = '00000000-0000-4000-a000-000000000002' // membre d'Amics
const SLOW = { timeout: 20_000 }
// L'històric: la visita de prova hi surt sigui quin sigui el mes en curs.
const RANKING = `/g/${AMICS}/ranquing?vista=historic`

const admin = adminClient(getLocalStack())
const restaurant = `E2E esborrar ${Date.now()}`
let restaurantId: string
let visitId: string

async function phone(browser: Browser, user: string, next: string): Promise<Page> {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`)
  await page.getByRole('button', { name: new RegExp(`^${user}$`, 'i') }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/entrar'))
  return page
}

/**
 * Un dit que es queda quiet sobre l'element (tocs reals de Chrome, per CDP).
 * Primer s'espera que React hagi hidratat la fila: l'HTML del servidor ja es
 * veu abans de tenir els gestors.
 */
async function longPress(page: Page, target: Locator, ms = 800) {
  await expect
    .poll(() => target.evaluate((el) => Object.keys(el).some((k) => k.startsWith('__reactProps'))), SLOW)
    .toBe(true)
  // Els tocs per CDP no fan scroll sols (tap() sí): al mig, lluny de la navegació inferior.
  await target.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const box = await target.boundingBox()
  if (!box) throw new Error('l\'element no es veu')
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await page.waitForTimeout(ms)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

test.beforeAll(async () => {
  restaurantId = await createRestaurant(admin, restaurant)
  ;({ visitId } = await createClosedVisit(admin, {
    groupId: AMICS,
    restaurantId,
    hostId: ORIOL,
    participants: [ORIOL, PITI],
  }))
})

test.afterAll(async () => {
  // Les dades de prova han de quedar com estaven (el rànquing local en depèn).
  await admin.from('visits').delete().eq('id', visitId)
  await admin.from('restaurants').delete().eq('id', restaurantId)
})

test('mantenir premuda una visita del rànquing per esborrar-la', async ({ browser }) => {
  // En Piti no n'és l'amfitrió ni admin: mantenir premut no obre res.
  const piti = await phone(browser, 'piti', RANKING)
  const pitiRow = piti.getByRole('link', { name: new RegExp(restaurant) })
  await expect(pitiRow).toBeVisible(SLOW)
  await longPress(piti, pitiRow)
  await piti.waitForTimeout(300)
  await expect(piti.getByRole('dialog')).toHaveCount(0)

  // L'Oriol (admin): s'obre el full i NO navega al detall.
  const oriol = await phone(browser, 'oriol', RANKING)
  const row = oriol.getByRole('link', { name: new RegExp(restaurant) })
  await expect(row).toBeVisible(SLOW)
  await expect(oriol.getByText('Per esborrar una visita, mantén-la premuda.')).toBeVisible()

  const sheet = oriol.getByRole('dialog', { name: 'Vols esborrar aquesta visita?' })
  await longPress(oriol, row)
  await expect(sheet).toBeVisible()
  await expect(sheet).toContainText(restaurant)
  await oriol.waitForTimeout(500)
  expect(new URL(oriol.url()).pathname).toBe(`/g/${AMICS}/ranquing`)
  await expect(sheet).toBeVisible() // el dit que s'aixeca no el tanca

  // «Cancel·la»: no toca res.
  await sheet.getByRole('button', { name: 'Cancel·la' }).click()
  await expect(sheet).toBeHidden()
  await expect(row).toBeVisible()

  // «Esborra la visita»: fora de la llista i de la BD (amb el restaurant).
  await longPress(oriol, row)
  await sheet.getByRole('button', { name: 'Esborra la visita' }).click()
  await expect(sheet).toBeHidden(SLOW)
  await expect(row).toHaveCount(0)

  const { data: visits } = await admin.from('visits').select('id').eq('id', visitId)
  expect(visits ?? []).toHaveLength(0)
  const { data: restaurants } = await admin.from('restaurants').select('id').eq('id', restaurantId)
  expect(restaurants ?? []).toHaveLength(0)

  // Un toc normal continua obrint el detall.
  const other = oriol.getByRole('link', { name: /Ramen Ya/ })
  await other.tap()
  await oriol.waitForURL(/\/visites\//, SLOW)
})
