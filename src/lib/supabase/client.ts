import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './env'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

/** Client del navegador (una sola instància). Sessió a les cookies, com el servidor. */
export function getBrowserClient() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  return client
}
