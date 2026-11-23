import { GROUP_COLORS, type GroupColor } from '@/config/groupColors'

/** L'emoji del grup dins d'un cercle tenyit amb el seu color. */
export function GroupBadge({ emoji, color, size = 36 }: { emoji: string; color: GroupColor; size?: number }) {
  const c = GROUP_COLORS[color].cssVar
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `color-mix(in oklab, ${c} 18%, var(--surface))`,
        boxShadow: `inset 0 0 0 2px color-mix(in oklab, ${c} 55%, transparent)`,
      }}
    >
      {emoji}
    </span>
  )
}
