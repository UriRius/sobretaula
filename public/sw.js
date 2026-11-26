// Service worker de Sobretaula: NOMÉS la pàgina «sense connexió».
//
// No desa a la memòria cau res de l'app (pàgines, dades ni vots): tot passa
// per la xarxa com sempre. Si una navegació falla perquè no hi ha cobertura,
// es mostra /offline.html. Les navegacions dins l'app ja oberta les gestiona
// Next (experimental.useOffline): les reintenta soles.

const CACHE = 'sobretaula-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, '/icons/logo.svg']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }
  if (new URL(request.url).pathname === '/icons/logo.svg') {
    event.respondWith(fetch(request).catch(() => caches.match('/icons/logo.svg')))
  }
})
