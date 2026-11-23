import Image from 'next/image'

/** Logotip (provisional): public/icons/logo.svg és la font única. */
export function Logo({ size = 40 }: { size?: number }) {
  return <Image src="/icons/logo.svg" alt="" width={size} height={size} priority className="rounded-[22%]" />
}
