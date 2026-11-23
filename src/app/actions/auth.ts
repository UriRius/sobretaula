'use server'

import { redirect } from 'next/navigation'
import { safeNext } from '@/lib/safeNext'
import { IS_LOCAL_SUPABASE } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/entrar')
}

const DEV_USERS = ['oriol', 'piti', 'mario', 'joel', 'laia'] as const

/**
 * Només amb la Supabase LOCAL: entrar com un usuari de prova del seed sense
 * passar per Google. A producció aquests usuaris no existeixen i el proveïdor
 * d'email està desactivat; a més, es nega a córrer si la URL no és local.
 */
export async function devSignIn(user: string, next: string) {
  if (!IS_LOCAL_SUPABASE || !DEV_USERS.includes(user as (typeof DEV_USERS)[number])) {
    throw new Error('devSignIn només funciona amb la Supabase local')
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: `${user}@sobretaula.test`,
    password: 'sobretaula-dev',
  })
  if (error) throw new Error(error.message)
  redirect(safeNext(next))
}
