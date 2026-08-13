import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * An admin is an authenticated user whose JWT carries app_metadata.is_admin.
 * This matches the is_admin() function used by the RLS policies, so an
 * authenticated non-admin can sign in but cannot read drafts or write anything.
 */
export function isAdmin(user: User | null): boolean {
  return Boolean(user?.app_metadata?.is_admin)
}

/** Current signed-in user (or null), for admin server components/actions. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
