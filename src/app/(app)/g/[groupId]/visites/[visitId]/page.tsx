import { DoorOpen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { saveRestaurantNotes } from '@/app/actions/visits'
import { Avatar } from '@/components/Avatar'
import { BackButton } from '@/components/BackButton'
import { Flag } from '@/components/Flag'
import { GroupBadge } from '@/components/GroupBadge'
import { ButtonLink } from '@/components/ui/Button'
import { Card, SectionTitle, Skeleton } from '@/components/ui/Card'
import { CATEGORIES } from '@/config/scoring'
import { cuisineName } from '@/config/cuisines'
import { ca } from '@/i18n/ca'
import { formatDayLong, formatDayShort, formatEuros, formatMonthName, formatOrdinal, formatScore } from '@/lib/format'
import { getGroup } from '@/lib/queries'
import { periodPositions, scoreVisit, type Vote } from '@/lib/scoring'
import { getVisitDetail, type RoomPerson } from '@/lib/visits'
import { NotesForm } from './NotesForm'

export const metadata: Metadata = { title: 'Visita' }

export default function VisitPage({ params }: PageProps<'/g/[groupId]/visites/[visitId]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem]" />}>
      <VisitDetailView params={params} />
    </Suspense>
  )
}

async function VisitDetailView({ params }: Pick<PageProps<'/g/[groupId]/visites/[visitId]'>, 'params'>) {
  const { groupId, visitId } = await params
  const group = await getGroup(groupId)
  if (!group) notFound()
  const detail = await getVisitDetail(groupId, visitId)
  if (!detail) notFound()

  const { visit, scored, groupVisits, votes, comments, notes, people } = detail
  const r = visit.restaurant
  const host = people.find((p) => p.id === visit.hostId)
  const positions = scored ? periodPositions(groupVisits, scored) : null
  const others = groupVisits
    .filter((v) => v.restaurant.id === r.id)
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
  const ranking = `/g/${groupId}/ranquing`

  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback={ranking} />

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Flag code={r.cuisineOrigin} size="lg" />
          <h1 className="min-w-0 font-display text-3xl font-semibold leading-tight text-heading">{r.name}</h1>
        </div>
        <p className="text-subtle">
          {[cuisineName(r.cuisineOrigin), r.city, r.address].filter(Boolean).join(' · ')}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-label">
          <time dateTime={visit.visitDate}>{formatDayLong(visit.visitDate)}</time>
          {visit.pricePerPerson !== null && <span>· {ca.visit.price(formatEuros(visit.pricePerPerson))}</span>}
        </p>
        <p className="flex items-center gap-2 text-sm text-subtle">
          <GroupBadge emoji={group.emoji} color={group.color} size={24} />
          <span>{group.name}</span>
          {host && <span>· {ca.visit.host(host.name)}</span>}
        </p>
      </header>

      {visit.status !== 'closed' && (
        <Card className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-heading">{ca.visit.inProgress}</p>
          <ButtonLink href={`/s/${visit.roomCode}`}>
            <DoorOpen size={20} aria-hidden />
            {ca.visit.goToRoom}
          </ButtonLink>
        </Card>
      )}

      {scored && scored.total !== null && (
        <section className="flex items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-accent shadow-raised">
            <span className="tabular font-display text-4xl font-semibold text-on-accent">{formatScore(scored.total)}</span>
          </div>
          {positions && (
            <div className="flex flex-col gap-1">
              <p className="text-sm text-subtle">{ca.visit.positions}</p>
              {positions.month && (
                <Link
                  href={`${ranking}?vista=mensual&mes=${visit.visitDate.slice(0, 7)}`}
                  className="font-medium text-link underline-offset-4 hover:underline"
                >
                  {ca.visit.positionMonth(formatOrdinal(positions.month), formatMonthName(visit.visitDate.slice(0, 7)))}
                </Link>
              )}
              {positions.year && (
                <Link
                  href={`${ranking}?vista=anual&any=${visit.visitDate.slice(0, 4)}`}
                  className="font-medium text-link underline-offset-4 hover:underline"
                >
                  {ca.visit.positionYear(formatOrdinal(positions.year), visit.visitDate.slice(0, 4))}
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      {scored && (
        <Card flush>
          <div className="px-4 pt-4">
            <SectionTitle>{ca.visit.categoriesTitle}</SectionTitle>
          </div>
          <ul className="divide-y divide-line-subtle">
            {CATEGORIES.map((c) => {
              const stats = scored.categories[c]
              return (
                <li key={c} className="flex min-h-14 items-center gap-3 px-4 py-2">
                  <span className="flex-1 font-medium text-heading">{ca.categories[c].name}</span>
                  {stats && (
                    <span className="text-sm text-subtle">
                      {stats.debate && <span aria-label={ca.room.debate}>🔥 </span>}
                      {ca.room.range(stats.min, stats.max)}
                    </span>
                  )}
                  <span className="tabular w-12 text-right font-display text-2xl font-semibold text-heading">
                    {stats ? formatScore(stats.average) : '–'}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {scored && votes.length > 0 && <VotesTable votes={votes} people={people} />}

      {scored && (
        <Card>
          <SectionTitle>{ca.visit.commentsTitle}</SectionTitle>
          {comments.length === 0 ? (
            <p className="text-subtle">{ca.visit.noComments}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {comments.map((c) => {
                const person = people.find((p) => p.id === c.userId)
                return (
                  <li key={c.userId} className="flex gap-3">
                    <Avatar profile={avatarOf(person)} size="sm" />
                    <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm bg-surface-2 px-3 py-2">
                      <p className="text-xs font-semibold text-label">{person?.name ?? '?'}</p>
                      <p className="text-body">{c.body}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <SectionTitle>{ca.visit.notesTitle}</SectionTitle>
        <p className="-mt-2 mb-3 text-sm text-subtle">{ca.visit.notesHint}</p>
        <NotesForm action={saveRestaurantNotes.bind(null, groupId, r.id)} initial={notes} />
      </Card>

      {others.length > 1 && (
        <Card flush>
          <div className="px-4 pt-4">
            <SectionTitle>{ca.visit.otherVisits}</SectionTitle>
          </div>
          <ul className="divide-y divide-line-subtle">
            {others.map((v) => {
              const current = v.id === visit.id
              const row = (
                <>
                  <time dateTime={v.visitDate} className="tabular flex-1 text-heading">
                    {formatDayShort(v.visitDate)}
                    {current && <span className="text-subtle"> · {ca.visit.thisVisit}</span>}
                  </time>
                  <span className="tabular font-display text-xl font-semibold text-heading">
                    {v.total === null ? '–' : formatScore(v.total)}
                  </span>
                </>
              )
              return (
                <li key={v.id}>
                  {current ? (
                    <div className="flex min-h-14 items-center gap-3 bg-surface-2 px-4 py-2">{row}</div>
                  ) : (
                    <Link href={`/g/${groupId}/visites/${v.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-2">
                      {row}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

function avatarOf(person: RoomPerson | undefined) {
  return { display_name: person?.name ?? '?', avatar_url: person?.avatarUrl ?? null, avatar_emoji: person?.avatarEmoji ?? null }
}

/** Cada participant, els seus 4 vots i la seva nota ponderada. */
function VotesTable({ votes, people }: { votes: Vote[]; people: RoomPerson[] }) {
  const { personal } = scoreVisit(votes)
  const rows = [...personal.entries()]
    .map(([userId, score]) => ({ userId, score, person: people.find((p) => p.id === userId) }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))

  return (
    <Card flush>
      <div className="px-4 pt-4">
        <SectionTitle>{ca.visit.votesTitle}</SectionTitle>
      </div>
      <table className="w-full table-fixed">
        <thead>
          <tr className="text-xs font-semibold text-subtle">
            <th scope="col" className="px-4 pb-2 text-left font-semibold">
              <span className="sr-only">{ca.nav.profile}</span>
            </th>
            {CATEGORIES.map((c) => (
              <th key={c} scope="col" className="w-9 pb-2 text-center font-semibold" title={ca.categories[c].name}>
                <span aria-hidden>{ca.categories[c].name.slice(0, 1)}</span>
                <span className="sr-only">{ca.categories[c].name}</span>
              </th>
            ))}
            <th scope="col" className="w-16 pr-4 pb-2 text-right font-semibold">
              {ca.visit.personal}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-subtle border-t border-line-subtle">
          {rows.map(({ userId, score, person }) => (
            <tr key={userId}>
              <th scope="row" className="px-4 py-2 text-left font-normal">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar profile={avatarOf(person)} size="sm" />
                  <span className="truncate text-heading">{person?.name ?? '?'}</span>
                </span>
              </th>
              {CATEGORIES.map((c) => (
                <td key={c} className="tabular py-2 text-center text-label">
                  {votes.find((v) => v.userId === userId && v.category === c)?.value ?? '–'}
                </td>
              ))}
              <td className="tabular pr-4 py-2 text-right font-display text-lg font-semibold text-heading">
                {score === null ? <span title={ca.visit.incomplete}>–</span> : formatScore(score)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
