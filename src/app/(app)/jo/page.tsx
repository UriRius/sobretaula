import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Card'
import { requireUser } from '@/lib/auth'
import { getProfile } from '@/lib/profile'
import { requireProfile } from '@/lib/queries'
import { ProfileView } from '../perfil/ProfileView'

export const metadata: Metadata = { title: 'Perfil' }

export default function MePage({ searchParams }: PageProps<'/jo'>) {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem]" />}>
      <MyProfile searchParams={searchParams} />
    </Suspense>
  )
}

async function MyProfile({ searchParams }: Pick<PageProps<'/jo'>, 'searchParams'>) {
  const [query, user] = await Promise.all([searchParams, requireUser(), requireProfile()])
  const data = await getProfile(user.id, typeof query.grup === 'string' ? query.grup : null)
  if (!data) return null
  return <ProfileView data={data} basePath="/jo" />
}
