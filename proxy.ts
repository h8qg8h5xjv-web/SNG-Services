import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from './i18n/routing'
import { updateSession } from './lib/supabase/middleware'

// Next 16 renamed the "middleware" convention to "proxy". Two concerns:
//   - /admin/*  : Supabase session refresh + auth guard (no i18n)
//   - everything else : next-intl locale routing
const handleI18n = createMiddleware(routing)

// Reachable without a session (the login form and the magic-link callback).
const ADMIN_PUBLIC = ['/admin/login', '/admin/auth']

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
  const response = handleI18n(request)
  response.headers.set('x-pathname', request.nextUrl.pathname)
  return response
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
