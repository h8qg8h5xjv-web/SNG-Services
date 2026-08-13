import createMiddleware from 'next-intl/middleware'
import type { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

// Next 16 renamed the "middleware" convention to "proxy". This handles locale
// detection (Accept-Language), the cookie override, and the always-explicit
// URL prefix via next-intl.
const handleI18n = createMiddleware(routing)

export function proxy(request: NextRequest) {
  const response = handleI18n(request)
  // Expose the current path so layouts/pages can build hreflang alternates.
  response.headers.set('x-pathname', request.nextUrl.pathname)
  return response
}

export const config = {
  // Run on everything except Next internals, the API, and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
