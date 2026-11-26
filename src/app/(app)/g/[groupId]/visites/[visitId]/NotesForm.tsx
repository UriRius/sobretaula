'use client'

import { Check } from 'lucide-react'
import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ErrorText } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import type { ActionState } from '@/lib/errors'

const NOTES_MAX = 2000

type NotesState = ActionState & { saved: string }

/** Notes lliures del grup sobre el restaurant: les edita qualsevol membre. */
export function NotesForm({
  action: serverAction,
  initial,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  initial: string
}) {
  const [state, action, pending] = useActionState(
    async (prev: NotesState, formData: FormData): Promise<NotesState> => {
      const result = await serverAction(prev, formData)
      return { ...result, saved: result.ok ? String(formData.get('notes') ?? '') : prev.saved }
    },
    { error: null, saved: initial },
  )
  const [text, setText] = useState(initial)
  const dirty = text.trim() !== state.saved.trim()

  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea
        name="notes"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={NOTES_MAX}
        rows={3}
        placeholder={ca.visit.notesPlaceholder}
        aria-label={ca.visit.notesTitle}
        className="resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-base text-heading placeholder:text-muted focus:border-primary focus:outline-none"
      />
      <ErrorText>{state.error}</ErrorText>
      <div className="flex min-h-12 items-center justify-end gap-3">
        {!dirty && state.ok && (
          <span className="flex items-center gap-1 text-sm font-medium text-success">
            <Check size={16} aria-hidden />
            {ca.visit.notesSaved}
          </span>
        )}
        {dirty && (
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? ca.common.saving : ca.visit.notesSave}
          </Button>
        )}
      </div>
    </form>
  )
}
