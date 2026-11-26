// Criteri d'acceptació: un usuari que és a «Amics» però no a «Parella» no
// pot veure res de «Parella», ni tan sols al perfil de la persona que
// comparteixen. (La part de la BD és a tests/rls/isolation.test.ts.)
//
// Dades de prova: l'Oriol és a Amics i a Parella; en Piti només a Amics.
// «Mar i Cel», «Le Petit Bistrot» i «La Taverna Andalusa» només els coneix
// Parella.

import { expect, test, type Page } from '@playwright/test'

const ORIOL = '00000000-0000-4000-a000-000000000001'
const PARELLA = '10000000-0000-4000-a000-000000000002'
const PARELLA_ONLY = ['Parella', 'Mar i Cel', 'Le Petit Bistrot', 'La Taverna Andalusa']

async function signIn(page: Page, user: string, next: string) {
  await page.goto(`/entrar?next=${encodeURIComponent(next)}`)
  await page.getByRole('button', { name: new RegExp(`^${user}$`, 'i') }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/entrar'))
}

/** El text que es veu (innerText ignora les pàgines amagades per Activity). */
const visibleText = (page: Page) => page.locator('body').innerText()

test('al perfil de l\'Oriol, en Piti no veu res de Parella', async ({ page }) => {
  await signIn(page, 'piti', `/perfil/${ORIOL}`)
  await expect(page.getByRole('heading', { name: 'Oriol' })).toBeVisible()
  await expect(page.getByText('Historial de vots')).toBeVisible()
  const text = await visibleText(page)
  for (const secret of PARELLA_ONLY) expect(text, secret).not.toContain(secret)

  // Ni forçant l'adreça amb l'id de Parella.
  await page.goto(`/perfil/${ORIOL}?grup=${PARELLA}`)
  await expect(page.getByText('Historial de vots')).toBeVisible()
  const forced = await visibleText(page)
  for (const secret of PARELLA_ONLY) expect(forced, secret).not.toContain(secret)

  // Ni al rànquing de Parella: la mateixa resposta que una adreça inexistent.
  // (Amb streaming, notFound() dins d'un <Suspense> respon 200 amb la pàgina
  // de «no trobat»: per això es mira el que es veu, no el codi HTTP.)
  await page.goto(`/g/${PARELLA}/ranquing`)
  await expect(page.getByText('Aquí no hi ha res')).toBeVisible()
  expect(await visibleText(page)).not.toContain('Mar i Cel')
})

test('control: l\'Oriol sí que veu Parella al seu perfil', async ({ page }) => {
  await signIn(page, 'oriol', '/jo')
  await expect(page.getByRole('link', { name: 'Parella' })).toBeVisible()
  await expect(page.getByText('Mar i Cel').first()).toBeVisible()
})
