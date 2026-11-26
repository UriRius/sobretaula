import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/Card'
import { requireUser } from '@/lib/auth'
import { getProfile } from '@/lib/profile'
import { ProfileView } from '../ProfileView'

export const metadata: Metadata = { title: 'Perfil' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export default function PersonPage({ params, searchParams }: PageProps<'/perfil/[userId]'>) {
  return (
    <Suspense fallback={<Skeleton className="h-[32rem]" />}>
      <Person params={params} searchParams={searchParams} />
    </Suspense>
  )
}

async function Person({ params, searchParams }: PageProps<'/perfil/[userId]'>) {
  const [{ userId }, query, me] = await Promise.all([params, searchParams, requireUser()])
  const group = typeof query.grup === 'string' ? query.grup : null
  if (userId === me.id) redirect(group ? `/jo?grup=${group}` : '/jo')
  if (!UUID.test(userId)) notFound()

  // Mateixa resposta si no existeix o si no compartim res.
  const data = await getProfile(userId, group)
  if (!data) notFound()
  return <ProfileView data={data} basePath={`/perfil/${userId}`} />
}
