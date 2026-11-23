import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { connection } from 'next/server'
import type { Database } from '@/types/database'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env'

/**
 * Client de servidor amb la sessió de l'usuari (cookies): tot passa per RLS.
 * Llegeix cookies → amb cacheComponents, crida-ho dins d'un <Suspense> o d'una
 * Server Action.
 *
 * `connection()`: les dades de Sobretaula (sales, vots) són sempre de temps de
 * petició. Sense això, el Partial Prefetching intenta prerenderitzar-les amb
 * les cookies de la sessió i supabase-js crida Date.now() en validar el token
 * («unstable value Date.now() while prerendering»).
 */
export async function createClient() {
  await connection()
  const cookieStore = await cookies()
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options)
        } catch {
          // Des d'un Server Component no es poden escriure cookies; el proxy ja
          // refresca la sessió a cada petició.
        }
      },
    },
  })
}
