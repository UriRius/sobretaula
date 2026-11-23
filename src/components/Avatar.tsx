import Image from 'next/image'

type AvatarProfile = {
  display_name: string
  avatar_url: string | null
  avatar_emoji: string | null
}

const SIZES = { sm: 32, md: 44, lg: 72 } as const

/** Foto de Google, emoji triat o, si no, la inicial. */
export function Avatar({ profile, size = 'md' }: { profile: AvatarProfile; size?: keyof typeof SIZES }) {
  const px = SIZES[size]
  const common = 'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2'
  if (profile.avatar_url) {
    return (
      <Image
        src={profile.avatar_url}
        alt=""
        width={px}
        height={px}
        unoptimized
        referrerPolicy="no-referrer"
        className={common}
        style={{ width: px, height: px }}
      />
    )
  }
  return (
    <span aria-hidden className={common} style={{ width: px, height: px, fontSize: px * 0.5 }}>
      {profile.avatar_emoji ?? (
        <span className="font-display font-semibold text-label">{profile.display_name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  )
}
