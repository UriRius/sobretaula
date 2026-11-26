'use client'

import { useEffect, useRef } from 'react'

// Confeti per quan un restaurant queda primer del mes. Canvas, sense
// llibreries. Colors dels tokens del tema (mai colors crus). Si l'usuari
// demana menys animacions, no es pinta res.

const TOKENS = ['--accent', '--primary', '--group-salvia', '--group-blau', '--group-taronja', '--group-rosa']
const PIECES = 140
const DURATION_MS = 3200

type Piece = { x: number; y: number; vx: number; vy: number; size: number; rot: number; vr: number; color: string }

export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const styles = getComputedStyle(document.documentElement)
    const colors = TOKENS.map((t) => styles.getPropertyValue(t).trim()).filter(Boolean)
    const pieces: Piece[] = Array.from({ length: PIECES }, () => ({
      x: width / 2 + (Math.random() - 0.5) * width * 0.3,
      y: height * 0.35,
      vx: (Math.random() - 0.5) * 9,
      vy: -Math.random() * 11 - 4,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)] ?? 'gold',
    }))

    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const elapsed = now - start
      ctx.clearRect(0, 0, width, height)
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - DURATION_MS * 0.6) / (DURATION_MS * 0.4))
      for (const p of pieces) {
        p.vy += 0.28
        p.vx *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      if (elapsed < DURATION_MS) frame = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, width, height)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 h-full w-full" />
}
