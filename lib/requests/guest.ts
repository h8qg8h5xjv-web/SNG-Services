'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { notifyMatch, notifyCancel } from '@/lib/notifications/notify'

export type GuestOffer = {
  id: string
  providerName: string
  pricePence: number
  message: string | null
  proposedStart: string | null
}

export type GuestRequestState = {
  status: 'draft' | 'broadcasting' | 'matched' | 'confirmed' | 'expired' | 'cancelled' | 'completed'
  type: 'fixed' | 'quote'
  askedCount: number
  maxWave: number
  match: {
    providerName: string
    startsAt: string | null
    endsAt: string | null
    pricePence: number | null
  } | null
  // quote only: open offers the client can choose from while broadcasting.
  offers: GuestOffer[]
}

// A guest reads/acts on their own request only with (public_ref, guest_token).
// The token gate replaces RLS here (guests have no session); contacts are never
// returned. Waiting screen polls getGuestRequestState (REQUESTS §11).
async function findRequest(ref: string, token: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('requests')
    .select('id, status, type')
    .eq('public_ref', ref)
    .eq('guest_token', token)
    .maybeSingle()
  return data
}

export async function getGuestRequestState(
  ref: string,
  token: string,
): Promise<GuestRequestState | null> {
  const supabase = createAdminClient()
  const req = await findRequest(ref, token)
  if (!req) return null

  const { data: targets } = await supabase
    .from('request_targets')
    .select('wave')
    .eq('request_id', req.id)
  const askedCount = targets?.length ?? 0
  const maxWave = (targets ?? []).reduce((m, t) => Math.max(m, t.wave), 0)

  let match: GuestRequestState['match'] = null
  if (req.status === 'matched' || req.status === 'confirmed' || req.status === 'completed') {
    const { data: m } = await supabase
      .from('request_matches')
      .select('starts_at, ends_at, price_pence, providers(name_en)')
      .eq('request_id', req.id)
      .maybeSingle()
      .returns<{
        starts_at: string | null
        ends_at: string | null
        price_pence: number | null
        providers: { name_en: string } | null
      }>()
    if (m) {
      match = {
        providerName: m.providers?.name_en ?? '',
        startsAt: m.starts_at,
        endsAt: m.ends_at,
        pricePence: m.price_pence,
      }
    }
  }

  let offers: GuestOffer[] = []
  if (req.type === 'quote' && req.status === 'broadcasting') {
    const { data: rows } = await supabase
      .from('request_offers')
      .select('id, price_pence, message, proposed_start, providers(name_en)')
      .eq('request_id', req.id)
      .eq('status', 'open')
      .order('price_pence', { ascending: true })
      .returns<
        {
          id: string
          price_pence: number
          message: string | null
          proposed_start: string | null
          providers: { name_en: string } | null
        }[]
      >()
    offers = (rows ?? []).map((o) => ({
      id: o.id,
      providerName: o.providers?.name_en ?? '',
      pricePence: o.price_pence,
      message: o.message,
      proposedStart: o.proposed_start,
    }))
  }

  return {
    status: req.status as GuestRequestState['status'],
    type: req.type as GuestRequestState['type'],
    askedCount,
    maxWave,
    match,
    offers,
  }
}

// Client chooses one offer for a quote request. The status gate makes it atomic:
// only the transaction that flips broadcasting→matched wins; the chosen offer
// becomes the match, the rest are rejected.
export async function chooseGuestOffer(
  ref: string,
  token: string,
  offerId: string,
): Promise<GuestActionResult> {
  const supabase = createAdminClient()
  const req = await findRequest(ref, token)
  if (!req) return { ok: false, error: 'Not found' }

  const { data: offer } = await supabase
    .from('request_offers')
    .select('id, provider_id, price_pence, proposed_start')
    .eq('id', offerId)
    .eq('request_id', req.id)
    .maybeSingle()
  if (!offer) return { ok: false, error: 'Offer not found' }

  const { data: won } = await supabase
    .from('requests')
    .update({ status: 'matched' })
    .eq('id', req.id)
    .eq('status', 'broadcasting')
    .select('id')
  if (!won || won.length === 0) return { ok: false, error: 'Request already closed' }

  await supabase.from('request_matches').insert({
    request_id: req.id,
    provider_id: offer.provider_id,
    service_id: null,
    starts_at: offer.proposed_start,
    price_pence: offer.price_pence,
  })
  await supabase.from('request_offers').update({ status: 'chosen' }).eq('id', offer.id)
  await supabase
    .from('request_offers')
    .update({ status: 'rejected' })
    .eq('request_id', req.id)
    .eq('status', 'open')
  await notifyMatch(req.id, offer.provider_id) // match event (REQUESTS §8)
  return { ok: true }
}

export type GuestActionResult = { ok: true } | { ok: false; error: string }

export async function confirmGuestMatch(ref: string, token: string): Promise<GuestActionResult> {
  const supabase = createAdminClient()
  const req = await findRequest(ref, token)
  if (!req) return { ok: false, error: 'Not found' }
  const { error } = await supabase
    .from('requests')
    .update({ status: 'confirmed' })
    .eq('id', req.id)
    .eq('status', 'matched')
  return error ? { ok: false, error: error.message } : { ok: true }
}

export async function cancelGuestRequest(ref: string, token: string): Promise<GuestActionResult> {
  const supabase = createAdminClient()
  const req = await findRequest(ref, token)
  if (!req) return { ok: false, error: 'Not found' }
  const { data: cancelled, error } = await supabase
    .from('requests')
    .update({ status: 'cancelled' })
    .eq('id', req.id)
    .in('status', ['broadcasting', 'matched'])
    .select('id')
  if (error) return { ok: false, error: error.message }
  if (cancelled && cancelled.length > 0) await notifyCancel(req.id) // cancel event (§8)
  return { ok: true }
}
