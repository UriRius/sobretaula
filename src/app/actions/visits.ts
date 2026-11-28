'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { CUISINES } from '@/config/cuisines'
import { ca } from '@/i18n/ca'
import { isDay, today } from '@/lib/dates'
import { errorMessage, type ActionState } from '@/lib/errors'
import { parsePrice } from '@/lib/parse'
import { createClient } from '@/lib/supabase/server'

// La sessió de l'usuari fa la feina; les RPC i la RLS decideixen. Aquí només
// es valida perquè l'error sigui clar abans d'arribar a la BD.

const CUISINE_CODES = new Set(CUISINES.map((c) => c.code))
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export async function createVisit(groupId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const text = (key: string) => String(formData.get(key) ?? '').trim()
  const restaurantId = text('restaurant_id')
  const name = text('name')
  const city = text('city')
  const address = text('address')
  const cuisine = text('cuisine')
  const visitDate = text('visit_date')
  const price = parsePrice(text('price'))

  if (restaurantId && !UUID.test(restaurantId)) return { error: ca.errors.restaurant_not_found }
  if (!restaurantId) {
    if (!name) return { error: ca.errors.restaurant_name_required }
    if (name.length > 80 || city.length > 60 || address.length > 160) return { error: ca.errors.name_too_long }
    if (!CUISINE_CODES.has(cuisine)) return { error: ca.errors.cuisine_required }
  }
  if (!isDay(visitDate) || visitDate > today()) return { error: ca.errors.invalid_date }
  if (price === undefined) return { error: ca.errors.invalid_price }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_visit', {
    p_group_id: groupId,
    p_restaurant_id: (restaurantId || null) as string,
    p_restaurant_name: name,
    p_city: city,
    p_address: address,
    p_cuisine_origin: (cuisine || null) as string,
    p_visit_date: visitDate,
    p_price_per_person: price as number,
  })
  if (error || !data) return { error: errorMessage(error) }
  redirect(`/s/${data.room_code}`)
}

/**
 * Esborrar una visita (des del rànquing, mantenint-la premuda). Decideix la
 * RLS: l'amfitrió o un admin, i mai mentre es revela. Si no hi té dret, el
 * DELETE no esborra res (sense error): per això es demana la fila esborrada.
 * La neteja (notes del grup, restaurant orfe) la fa un trigger a la BD.
 */
export async function deleteVisit(visitId: string): Promise<ActionState> {
  if (!UUID.test(visitId)) return { error: ca.errors.room_not_found }
  const supabase = await createClient()
  const { data, error } = await supabase.from('visits').delete().eq('id', visitId).select('id')
  if (error) return { error: errorMessage(error) }
  if (!data?.length) return { error: ca.errors.cannot_delete_visit }
  refresh()
  return { error: null, ok: true }
}

/** Notes del grup sobre un restaurant (qualsevol membre). */
export async function saveRestaurantNotes(
  groupId: string,
  restaurantId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const notes = String(formData.get('notes') ?? '').trim()
  if (notes.length > 2000) return { error: ca.errors.name_too_long }
  const supabase = await createClient()
  const { error } = await supabase
    .from('group_restaurant_notes')
    .upsert({ group_id: groupId, restaurant_id: restaurantId, notes }, { onConflict: 'group_id,restaurant_id' })
  if (error) return { error: errorMessage(error) }
  refresh()
  return { error: null, ok: true }
}
