import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { updateSession } from './lib/supabase/middleware'

// Next 16 renamed the "middleware" convention to "proxy". Concerns:
//   - /admin/*                       : Supabase session refresh + admin guard (no i18n)
//   - /[locale]/(business|profile)   : redirect to the unified /cabinet
//   - everything else                : next-intl locale routing
// The cabinet itself is public (it works signed-out and shows a login prompt),
// so it is not guarded here.
const handleI18n = createMiddleware(routing)

// Reachable without a session (the login form and the magic-link callback).
const ADMIN_PUBLIC = ['/admin/login', '/admin/auth']

// Legacy split cabinets → one /cabinet.
const LEGACY_CABINET_RE = /^\/([^/]+)\/(business|profile)(?:\/.*)?$/

async function handleAdmin(request: NextRequest): Promise<NextResponse> {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl
  const isPublic = ADMIN_PUBLIC.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  if (user && pathname === '/admin/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return response
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return handleAdmin(request)
  }

  const legacy = request.nextUrl.pathname.match(LEGACY_CABINET_RE)
  if (legacy) {
    const url = request.nextUrl.clone()
    url.pathname = `/${legacy[1]}/cabinet`
    url.search = ''
    return NextResponse.redirect(url)
  }

  const response = handleI18n(request)
  response.headers.set('x-pathname', request.nextUrl.pathname)
  // Pseudonymous session id for analytics (no identity, no IP/UA stored).
  if (!request.cookies.get('sng_sid')) {
    response.cookies.set('sng_sid', crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  }
  return response
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
