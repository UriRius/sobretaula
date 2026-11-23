'use client'

import { Check, Copy, Link2, Share2, X } from 'lucide-react'
import { useState, useTransition } from 'react'
import { createInvite, revokeInvite } from '@/app/actions/groups'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { formatInstantShort } from '@/lib/format'
import type { Invite } from '@/lib/queries'

export function InviteManager({ groupId, groupName, invites }: { groupId: string; groupName: string; invites: Invite[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3">
      {invites.length === 0 && <p className="text-sm text-subtle">{ca.invites.none}</p>}
      <ul className="flex flex-col gap-2">
        {invites.map((invite) => (
          <InviteRow key={invite.id} invite={invite} groupName={groupName} />
        ))}
      </ul>
      <ErrorText>{error}</ErrorText>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await createInvite(groupId)
            setError('error' in result ? result.error : null)
          })
        }
      >
        <Link2 size={20} aria-hidden />
        {pending ? ca.invites.creating : ca.invites.create}
      </Button>
    </div>
  )
}

function InviteRow({ invite, groupName }: { invite: Invite; groupName: string }) {
  const [copied, setCopied] = useState(false)
  const [revoking, startTransition] = useTransition()
  const link = () => `${window.location.origin}/unir/${invite.code}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(link())
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Sense permís de porta-retalls: el codi és visible i es pot copiar a mà.
    }
  }

  async function share() {
    const url = link()
    if (navigator.share) {
      try {
        await navigator.share({ title: ca.app.name, text: ca.invites.shareText(groupName), url })
        return
      } catch {
        return // l'usuari ha tancat el diàleg
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${ca.invites.shareText(groupName)}: ${url}`)}`, '_blank', 'noopener')
  }

  return (
    <li className="rounded-xl border border-line-subtle bg-surface-2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="tabular font-mono text-lg font-semibold tracking-wider text-heading">{invite.code}</p>
          <p className="text-xs text-subtle">
            {ca.invites.expires(formatInstantShort(invite.expires_at))} · {ca.invites.uses(invite.uses, invite.max_uses)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => startTransition(() => revokeInvite(invite.id))}
          disabled={revoking}
          aria-label={ca.invites.revoke}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-label hover:bg-surface-3"
        >
          <X size={20} aria-hidden />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          {copied ? ca.common.copied : ca.common.copy}
        </Button>
        <Button onClick={share}>
          <Share2 size={18} aria-hidden />
          {ca.common.share}
        </Button>
      </div>
    </li>
  )
}
