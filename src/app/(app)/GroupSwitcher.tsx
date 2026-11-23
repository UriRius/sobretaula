'use client'

import { Check, ChevronDown, Plus } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { GroupBadge } from '@/components/GroupBadge'
import { Logo } from '@/components/Logo'
import { GROUP_COLORS } from '@/config/groupColors'
import { ca } from '@/i18n/ca'
import type { MyGroup } from '@/lib/queries'

/**
 * Capçalera: el grup actiu (el de la URL o, fora d'un grup, l'últim triat), tenyit
 * subtilment amb el seu color perquè sempre sàpigues on ets.
 */
export function GroupSwitcher({
  groups,
  fallbackGroupId,
  children,
}: {
  groups: MyGroup[]
  fallbackGroupId: string | null
  children: ReactNode
}) {
  const params = useParams<{ groupId?: string }>()
  const pathname = usePathname()
  // El menú només és obert a la ruta on s'ha obert: en navegar es tanca sol
  // (amb Activity el component no es desmunta).
  const [openAt, setOpenAt] = useState<string | null>(null)
  const open = openAt === pathname
  const setOpen = (value: boolean | ((o: boolean) => boolean)) =>
    setOpenAt((typeof value === 'function' ? value(open) : value) ? pathname : null)
  const activeId = params.groupId ?? fallbackGroupId
  const active = groups.find((g) => g.id === activeId) ?? null
  const tint = active ? GROUP_COLORS[active.color].cssVar : 'var(--line)'

  // Canviar de grup et deixa a la mateixa secció de l'altre grup.
  const section = pathname.match(/^\/g\/[^/]+\/(ranquing|grup)/)?.[1]
  const hrefFor = (id: string) => (section ? `/g/${id}/${section}` : `/g/${id}`)

  return (
    <header
      className="sticky top-0 z-30 border-b-[3px] pt-[env(safe-area-inset-top)]"
      style={{
        borderBottomColor: `color-mix(in oklab, ${tint} 70%, transparent)`,
        background: `color-mix(in oklab, ${tint} 9%, var(--surface))`,
      }}
    >
      <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
        {active ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={ca.nav.switchGroup}
            className="-ml-1 flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-1 text-left focus-visible:outline-2 focus-visible:outline-primary"
          >
            <GroupBadge emoji={active.emoji} color={active.color} size={34} />
            <span className="truncate font-display text-xl font-semibold text-heading">{active.name}</span>
            <ChevronDown size={18} aria-hidden className={`shrink-0 text-label transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        ) : (
          <Link href="/" className="flex flex-1 items-center gap-2">
            <Logo size={32} />
            <span className="font-display text-xl font-semibold text-heading">{ca.app.name}</span>
          </Link>
        )}
        {children}
      </div>

      {open && (
        <>
          <button
            type="button"
            aria-label={ca.common.cancel}
            className="fixed inset-0 top-[calc(3.5rem+3px+env(safe-area-inset-top))] z-30 cursor-default bg-black/30"
            onClick={() => setOpen(false)}
          />
          <nav
            aria-label={ca.nav.myGroups}
            className="absolute inset-x-0 top-full z-40 mx-auto max-w-lg px-3 pt-2"
          >
            <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-raised">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={hrefFor(g.id)}
                    className="flex min-h-14 items-center gap-3 px-4 py-2 hover:bg-surface-2 active:bg-surface-3"
                  >
                    <GroupBadge emoji={g.emoji} color={g.color} size={32} />
                    <span className="flex-1 truncate font-medium text-heading">{g.name}</span>
                    {g.id === activeId && <Check size={20} aria-hidden className="text-link" />}
                  </Link>
                </li>
              ))}
              <li className="border-t border-line-subtle">
                <Link href="/grups/nou" className="flex min-h-14 items-center gap-3 px-4 py-2 font-medium text-link hover:bg-surface-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-line-strong">
                    <Plus size={18} aria-hidden />
                  </span>
                  {ca.nav.newGroup}
                </Link>
              </li>
            </ul>
          </nav>
        </>
      )}
    </header>
  )
}
