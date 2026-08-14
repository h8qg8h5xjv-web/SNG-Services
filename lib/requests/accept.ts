'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AcceptResult =
  | { ok: true; won: boolean }
  | { ok: false; error: string }

/**
 * A provider accepts a fixed request. Authorization (caller owns the provider)
 * is checked with the user session; the atomic race gate lives in the
 * accept_request() DB function (SECURITY DEFINER) — see REQUESTS §6. `won:false`
 * means the request was already taken (not an error).
 */
export async function acceptRequest(input: {
  requestId: string
  providerId: string
  serviceId: string | null
  startsAt: string | null
  endsAt: string | null
  pricePence: number | null
}): Promise<AcceptResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  // Must own the provider being accepted for.
  const { data: membership } = await supabase
    .from('provider_members')
    .select('provider_id')
    .eq('provider_id', input.providerId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return { ok: false, error: 'Not a member of this provider.' }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('accept_request', {
    p_request_id: input.requestId,
    p_provider_id: input.providerId,
    p_service_id: input.serviceId,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_price_pence: input.pricePence,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, won: data === true }
}
