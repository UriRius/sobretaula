'use client'

import { Trash2 } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { deleteVisit } from '@/app/actions/visits'
import { Flag } from '@/components/Flag'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { formatDayShort, formatScore } from '@/lib/format'

export type DeletableVisit = {
  visitId: string
  name: string
  cuisineOrigin: string
  visitDate: string
  city: string | null
  score: number
}

/**
 * Full inferior per confirmar que s'esborra una visita. Muntar-lo = obrir-lo
 * (`<dialog>` modal: focus a dins, Esc el tanca, la pàgina no fa scroll).
 * Tocar el vel també el tanca, però només si el toc ha COMENÇAT al vel: el dit
 * que l'acaba d'obrir mantenint premut encara és a la pantalla.
 */
export function DeleteVisitSheet({ visit, onClose }: { visit: DeletableVisit; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement | null>(null)
  const downOnScrim = useRef(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await deleteVisit(visit.visitId)
      if (result.error) setError(result.error)
      else dialog.current?.close()
    })
  }

  return (
    <dialog
      ref={(el) => {
        dialog.current = el
        if (el && !el.open) el.showModal()
      }}
      aria-labelledby="delete-visit-title"
      onClose={onClose}
      onCancel={(e) => {
        if (pending) e.preventDefault()
      }}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        downOnScrim.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnScrim.current && !pending) e.currentTarget.close()
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-scrim p-0 backdrop:bg-transparent"
    >
      <div className="animate-sheet-up absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-card border border-b-0 border-line-subtle bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-raised">
        <div aria-hidden className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />

        <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
          <Flag code={visit.cuisineOrigin} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-heading">{visit.name}</p>
            <p className="truncate text-sm text-subtle">
              <time dateTime={visit.visitDate} className="tabular">
                {formatDayShort(visit.visitDate)}
              </time>
              {visit.city && ` · ${visit.city}`}
            </p>
          </div>
          <span className="tabular shrink-0 font-display text-2xl font-semibold text-heading">{formatScore(visit.score)}</span>
        </div>

        <h2 id="delete-visit-title" className="mt-4 font-display text-xl font-semibold text-heading">
          {ca.ranking.deleteTitle}
        </h2>
        <p className="mt-1 text-label">{ca.ranking.deleteText}</p>

        <div className="mt-4 flex flex-col gap-2">
          <ErrorText>{error}</ErrorText>
          <Button type="button" variant="danger" onClick={confirm} disabled={pending}>
            <Trash2 size={20} aria-hidden />
            {pending ? ca.ranking.deleting : ca.ranking.deleteConfirm}
          </Button>
          <Button type="button" variant="secondary" onClick={() => dialog.current?.close()} disabled={pending}>
            {ca.common.cancel}
          </Button>
        </div>
      </div>
    </dialog>
  )
}
