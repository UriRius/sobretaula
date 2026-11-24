import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ACTIVE_GROUP_COOKIE } from '@/lib/activeGroup'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/env'

// Rutes que no demanen sessió.
const PUBLIC_PATHS = [/^\/entrar$/, /^\/privacitat$/, /^\/auth\//, /^\/api\/keep-alive$/]
const GROUP_PATH = /^\/g\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(\/|$)/

/**
 * A cada petició: refresca la sessió de Supabase (els tokens de refresc són
 * d'un sol ús; fer-ho aquí un sol cop per navegació evita curses), redirigeix
 * a /entrar si no n'hi ha, i recorda l'últim grup visitat.
 *
 * Això és una comprovació optimista: la seguretat de debò és la RLS.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
        // Una resposta que porta cookies de sessió no s'ha de guardar a cap CDN.
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value)
      },
    },
  })

  // No posis codi entre createServerClient i getClaims: és el que refresca.
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims?.sub)
  const { pathname, search } = request.nextUrl

  if (!signedIn && !PUBLIC_PATHS.some((re) => re.test(pathname))) {
    const url = request.nextUrl.clone()
    url.pathname = '/entrar'
    url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname + search)}`
    return withCookies(NextResponse.redirect(url), response)
  }

  if (signedIn && pathname === '/entrar') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return withCookies(NextResponse.redirect(url), response)
  }

  const group = GROUP_PATH.exec(pathname)?.[1]
  if (group && request.cookies.get(ACTIVE_GROUP_COOKIE)?.value !== group) {
    response.cookies.set(ACTIVE_GROUP_COOKIE, group, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
      httpOnly: true,
    })
  }

  return response
}

/** Copia les cookies de sessió refrescades a una resposta de redirecció. */
function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie)
  source.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'cache-control' || key.toLowerCase() === 'pragma' || key.toLowerCase() === 'expires') {
      target.headers.set(key, value)
    }
  })
  return target
}

export const config = {
  matcher: [
    // Tot menys els fitxers estàtics, les icones i el manifest.
    '/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|icons/|flags/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
