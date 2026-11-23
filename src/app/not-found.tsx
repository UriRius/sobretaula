import { Logo } from '@/components/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { ca } from '@/i18n/ca'

// Mateixa resposta per a «no existeix» i «és d'un grup on no ets»: no
// revelem què hi ha als grups dels altres. Es pot pintar dins de l'app
// (capçalera i navegació) o sola, així que no ocupa tota la pantalla.
export default function NotFound() {
  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <div className="w-full max-w-sm rounded-card border border-line-subtle bg-surface p-6 shadow-card">
        <div className="flex justify-center">
          <Logo size={56} />
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-heading">{ca.notFound.title}</h1>
        <p className="mt-2 text-subtle">{ca.notFound.text}</p>
        <ButtonLink href="/" className="mt-6 w-full">
          {ca.notFound.home}
        </ButtonLink>
      </div>
    </div>
  )
}
