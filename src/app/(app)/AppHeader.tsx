import Link from 'next/link'
import { Avatar } from '@/components/Avatar'
import { Logo } from '@/components/Logo'
import { getActiveGroupId, getMyGroups, requireProfile } from '@/lib/queries'
import { GroupSwitcher } from './GroupSwitcher'

export async function AppHeader() {
  const profile = await requireProfile()
  const [groups, activeGroupId] = await Promise.all([getMyGroups(), getActiveGroupId()])

  return (
    <GroupSwitcher groups={groups} fallbackGroupId={activeGroupId}>
      <Link href="/jo" aria-label="El meu perfil" className="rounded-full focus-visible:outline-2 focus-visible:outline-primary">
        <Avatar profile={profile} size="sm" />
      </Link>
    </GroupSwitcher>
  )
}

export function HeaderFallback() {
  return (
    <header className="sticky top-0 z-30 border-b border-line-subtle bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
        <Logo size={32} />
        <div className="h-5 w-28 animate-pulse rounded bg-surface-2" />
      </div>
    </header>
  )
}
