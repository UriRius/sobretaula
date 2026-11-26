import type { CSSProperties } from 'react'

// Cartes de debò: anvers crema amb el número gran i els índexs a les
// cantonades; revers de quadres vichy. El gir és CSS (globals.css: .card-flip).

const RADIUS = 'rounded-[10px]'

/** L'anvers. `selected`: la carta triada (vermell d'estovalla). */
export function CardFront({ value, selected = false, big = false }: { value: number; selected?: boolean; big?: boolean }) {
  return (
    <span
      className={`flex h-full w-full flex-col justify-between border ${RADIUS} ${big ? 'p-2' : 'p-1.5'} ${
        selected ? 'border-primary bg-primary text-on-primary' : 'border-line bg-card-face text-card-ink'
      }`}
    >
      <span className={`tabular self-start font-semibold leading-none ${big ? 'text-sm' : 'text-[11px]'}`}>{value}</span>
      <span className={`tabular self-center font-display font-semibold leading-none ${big ? 'text-5xl' : 'text-[1.75rem]'}`}>
        {value}
      </span>
      <span className={`tabular rotate-180 self-end font-semibold leading-none ${big ? 'text-sm' : 'text-[11px]'}`}>{value}</span>
    </span>
  )
}

/** El revers: quadres vichy dins d'un marge crema. */
export function CardBack({ dim = false }: { dim?: boolean }) {
  return (
    <span className={`block h-full w-full border border-line bg-card-face p-1 ${RADIUS} ${dim ? 'opacity-45' : ''}`}>
      <span className="vichy block h-full w-full rounded-[6px]" />
    </span>
  )
}

/**
 * Carta que es gira quan arriba el valor. Mentre `value` és null es veu el
 * revers (i el valor no és ni al DOM: la BD encara no l'ha donat).
 */
export function FlipCard({
  value,
  delayMs = 0,
  dim = false,
  className = '',
}: {
  value: number | null
  delayMs?: number
  dim?: boolean
  className?: string
}) {
  const style: CSSProperties = { transitionDelay: `${delayMs}ms` }
  return (
    <span className={`card-flip block aspect-[5/7] ${className}`}>
      <span className="card-flip-inner block" data-down={value === null} style={style}>
        <span className="card-side">{value !== null && <CardFront value={value} big />}</span>
        <span className="card-side card-side-back">
          <CardBack dim={dim} />
        </span>
      </span>
    </span>
  )
}
