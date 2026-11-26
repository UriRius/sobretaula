import { ChevronRight, DoorOpen, Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Flag } from '@/components/Flag'
import { ButtonLink } from '@/components/ui/Button'
import { Card, SectionTitle, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { formatDayShort, formatScore } from '@/lib/format'
import { getGroup } from '@/lib/queries'
import { getGroupVisits, getScoredVisits, type VisitSummary } from '@/lib/visits'
import { JoinRoomForm } from './JoinRoomForm'

const RECENT = 8

export default function GroupHomePage({ params }: PageProps<'/g/[groupId]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <GroupHome params={params} />
    </Suspense>
  )
}

async function GroupHome({ params }: Pick<PageProps<'/g/[groupId]'>, 'params'>) {
  const { groupId } = await params
  const group = await getGroup(groupId)
  if (!group) notFound()
  const [visits, scored] = await Promise.all([getGroupVisits(groupId), getScoredVisits([groupId])])
  const open = visits.filter((v) => v.status !== 'closed')
  const recent = visits.filter((v) => v.status === 'closed').slice(0, RECENT)
  const totals = new Map(scored.map((v) => [v.id, v.total]))

  return (
    <div className="flex flex-col gap-5">
      {open.map((room) => (
        <OpenRoom key={room.id} room={room} />
      ))}

      <ButtonLink href={`/g/${groupId}/sala/nova`} size="lg" variant={open.length ? 'secondary' : 'primary'} className="w-full">
        <Plus size={22} aria-hidden />
        {ca.home.newRoom}
      </ButtonLink>

      <Card flush>
        <div className="px-4 pt-4">
          <SectionTitle>{ca.home.recentTitle}</SectionTitle>
        </div>
        {recent.length === 0 ? (
          <p className="px-4 pb-5 text-subtle">{ca.home.noVisits}</p>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {recent.map((v) => {
              const total = totals.get(v.id)
              return (
                <li key={v.id}>
                  <Link
                    href={`/g/${groupId}/visites/${v.id}`}
                    className="flex min-h-16 items-center gap-3 px-4 py-2.5 hover:bg-surface-2 active:bg-surface-3"
                  >
                    <Flag code={v.restaurant.cuisineOrigin} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-heading">{v.restaurant.name}</p>
                      <p className="truncate text-sm text-subtle">
                        <time dateTime={v.visitDate} className="tabular">
                          {formatDayShort(v.visitDate)}
                        </time>
                        {v.restaurant.city && ` · ${v.restaurant.city}`}
                      </p>
                    </div>
                    {total !== undefined && total !== null && (
                      <span className="tabular shrink-0 font-display text-2xl font-semibold text-heading">{formatScore(total)}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        <JoinRoomForm />
      </Card>
    </div>
  )
}

function OpenRoom({ room }: { room: VisitSummary }) {
  return (
    <Link
      href={`/s/${room.roomCode}`}
      className="tablecloth block overflow-hidden rounded-card border-2 border-primary shadow-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <div className="flex items-center gap-3 bg-surface/90 p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
          <DoorOpen size={24} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-link">
            {room.status === 'voting' ? ca.home.openRoomVoting : ca.home.openRoomRevealing}
          </p>
          <p className="flex items-center gap-2 truncate font-display text-xl font-semibold text-heading">
            <Flag code={room.restaurant.cuisineOrigin} />
            <span className="truncate">{room.restaurant.name}</span>
          </p>
          <p className="text-sm text-subtle">
            {ca.home.enterRoom} · <span className="tabular font-mono font-semibold tracking-wider">{room.roomCode}</span>
          </p>
        </div>
        <ChevronRight size={22} aria-hidden className="shrink-0 text-label" />
      </div>
    </Link>
  )
}
