import { Settings } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Avatar } from '@/components/Avatar'
import { Flag } from '@/components/Flag'
import { GroupBadge } from '@/components/GroupBadge'
import { Card, SectionTitle } from '@/components/ui/Card'
import { CATEGORIES } from '@/config/scoring'
import { ca } from '@/i18n/ca'
import { formatDayShort, formatInstantShort, formatScore, formatSignedScore } from '@/lib/format'
import type { ProfileData } from '@/lib/profile'
import { MIN_VISITS_FOR_EXIGENCY } from '@/config/scoring'
import type { HistoryEntry } from '@/lib/scoring'
import type { VisitWithVotes } from '@/lib/visits'

/** El perfil d'una persona (o el meu), dins del context triat. */
export function ProfileView({ data, basePath }: { data: ProfileData; basePath: string }) {
  const { person, isMe, groups, selected, stats, exigencyPosition } = data
  const groupOf = (id: string) => groups.find((g) => g.id === id)

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center gap-4">
        <Avatar profile={{ display_name: person.name, avatar_url: person.avatarUrl, avatar_emoji: person.avatarEmoji }} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-3xl font-semibold leading-tight text-heading">{person.name}</h1>
          <p className="text-sm text-subtle">{ca.profile.since(formatInstantShort(person.createdAt))}</p>
        </div>
        {isMe && (
          <Link
            href="/jo/ajustos"
            aria-label={ca.profile.settings}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-label hover:bg-surface-2"
          >
            <Settings size={20} aria-hidden />
          </Link>
        )}
      </header>

      {groups.length > 1 && (
        <nav aria-label={ca.profile.contextLabel} className="-mx-4 overflow-x-auto px-4">
          <ul className="flex gap-2">
            <ContextChip href={basePath} active={selected === null}>
              {ca.profile.allGroups}
            </ContextChip>
            {groups.map((g) => (
              <ContextChip key={g.id} href={`${basePath}?grup=${g.id}`} active={selected?.id === g.id}>
                <GroupBadge emoji={g.emoji} color={g.color} size={22} />
                {g.name}
              </ContextChip>
            ))}
          </ul>
        </nav>
      )}

      {stats.visits === 0 ? (
        <Card className="py-8 text-center text-subtle">{isMe ? ca.profile.noVotesMine : ca.profile.noVotesOther}</Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Tile label={ca.profile.restaurants} value={String(stats.restaurants)} />
            <Tile label={ca.profile.visits} value={String(stats.visits)} />
            <Tile label={ca.profile.average} value={stats.average === null ? '–' : formatScore(stats.average)} />
            <Tile
              label={ca.profile.exigency}
              value={stats.exigency.value === null ? '–' : formatSignedScore(stats.exigency.value)}
              note={
                stats.exigency.value === null
                  ? ca.profile.exigencyNeeds(MIN_VISITS_FOR_EXIGENCY)
                  : exigencyNote(stats.exigency.value, exigencyPosition)
              }
            />
          </div>

          <Card>
            <SectionTitle>{ca.profile.byCategory}</SectionTitle>
            <ul className="flex flex-col gap-3">
              {CATEGORIES.map((c) => {
                const avg = stats.categoryAverages[c]
                return (
                  <li key={c}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-heading">{ca.categories[c].name}</span>
                      <span className="tabular font-display text-xl font-semibold text-heading">{avg === undefined ? '–' : formatScore(avg)}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <div className="h-full rounded-full bg-label" style={{ width: `${((avg ?? 0) / 10) * 100}%` }} />
                    </div>
                    {stats.mostGenerous === c && (
                      <p className="mt-1 text-sm text-subtle">{isMe ? ca.profile.mostGenerousMine : ca.profile.mostGenerousOther}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>

          {(stats.best || stats.worst) && (
            <Card flush>
              <div className="px-4 pt-4">
                <SectionTitle>{ca.profile.curiosities}</SectionTitle>
              </div>
              <ul className="divide-y divide-line-subtle">
                {stats.best && <HighlightRow label={ca.profile.best} entry={stats.best} />}
                {stats.worst && <HighlightRow label={ca.profile.worst} entry={stats.worst} />}
              </ul>
            </Card>
          )}

          <Card flush>
            <div className="px-4 pt-4">
              <SectionTitle>{ca.profile.history}</SectionTitle>
            </div>
            <ul className="divide-y divide-line-subtle">
              {stats.history.map((h) => {
                const group = groupOf(h.visit.groupId)
                return (
                  <li key={h.visit.id}>
                    <Link
                      href={`/g/${h.visit.groupId}/visites/${h.visit.id}`}
                      className="flex min-h-16 items-center gap-3 px-4 py-2.5 hover:bg-surface-2 active:bg-surface-3"
                    >
                      <Flag code={h.visit.restaurant.cuisineOrigin} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-heading">{h.visit.restaurant.name}</p>
                        <p className="flex items-center gap-1.5 text-sm text-subtle">
                          {group && <GroupBadge emoji={group.emoji} color={group.color} size={18} />}
                          <time dateTime={h.visit.visitDate} className="tabular">
                            {formatDayShort(h.visit.visitDate)}
                          </time>
                        </p>
                        <p className="tabular mt-0.5 flex gap-2 text-xs text-label">
                          {CATEGORIES.map((c) => (
                            <span key={c}>
                              <span className="text-subtle">{ca.categories[c].name.slice(0, 1)}</span> {h.votes[c] ?? '–'}
                            </span>
                          ))}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular font-display text-2xl font-semibold text-heading">
                          {h.personal === null ? '–' : formatScore(h.personal)}
                        </p>
                        {h.group !== null && <p className="tabular text-xs text-subtle">{ca.profile.groupScore(formatScore(h.group))}</p>}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}

function exigencyNote(value: number, position: ProfileData['exigencyPosition']): string {
  const rounded = Math.round(value * 10) / 10
  if (position && position.of > 1) {
    if (position.position === 1 && rounded < 0) return ca.profile.lowestInGroup
    if (position.position === position.of && rounded > 0) return ca.profile.highestInGroup
  }
  return rounded < 0 ? ca.profile.belowRest : rounded > 0 ? ca.profile.aboveRest : ca.profile.likeRest
}

function ContextChip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <li className="shrink-0">
      <Link
        href={href}
        replace
        aria-current={active ? 'page' : undefined}
        className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
          active ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-line bg-surface text-label hover:bg-surface-2'
        }`}
      >
        {children}
      </Link>
    </li>
  )
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-card border border-line-subtle bg-surface p-4 shadow-card">
      <p className="text-sm text-subtle">{label}</p>
      <p className="tabular mt-1 font-display text-3xl font-semibold text-heading">{value}</p>
      {note && <p className="mt-1 text-xs leading-snug text-subtle">{note}</p>}
    </div>
  )
}

function HighlightRow({ label, entry }: { label: string; entry: HistoryEntry<VisitWithVotes> }) {
  return (
    <li>
      <Link
        href={`/g/${entry.visit.groupId}/visites/${entry.visit.id}`}
        className="flex min-h-16 items-center gap-3 px-4 py-2.5 hover:bg-surface-2"
      >
        <Flag code={entry.visit.restaurant.cuisineOrigin} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-subtle">{label}</p>
          <p className="truncate font-medium text-heading">{entry.visit.restaurant.name}</p>
        </div>
        <span className="tabular font-display text-2xl font-semibold text-heading">
          {entry.personal === null ? '–' : formatScore(entry.personal)}
        </span>
      </Link>
    </li>
  )
}
