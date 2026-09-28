'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getSlotsForServiceDate } from '@/lib/slots/service'
import { bookingInputSchema } from '@/lib/booking/schema'
import { recordEvents } from '@/lib/tracking/events'
import type { Slot } from '@/lib/slots/compute'

export async function getSlots(serviceId: string, date: string): Promise<Slot[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return []
  return getSlotsForServiceDate(serviceId, date)
}

/**
 * Names of people who opted into being visible on a group slot (Phase 2).
 * Presence only — the security-definer function returns names, never contacts.
 */
export async function getSlotParticipants(
  serviceId: string,
  startsAt: string,
): Promise<string[]> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase.rpc('slot_participants', {
      p_service_id: serviceId,
      p_starts_at: startsAt,
    })
    return (data ?? []).map((r) => r.name)
  } catch {
    return []
  }
}

export type CreateBookingResult =
  // ref + token: the guest's read key, remembered in the browser like a request's.
  | { ok: true; startsAt: string; endsAt: string; partySize: number; ref: string; token: string }
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
    .select('duration_min, price_pence, provider_id')
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

  // Signed in → the booking belongs to the account (from the session, never the
  // client). A guest's booking is linked later, on sign-in, by (ref, token).
  const {
    data: { user },
  } = await (await createClient()).auth.getUser()

  const { data: created, error } = await supabase.from('bookings').insert({
    service_id: d.service_id,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    party_size: d.party_size,
    customer_name: d.customer_name,
    customer_phone: d.customer_phone,
    customer_email: d.customer_email,
    is_visible_to_group: d.is_visible_to_group,
    status: 'pending',
    // Snapshot the price/duration onto the booking so a later price change
    // never rewrites this booking's history (the trigger also enforces this).
    price_pence: service.price_pence,
    duration_min: service.duration_min,
    customer_id: user?.id ?? null,
  })
    .select('public_ref, guest_token')
    .single()

  if (error || !created) {
    // The DB trigger raises check_violation when the slot (service seats) or the
    // provider (parallel capacity, …36) is full.
    const overflow = error ? /capacity exceeded|fully booked/i.test(error.message) : false
    return {
      ok: false,
      error: overflow
        ? 'Sorry — this slot was just taken. Please pick another time.'
        : 'Could not create the booking. Please try again.',
    }
  }

  const sessionId = (await cookies()).get('sng_sid')?.value ?? null
  await recordEvents(
    [{ provider_id: service.provider_id, event_type: 'booking_completed', surface: 'booking' }],
    sessionId,
  )

  return {
    ok: true,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    partySize: d.party_size,
    ref: created.public_ref,
    token: created.guest_token,
  }
}
