'use client'

import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ca } from '@/i18n/ca'

/**
 * Enrere de debò (historial): torna al rànquing amb la pestanya, el mes i
 * l'scroll on eren. Si s'ha obert l'enllaç directament, va a `fallback`.
 */
export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="-ml-2 flex min-h-11 items-center gap-1 rounded-xl px-2 font-medium text-link hover:bg-surface-2"
    >
      <ChevronLeft size={20} aria-hidden />
      {ca.visit.back}
    </button>
  )
}
