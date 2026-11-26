import { ButtonLink } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'

export function CancelledView({ href }: { href: string }) {
  return (
    <main className="tablecloth flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <p className="font-display text-xl font-semibold text-heading">{ca.room.cancelled}</p>
        <ButtonLink href={href} className="mt-5 w-full">
          {ca.room.backHome}
        </ButtonLink>
      </Card>
    </main>
  )
}
