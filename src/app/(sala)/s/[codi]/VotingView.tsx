'use client'

import { Check, Eye, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { CardFront } from '@/components/PlayingCard'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { CARD_VALUES, CATEGORIES, type Category } from '@/config/scoring'
import { ca } from '@/i18n/ca'
import type { RoomParticipant, RoomPerson } from '@/lib/visits'
import { Seat } from './people'

const COMMENT_MAX = 280

export function VotingView({
  meId,
  isParticipant,
  people,
  participants,
  online,
  hostId,
  hostName,
  myVotes,
  initialComment,
  canAdvance,
  advancing,
  error,
  onVote,
  onSaveComment,
  onReveal,
  onCancel,
}: {
  meId: string
  isParticipant: boolean
  people: RoomPerson[]
  participants: RoomParticipant[]
  online: string[]
  hostId: string
  hostName: string
  myVotes: Partial<Record<Category, number>>
  initialComment: string
  canAdvance: boolean
  advancing: boolean
  error: string | null
  onVote: (category: Category, value: number) => void
  onSaveComment: (body: string) => Promise<boolean>
  onReveal: () => void
  onCancel: () => void
}) {
  const blocks = useRef<Partial<Record<Category | 'comment', HTMLElement | null>>>({})
  const anyVote = participants.some((p) => p.votesCast > 0)

  function scrollTo(target: Category | 'comment') {
    blocks.current[target]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function pick(category: Category, value: number) {
    onVote(category, value)
    // Baixa sola fins a la següent categoria que encara no has votat.
    const after = CATEGORIES.slice(CATEGORIES.indexOf(category) + 1)
    const next = after.find((c) => myVotes[c] === undefined)
    if (next) scrollTo(next)
    else if (CATEGORIES.every((c) => c === category || myVotes[c] !== undefined)) scrollTo('comment')
  }

  return (
    <>
      {/* Els teus 4 vots, sempre a la vista. */}
      <nav
        aria-label={ca.room.yourVotes}
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 border-b border-line-subtle bg-canvas/95 backdrop-blur"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-4 gap-1.5 px-3 py-2">
          {CATEGORIES.map((c) => {
            const value = myVotes[c]
            return (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => scrollTo(c)}
                  className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border text-sm ${
                    value !== undefined
                      ? 'border-line bg-surface font-semibold text-heading'
                      : 'border-dashed border-line-strong text-subtle'
                  }`}
                >
                  <span className="truncate">{ca.categories[c].name}</span>
                  <span className="tabular font-display text-base">{value ?? ca.room.noVote}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <section aria-label={ca.room.atTable} className="-mx-4 mb-2">
          <ul className="flex gap-1 overflow-x-auto px-4 pt-1 pb-2">
            {participants.map((p) => (
              <Seat
                key={p.userId}
                person={people.find((person) => person.id === p.userId)}
                votesCast={p.votesCast}
                total={CATEGORIES.length}
                online={online.includes(p.userId)}
                isHost={p.userId === hostId}
                isMe={p.userId === meId}
              />
            ))}
          </ul>
        </section>

        {CATEGORIES.map((category) => (
          <section
            key={category}
            ref={(el) => {
              blocks.current[category] = el
            }}
            aria-labelledby={`cat-${category}`}
            className="scroll-mt-[calc(7.75rem+env(safe-area-inset-top))] py-4"
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id={`cat-${category}`} className="font-display text-2xl font-semibold text-heading">
                {ca.categories[category].name}
              </h2>
              <p className="text-right text-sm text-subtle">{ca.categories[category].hint}</p>
            </div>
            {/* 2 files de 5: a 375 px cada carta fa ~62 × 87 px. */}
            <div role="radiogroup" aria-labelledby={`cat-${category}`} className="grid grid-cols-5 gap-2">
              {CARD_VALUES.map((value) => {
                const selected = myVotes[category] === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={ca.room.pickCard(ca.categories[category].name, value)}
                    disabled={!isParticipant}
                    onClick={() => pick(category, value)}
                    className={`aspect-[5/7] rounded-[10px] transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 ${
                      selected ? 'shadow-raised' : 'shadow-card active:scale-95'
                    }`}
                  >
                    <span key={selected ? 'on' : 'off'} className={`block h-full w-full ${selected ? 'animate-card-pop' : ''}`}>
                      <CardFront value={value} selected={selected} />
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}

        <section
          ref={(el) => {
            blocks.current.comment = el
          }}
          className="scroll-mt-[calc(7.75rem+env(safe-area-inset-top))] py-4"
        >
          <CommentBox key={initialComment} initial={initialComment} disabled={!isParticipant} onSave={onSaveComment} />
        </section>

        {canAdvance && (
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" onClick={onCancel} className="text-subtle">
              <Trash2 size={18} aria-hidden />
              {ca.room.cancel}
            </Button>
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line-subtle bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg flex-col gap-2 px-4 py-3">
          <ErrorText>{error}</ErrorText>
          {canAdvance ? (
            <>
              <Button size="lg" className="w-full" onClick={onReveal} disabled={advancing || !anyVote}>
                <Eye size={22} aria-hidden />
                {advancing ? ca.room.revealing : ca.room.reveal}
              </Button>
              {hostId !== meId ? null : <p className="text-center text-xs text-subtle">{ca.room.youAreHost}</p>}
            </>
          ) : (
            <p className="py-2 text-center text-subtle">{ca.room.waitingReveal(hostName)}</p>
          )}
        </div>
      </div>
    </>
  )
}

function CommentBox({
  initial,
  disabled,
  onSave,
}: {
  initial: string
  disabled: boolean
  onSave: (body: string) => Promise<boolean>
}) {
  const [text, setText] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [saving, setSaving] = useState(false)
  const dirty = text.trim() !== saved.trim()

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    const ok = await onSave(text)
    setSaving(false)
    if (ok) setSaved(text)
  }

  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-display text-xl font-semibold text-heading">{ca.room.commentLabel}</span>
        <span className="text-sm text-subtle">{ca.newRoom.optional}</span>
      </span>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        maxLength={COMMENT_MAX}
        rows={2}
        disabled={disabled}
        placeholder={ca.room.commentPlaceholder}
        className="resize-none rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-heading placeholder:text-muted focus:border-primary focus:outline-none"
      />
      <span className="flex min-h-11 items-center justify-between gap-3">
        <span className="text-xs text-subtle">{ca.room.commentHint}</span>
        {dirty ? (
          <Button type="button" variant="secondary" onClick={save} disabled={saving} className="h-11 shrink-0">
            {saving ? ca.common.saving : ca.room.commentSave}
          </Button>
        ) : saved.trim() ? (
          <span className="flex items-center gap-1 text-sm font-medium text-success">
            <Check size={16} aria-hidden />
            {ca.room.commentSaved}
          </span>
        ) : null}
      </span>
    </label>
  )
}
