// Fàbrica d'usuaris, grups i visites per a la suite RLS.
// L'admin (clau secreta) se salta la RLS: només per PREPARAR dades i per
// COMPROVAR-LES després d'un intent bloquejat. Les proves es fan amb clients
// amb sessió real, pel mateix camí que l'app.

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'
import type { LocalStack } from './local-stack'

export type Client = SupabaseClient<Database>
type Category = Database['public']['Enums']['vote_category']

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }
export const PASSWORD = 'test-password-1234'
export const CATEGORIES: Category[] = ['menjar', 'preu', 'servei', 'espai']

export function adminClient(stack: LocalStack): Client {
  return createClient<Database>(stack.url, stack.secretKey, noSession)
}

/** El que veu qualsevol que tingui la clau publicable (és dins l'app). */
export function anonClient(stack: LocalStack): Client {
  return createClient<Database>(stack.url, stack.publishableKey, noSession)
}

export function uniqueEmail(label: string): string {
  return `rls-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`
}

/** Usuari confirmat + perfil. Retorna l'id. */
export async function createTestUser(admin: Client, email: string, name: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  // Un error buit aquí sol ser el contenidor d'auth responent 502 després d'un
  // db reset: `npx supabase stop && npx supabase start`.
  if (error || !data.user) throw new Error(`createUser(${email}) ha fallat: ${error?.message}`)
  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: data.user.id, display_name: name })
  if (profileError) throw new Error(`perfil de ${email}: ${profileError.message}`)
  return data.user.id
}

/** Client amb sessió real. */
export async function signIn(stack: LocalStack, email: string): Promise<Client> {
  const client = createClient<Database>(stack.url, stack.publishableKey, noSession)
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`signIn(${email}) ha fallat: ${error.message}`)
  return client
}

export async function createGroup(
  admin: Client,
  name: string,
  members: { userId: string; role: 'admin' | 'member' }[],
): Promise<string> {
  const { data, error } = await admin.from('groups').insert({ name }).select('id').single()
  if (error || !data) throw new Error(`grup ${name}: ${error?.message}`)
  const { error: membersError } = await admin
    .from('group_members')
    .insert(members.map((m) => ({ group_id: data.id, user_id: m.userId, role: m.role })))
  if (membersError) throw new Error(`membres de ${name}: ${membersError.message}`)
  return data.id
}

export async function createRestaurant(admin: Client, name: string, cuisine = 'es-ct'): Promise<string> {
  const { data, error } = await admin
    .from('restaurants')
    .insert({ name, city: 'Prova', cuisine_origin: cuisine })
    .select('id')
    .single()
  if (error || !data) throw new Error(`restaurant ${name}: ${error?.message}`)
  return data.id
}

let roomCounter = 0
function testRoomCode(): string {
  // 5 caràcters de l'alfabet de les sales; prou únic per a una execució.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let n = Date.now() * 7 + roomCounter++ * 104729
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += alphabet[n % 32]
    n = Math.floor(n / 32)
  }
  return code
}

/** Visita tancada amb participants, vots i un comentari per participant. */
export async function createClosedVisit(
  admin: Client,
  opts: { groupId: string; restaurantId: string; hostId: string; participants: string[]; value?: number },
): Promise<{ visitId: string; roomCode: string }> {
  const roomCode = testRoomCode()
  const { data: visit, error } = await admin
    .from('visits')
    .insert({
      group_id: opts.groupId,
      restaurant_id: opts.restaurantId,
      host_id: opts.hostId,
      visit_date: '2026-11-01',
      room_code: roomCode,
      status: 'closed',
      reveal_step: 3,
      closed_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error || !visit) throw new Error(`visita: ${error?.message}`)

  const participants = opts.participants.map((userId) => ({
    visit_id: visit.id,
    group_id: opts.groupId,
    user_id: userId,
  }))
  const { error: pError } = await admin.from('visit_participants').insert(participants)
  if (pError) throw new Error(`participants: ${pError.message}`)

  const votes = opts.participants.flatMap((userId) =>
    CATEGORIES.map((category) => ({
      visit_id: visit.id,
      group_id: opts.groupId,
      user_id: userId,
      category,
      value: opts.value ?? 7,
    })),
  )
  const { error: vError } = await admin.from('votes').insert(votes)
  if (vError) throw new Error(`vots: ${vError.message}`)

  const { error: cError } = await admin.from('comments').insert(
    opts.participants.map((userId) => ({
      visit_id: visit.id,
      group_id: opts.groupId,
      user_id: userId,
      body: 'Comentari de prova',
    })),
  )
  if (cError) throw new Error(`comentaris: ${cError.message}`)

  return { visitId: visit.id, roomCode }
}

/** Esborra tot el que han creat els tests (per grup i per usuari). */
export async function cleanup(admin: Client, groupIds: string[], userIds: string[], restaurantIds: string[]) {
  if (groupIds.length) await admin.from('groups').delete().in('id', groupIds)
  if (restaurantIds.length) await admin.from('restaurants').delete().in('id', restaurantIds)
  // Restaurants creats pel camí real (create_visit) durant els tests.
  if (userIds.length) await admin.from('restaurants').delete().in('created_by', userIds)
  for (const id of userIds) {
    await admin.from('profiles').delete().eq('id', id)
    await admin.auth.admin.deleteUser(id)
  }
}
