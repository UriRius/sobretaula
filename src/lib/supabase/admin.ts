import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { SUPABASE_URL } from './env'

/**
 * Client amb la clau SECRETA: se salta la RLS. Només per a les dues coses que
 * la sessió de l'usuari no pot fer: esborrar-li les dades d'accés (auth) i el
 * cron que manté Supabase despert. Mai per llegir dades per a la UI.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) throw new Error('Falta SUPABASE_SECRET_KEY')
  return createClient<Database>(SUPABASE_URL, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
