'use client'

import { ArrowRight, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { FlipCard } from '@/components/PlayingCard'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { CATEGORIES } from '@/config/scoring'
import { ca } from '@/i18n/ca'
import { formatScore } from '@/lib/format'
import { categoryStats, type Vote } from '@/lib/scoring'
import type { RoomParticipant, RoomPerson } from '@/lib/visits'
import { personAvatar } from './people'

const STAGGER_MS = 140
const FLIP_MS = 700

/**
 * Una categoria revelada. Es munta de nou a cada pas (key): les cartes surten
 * de cara avall i es giren quan arriben els vots d'aquesta categoria.
 */
export function RevealView({
  step,
  votes,
  votesReady,
  people,
  participants,
  canAdvance,
  advancing,
  hostName,
  error,
  onNext,
}: {
  step: number
  votes: Vote[]
  votesReady: boolean
  people: RoomPerson[]
  participants: RoomParticipant[]
  canAdvance: boolean
  advancing: boolean
  hostName: string
  error: string | null
  onNext: () => void
}) {
  const category = CATEGORIES[step]
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!votesReady) return
    const timer = setTimeout(() => setShown(true), 250)
    return () => clearTimeout(timer)
  }, [votesReady])

  const inCategory = votes.filter((v) => v.category === category)
  const stats = categoryStats(inCategory.map((v) => v.value))
  // Qui hi és: els participants, i també qui hagi votat sense constar-hi.
  const seats = participants.map((p) => p.userId)
  for (const v of inCategory) if (!seats.includes(v.userId)) seats.push(v.userId)
  const columns = seats.length <= 4 ? Math.max(seats.length, 2) : 3
  const averageDelay = seats.length * STAGGER_MS + FLIP_MS
  const last = step === CATEGORIES.length - 1

  return (
    <>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <ol className="mb-5 grid grid-cols-4 gap-1.5" aria-label={ca.room.step(step + 1, CATEGORIES.length)}>
          {CATEGORIES.map((c, i) => {
            const done = i < step
            const current = i === step
            const average = done ? categoryStats(votes.filter((v) => v.category === c).map((v) => v.value))?.average : undefined
            return (
              <li
                key={c}
                aria-current={current ? 'step' : undefined}
                className={`flex h-12 flex-col items-center justify-center rounded-xl border text-xs ${
                  current
                    ? 'border-primary bg-primary-soft font-semibold text-primary-soft-fg'
                    : done
                      ? 'border-line bg-surface text-label'
                      : 'border-dashed border-line text-subtle'
                }`}
              >
                <span>{ca.categories[c].name}</span>
                {average !== undefined && <span className="tabular font-display text-sm text-heading">{formatScore(average)}</span>}
              </li>
            )
          })}
        </ol>

        <div className="mb-5 text-center">
          <h2 className="font-display text-4xl font-semibold text-heading">{ca.categories[category].name}</h2>
          <p className="mt-1 text-subtle">{ca.categories[category].hint}</p>
        </div>

        <ul className="mx-auto grid w-full gap-x-3 gap-y-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {seats.map((userId, i) => {
            const person = people.find((p) => p.id === userId)
            const vote = inCategory.find((v) => v.userId === userId)
            return (
              <li key={userId} className="flex flex-col items-center gap-2">
                <FlipCard
                  value={shown && vote ? vote.value : null}
                  dim={shown && !vote}
                  delayMs={i * STAGGER_MS}
                  className="w-full max-w-[104px]"
                />
                <span className="flex max-w-full items-center gap-1.5">
                  <Avatar profile={personAvatar(person)} size="sm" />
                  <span className="truncate text-sm text-label">{person?.name ?? '?'}</span>
                </span>
                {shown && !vote && <span className="-mt-1 text-xs text-subtle">{ca.room.didNotVote}</span>}
              </li>
            )
          })}
        </ul>

        {shown && stats && (
          <div
            className="animate-rise-in mt-8 flex flex-col items-center gap-2 text-center"
            style={{ animationDelay: `${averageDelay}ms` }}
          >
            <p className="tabular font-display text-6xl font-semibold leading-none text-heading">{formatScore(stats.average)}</p>
            <p className="text-sm uppercase tracking-wide text-subtle">{ca.room.average}</p>
            <p className="flex flex-wrap items-center justify-center gap-2 text-label">
              {stats.debate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-sm font-semibold text-primary-soft-fg">
                  <span aria-hidden>🔥</span>
                  {ca.room.debate}
                </span>
              )}
              <span>{ca.room.range(stats.min, stats.max)}</span>
            </p>
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-subtle bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg flex-col gap-2 px-4 py-3">
          <ErrorText>{error}</ErrorText>
          {canAdvance ? (
            <Button size="lg" className="w-full" onClick={onNext} disabled={advancing}>
              {last ? <Trophy size={22} aria-hidden /> : null}
              {last ? ca.room.toFinal : ca.room.next}
              {last ? null : <ArrowRight size={22} aria-hidden />}
            </Button>
          ) : (
            <p className="py-2 text-center text-subtle">{ca.room.waitingNext(hostName)}</p>
          )}
        </div>
      </div>
    </>
  )
}

