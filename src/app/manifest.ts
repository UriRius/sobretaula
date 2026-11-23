import type { MetadataRoute } from 'next'
import { ca } from '@/i18n/ca'

// PWA: «Afegeix a la pantalla d'inici». No cal service worker per instal·lar-la
// i la sala necessita connexió igualment.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: ca.app.name,
    short_name: ca.app.name,
    description: ca.app.description,
    lang: 'ca',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f0e3',
    theme_color: '#b23a2b',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
