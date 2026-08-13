import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Service-role client — bypasses RLS. Import ONLY from server code (server
// actions, route handlers, server components): it reads SUPABASE_SERVICE_ROLE_KEY,
// which must never reach the client. Used for anonymous booking writes and for
// reading occupancy when computing slots.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
