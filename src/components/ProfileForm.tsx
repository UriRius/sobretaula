'use client'

import Image from 'next/image'
import { useActionState, useState } from 'react'
import { saveProfile } from '@/app/actions/profile'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { AVATAR_EMOJIS } from '@/config/groupColors'
import { ca } from '@/i18n/ca'
import { initialActionState } from '@/lib/errors'

export function ProfileForm({
  defaultName,
  photoUrl,
  defaultAvatar,
  next,
  submitLabel = ca.common.save,
}: {
  defaultName: string
  photoUrl: string | null
  defaultAvatar: string
  next?: string
  submitLabel?: string
}) {
  const [state, action, pending] = useActionState(saveProfile, initialActionState)
  const [avatar, setAvatar] = useState(defaultAvatar)
  const options: string[] = [...(photoUrl ? ['photo'] : []), ...AVATAR_EMOJIS]

  return (
    <form action={action} className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="avatar" value={avatar} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-label">{ca.welcome.nameLabel}</span>
        <input
          name="display_name"
          required
          maxLength={40}
          defaultValue={defaultName}
          placeholder={ca.welcome.namePlaceholder}
          autoComplete="nickname"
          className="h-12 rounded-xl border border-line bg-surface px-3 text-lg text-heading placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-label">{ca.welcome.avatarLabel}</legend>
        <div className="grid grid-cols-5 gap-2">
          {options.map((option) => {
            const selected = option === avatar
            return (
              <button
                key={option}
                type="button"
                onClick={() => setAvatar(option)}
                aria-pressed={selected}
                aria-label={option === 'photo' ? ca.welcome.usePhoto : option}
                className={`flex aspect-square items-center justify-center rounded-2xl border-2 text-2xl transition ${
                  selected ? 'border-primary bg-primary-soft' : 'border-line-subtle bg-surface-2 hover:border-line'
                }`}
              >
                {option === 'photo' && photoUrl ? (
                  <Image src={photoUrl} alt="" width={40} height={40} unoptimized referrerPolicy="no-referrer" className="rounded-full" />
                ) : (
                  option
                )}
              </button>
            )
          })}
        </div>
      </fieldset>

      <ErrorText>{state.error}</ErrorText>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? ca.common.saving : submitLabel}
      </Button>
    </form>
  )
}
