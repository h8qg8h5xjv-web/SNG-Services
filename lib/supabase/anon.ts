import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Anonymous client for public server reads that don't need request cookies
// (sitemap, robots). RLS still limits it to published content.
export function createAnonClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
