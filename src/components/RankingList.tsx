import Link from 'next/link'
import type { ReactNode } from 'react'
import { Flag } from '@/components/Flag'
import { ca } from '@/i18n/ca'
import { formatDayShort, formatScore } from '@/lib/format'

export type RankingRow = {
  key: string
  href: string
  position: number
  score: number
  name: string
  cuisineOrigin: string
  visitDate: string
  city: string | null
  /** Alguna cosa més a la segona línia (p. ex. el grup a «El meu rànquing»). */
  extra?: ReactNode
}

/**
 * Llista neta, sense res desplegable: posició · bandera · nom · nota. Les 3
 * primeres posicions, en mostassa (l'únic lloc amb accent a més de la nota
 * final). Tocar una fila obre el detall.
 */
export function RankingList({ rows }: { rows: RankingRow[] }) {
  return (
    <ol className="divide-y divide-line-subtle">
      {rows.map((row) => (
        <li key={row.key}>
          <Link
            href={row.href}
            className="flex min-h-16 items-center gap-3 px-4 py-2.5 hover:bg-surface-2 active:bg-surface-3"
          >
            <Position n={row.position} />
            <Flag code={row.cuisineOrigin} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-heading">{row.name}</p>
              <p className="flex min-w-0 items-center gap-1.5 text-sm text-subtle">
                {row.extra}
                <span className="truncate">
                  <time dateTime={row.visitDate} className="tabular">
                    {formatDayShort(row.visitDate)}
                  </time>
                  {row.city && ` · ${row.city}`}
                </span>
              </p>
            </div>
            <span className="tabular shrink-0 font-display text-2xl font-semibold text-heading">{formatScore(row.score)}</span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

function Position({ n }: { n: number }) {
  const podium = n <= 3
  return (
    <span
      aria-label={ca.ranking.position(n)}
      className={`tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold ${
        podium ? 'bg-accent text-on-accent shadow-card' : 'text-subtle'
      }`}
    >
      {n}
    </span>
  )
}
