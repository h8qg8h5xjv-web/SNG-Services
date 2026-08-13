'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/auth'
import type { ActionResult } from '@/lib/admin/provider-actions'
import type { BookingStatus } from '@/types/database'

const STATUSES = ['pending', 'confirmed', 'cancelled'] as const

export async function updateBookingStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  if (!(STATUSES as readonly string[]).includes(status)) {
    return { ok: false, formError: 'Invalid status.' }
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdmin(user)) return { ok: false, formError: 'Not authorized.' }

  const { error } = await supabase
    .from('bookings')
    .update({ status: status as BookingStatus })
    .eq('id', id)
  if (error) {
    // Confirming can hit the capacity trigger.
    const overflow = /capacity exceeded/i.test(error.message)
    return {
      ok: false,
      formError: overflow ? 'Slot capacity exceeded — cannot confirm.' : error.message,
    }
  }
  revalidatePath('/admin/bookings')
  return { ok: true, id }
}
