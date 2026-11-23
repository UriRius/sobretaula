'use client'

import { useState } from 'react'
import { buttonClass } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { getBrowserClient } from '@/lib/supabase/client'

export function GoogleButton({ next }: { next: string }) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function signIn() {
    setPending(true)
    setFailed(false)
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await getBrowserClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (error) {
      setPending(false)
      setFailed(true)
    }
  }

  return (
    <>
      <button type="button" onClick={signIn} disabled={pending} className={buttonClass('primary', 'lg', 'w-full')}>
        <GoogleMark />
        {pending ? ca.auth.redirecting : ca.auth.google}
      </button>
      {failed && <ErrorText>{ca.auth.oauthFailed}</ErrorText>}
    </>
  )
}

function GoogleMark() {
  return (
    <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
      <svg viewBox="0 0 48 48" width="18" height="18">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
        <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.6 10.7l7.9-6.1z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
      </svg>
    </span>
  )
}
