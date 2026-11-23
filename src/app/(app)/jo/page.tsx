import { LogOut } from 'lucide-react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { signOut } from '@/app/actions/auth'
import { Avatar } from '@/components/Avatar'
import { ProfileForm } from '@/components/ProfileForm'
import { Button } from '@/components/ui/Button'
import { Card, PageTitle, SectionTitle, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { requireUser } from '@/lib/auth'
import { formatInstantShort } from '@/lib/format'
import { requireProfile } from '@/lib/queries'
import { ThemePicker } from './ThemePicker'

export const metadata: Metadata = { title: 'Perfil' }

export default function MePage() {
  return (
    <div className="flex flex-col gap-5">
      <PageTitle>{ca.profile.title}</PageTitle>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <MyProfile />
      </Suspense>
      <Card>
        <SectionTitle>{ca.profile.themeTitle}</SectionTitle>
        <ThemePicker />
      </Card>
      <form action={signOut}>
        <Button type="submit" variant="secondary" className="w-full">
          <LogOut size={20} aria-hidden />
          {ca.auth.signOut}
        </Button>
      </form>
    </div>
  )
}

async function MyProfile() {
  const [user, profile] = await Promise.all([requireUser(), requireProfile()])
  return (
    <Card>
      <div className="mb-5 flex items-center gap-4">
        <Avatar profile={profile} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-display text-2xl font-semibold text-heading">{profile.display_name}</p>
          <p className="text-sm text-subtle">{ca.profile.since(formatInstantShort(profile.created_at))}</p>
        </div>
      </div>
      <ProfileForm
        defaultName={profile.display_name}
        photoUrl={user.suggestedAvatarUrl}
        defaultAvatar={profile.avatar_url ? 'photo' : (profile.avatar_emoji ?? '🍷')}
      />
      <p className="mt-4 text-center text-sm text-muted">{ca.profile.statsSoon}</p>
    </Card>
  )
}
