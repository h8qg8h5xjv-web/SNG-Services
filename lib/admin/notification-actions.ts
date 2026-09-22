'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin/auth'

// §5: admin marks a queued notification as sent (after forwarding it by hand).
export async function markNotificationSent(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) return { ok: false, error: 'Not authorized.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('notification_queue')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/notifications')
  return { ok: true }
}
