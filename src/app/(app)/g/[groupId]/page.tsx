import { Plus } from 'lucide-react'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Flag } from '@/components/Flag'
import { Button } from '@/components/ui/Button'
import { Card, SectionTitle, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { formatDayShort } from '@/lib/format'
import { getGroup, getRecentVisits } from '@/lib/queries'

export default function GroupHomePage({ params }: PageProps<'/g/[groupId]'>) {
  return (
    <div className="flex flex-col gap-5">
      {/* La sala de votació arriba a la Fase 2. */}
      <div>
        <Button size="lg" className="w-full" disabled aria-describedby="new-room-soon">
          <Plus size={22} aria-hidden />
          {ca.home.newRoom}
        </Button>
        <p id="new-room-soon" className="mt-2 text-center text-sm text-subtle">
          {ca.home.newRoomSoon}
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-72" />}>
        <RecentVisits params={params} />
      </Suspense>
    </div>
  )
}

async function RecentVisits({ params }: Pick<PageProps<'/g/[groupId]'>, 'params'>) {
  const { groupId } = await params
  const group = await getGroup(groupId)
  if (!group) notFound()
  const visits = await getRecentVisits(groupId)

  return (
    <Card flush>
      <div className="px-4 pt-4">
        <SectionTitle>{ca.home.recentTitle}</SectionTitle>
      </div>
      {visits.length === 0 ? (
        <p className="px-4 pb-5 text-subtle">{ca.home.noVisits}</p>
      ) : (
        <ul className="divide-y divide-line-subtle">
          {visits.map((v) => (
            <li key={v.id} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
              <Flag code={v.restaurant.cuisineOrigin} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-heading">{v.restaurant.name}</p>
                {v.restaurant.city && <p className="truncate text-sm text-subtle">{v.restaurant.city}</p>}
              </div>
              <time dateTime={v.visitDate} className="tabular shrink-0 text-sm text-label">
                {formatDayShort(v.visitDate)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
