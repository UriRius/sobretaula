'use client'

import { DoorOpen, X } from 'lucide-react'
import { useActionState, useId, useState } from 'react'
import { Flag } from '@/components/Flag'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { CUISINES, type CuisineGroup } from '@/config/cuisines'
import { ca } from '@/i18n/ca'
import { initialActionState, type ActionState } from '@/lib/errors'
import { searchKey } from '@/lib/parse'
import type { Restaurant } from '@/lib/visits'

const GROUPS: CuisineGroup[] = ['catalunya', 'espanya', 'mon', 'sense']
const MAX_SUGGESTIONS = 5

const inputClass =
  'h-12 w-full rounded-xl border border-line bg-surface px-3 text-lg text-heading placeholder:text-muted focus:border-primary focus:outline-none'

export function NewRoomForm({
  action: serverAction,
  restaurants,
  defaultDate,
  maxDate,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  restaurants: Restaurant[]
  defaultDate: string
  maxDate: string
}) {
  const [state, action, pending] = useActionState(serverAction, initialActionState)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<Restaurant | null>(null)
  const [cuisine, setCuisine] = useState('')
  const listId = useId()

  const query = searchKey(name)
  const suggestions =
    picked || query.length === 0
      ? []
      : restaurants.filter((r) => searchKey(`${r.name} ${r.city ?? ''}`).includes(query)).slice(0, MAX_SUGGESTIONS)

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="restaurant_id" value={picked?.id ?? ''} />

      {picked ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
          <Flag code={picked.cuisineOrigin} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-xl font-semibold text-heading">{picked.name}</p>
            {picked.city && <p className="truncate text-sm text-subtle">{picked.city}</p>}
          </div>
          <button
            type="button"
            onClick={() => setPicked(null)}
            aria-label={ca.newRoom.change}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-label hover:bg-surface-3"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="restaurant-name" className="text-sm font-medium text-label">
            {ca.newRoom.restaurantLabel}
          </label>
          <input
            id="restaurant-name"
            name="name"
            required
            maxLength={80}
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={ca.newRoom.restaurantPlaceholder}
            aria-controls={listId}
            aria-autocomplete="list"
            className={inputClass}
          />
          {suggestions.length > 0 && (
            <div className="mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-subtle">{ca.newRoom.suggestions}</p>
              <ul id={listId} role="listbox" className="divide-y divide-line-subtle">
                {suggestions.map((r) => (
                  <li key={r.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onClick={() => setPicked(r)}
                      className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-surface-2"
                    >
                      <Flag code={r.cuisineOrigin} />
                      <span className="min-w-0 flex-1 truncate font-medium text-heading">{r.name}</span>
                      {r.city && <span className="shrink-0 text-sm text-subtle">{r.city}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!picked && (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cuisine" className="text-sm font-medium text-label">
              {ca.newRoom.cuisineLabel}
            </label>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-2">
                {cuisine ? <Flag code={cuisine} /> : null}
              </span>
              <select
                id="cuisine"
                name="cuisine"
                required
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className={`${inputClass} appearance-none ${cuisine ? '' : 'text-muted'}`}
              >
                <option value="" disabled>
                  {ca.newRoom.cuisinePlaceholder}
                </option>
                {GROUPS.map((group) => (
                  <optgroup key={group} label={ca.newRoom.cuisineGroups[group]}>
                    {CUISINES.filter((c) => c.group === group).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <Field label={ca.newRoom.cityLabel} optional>
              <input name="city" maxLength={60} autoComplete="address-level2" className={inputClass} />
            </Field>
            <Field label={ca.newRoom.addressLabel} optional>
              <input name="address" maxLength={160} autoComplete="street-address" className={inputClass} />
            </Field>
          </div>
        </>
      )}

      <div className="grid grid-cols-2 items-end gap-3">
        <Field label={ca.newRoom.dateLabel}>
          <input
            type="date"
            name="visit_date"
            required
            defaultValue={defaultDate}
            max={maxDate}
            className={`${inputClass} text-base`}
          />
        </Field>
        <Field label={ca.newRoom.priceLabel} optional>
          <div className="relative">
            <input
              name="price"
              inputMode="decimal"
              autoComplete="off"
              placeholder={ca.newRoom.pricePlaceholder}
              className={`${inputClass} pr-8`}
            />
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-subtle">
              €
            </span>
          </div>
        </Field>
      </div>

      <ErrorText>{state.error}</ErrorText>
      <Button type="submit" size="lg" disabled={pending}>
        <DoorOpen size={22} aria-hidden />
        {pending ? ca.newRoom.creating : ca.newRoom.create}
      </Button>
    </form>
  )
}

function Field({ label, optional = false, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-sm font-medium text-label">
        {label}
        {optional && <span className="font-normal text-subtle"> · {ca.newRoom.optional}</span>}
      </span>
      {children}
    </label>
  )
}
