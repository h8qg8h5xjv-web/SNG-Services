'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { advanceRequests } from './advance'

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
  description: z.string().trim().max(1000).nullable().default(null),
  budgetMaxPence: z.number().int().min(0).nullable().default(null),
  windows: z.array(windowSchema).min(1, 'Pick at least one time window'),
  contactName: z.string().trim().min(1),
  contactPhone: z.string().trim().min(1),
  contactEmail: z.string().trim().email().nullable().default(null),
})

export type CreateRequestResult =
  | { ok: true; ref: string; token: string }
  | { ok: false; error: string }

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

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // ~1h horizon

  const { data: request, error } = await supabase
    .from('requests')
    .insert({
      type: d.type,
      category_id: d.categoryId,
      service_id: d.serviceId,
      target_provider_id: d.targetProviderId,
      borough: d.borough,
      description: d.description,
      budget_max_pence: d.budgetMaxPence,
      status: 'broadcasting',
      expires_at: expiresAt,
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
    }),
    supabase
      .from('request_windows')
      .insert(d.windows.map((w) => ({ request_id: request.id, starts_at: w.starts_at, ends_at: w.ends_at }))),
  ])
  if (cErr || wErr) return { ok: false, error: (cErr ?? wErr)!.message }

  // Wave 1 now (idempotent); waves 2/3 + expiry are the background job's.
  await advanceRequests()

  return { ok: true, ref: request.public_ref, token: request.guest_token }
}
