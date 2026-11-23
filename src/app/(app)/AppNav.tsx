import { getActiveGroupId } from '@/lib/queries'
import { BottomNav, BottomNavSkeleton } from './BottomNav'

export async function AppNav() {
  const activeGroupId = await getActiveGroupId()
  return <BottomNav fallbackGroupId={activeGroupId} />
}

export function NavFallback() {
  return <BottomNavSkeleton />
}
