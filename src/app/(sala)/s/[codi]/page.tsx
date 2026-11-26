import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Card'
import { getMyProfile } from '@/lib/queries'
import { getRoom } from '@/lib/visits'
import { Room } from './Room'

export const metadata: Metadata = { title: 'Sala' }

const ROOM_CODE = /^[A-Z2-9]{5}$/

export default function RoomPage({ params }: PageProps<'/s/[codi]'>) {
  return (
    <Suspense fallback={<RoomSkeleton />}>
      <RoomLoader params={params} />
    </Suspense>
  )
}

async function RoomLoader({ params }: Pick<PageProps<'/s/[codi]'>, 'params'>) {
  const { codi } = await params
  const code = codi.toUpperCase()
  if (!ROOM_CODE.test(code)) notFound()

  const profile = await getMyProfile()
  if (!profile) redirect(`/benvinguda?next=${encodeURIComponent(`/s/${code}`)}`)

  // Mateixa resposta si no existeix o és d'un grup on no ets.
  const room = await getRoom(code)
  if (!room) notFound()

  return <Room initial={room} />
}

function RoomSkeleton() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <Skeleton className="h-10" />
      <Skeleton className="h-14" />
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="aspect-[5/7]" />
        ))}
      </div>
    </div>
  )
}
