'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { GROUP_COLOR_KEYS, type GroupColor } from '@/config/groupColors'
import { ca } from '@/i18n/ca'
import { errorMessage, type ActionState } from '@/lib/errors'
import { createClient } from '@/lib/supabase/server'

// Totes passen per la sessió de l'usuari: la RLS i les RPC decideixen qui pot
// fer què. Aquí només es valida perquè el missatge d'error sigui clar.

type GroupFields = { name: string; emoji: string; color: GroupColor }

function readGroupFields(formData: FormData): { fields: GroupFields } | { error: string } {
  const name = String(formData.get('name') ?? '').trim()
  const emoji = String(formData.get('emoji') ?? '').trim() || '🍽️'
  const colorRaw = String(formData.get('color') ?? '')
  const color: GroupColor = (GROUP_COLOR_KEYS as string[]).includes(colorRaw) ? (colorRaw as GroupColor) : 'tomaquet'
  if (!name) return { error: ca.errors.name_required }
  if (name.length > 40) return { error: ca.errors.name_too_long }
  return { fields: { name, emoji: [...emoji].slice(0, 4).join(''), color } }
}

export async function createGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = readGroupFields(formData)
  if ('error' in parsed) return { error: parsed.error }
  const { fields } = parsed
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_group', {
    p_name: fields.name,
    p_emoji: fields.emoji,
    p_color: fields.color,
  })
  if (error || !data) return { error: errorMessage(error) }
  redirect(`/g/${data}`)
}

export async function updateGroup(groupId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = readGroupFields(formData)
  if ('error' in parsed) return { error: parsed.error }
  const supabase = await createClient()
  const { data, error } = await supabase.from('groups').update(parsed.fields).eq('id', groupId).select('id')
  if (error) return { error: errorMessage(error) }
  if (!data?.length) return { error: ca.errors.not_admin }
  refresh()
  return { error: null, ok: true }
}

export async function createInvite(groupId: string): Promise<{ code: string } | { error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_invite', { p_group_id: groupId })
  if (error || !data) return { error: errorMessage(error) }
  refresh()
  return { code: data.code }
}

export async function revokeInvite(inviteId: string) {
  const supabase = await createClient()
  await supabase.from('group_invites').delete().eq('id', inviteId)
  refresh()
}

export async function setMemberRole(groupId: string, userId: string, role: 'admin' | 'member') {
  const supabase = await createClient()
  await supabase.from('group_members').update({ role }).eq('group_id', groupId).eq('user_id', userId)
  refresh()
}

export async function removeMember(groupId: string, userId: string) {
  const supabase = await createClient()
  await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
  refresh()
}

export async function leaveGroup(groupId: string): Promise<ActionState> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId })
  if (error) return { error: errorMessage(error) }
  redirect('/')
}

export async function acceptInvite(code: string): Promise<ActionState> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('accept_invite', { p_code: code })
  if (error || !data) return { error: errorMessage(error) }
  redirect(`/g/${data}`)
}
