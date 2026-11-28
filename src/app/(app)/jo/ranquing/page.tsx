import type { Metadata } from 'next'
import { Suspense } from 'react'
import { GroupBadge } from '@/components/GroupBadge'
import { RankingList } from '@/components/RankingList'
import { Card, PageTitle, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { requireUser } from '@/lib/auth'
import { getMyGroups } from '@/lib/queries'
import { newestFirst, personalScore, rank } from '@/lib/scoring'
import { getScoredVisits, getVisibleVotes } from '@/lib/visits'

export const metadata: Metadata = { title: 'El meu rànquing' }

// Tots els restaurants que he votat (a tots els meus grups), ordenats per la
// MEVA nota. No exposa res dels altres: només els meus vots.
export default function MyRankingPage() {
  return (
    <>
      <PageTitle subtitle={ca.myRanking.subtitle}>{ca.myRanking.title}</PageTitle>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <MyRanking />
      </Suspense>
    </>
  )
}

async function MyRanking() {
  const [user, groups] = await Promise.all([requireUser(), getMyGroups()])
  const groupIds = groups.map((g) => g.id)
  const [visits, votes] = await Promise.all([getScoredVisits(groupIds), getVisibleVotes(groupIds)])
  const mine = votes.filter((v) => v.userId === user.id)

  const ranked = rank(
    visits,
    (v) => personalScore(mine.filter((vote) => vote.visitId === v.id)),
    newestFirst,
  )

  // Esborrar (mantenint premut): l'amfitrió o un admin d'aquell grup. La RLS ho torna a mirar.
  const canDelete = (groupId: string, hostId: string) =>
    hostId === user.id || groups.some((g) => g.id === groupId && g.role === 'admin')
  const someDeletable = ranked.some(({ item }) => canDelete(item.groupId, item.hostId))

  return (
    <>
      <Card flush>
        {ranked.length === 0 ? (
          <p className="px-4 py-8 text-center text-subtle">{ca.myRanking.empty}</p>
        ) : (
          <RankingList
            rows={ranked.map(({ item, score, position }) => {
              const group = groups.find((g) => g.id === item.groupId)
              return {
                visitId: item.id,
                href: `/g/${item.groupId}/visites/${item.id}`,
                position,
                score,
                name: item.restaurant.name,
                cuisineOrigin: item.restaurant.cuisineOrigin,
                visitDate: item.visitDate,
                city: item.restaurant.city,
                deletable: canDelete(item.groupId, item.hostId),
                extra: group ? (
                  <span className="flex shrink-0 items-center gap-1" title={group.name}>
                    <GroupBadge emoji={group.emoji} color={group.color} size={18} />
                    <span className="sr-only">{group.name}</span>
                  </span>
                ) : null,
              }
            })}
          />
        )}
      </Card>
      {someDeletable && <p className="mt-4 text-center text-xs text-subtle">{ca.ranking.longPressHint}</p>}
    </>
  )
}
