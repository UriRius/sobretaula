'use client'

import { Home, Trophy, UserRound, UsersRound, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { ca } from '@/i18n/ca'

type Tab = { key: string; label: string; icon: LucideIcon; href: (groupId: string | null) => string; match: RegExp }

// 4 destinacions, on arriba el polze.
const TABS: Tab[] = [
  { key: 'home', label: ca.nav.home, icon: Home, href: (g) => (g ? `/g/${g}` : '/'), match: /^\/g\/[^/]+(\/sala\/.*)?\/?$|^\/$/ },
  { key: 'ranking', label: ca.nav.ranking, icon: Trophy, href: (g) => (g ? `/g/${g}/ranquing` : '/'), match: /^\/g\/[^/]+\/(ranquing|visites)|^\/jo\/ranquing/ },
  { key: 'group', label: ca.nav.group, icon: UsersRound, href: (g) => (g ? `/g/${g}/grup` : '/'), match: /^\/g\/[^/]+\/grup|^\/grups\// },
  { key: 'profile', label: ca.nav.profile, icon: UserRound, href: () => '/jo', match: /^\/jo(?!\/ranquing)|^\/perfil\// },
]

const navClass =
  'fixed inset-x-0 bottom-0 z-30 border-t border-line-subtle bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur'

export function BottomNav({ fallbackGroupId }: { fallbackGroupId: string | null }) {
  const params = useParams<{ groupId?: string }>()
  const pathname = usePathname()
  const groupId = params.groupId ?? fallbackGroupId

  return (
    <nav aria-label="Navegació principal" className={navClass}>
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-4">
        {TABS.map(({ key, label, icon: Icon, href, match }) => {
          const active = match.test(pathname)
          return (
            <li key={key}>
              <Link
                href={href(groupId)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  active ? 'text-link' : 'text-subtle hover:text-heading'
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Mentre arriba la sessió: la mateixa barra, sense llegir la URL. */
export function BottomNavSkeleton() {
  return (
    <nav aria-hidden className={navClass}>
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <li key={key} className="flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-subtle">
            <Icon size={24} strokeWidth={2} aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </nav>
  )
}
