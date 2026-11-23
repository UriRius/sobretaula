'use client'

import { useActionState } from 'react'
import { goToInvite } from '@/app/actions/profile'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { initialActionState } from '@/lib/errors'

export function InviteCodeForm() {
  const [state, action, pending] = useActionState(goToInvite, initialActionState)
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-label">{ca.welcome.codeLabel}</span>
        <input
          name="code"
          required
          autoComplete="off"
          autoCapitalize="characters"
          placeholder={ca.welcome.codePlaceholder}
          className="h-12 rounded-xl border border-line bg-surface px-3 text-lg tracking-wider text-heading placeholder:text-muted placeholder:tracking-normal focus:border-primary focus:outline-none"
        />
      </label>
      <ErrorText>{state.error}</ErrorText>
      <Button type="submit" disabled={pending}>
        {ca.welcome.useCode}
      </Button>
    </form>
  )
}
