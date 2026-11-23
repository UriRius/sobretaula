import { Suspense } from 'react'
import { AppHeader, HeaderFallback } from './AppHeader'
import { AppNav, NavFallback } from './AppNav'

// L'esquelet (capçalera i navegació buides) surt a l'instant; el que depèn de
// la sessió arriba en streaming dins de cada <Suspense>.
export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <AppHeader />
      </Suspense>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <Suspense fallback={<NavFallback />}>
        <AppNav />
      </Suspense>
    </div>
  )
}
