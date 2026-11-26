import { LogOut } from 'lucide-react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { signOut } from '@/app/actions/auth'
import { BackButton } from '@/components/BackButton'
import { ProfileForm } from '@/components/ProfileForm'
import { Button } from '@/components/ui/Button'
import { Card, PageTitle, SectionTitle, Skeleton } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'
import { requireUser } from '@/lib/auth'
import { requireProfile } from '@/lib/queries'
import { ThemePicker } from '../ThemePicker'
import { DeleteAccount } from './DeleteAccount'

export const metadata: Metadata = { title: 'Ajustos' }

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <BackButton fallback="/jo" />
        <PageTitle>{ca.profile.settingsTitle}</PageTitle>
      </div>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ProfileSettings />
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
      <Card className="mt-6">
        <SectionTitle>{ca.account.deleteTitle}</SectionTitle>
        <DeleteAccount />
      </Card>
    </div>
  )
}

async function ProfileSettings() {
  const [user, profile] = await Promise.all([requireUser(), requireProfile()])
  return (
    <Card>
      <SectionTitle>{ca.profile.profileTitle}</SectionTitle>
      <ProfileForm
        defaultName={profile.display_name}
        photoUrl={user.suggestedAvatarUrl}
        defaultAvatar={profile.avatar_url ? 'photo' : (profile.avatar_emoji ?? '🍷')}
      />
    </Card>
  )
}
