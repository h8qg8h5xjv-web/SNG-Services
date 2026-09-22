'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin/auth'

// §1: an admin marks a manual request as handed off, recording to whom. Re-checks
// the session, then writes via the service role (status is not member-writable).
export async function markRequestHandled(
  id: string,
  handedTo: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) return { ok: false, error: 'Not authorized.' }

  const to = handedTo.trim()
  if (!to) return { ok: false, error: 'Say who it was passed to.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('requests')
    .update({ status: 'handled', manual_handled_at: new Date().toISOString(), manual_handled_to: to })
    .eq('id', id)
    .eq('status', 'manual')
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/requests')
  return { ok: true }
}
