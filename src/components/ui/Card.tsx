import type { ReactNode } from 'react'

/** `flush`: sense marge interior (per a llistes que van de vora a vora). */
export function Card({ children, className = '', flush = false }: { children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`rounded-card border border-line-subtle bg-surface shadow-card ${flush ? 'overflow-hidden' : 'p-4'} ${className}`}>
      {children}
    </section>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-semibold text-heading">{children}</h2>
      {action}
    </div>
  )
}

export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-3xl font-semibold leading-tight text-heading">{children}</h1>
      {subtitle && <p className="mt-1 text-subtle">{subtitle}</p>}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-xl border border-primary-edge bg-primary-soft px-3 py-2 text-sm text-primary-soft-fg">
      {children}
    </p>
  )
}
