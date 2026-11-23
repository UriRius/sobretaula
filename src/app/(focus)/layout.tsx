import { Logo } from '@/components/Logo'
import { ca } from '@/i18n/ca'

// Pantalles d'un sol pas (benvinguda, invitació): sense navegació.
export default function FocusLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="tablecloth flex min-h-dvh flex-col items-center px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-10">
      <div className="mb-5 flex items-center gap-2">
        <Logo size={36} />
        <span className="font-display text-2xl font-semibold text-heading">{ca.app.name}</span>
      </div>
      <main className="w-full max-w-sm">{children}</main>
    </div>
  )
}
