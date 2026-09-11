'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyMatch } from '@/lib/notifications/notify'

export type BusinessActionResult =
  | { ok: true; won?: boolean }
  | { ok: false; error: string }

// The signed-in user must be a member of the provider they act for. RLS scopes
// provider_members to the caller, so a returned row proves membership. Writes
// then go through the service role (like the guest flow) with membership already
// established.
async function assertMember(providerId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('provider_members')
    .select('provider_id')
    .eq('provider_id', providerId)
    .maybeSingle()
  return Boolean(data)
}

const acceptSchema = z.object({
  requestId: z.string().uuid(),
  providerId: z.string().uuid(),
  // Concrete start the master picked inside a window (REQUESTS §3).
  startsAt: z.string().datetime(),
})

// Take a fixed request. Uses the existing atomic accept_request RPC (§6): the
// status gate decides the single winner. We resolve the service (the request's
// own, or this provider's cheapest in the category), price and duration, then
// let the RPC create the match + booking in one transaction.
export async function acceptRequest(input: unknown): Promise<BusinessActionResult> {
  const parsed = acceptSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const { requestId, providerId, startsAt } = parsed.data
  if (!(await assertMember(providerId))) return { ok: false, error: 'Not authorized.' }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from('requests')
    .select('id, type, status, service_id, category_id, budget_max_pence')
    .eq('id', requestId)
    .maybeSingle()
  if (!req) return { ok: false, error: 'Request not found.' }
  if (req.status !== 'broadcasting') return { ok: false, error: 'taken' }

  // Resolve the service: the request's own (specific master), else this
  // provider's cheapest service in the request category.
  let serviceId = req.service_id
  let pricePence: number | null = null
  let durationMin = 60
  if (serviceId) {
    const { data: s } = await admin
      .from('services')
      .select('price_pence, duration_min')
      .eq('id', serviceId)
      .maybeSingle()
    if (s) {
      pricePence = s.price_pence
      durationMin = s.duration_min
    }
  } else {
    const { data: svcs } = await admin
      .from('services')
      .select('id, price_pence, duration_min')
      .eq('provider_id', providerId)
      .order('price_pence', { ascending: true })
      .limit(1)
    if (svcs && svcs.length > 0) {
      serviceId = svcs[0].id
      pricePence = svcs[0].price_pence
      durationMin = svcs[0].duration_min
    }
  }
  if (pricePence == null) pricePence = req.budget_max_pence ?? 0

  const endsAt = new Date(new Date(startsAt).getTime() + durationMin * 60 * 1000).toISOString()

  // The match itself is the record (request_matches). We deliberately do NOT
  // create a booking here: bookings are the native instant-booking flow and
  // enforce_booking_rules rejects them for non-native providers — which is who
  // the request flow serves. Passing p_service_id = null skips the booking insert
  // in the (unchanged) atomic accept while still recording time + price.
  const { data: won, error } = await admin.rpc('accept_request', {
    p_request_id: requestId,
    p_provider_id: providerId,
    p_service_id: null,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_price_pence: pricePence,
  })
  if (error) return { ok: false, error: error.message }
  if (won === false) return { ok: true, won: false } // lost the race — calm message in UI

  await notifyMatch(requestId, providerId) // match event (§8)
  revalidatePath('/business/requests')
  return { ok: true, won: true }
}

const declineSchema = z.object({
  requestId: z.string().uuid(),
  providerId: z.string().uuid(),
})

export async function declineRequest(input: unknown): Promise<BusinessActionResult> {
  const parsed = declineSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const { requestId, providerId } = parsed.data
  if (!(await assertMember(providerId))) return { ok: false, error: 'Not authorized.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('request_targets')
    .update({ response: 'declined', responded_at: new Date().toISOString() })
    .eq('request_id', requestId)
    .eq('provider_id', providerId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/business/requests')
  return { ok: true }
}

const offerSchema = z.object({
  requestId: z.string().uuid(),
  providerId: z.string().uuid(),
  pricePence: z.number().int().min(0),
  message: z.string().trim().max(500).nullable().default(null),
  proposedStart: z.string().datetime().nullable().default(null),
})

// Quote requests: the master responds with a priced offer; the client chooses
// later (REQUESTS §2). Not an accept — no race, no match yet.
export async function submitOffer(input: unknown): Promise<BusinessActionResult> {
  const parsed = offerSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const d = parsed.data
  if (!(await assertMember(d.providerId))) return { ok: false, error: 'Not authorized.' }

  const admin = createAdminClient()
  const { error } = await admin.from('request_offers').upsert(
    {
      request_id: d.requestId,
      provider_id: d.providerId,
      price_pence: d.pricePence,
      message: d.message,
      proposed_start: d.proposedStart,
      status: 'open',
    },
    { onConflict: 'request_id,provider_id' },
  )
  if (error) return { ok: false, error: error.message }
  await admin
    .from('request_targets')
    .update({ response: 'accepted', responded_at: new Date().toISOString() })
    .eq('request_id', d.requestId)
    .eq('provider_id', d.providerId)
  revalidatePath('/business/requests')
  return { ok: true }
}
