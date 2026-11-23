import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Card'
import { getActiveGroupId, requireProfile } from '@/lib/queries'

// `/` porta al grup actiu (l'últim visitat) o, si encara no n'hi ha cap, a la
// benvinguda.
export default function RootPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40" />}>
      <RedirectToActiveGroup />
    </Suspense>
  )
}

async function RedirectToActiveGroup() {
  await requireProfile()
  const groupId = await getActiveGroupId()
  redirect(groupId ? `/g/${groupId}` : '/benvinguda')
  return null
}
