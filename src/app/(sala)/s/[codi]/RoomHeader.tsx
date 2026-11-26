'use client'

import { Share2, WifiOff, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Flag } from '@/components/Flag'
import { ca } from '@/i18n/ca'

/** Capçalera de la sala: sortir, on som i el codi per convidar els altres. */
export function RoomHeader({
  restaurant,
  roomCode,
  backHref,
  connected,
  showShare,
}: {
  restaurant: { name: string; cuisineOrigin: string }
  roomCode: string
  backHref: string
  connected: boolean
  showShare: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/s/${roomCode}`
    if (navigator.share) {
      try {
        await navigator.share({ title: ca.app.name, text: ca.room.shareText(restaurant.name), url })
      } catch {
        // l'usuari ha tancat el diàleg
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // sense porta-retalls: el codi és a la vista
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line-subtle bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-2">
        <Link
          href={backHref}
          aria-label={ca.room.close}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-label hover:bg-surface-2"
        >
          <X size={22} aria-hidden />
        </Link>
        <Flag code={restaurant.cuisineOrigin} />
        <h1 className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-heading">{restaurant.name}</h1>
        {!connected && (
          <span role="status" className="flex items-center gap-1 text-xs text-subtle">
            <WifiOff size={14} aria-hidden />
            <span className="sr-only">{ca.room.reconnecting}</span>
          </span>
        )}
        {showShare ? (
          <button
            type="button"
            onClick={share}
            aria-label={`${ca.common.share} · ${ca.room.code} ${roomCode}`}
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 text-heading hover:bg-surface-3"
          >
            <span className="tabular font-mono text-base font-semibold tracking-wider">{copied ? ca.common.copied : roomCode}</span>
            <Share2 size={16} aria-hidden className="text-label" />
          </button>
        ) : (
          <span className="tabular shrink-0 px-2 font-mono text-sm font-semibold tracking-wider text-subtle">{roomCode}</span>
        )}
      </div>
    </header>
  )
}
