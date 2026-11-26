'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ca } from '@/i18n/ca'
import { parseRoomCode } from '@/lib/parse'

/** Entrar a una sala amb el codi (o enganxant-ne l'enllaç). */
export function JoinRoomForm() {
  const router = useRouter()
  const [value, setValue] = useState('')
  const code = parseRoomCode(value)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!code) return
        setValue('')
        router.push(`/s/${code}`)
      }}
      className="flex flex-col gap-2"
    >
      <label htmlFor="room-code" className="text-sm font-medium text-label">
        {ca.home.joinTitle}
      </label>
      <div className="flex gap-2">
        <input
          id="room-code"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={ca.home.joinPlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="tabular h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 font-mono text-lg uppercase tracking-widest text-heading placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <Button type="submit" variant="secondary" disabled={!code}>
          {ca.home.join}
        </Button>
      </div>
    </form>
  )
}
