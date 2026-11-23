import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { GroupBadge } from '@/components/GroupBadge'
import { ButtonLink } from '@/components/ui/Button'
import { Card, ErrorText, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { getMyProfile } from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import { JoinButton } from './JoinButton'

export const metadata: Metadata = { title: 'Invitació' }

export default function InvitePage({ params }: PageProps<'/unir/[codi]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-72" />}>
      <Invite params={params} />
    </Suspense>
  )
}

async function Invite({ params }: Pick<PageProps<'/unir/[codi]'>, 'params'>) {
  const { codi } = await params
  const code = codi.toUpperCase()

  // Primer el perfil: un grup sense saber com et dius no serveix.
  const profile = await getMyProfile()
  if (!profile) redirect(`/benvinguda?next=${encodeURIComponent(`/unir/${code}`)}`)

  const supabase = await createClient()
  const { data } = await supabase.rpc('invite_preview', { p_code: code })
  const invite = data?.[0]

  if (!invite) {
    return (
      <Card className="p-5">
        <ErrorText>{ca.invite.notFound}</ErrorText>
        <ButtonLink href="/" variant="secondary" className="mt-4 w-full">
          {ca.notFound.home}
        </ButtonLink>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col items-center p-6 text-center">
      <p className="text-subtle">{ca.invite.title}</p>
      <div className="my-4">
        <GroupBadge emoji={invite.group_emoji} color={invite.group_color} size={88} />
      </div>
      <h1 className="font-display text-3xl font-semibold text-heading">{invite.group_name}</h1>
      <p className="mt-1 text-subtle">{ca.invite.members(invite.member_count)}</p>

      <div className="mt-6 w-full">
        {invite.is_member ? (
          <>
            <p className="mb-3 font-medium text-heading">{ca.invite.alreadyMember}</p>
            <ButtonLink href={`/g/${invite.group_id}`} size="lg" className="w-full">
              {ca.invite.goToGroup}
            </ButtonLink>
          </>
        ) : invite.status === 'expired' ? (
          <ErrorText>{ca.invite.expired}</ErrorText>
        ) : invite.status === 'used_up' ? (
          <ErrorText>{ca.invite.usedUp}</ErrorText>
        ) : (
          <JoinButton code={code} />
        )}
      </div>
    </Card>
  )
}
