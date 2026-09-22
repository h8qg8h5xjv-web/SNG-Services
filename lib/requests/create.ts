'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseUkPostcode } from '@/lib/postcode'
import { advanceRequests, loadMatchPool } from './advance'
import { eligibleProviderCount } from './match'

// §1: below this many eligible masters a request is not broadcast but queued for
// a manual hand-off. Env-tunable; 3 by default.
function minTargets(): number {
  const n = Number(process.env.REQUEST_MIN_TARGETS)
  return Number.isInteger(n) && n > 0 ? n : 3
}

// A time window the client offers (REQUESTS §3) — not an exact time.
const windowSchema = z.object({
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
})

const createSchema = z.object({
  categoryId: z.string().uuid(),
  type: z.enum(['fixed', 'quote']),
  // "specific master" mode carries the provider (and, for fixed, the service).
  targetProviderId: z.string().uuid().nullable().default(null),
  serviceId: z.string().uuid().nullable().default(null),
  borough: z.string().min(1),
  postcode: z.string().trim().min(1),
  urgency: z.enum(['today', 'this_week', 'flexible']),
  photos: z.array(z.string()).max(5).default([]),
  regulatedKind: z.enum(['gas', 'electrical', 'other']).nullable().default(null),
  description: z.string().trim().max(1000).nullable().default(null),
  budgetMaxPence: z.number().int().min(0).nullable().default(null),
  windows: z.array(windowSchema).min(1, 'Pick at least one time window'),
  contactName: z.string().trim().min(1),
  contactPhone: z.string().trim().min(1),
  contactEmail: z.string().trim().email().nullable().default(null),
})

export type CreateRequestResult =
  // manual = too few eligible masters, queued for hand-off instead of broadcast (§1).
  | { ok: true; ref: string; token: string; manual: boolean }
  // 'no_regulated_providers': a hard LEGAL D3a stop — no verified master exists.
  | { ok: false; error: string; code?: 'no_regulated_providers' }

// LEGAL D3a: does the catalog hold ANY published provider with the matching
// verified (non-expired) registration? gas→Gas Safe, electrical→scheme,
// other→either. Used to stop a regulated request that could never be fulfilled.
async function hasRegulatedProvider(
  supabase: ReturnType<typeof createAdminClient>,
  categoryId: string,
  kind: 'gas' | 'electrical' | 'other',
): Promise<boolean> {
  const { data } = await supabase
    .from('providers')
    .select('gas_safe_status, gas_safe_expires_at, electrical_status, electrical_expires_at')
    .eq('status', 'published')
    .eq('category_id', categoryId)
  const now = new Date()
  const ok = (status: string, exp: string | null) =>
    status === 'verified' && (!exp || new Date(exp) > now)
  return (data ?? []).some((p) => {
    const gas = ok(p.gas_safe_status, p.gas_safe_expires_at)
    const ele = ok(p.electrical_status, p.electrical_expires_at)
    if (kind === 'gas') return gas
    if (kind === 'electrical') return ele
    return gas || ele
  })
}

// Creates a guest request (no auth), then runs wave 1 targeting immediately so
// providers are notified right away; later waves are advanced by the background
// job. Contacts/address live in request_contacts and are never exposed until a
// match (RLS, REQUESTS §12.1).
export async function createRequest(input: unknown): Promise<CreateRequestResult> {
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' }
  }
  const d = parsed.data
  const supabase = createAdminClient()

  const postcode = parseUkPostcode(d.postcode)
  if (!postcode) return { ok: false, error: 'Проверьте формат postcode (например, SW1A 1AA).' }

  // LEGAL D3a hard stop: a regulated request with no eligible master in the
  // catalog is never broadcast — we tell the client honestly instead.
  if (d.regulatedKind) {
    const eligible = await hasRegulatedProvider(supabase, d.categoryId, d.regulatedKind)
    if (!eligible) {
      return {
        ok: false,
        code: 'no_regulated_providers',
        error: 'В каталоге пока нет мастеров с подтверждённой регистрацией для этой работы.',
      }
    }
  }

  const now = new Date()

  // §1 emptiness guard: count who could actually be asked. Below the threshold we
  // don't broadcast into a near-empty pool — the request is queued as 'manual'
  // for a hand-off. A specific-master request is a direct ask, never manual.
  const pool = await loadMatchPool(supabase, now)
  const eligible = eligibleProviderCount(
    {
      type: d.type,
      category_id: d.categoryId,
      borough: d.borough,
      budget_max_pence: d.budgetMaxPence,
      target_provider_id: d.targetProviderId,
      regulated_kind: d.regulatedKind,
    },
    pool,
    now,
  )
  const manual = !d.targetProviderId && eligible < minTargets()

  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString() // ~1h horizon

  const { data: request, error } = await supabase
    .from('requests')
    .insert({
      type: d.type,
      category_id: d.categoryId,
      service_id: d.serviceId,
      target_provider_id: d.targetProviderId,
      borough: d.borough,
      postcode_outward: postcode.outward,
      urgency: d.urgency,
      photos: d.photos.length > 0 ? d.photos : null,
      regulated: d.regulatedKind !== null,
      regulated_kind: d.regulatedKind,
      description: d.description,
      budget_max_pence: d.budgetMaxPence,
      // manual requests never enter the wave job (it only touches 'broadcasting').
      status: manual ? 'manual' : 'broadcasting',
      expires_at: manual ? null : expiresAt,
    })
    .select('id, public_ref, guest_token')
    .single()
  if (error || !request) {
    return { ok: false, error: error?.message ?? 'Could not create the request.' }
  }

  const [{ error: cErr }, { error: wErr }] = await Promise.all([
    supabase.from('request_contacts').insert({
      request_id: request.id,
      contact_name: d.contactName,
      contact_phone: d.contactPhone,
      contact_email: d.contactEmail,
      postcode: postcode.full,
    }),
    supabase
      .from('request_windows')
      .insert(d.windows.map((w) => ({ request_id: request.id, starts_at: w.starts_at, ends_at: w.ends_at }))),
  ])
  if (cErr || wErr) return { ok: false, error: (cErr ?? wErr)!.message }

  // Wave 1 now (idempotent); waves 2/3 + expiry are the background job's. Manual
  // requests are skipped — an admin hands them off from the queue instead.
  if (!manual) await advanceRequests()

  return { ok: true, ref: request.public_ref, token: request.guest_token, manual }
}
