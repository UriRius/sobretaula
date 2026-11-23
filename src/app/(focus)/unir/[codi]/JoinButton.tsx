'use client'

import { useActionState } from 'react'
import { acceptInvite } from '@/app/actions/groups'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { initialActionState } from '@/lib/errors'

/** El pas de consentiment: entrar al grup és una decisió de la persona convidada. */
export function JoinButton({ code }: { code: string }) {
  const [state, action, pending] = useActionState(() => acceptInvite(code), initialActionState)
  return (
    <form action={action} className="flex flex-col gap-3">
      <ErrorText>{state.error}</ErrorText>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? ca.invite.joining : ca.invite.join}
      </Button>
    </form>
  )
}
