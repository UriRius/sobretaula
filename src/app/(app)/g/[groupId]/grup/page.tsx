import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { updateGroup } from '@/app/actions/groups'
import { Avatar } from '@/components/Avatar'
import { GroupForm } from '@/components/GroupForm'
import { ButtonLink } from '@/components/ui/Button'
import { Card, SectionTitle, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { requireUser } from '@/lib/auth'
import { getActiveInvites, getGroup } from '@/lib/queries'
import { InviteManager } from './InviteManager'
import { LeaveGroupButton, MemberActions } from './MemberActions'

export const metadata: Metadata = { title: 'Grup' }

export default function GroupPage({ params }: PageProps<'/g/[groupId]/grup'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <GroupSettings params={params} />
    </Suspense>
  )
}

async function GroupSettings({ params }: Pick<PageProps<'/g/[groupId]/grup'>, 'params'>) {
  const { groupId } = await params
  const [user, group] = await Promise.all([requireUser(), getGroup(groupId)])
  if (!group) notFound()
  const isAdmin = group.role === 'admin'
  const invites = isAdmin ? await getActiveInvites(groupId) : []

  return (
    <div className="flex flex-col gap-5">
      <Card flush>
        <div className="px-4 pt-4">
          <SectionTitle>
            {ca.group.membersTitle} <span className="tabular text-base font-normal text-subtle">· {group.members.length}</span>
          </SectionTitle>
        </div>
        <ul className="divide-y divide-line-subtle">
          {group.members.map((m) => {
            const isMe = m.userId === user.id
            return (
              <li key={m.userId} className="flex min-h-16 items-center gap-3 px-4 py-2">
                <Avatar profile={m.profile} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-heading">
                    {m.profile.display_name}
                    {isMe && <span className="font-normal text-subtle"> ({ca.common.you})</span>}
                  </p>
                  {m.role === 'admin' && (
                    <span className="mt-0.5 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-soft-fg">
                      {ca.group.admin}
                    </span>
                  )}
                </div>
                {isAdmin && !isMe && (
                  <MemberActions groupId={groupId} userId={m.userId} name={m.profile.display_name} role={m.role} />
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      {isAdmin && (
        <Card>
          <SectionTitle>{ca.invites.title}</SectionTitle>
          <p className="-mt-2 mb-4 text-sm text-subtle">{ca.invites.subtitle}</p>
          <InviteManager groupId={groupId} groupName={group.name} invites={invites} />
        </Card>
      )}

      {isAdmin && (
        <Card>
          <SectionTitle>{ca.group.settingsTitle}</SectionTitle>
          <GroupForm
            action={updateGroup.bind(null, groupId)}
            defaults={{ name: group.name, emoji: group.emoji, color: group.color }}
            submitLabel={ca.common.save}
            pendingLabel={ca.common.saving}
          />
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <ButtonLink href="/grups/nou" variant="secondary">
          <Plus size={20} aria-hidden />
          {ca.group.createAnother}
        </ButtonLink>
        <LeaveGroupButton groupId={groupId} />
      </div>
    </div>
  )
}
