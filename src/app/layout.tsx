import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import { OfflineBanner } from '@/components/OfflineBanner'
import { ca } from '@/i18n/ca'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const fraunces = Fraunces({ variable: '--font-fraunces', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: ca.app.name, template: `%s · ${ca.app.name}` },
  description: ca.app.description,
  applicationName: ca.app.name,
  appleWebApp: { capable: true, title: ca.app.name, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icons/logo.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f0e3' },
    { media: '(prefers-color-scheme: dark)', color: '#1e1412' },
  ],
}

// Tema: «sistema» per defecte (CSS); si l'usuari n'ha triat un, l'aplica abans
// de pintar (preferència del dispositiu, no de la BD).
const themeScript = `(function(){try{var t=localStorage.getItem("sobretaula-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="ca" className={`${inter.variable} ${fraunces.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <OfflineBanner />
        {children}
      </body>
    </html>
  )
}
