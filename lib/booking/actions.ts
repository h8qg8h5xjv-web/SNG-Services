'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSlotsForServiceDate } from '@/lib/slots/service'
import { bookingInputSchema } from '@/lib/booking/schema'
import type { Slot } from '@/lib/slots/compute'

export async function getSlots(serviceId: string, date: string): Promise<Slot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
  return getSlotsForServiceDate(serviceId, date)
}

export type CreateBookingResult =
  | { ok: true; startsAt: string; endsAt: string; partySize: number }
  | { ok: false; error: string }

export async function createBooking(input: unknown): Promise<CreateBookingResult> {
  const parsed = bookingInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid data.' }
  }
  const d = parsed.data

  const supabase = createAdminClient()

  // Recompute the end time from the service duration server-side (don't trust the client).
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('duration_min')
    .eq('id', d.service_id)
    .maybeSingle()
  if (serviceError || !service) {
    return { ok: false, error: 'Service not found.' }
  }

  const startsAt = new Date(d.starts_at)
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: 'Invalid slot.' }
  }
  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60000)

  const { error } = await supabase.from('bookings').insert({
    service_id: d.service_id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    party_size: d.party_size,
    customer_name: d.customer_name,
    customer_phone: d.customer_phone,
    customer_email: d.customer_email,
    status: 'pending',
  })

  if (error) {
    // The DB trigger raises check_violation when the slot is full.
    const overflow = /capacity exceeded/i.test(error.message)
    return {
      ok: false,
      error: overflow
        ? 'Sorry — this slot was just taken. Please pick another time.'
        : 'Could not create the booking. Please try again.',
    }
  }

  return {
    ok: true,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    partySize: d.party_size,
  }
}
