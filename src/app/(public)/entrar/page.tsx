import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { devSignIn } from '@/app/actions/auth'
import { Logo } from '@/components/Logo'
import { ErrorText } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { safeNext } from '@/lib/safeNext'
import { IS_LOCAL_SUPABASE } from '@/lib/supabase/env'
import { GoogleButton } from './GoogleButton'

export const metadata: Metadata = { title: 'Entra' }

export default function SignInPage({ searchParams }: PageProps<'/entrar'>) {
  return (
    <main className="tablecloth flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-card border border-line-subtle bg-surface p-6 shadow-raised">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-4 font-display text-3xl font-semibold text-heading">{ca.app.name}</h1>
          <p className="mt-1 text-subtle">{ca.app.tagline}</p>
          <p className="mt-3 text-sm text-label">{ca.app.description}</p>
        </div>
        <Suspense fallback={<GoogleButton next="/" />}>
          <SignInForm searchParams={searchParams} />
        </Suspense>
      </div>
      {/* Aquesta pantalla és la «pàgina principal» que veu Google: ha d'enllaçar la privacitat. */}
      <Link href="/privacitat" className="mt-6 rounded-lg bg-surface/80 px-3 py-2 text-sm font-medium text-link underline-offset-4 hover:underline">
        {ca.legal.privacy}
      </Link>
    </main>
  )
}

async function SignInForm({ searchParams }: Pick<PageProps<'/entrar'>, 'searchParams'>) {
  const params = await searchParams
  const next = safeNext(typeof params.next === 'string' ? params.next : null)
  const failed = params.error === 'oauth'
  const deleted = params.compte === 'esborrat'

  return (
    <div className="flex flex-col gap-4">
      {failed && <ErrorText>{ca.auth.oauthFailed}</ErrorText>}
      {deleted && (
        <p role="status" className="rounded-xl bg-surface-2 px-3 py-2 text-center text-sm text-label">
          {ca.account.deleted}
        </p>
      )}
      <GoogleButton next={next} />
      <p className="text-center text-sm text-subtle">{ca.auth.subtitle}</p>

      {IS_LOCAL_SUPABASE && (
        <div className="mt-2 border-t border-dashed border-line pt-4">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">{ca.auth.devTitle}</p>
          <div className="grid grid-cols-3 gap-2">
            {['oriol', 'piti', 'mario', 'joel', 'laia'].map((user) => (
              <form key={user} action={devSignIn.bind(null, user, next)}>
                <button className="h-11 w-full rounded-lg border border-line bg-surface-2 text-sm font-medium capitalize text-heading hover:bg-surface-3">
                  {user}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
