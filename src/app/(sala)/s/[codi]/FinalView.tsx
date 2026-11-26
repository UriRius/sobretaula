'use client'

import { Home, ListOrdered } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Confetti } from '@/components/Confetti'
import { ButtonLink } from '@/components/ui/Button'
import { Card, SectionTitle } from '@/components/ui/Card'
import { useCountUp } from '@/components/useCountUp'
import { CATEGORIES, type Category } from '@/config/scoring'
import { ca } from '@/i18n/ca'
import { formatMonthName, formatOrdinal, formatScore } from '@/lib/format'
import { periodPositions, scoreVisit, weightedScore, type CategoryScores, type Vote } from '@/lib/scoring'
import { getBrowserClient } from '@/lib/supabase/client'
import type { RoomPerson } from '@/lib/visits'
import { personAvatar } from './people'

type Positions = { month: number | null; year: number | null }

/** La nota final: comptador, posició provisional, notes de cadascú i comentaris. */
export function FinalView({
  visitId,
  groupId,
  visitDate,
  votes,
  votesReady,
  people,
  live,
}: {
  visitId: string
  groupId: string
  visitDate: string
  votes: Vote[]
  votesReady: boolean
  people: RoomPerson[]
  /** La sala s'ha tancat mentre la miràvem (no en tornar-hi després). */
  live: boolean
}) {
  const score = scoreVisit(votesReady ? votes : [])
  const total = votesReady ? score.total : null
  const counter = useCountUp(total)
  const [positions, setPositions] = useState<Positions | null>(null)
  const [comments, setComments] = useState<{ userId: string; body: string }[] | null>(null)

  useEffect(() => {
    let alive = true
    const supabase = getBrowserClient()
    const year = visitDate.slice(0, 4)

    void supabase
      .from('comments')
      .select('user_id, body, created_at')
      .eq('visit_id', visitId)
      .order('created_at')
      .then(({ data }) => {
        if (alive) setComments((data ?? []).map((c) => ({ userId: c.user_id, body: c.body })))
      })

    // Posició provisional: les visites tancades del grup aquell any.
    void (async () => {
      const { data: visits } = await supabase
        .from('visits')
        .select('id, visit_date')
        .eq('group_id', groupId)
        .eq('status', 'closed')
        .gte('visit_date', `${year}-01-01`)
        .lte('visit_date', `${year}-12-31`)
      const ids = (visits ?? []).map((v) => v.id)
      if (!ids.includes(visitId)) ids.push(visitId)
      const { data: stats } = await supabase
        .from('visit_category_stats')
        .select('visit_id, category, average')
        .in('visit_id', ids)
      const averages = new Map<string, CategoryScores>()
      for (const s of stats ?? []) {
        if (!s.visit_id || !s.category || s.average === null) continue
        averages.set(s.visit_id, { ...averages.get(s.visit_id), [s.category]: s.average })
      }
      const dated = [...(visits ?? []), ...(visits?.some((v) => v.id === visitId) ? [] : [{ id: visitId, visit_date: visitDate }])]
      const scored = dated.map((v) => ({
        id: v.id,
        visitDate: v.visit_date,
        total: weightedScore(averages.get(v.id) ?? {}),
      }))
      const me = scored.find((v) => v.id === visitId)
      if (alive && me) setPositions(periodPositions(scored, me))
    })()

    return () => {
      alive = false
    }
  }, [visitId, groupId, visitDate])

  const personal = [...score.personal.entries()]
    .map(([userId, value]) => ({ userId, value, person: people.find((p) => p.id === userId) }))
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
  const firstOfMonth = positions?.month === 1

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 pt-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      {live && firstOfMonth && counter.done && <Confetti />}

      <section className="flex flex-col items-center text-center" aria-live="polite">
        <p className="text-sm font-semibold uppercase tracking-widest text-subtle">{ca.room.finalScore}</p>
        <div className="mt-3 flex h-40 w-40 items-center justify-center rounded-full bg-accent shadow-raised">
          <span className="tabular font-display text-6xl font-semibold text-on-accent">
            {counter.value === null ? '…' : formatScore(counter.value)}
          </span>
        </div>
        {positions && (positions.month || positions.year) && (
          <div className="animate-rise-in mt-4 flex flex-col items-center gap-1">
            {firstOfMonth && <p className="font-display text-xl font-semibold text-heading">{ca.room.firstOfMonth}</p>}
            <p className="text-sm text-subtle">{ca.room.provisional}</p>
            <p className="text-label">
              {[
                positions.month ? ca.room.positionMonth(formatOrdinal(positions.month), formatMonthName(visitDate.slice(0, 7))) : null,
                positions.year ? ca.room.positionYear(formatOrdinal(positions.year), visitDate.slice(0, 4)) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        )}
      </section>

      <Card flush>
        <ul className="divide-y divide-line-subtle">
          {CATEGORIES.map((c: Category) => {
            const stats = score.categories[c]
            return (
              <li key={c} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <span className="flex-1 font-medium text-heading">{ca.categories[c].name}</span>
                {stats?.debate && (
                  <span className="text-sm text-subtle">
                    <span aria-hidden>🔥 </span>
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

      {personal.length > 0 && (
        <Card flush>
          <ul className="divide-y divide-line-subtle">
            {personal.map(({ userId, value, person }) => (
              <li key={userId} className="flex min-h-14 items-center gap-3 px-4 py-2">
                <Avatar profile={personAvatar(person)} size="sm" />
                <span className="flex-1 truncate text-heading">{person?.name ?? '?'}</span>
                <span className="tabular font-display text-xl font-semibold text-label">
                  {value === null ? '–' : formatScore(value)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <SectionTitle>{ca.room.comments}</SectionTitle>
        {comments === null ? null : comments.length === 0 ? (
          <p className="text-subtle">{ca.room.noComments}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => {
              const person = people.find((p) => p.id === c.userId)
              return (
                <li key={c.userId} className="flex gap-3">
                  <Avatar profile={personAvatar(person)} size="sm" />
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

      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href={`/g/${groupId}`} variant="secondary">
          <Home size={20} aria-hidden />
          {ca.room.backHome}
        </ButtonLink>
        <ButtonLink href={`/g/${groupId}/visites/${visitId}`}>
          <ListOrdered size={20} aria-hidden />
          {ca.room.viewDetail}
        </ButtonLink>
      </div>
    </main>
  )
}
