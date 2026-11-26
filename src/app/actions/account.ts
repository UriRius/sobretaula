'use server'

import { redirect } from 'next/navigation'
import { ca } from '@/i18n/ca'
import { getCurrentUser } from '@/lib/auth'
import { errorMessage, type ActionState } from '@/lib/errors'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Esborrar el compte, en dos passos:
 *  1. delete_my_account() amb la sessió de l'usuari: perfil anònim, fora dels
 *     grups, comentaris esborrats; els vots revelats es queden.
 *  2. Les dades d'accés (auth.users, amb l'email), amb la clau secreta.
 * Si el pas 2 falla, el pas 1 es pot tornar a fer sense mal (és idempotent).
 */
export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const typed = String(formData.get('confirm') ?? '').trim().toLowerCase()
  if (typed !== ca.account.confirmWord) return { error: ca.account.confirmMismatch }

  const user = await getCurrentUser()
  if (!user) return { error: ca.errors.not_authenticated }

  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_my_account')
  if (error) return { error: errorMessage(error) }

  const { error: authError } = await createAdminClient().auth.admin.deleteUser(user.id)
  if (authError) return { error: ca.errors.generic }

  await supabase.auth.signOut({ scope: 'local' })
  redirect('/entrar?compte=esborrat')
}
