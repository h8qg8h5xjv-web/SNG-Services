import { createAdminClient } from '@/lib/supabase/admin'
import { matchProviders, type MatchProvider } from './match'

// Idempotent wave job (REQUESTS §5). Advances broadcasting requests through
// waves 1→2→3 by time, inserting new request_targets, and expires the rest.
// Re-running never double-targets: targets are only added for waves not yet
// present, and never for a provider already targeted (also guarded by the
// unique (request_id, provider_id) constraint). Notifications are a separate
// step — this only progresses waves and expiry.

const WAVE_INTERVAL_MS = 15 * 60 * 1000
// Urgent ("today") requests expand through waves faster so an answer can arrive
// the same day; wave 1 already fires immediately for everyone (on create).
const URGENT_WAVE_INTERVAL_MS = 5 * 60 * 1000
const MAX_WAVE = 3

// An expired verified registration is not effective (read as self_declared).
function effectiveVerified(status: string, expiresAt: string | null, now: Date): boolean {
  if (status !== 'verified') return false
  return !expiresAt || new Date(expiresAt) > now
}

export async function advanceRequests(
  now: Date = new Date(),
): Promise<{ targeted: number; expired: number }> {
  const supabase = createAdminClient()

  const { data: requests } = await supabase
    .from('requests')
    .select(
      'id, type, category_id, borough, budget_max_pence, target_provider_id, created_at, urgency, regulated_kind',
    )
    .eq('status', 'broadcasting')
  if (!requests || requests.length === 0) return { targeted: 0, expired: 0 }

  const { data: provs } = await supabase
    .from('providers')
    .select(
      'id, category_id, borough, broadcast_paused_until, ' +
        'gas_safe_status, gas_safe_expires_at, electrical_status, electrical_expires_at, ' +
        'services(price_pence)',
    )
    .eq('status', 'published')
    .returns<
      {
        id: string
        category_id: string
        borough: string
        broadcast_paused_until: string | null
        gas_safe_status: string
        gas_safe_expires_at: string | null
        electrical_status: string
        electrical_expires_at: string | null
        services: { price_pence: number }[]
      }[]
    >()

  const pool: MatchProvider[] = (provs ?? []).map((p) => ({
    id: p.id,
    category_id: p.category_id,
    borough: p.borough,
    broadcast_paused_until: p.broadcast_paused_until,
    min_price_pence:
      p.services.length > 0 ? Math.min(...p.services.map((s) => s.price_pence)) : null,
    gas_safe_verified: effectiveVerified(p.gas_safe_status, p.gas_safe_expires_at, now),
    electrical_verified: effectiveVerified(p.electrical_status, p.electrical_expires_at, now),
  }))

  let targeted = 0
  let expired = 0

  for (const r of requests) {
    const ageMs = now.getTime() - Date.parse(r.created_at)
    const intervalMs = r.urgency === 'today' ? URGENT_WAVE_INTERVAL_MS : WAVE_INTERVAL_MS

    // After wave 3 + one interval with no acceptance, the request expires.
    if (ageMs > MAX_WAVE * intervalMs) {
      const { data } = await supabase
        .from('requests')
        .update({ status: 'expired' })
        .eq('id', r.id)
        .eq('status', 'broadcasting')
        .select('id')
      if (data && data.length) expired++
      continue
    }

    const dueWave = Math.min(MAX_WAVE, Math.floor(ageMs / intervalMs) + 1)

    const { data: existing } = await supabase
      .from('request_targets')
      .select('provider_id, wave')
      .eq('request_id', r.id)
    const existingWave = (existing ?? []).reduce((m, t) => Math.max(m, t.wave), 0)
    const targetedIds = new Set((existing ?? []).map((t) => t.provider_id))

    for (let wave = existingWave + 1; wave <= dueWave; wave++) {
      const ids = matchProviders(
        {
          type: r.type as 'fixed' | 'quote',
          category_id: r.category_id,
          borough: r.borough,
          budget_max_pence: r.budget_max_pence,
          target_provider_id: r.target_provider_id,
          regulated_kind: r.regulated_kind as 'gas' | 'electrical' | 'other' | null,
        },
        wave,
        pool,
        now,
      ).filter((id) => !targetedIds.has(id))

      if (ids.length > 0) {
        await supabase
          .from('request_targets')
          .insert(ids.map((id) => ({ request_id: r.id, provider_id: id, wave })))
        ids.forEach((id) => targetedIds.add(id))
        targeted += ids.length
      }
    }
  }

  return { targeted, expired }
}
