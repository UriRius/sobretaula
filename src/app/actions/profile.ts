'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { AVATAR_EMOJIS } from '@/config/groupColors'
import { ca } from '@/i18n/ca'
import { getCurrentUser } from '@/lib/auth'
import { errorMessage, type ActionState } from '@/lib/errors'
import { safeNext } from '@/lib/safeNext'
import { createClient } from '@/lib/supabase/server'

/**
 * Crea o actualitza el meu perfil. `avatar` = 'photo' (la foto de Google) o un
 * dels emojis de la llista.
 */
export async function saveProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser()
  if (!user) return { error: ca.errors.not_authenticated }

  const name = String(formData.get('display_name') ?? '').trim()
  if (!name) return { error: ca.errors.name_required }
  if (name.length > 40) return { error: ca.errors.name_too_long }

  const avatar = String(formData.get('avatar') ?? '')
  const usePhoto = avatar === 'photo' && user.suggestedAvatarUrl
  const emoji = (AVATAR_EMOJIS as readonly string[]).includes(avatar) ? avatar : null
  const fields = {
    display_name: name,
    avatar_url: usePhoto ? user.suggestedAvatarUrl : null,
    avatar_emoji: usePhoto ? null : emoji,
  }

  const supabase = await createClient()
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', user.id)
    .select('id')
  if (updateError) return { error: errorMessage(updateError) }
  if (!updated?.length) {
    const { error } = await supabase.from('profiles').insert({ id: user.id, ...fields })
    if (error) return { error: errorMessage(error) }
  }

  const next = formData.get('next')
  if (typeof next === 'string' && next) redirect(safeNext(next))
  refresh()
  return { error: null, ok: true }
}

/** Accepta un codi o un enllaç sencer (…/unir/CODI) i hi porta. */
export async function goToInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = String(formData.get('code') ?? '').trim()
  const code = (raw.match(/unir\/([A-Za-z0-9]+)/)?.[1] ?? raw).toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (code.length !== 10) return { error: ca.errors.invite_not_found }
  redirect(`/unir/${code}`)
}
