'use client'

import { EllipsisVertical, LogOut } from 'lucide-react'
import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { leaveGroup, removeMember, setMemberRole } from '@/app/actions/groups'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { initialActionState } from '@/lib/errors'

export function MemberActions({
  groupId,
  userId,
  name,
  role,
}: {
  groupId: string
  userId: string
  name: string
  role: 'admin' | 'member'
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Opcions per a ${name}`}
        disabled={pending}
        className="flex h-11 w-11 items-center justify-center rounded-full text-label hover:bg-surface-2"
      >
        <EllipsisVertical size={20} aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface shadow-raised">
          <button
            type="button"
            className="block min-h-12 w-full px-4 text-left text-heading hover:bg-surface-2"
            onClick={() => {
              setOpen(false)
              startTransition(() => setMemberRole(groupId, userId, role === 'admin' ? 'member' : 'admin'))
            }}
          >
            {role === 'admin' ? ca.group.removeAdmin : ca.group.makeAdmin}
          </button>
          <button
            type="button"
            className="block min-h-12 w-full border-t border-line-subtle px-4 text-left text-primary-soft-fg hover:bg-primary-soft"
            onClick={() => {
              setOpen(false)
              if (window.confirm(ca.group.confirmRemove(name))) {
                startTransition(() => removeMember(groupId, userId))
              }
            }}
          >
            {ca.group.remove}
          </button>
        </div>
      )}
    </div>
  )
}

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState(() => leaveGroup(groupId), initialActionState)
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(ca.group.confirmLeave)) e.preventDefault()
      }}
      className="flex flex-col gap-2"
    >
      <ErrorText>{state.error}</ErrorText>
      <Button type="submit" variant="danger" disabled={pending}>
        <LogOut size={20} aria-hidden />
        {ca.group.leave}
      </Button>
    </form>
  )
}
