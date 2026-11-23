import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type CurrentUser = {
  id: string
  email: string | null
  /** Nom i foto que dona Google (per omplir el perfil el primer cop). */
  suggestedName: string | null
  suggestedAvatarUrl: string | null
}

/**
 * L'usuari de la sessió (JWT verificat amb getClaims), o null.
 * `cache` = una sola lectura per petició encara que la cridin diversos components.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const avatar = str(meta.avatar_url) ?? str(meta.picture)
  return {
    id: claims.sub,
    email: str(claims.email),
    suggestedName: str(meta.full_name) ?? str(meta.name),
    suggestedAvatarUrl: avatar && avatar.startsWith('https://') ? avatar : null,
  }
})

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/entrar')
  return user
}
