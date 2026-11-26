import { Check } from 'lucide-react'
import { Avatar } from '@/components/Avatar'
import { ca } from '@/i18n/ca'
import type { RoomPerson } from '@/lib/visits'

export function personAvatar(person: RoomPerson | undefined) {
  return {
    display_name: person?.name ?? '?',
    avatar_url: person?.avatarUrl ?? null,
    avatar_emoji: person?.avatarEmoji ?? null,
  }
}

/**
 * Una persona a la taula: si té la sala oberta (punt), i quantes categories
 * ha votat (✓ quan les té totes). Mai el valor.
 */
export function Seat({
  person,
  votesCast,
  total,
  online,
  isHost,
  isMe,
}: {
  person: RoomPerson | undefined
  votesCast: number
  total: number
  online: boolean
  isHost: boolean
  isMe: boolean
}) {
  const done = votesCast >= total
  const name = person?.name ?? '?'
  const status = done ? ca.room.votedAll : votesCast > 0 ? ca.room.votedSome(votesCast) : null
  return (
    <li className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
      <span className="relative">
        <Avatar profile={personAvatar(person)} />
        {online && (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-success"
          />
        )}
        {done ? (
          <span className="absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-surface bg-success text-surface">
            <Check size={12} strokeWidth={3.5} aria-hidden />
          </span>
        ) : votesCast > 0 ? (
          <span className="tabular absolute -right-2 -bottom-1 rounded-full border-2 border-surface bg-surface-3 px-1 text-[10px] font-bold leading-4 text-label">
            {votesCast}/{total}
          </span>
        ) : null}
      </span>
      <span className={`w-full truncate text-xs ${isMe ? 'font-semibold text-heading' : 'text-subtle'}`}>
        {isMe ? ca.common.you : name}
      </span>
      <span className="sr-only">
        {[name, isHost ? ca.room.host : null, online ? ca.room.online : null, status].filter(Boolean).join(', ')}
      </span>
      {isHost && <span className="-mt-1 text-[10px] font-medium uppercase tracking-wide text-subtle">{ca.room.host}</span>}
    </li>
  )
}
