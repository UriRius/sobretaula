'use client'

import { useRef, type MouseEvent, type PointerEvent } from 'react'

const HOLD_MS = 500
/** Si el dit es mou més que això, és que vol fer scroll, no mantenir premut. */
const MOVE_TOLERANCE_PX = 10

/**
 * «Mantenir premut» sobre un enllaç (mòbil), més el clic dret i la tecla de
 * menú (escriptori), que obren el mateix. Retorna els gestors per escampar a
 * l'element; amb `onLongPress` undefined, no fa res i l'enllaç es comporta
 * com sempre.
 *
 * - Android dispara `contextmenu` en mantenir premut: es cancel·la el menú del
 *   navegador i s'obre el nostre.
 * - iOS no el dispara, i per això hi ha el temporitzador. La bombolla de
 *   l'enllaç (vista prèvia) es treu amb CSS: `[-webkit-touch-callout:none]`.
 * - Deixar anar el dit després de mantenir premut no ha d'obrir l'enllaç.
 */
export function useLongPress(onLongPress: (() => void) | undefined) {
  const timer = useRef<number | null>(null)
  // El dit que ha començat a prémer: un altre punter (p. ex. el ratolí que
  // surt de l'element quan s'obre el full) no l'ha de cancel·lar.
  const origin = useRef<{ id: number; x: number; y: number } | null>(null)
  const fired = useRef(false)

  function clear() {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
    origin.current = null
  }

  function fire() {
    clear()
    fired.current = true
    // Una vibració curta on n'hi ha (Android). Sense cap toc previ a la
    // pàgina, Chrome la bloqueja i avisa a la consola: no ho intentem.
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(15)
    onLongPress?.()
  }

  function end(e: PointerEvent) {
    if (origin.current?.id === e.pointerId) clear()
  }

  if (!onLongPress) return {}

  return {
    onPointerDown(e: PointerEvent) {
      fired.current = false
      clear()
      if (e.button !== 0) return // el clic dret va per contextmenu
      origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY }
      timer.current = window.setTimeout(fire, HOLD_MS)
    },
    onPointerMove(e: PointerEvent) {
      const o = origin.current
      if (o?.id === e.pointerId && Math.hypot(e.clientX - o.x, e.clientY - o.y) > MOVE_TOLERANCE_PX) clear()
    },
    onPointerUp: end,
    onPointerLeave: end,
    // El navegador s'ha quedat el gest (p. ex. ha començat l'scroll).
    onPointerCancel: end,
    onContextMenu(e: MouseEvent) {
      e.preventDefault()
      if (!fired.current) fire()
    },
    onClick(e: MouseEvent) {
      if (!fired.current) return
      e.preventDefault()
      fired.current = false
    },
  }
}
