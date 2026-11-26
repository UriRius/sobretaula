'use client'

import { useEffect, useState } from 'react'

/**
 * Un número que puja de 0 fins a `target` (comptador de la nota final). Amb
 * menys animacions, hi arriba de cop.
 */
export function useCountUp(target: number | null, durationMs = 1600): { value: number | null; done: boolean } {
  const [state, setState] = useState<{ target: number | null; value: number | null; done: boolean }>({
    target: null,
    value: null,
    done: false,
  })

  useEffect(() => {
    if (target === null) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frame = requestAnimationFrame(() => setState({ target, value: target, done: true }))
      return () => cancelAnimationFrame(frame)
    }
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - (1 - t) ** 3
      setState({ target, value: target * eased, done: t >= 1 })
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs])

  return state.target === target ? { value: state.value, done: state.done } : { value: target === null ? null : 0, done: false }
}
