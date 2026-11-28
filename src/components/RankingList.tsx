'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { DeleteVisitSheet, type DeletableVisit } from '@/components/DeleteVisitSheet'
import { Flag } from '@/components/Flag'
import { useLongPress } from '@/components/useLongPress'
import { ca } from '@/i18n/ca'
import { formatDayShort, formatScore } from '@/lib/format'

export type RankingRow = DeletableVisit & {
  href: string
  position: number
  /** Alguna cosa més a la segona línia (p. ex. el grup a «El meu rànquing»). */
  extra?: ReactNode
  /** Qui mira en pot esborrar la visita (n'és l'amfitrió o admin del grup). La BD ho torna a comprovar. */
  deletable?: boolean
}

/**
 * Llista neta, sense res desplegable: posició · bandera · nom · nota. Les 3
 * primeres posicions, en mostassa (l'únic lloc amb accent a més de la nota
 * final). Tocar una fila obre el detall; mantenir-la premuda (o el clic dret),
 * si se'n té dret, obre el full per esborrar-la.
 */
export function RankingList({ rows }: { rows: RankingRow[] }) {
  const [deleting, setDeleting] = useState<RankingRow | null>(null)
  return (
    <>
      <ol className="divide-y divide-line-subtle">
        {rows.map((row) => (
          <li key={row.visitId}>
            <RowLink row={row} onLongPress={row.deletable ? () => setDeleting(row) : undefined} />
          </li>
        ))}
      </ol>
      {deleting && <DeleteVisitSheet visit={deleting} onClose={() => setDeleting(null)} />}
    </>
  )
}

function RowLink({ row, onLongPress }: { row: RankingRow; onLongPress?: () => void }) {
  const press = useLongPress(onLongPress)
  return (
    <Link
      href={row.href}
      {...press}
      className={`flex min-h-16 items-center gap-3 px-4 py-2.5 hover:bg-surface-2 active:bg-surface-3 ${
        onLongPress ? 'select-none [-webkit-touch-callout:none]' : ''
      }`}
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
