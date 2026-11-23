import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ProfileForm } from '@/components/ProfileForm'
import { ButtonLink } from '@/components/ui/Button'
import { Card, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { requireUser } from '@/lib/auth'
import { getMyGroups, getMyProfile } from '@/lib/queries'
import { safeNext } from '@/lib/safeNext'
import { createClient } from '@/lib/supabase/server'
import { InviteCodeForm } from './InviteCodeForm'

export const metadata: Metadata = { title: 'Benvinguda' }

export default function WelcomePage({ searchParams }: PageProps<'/benvinguda'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Welcome searchParams={searchParams} />
    </Suspense>
  )
}

async function Welcome({ searchParams }: Pick<PageProps<'/benvinguda'>, 'searchParams'>) {
  const params = await searchParams
  const next = typeof params.next === 'string' ? safeNext(params.next, '') : ''
  const user = await requireUser()
  const profile = await getMyProfile()

  // Pas 1: com et diuen.
  if (!profile) {
    return (
      <Card className="p-5">
        <h1 className="font-display text-2xl font-semibold text-heading">{ca.welcome.profileTitle}</h1>
        <p className="mb-5 mt-1 text-subtle">{ca.welcome.profileSubtitle}</p>
        <ProfileForm
          defaultName={user.suggestedName ?? ''}
          photoUrl={user.suggestedAvatarUrl}
          defaultAvatar={user.suggestedAvatarUrl ? 'photo' : '🍷'}
          next={next || '/benvinguda'}
          submitLabel={ca.welcome.continue}
        />
      </Card>
    )
  }

  if (next) redirect(next)

  // Pas 2: ja tens grups → cap a dins.
  const groups = await getMyGroups()
  if (groups.length > 0) redirect('/')

  // Sense grups: codi d'invitació, o crear-ne un si pots.
  const supabase = await createClient()
  const { data: canCreate } = await supabase.rpc('can_create_groups')

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <h1 className="font-display text-2xl font-semibold text-heading">{ca.welcome.noGroupTitle}</h1>
        <p className="mb-5 mt-1 text-subtle">{ca.welcome.noGroupText}</p>
        <InviteCodeForm />
      </Card>
      {canCreate && (
        <Card className="p-5">
          <p className="mb-3 font-medium text-heading">{ca.welcome.orCreate}</p>
          <ButtonLink href="/grups/nou" variant="secondary" className="w-full">
            {ca.welcome.createGroup}
          </ButtonLink>
        </Card>
      )}
    </div>
  )
}
