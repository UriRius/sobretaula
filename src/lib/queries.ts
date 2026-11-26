import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { ACTIVE_GROUP_COOKIE } from '@/lib/activeGroup'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// Una funció per pantalla. Totes passen per la sessió de l'usuari → RLS.
// `cache` evita repetir la consulta dins d'una mateixa petició.

type Tables = Database['public']['Tables']
export type Profile = Tables['profiles']['Row']
export type GroupColor = Database['public']['Enums']['group_color']
export type GroupRole = Database['public']['Enums']['group_role']

export type MyGroup = {
  id: string
  name: string
  emoji: string
  color: GroupColor
  role: GroupRole
}

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  return data
})

/** El meu perfil; si encara no en tinc, a la pantalla de benvinguda. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getMyProfile()
  if (!profile) redirect('/benvinguda')
  return profile
}

export const getMyGroups = cache(async (): Promise<MyGroup[]> => {
  const user = await requireUser()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('group_members')
    .select('role, joined_at, groups(id, name, emoji, color)')
    .eq('user_id', user.id)
    .order('joined_at')
  if (error) throw new Error(error.message)
  return (data ?? []).flatMap((row) =>
    row.groups ? [{ ...row.groups, role: row.role }] : [],
  )
})

/** El grup de la galeta si encara hi sóc; si no, el primer. */
export const getActiveGroupId = cache(async (): Promise<string | null> => {
  const groups = await getMyGroups()
  if (groups.length === 0) return null
  const remembered = (await cookies()).get(ACTIVE_GROUP_COOKIE)?.value
  return groups.find((g) => g.id === remembered)?.id ?? groups[0].id
})

export type GroupMember = {
  userId: string
  role: GroupRole
  joinedAt: string
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'avatar_emoji'>
}

export type GroupDetail = MyGroup & { members: GroupMember[] }

/** Un grup meu amb els seus membres; null si no hi sóc (o no existeix). */
export const getGroup = cache(async (groupId: string): Promise<GroupDetail | null> => {
  const user = await requireUser()
  const groups = await getMyGroups()
  const group = groups.find((g) => g.id === groupId)
  if (!group) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, profiles(id, display_name, avatar_url, avatar_emoji)')
    .eq('group_id', groupId)
    .order('joined_at')
  if (error) throw new Error(error.message)

  const members = (data ?? []).flatMap((m) =>
    m.profiles ? [{ userId: m.user_id, role: m.role, joinedAt: m.joined_at, profile: m.profiles }] : [],
  )
  // Jo primer; després per ordre d'entrada.
  members.sort((a, b) => Number(b.userId === user.id) - Number(a.userId === user.id))
  return { ...group, members }
})

export type Invite = Tables['group_invites']['Row']

export async function getActiveInvites(groupId: string): Promise<Invite[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('group_invites')
    .select('*')
    .eq('group_id', groupId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return (data ?? []).filter((i) => i.max_uses === null || i.uses < i.max_uses)
}
