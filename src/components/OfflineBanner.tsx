'use client'

import { WifiOff } from 'lucide-react'
import { useOffline } from 'next/offline'
import { useEffect } from 'react'
import { ca } from '@/i18n/ca'

/**
 * Sense connexió: un avís a dalt (les navegacions es tornen a provar soles
 * quan torna). A més, registra el service worker que mostra /offline.html si
 * s'obre l'app sense cobertura (només en producció).
 */
export function OfflineBanner() {
  const offline = useOffline()

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      // Sense service worker l'app funciona igual; només perd la pàgina offline.
    })
  }, [])

  if (!offline) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-heading px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 text-sm font-medium text-canvas"
    >
      <WifiOff size={16} aria-hidden />
      {ca.offline.banner}
    </div>
  )
}
