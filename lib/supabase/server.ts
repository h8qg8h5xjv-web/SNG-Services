import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * `cookies()` is async in Next.js — this factory must be awaited.
 *
 * When called from a Server Component, cookie writes are silently swallowed:
 * Server Components cannot set outgoing cookies, and Supabase's session
 * refresh is handled by middleware instead. See DESIGN.md / PROMPTS.md.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component — safe to ignore when a
            // middleware refreshes the session.
          }
        },
      },
    },
  )
}
