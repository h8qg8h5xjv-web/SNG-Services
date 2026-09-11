import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { updateSession } from './lib/supabase/middleware'
import type { Database } from './types/database'

// Next 16 renamed the "middleware" convention to "proxy". Three concerns:
//   - /admin/*                 : Supabase session refresh + admin guard (no i18n)
//   - /[locale]/business/*     : i18n + session refresh + provider_members guard
//   - everything else          : next-intl locale routing
const handleI18n = createMiddleware(routing)

// Reachable without a session (the login form and the magic-link callback).
const ADMIN_PUBLIC = ['/admin/login', '/admin/auth']

// A localized path like /en/business/... — everything under it needs a master
// session, except the login form and the magic-link callback.
const BUSINESS_RE = /^\/[^/]+\/business(?:\/.*)?$/
function businessPublic(localeStripped: string): boolean {
  return localeStripped.startsWith('/business/login') || localeStripped.startsWith('/business/auth')
}

// Runs i18n routing, then refreshes the session and guards by provider_members.
// The cabinet is off-limits to anyone who isn't a member of some provider.
async function handleBusiness(request: NextRequest): Promise<NextResponse> {
  const response = handleI18n(request)
  // i18n issued a redirect (e.g. adding the locale prefix) — let it happen; the
  // guard runs on the next request to the prefixed URL.
  if (response.headers.get('location')) return response

  const { pathname } = request.nextUrl
  const locale = pathname.split('/')[1]
  const localeStripped = pathname.replace(/^\/[^/]+/, '')
  if (businessPublic(localeStripped)) return response

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    },
  )
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/business/login`
    url.search = `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }
  const { data: membership } = await supabase.from('provider_members').select('provider_id').limit(1)
  if (!membership || membership.length === 0) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/business/login`
    url.search = '?error=not_member'
    return NextResponse.redirect(url)
  }
  return response
}

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
  if (BUSINESS_RE.test(request.nextUrl.pathname)) {
    return handleBusiness(request)
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
