import type { Metadata } from 'next'
import { GroupForm } from '@/components/GroupForm'
import { Card, PageTitle } from '@/components/ui/Card'
import { createGroup } from '@/app/actions/groups'
import { ca } from '@/i18n/ca'

export const metadata: Metadata = { title: 'Nou grup' }

export default function NewGroupPage() {
  return (
    <>
      <PageTitle subtitle={ca.group.newSubtitle}>{ca.group.newTitle}</PageTitle>
      <Card>
        <GroupForm action={createGroup} submitLabel={ca.group.create} pendingLabel={ca.group.creating} />
      </Card>
    </>
  )
}
