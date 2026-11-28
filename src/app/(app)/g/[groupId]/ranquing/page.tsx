import { ChevronLeft, ChevronRight, UserRound } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { RankingList } from '@/components/RankingList'
import { Card, PageTitle, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { requireUser } from '@/lib/auth'
import { currentMonth, isMonth, isYear, shiftMonth } from '@/lib/dates'
import { formatMonth } from '@/lib/format'
import { getGroup } from '@/lib/queries'
import { rankPeriod } from '@/lib/scoring'
import { getScoredVisits } from '@/lib/visits'

export const metadata: Metadata = { title: 'Rànquing' }

const VIEWS = ['mensual', 'anual', 'historic'] as const
type View = (typeof VIEWS)[number]

// L'estat (pestanya, mes, any) viu a l'adreça: en tornar del detall, el
// rànquing és on era (i Activity en conserva l'scroll).
export default function RankingPage({ params, searchParams }: PageProps<'/g/[groupId]/ranquing'>) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <PageTitle>{ca.ranking.title}</PageTitle>
        <Link
          href="/jo/ranquing"
          className="mt-1 flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-link hover:bg-surface-2"
        >
          <UserRound size={18} aria-hidden />
          {ca.ranking.mine}
        </Link>
      </div>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Ranking params={params} searchParams={searchParams} />
      </Suspense>
    </>
  )
}

async function Ranking({ params, searchParams }: PageProps<'/g/[groupId]/ranquing'>) {
  const [{ groupId }, query, user] = await Promise.all([params, searchParams, requireUser()])
  const group = await getGroup(groupId)
  if (!group) notFound()

  const view: View = VIEWS.includes(query.vista as View) ? (query.vista as View) : 'mensual'
  const thisMonth = currentMonth()
  const month = isMonth(query.mes) ? query.mes : thisMonth
  const year = isYear(query.any) ? query.any : month.slice(0, 4)
  const period = view === 'mensual' ? month : view === 'anual' ? year : null

  const visits = await getScoredVisits([groupId])
  const ranked = rankPeriod(visits, period)
  // Esborrar (mantenint premut): l'amfitrió o un admin. La RLS ho torna a mirar.
  const canDelete = (hostId: string) => group.role === 'admin' || hostId === user.id
  const someDeletable = ranked.some(({ item }) => canDelete(item.hostId))

  const base = `/g/${groupId}/ranquing`
  const hrefFor = (v: View, value?: string) =>
    v === 'mensual' ? `${base}?vista=mensual&mes=${value ?? month}` : v === 'anual' ? `${base}?vista=anual&any=${value ?? year}` : `${base}?vista=historic`

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={ca.ranking.title} className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {VIEWS.map((v) => (
          <Link
            key={v}
            href={hrefFor(v)}
            replace
            aria-current={v === view ? 'page' : undefined}
            className={`flex h-11 items-center justify-center rounded-lg text-sm font-semibold ${
              v === view ? 'bg-surface text-heading shadow-card' : 'text-subtle hover:text-heading'
            }`}
          >
            {ca.ranking.views[v]}
          </Link>
        ))}
      </nav>

      {view !== 'historic' && (
        <div className="flex items-center justify-between gap-2">
          <PeriodLink
            href={view === 'mensual' ? hrefFor('mensual', shiftMonth(month, -1)) : hrefFor('anual', String(Number(year) - 1))}
            label={ca.ranking.previous}
            direction="previous"
          />
          <p className="font-display text-xl font-semibold text-heading first-letter:uppercase">{view === 'mensual' ? formatMonth(month) : year}</p>
          <PeriodLink
            href={view === 'mensual' ? hrefFor('mensual', shiftMonth(month, 1)) : hrefFor('anual', String(Number(year) + 1))}
            label={ca.ranking.next}
            direction="next"
            disabled={view === 'mensual' ? month >= thisMonth : year >= thisMonth.slice(0, 4)}
          />
        </div>
      )}

      <Card flush>
        {ranked.length === 0 ? (
          <p className="px-4 py-8 text-center text-subtle">
            {view === 'mensual'
              ? ca.ranking.emptyMonth(formatMonth(month))
              : view === 'anual'
                ? ca.ranking.emptyYear(year)
                : ca.ranking.emptyAll}
          </p>
        ) : (
          <RankingList
            rows={ranked.map(({ item, score, position }) => ({
              visitId: item.id,
              href: `/g/${groupId}/visites/${item.id}`,
              position,
              score,
              name: item.restaurant.name,
              cuisineOrigin: item.restaurant.cuisineOrigin,
              visitDate: item.visitDate,
              city: item.restaurant.city,
              deletable: canDelete(item.hostId),
            }))}
          />
        )}
      </Card>
      {ranked.length > 0 && (
        <div className="text-center text-sm text-subtle">
          <p>{ca.ranking.visits(ranked.length)}</p>
          {someDeletable && <p className="mt-1 text-xs">{ca.ranking.longPressHint}</p>}
        </div>
      )}
    </div>
  )
}

function PeriodLink({
  href,
  label,
  direction,
  disabled = false,
}: {
  href: string
  label: string
  direction: 'previous' | 'next'
  disabled?: boolean
}) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight
  const className = 'flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-label'
  if (disabled) {
    return (
      <span aria-hidden className={`${className} opacity-40`}>
        <Icon size={22} />
      </span>
    )
  }
  return (
    <Link href={href} replace aria-label={label} className={`${className} hover:bg-surface-2`}>
      <Icon size={22} aria-hidden />
    </Link>
  )
}
