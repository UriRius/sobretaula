import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { createVisit } from '@/app/actions/visits'
import { Card, PageTitle, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { defaultVisitDate, today } from '@/lib/dates'
import { getGroup } from '@/lib/queries'
import { getKnownRestaurants } from '@/lib/visits'
import { NewRoomForm } from './NewRoomForm'

export const metadata: Metadata = { title: 'Nova sala' }

export default function NewRoomPage({ params }: PageProps<'/g/[groupId]/sala/nova'>) {
  return (
    <>
      <PageTitle subtitle={ca.newRoom.subtitle}>{ca.newRoom.title}</PageTitle>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <NewRoom params={params} />
      </Suspense>
    </>
  )
}

async function NewRoom({ params }: Pick<PageProps<'/g/[groupId]/sala/nova'>, 'params'>) {
  const { groupId } = await params
  const [group, restaurants] = await Promise.all([getGroup(groupId), getKnownRestaurants()])
  if (!group) notFound()

  return (
    <Card>
      <NewRoomForm
        action={createVisit.bind(null, groupId)}
        restaurants={restaurants}
        defaultDate={defaultVisitDate()}
        maxDate={today()}
      />
    </Card>
  )
}
