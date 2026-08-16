'use server'

import { createAdminClient } from '@/lib/supabase/admin'

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

  return {
    status: req.status as GuestRequestState['status'],
    type: req.type as GuestRequestState['type'],
    askedCount,
    maxWave,
    match,
  }
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
  const { error } = await supabase
    .from('requests')
    .update({ status: 'cancelled' })
    .eq('id', req.id)
    .in('status', ['broadcasting', 'matched'])
  return error ? { ok: false, error: error.message } : { ok: true }
}
