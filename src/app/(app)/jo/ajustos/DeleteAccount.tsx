'use client'

import { Trash2 } from 'lucide-react'
import { useActionState, useState } from 'react'
import { deleteAccount } from '@/app/actions/account'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { initialActionState } from '@/lib/errors'

/** Zona perillosa: cal escriure la paraula per poder prémer el botó. */
export function DeleteAccount() {
  const [state, action, pending] = useActionState(deleteAccount, initialActionState)
  const [typed, setTyped] = useState('')
  const ready = typed.trim().toLowerCase() === ca.account.confirmWord

  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-label">{ca.account.deleteText}</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-label">{ca.account.confirmLabel}</span>
        <input
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="h-12 rounded-xl border border-line bg-surface px-3 text-lg text-heading focus:border-primary focus:outline-none"
        />
      </label>
      <ErrorText>{state.error}</ErrorText>
      <Button type="submit" variant="danger" disabled={!ready || pending}>
        <Trash2 size={20} aria-hidden />
        {pending ? ca.account.deleting : ca.account.delete}
      </Button>
    </form>
  )
}
