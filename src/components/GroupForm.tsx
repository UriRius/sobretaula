'use client'

import { Check } from 'lucide-react'
import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { GROUP_COLORS, GROUP_COLOR_KEYS, GROUP_EMOJIS, type GroupColor } from '@/config/groupColors'
import { ca } from '@/i18n/ca'
import { initialActionState, type ActionState } from '@/lib/errors'
import { GroupBadge } from './GroupBadge'

export function GroupForm({
  action: serverAction,
  defaults = { name: '', emoji: '🍻', color: 'tomaquet' },
  submitLabel,
  pendingLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  defaults?: { name: string; emoji: string; color: GroupColor }
  submitLabel: string
  pendingLabel: string
}) {
  const [state, action, pending] = useActionState(serverAction, initialActionState)
  const [emoji, setEmoji] = useState(defaults.emoji)
  const [color, setColor] = useState<GroupColor>(defaults.color)
  const [name, setName] = useState(defaults.name)

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="emoji" value={emoji} />
      <input type="hidden" name="color" value={color} />

      <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3">
        <GroupBadge emoji={emoji} color={color} size={48} />
        <span className="truncate font-display text-xl font-semibold text-heading">{name || ca.group.namePlaceholder}</span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-label">{ca.group.nameLabel}</span>
        <input
          name="name"
          required
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={ca.group.namePlaceholder}
          className="h-12 rounded-xl border border-line bg-surface px-3 text-lg text-heading placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-label">{ca.group.emojiLabel}</legend>
        <div className="grid grid-cols-6 gap-2">
          {GROUP_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              aria-pressed={e === emoji}
              className={`flex aspect-square items-center justify-center rounded-xl border-2 text-2xl ${
                e === emoji ? 'border-primary bg-primary-soft' : 'border-line-subtle bg-surface-2'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-label">{ca.group.colorLabel}</legend>
        <div className="grid grid-cols-8 gap-2">
          {GROUP_COLOR_KEYS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-pressed={c === color}
              aria-label={GROUP_COLORS[c].label}
              className="flex aspect-square min-h-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface"
              style={{
                background: GROUP_COLORS[c].cssVar,
                boxShadow: c === color ? `0 0 0 3px var(--surface), 0 0 0 5px ${GROUP_COLORS[c].cssVar}` : undefined,
              }}
            >
              {c === color && <Check size={18} strokeWidth={3} className="text-white" aria-hidden />}
            </button>
          ))}
        </div>
      </fieldset>

      <ErrorText>{state.error}</ErrorText>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  )
}
