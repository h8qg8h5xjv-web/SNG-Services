'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

// A "get into the catalog" lead from /for-business. Registration stays
// invite-only — this never creates a provider card, only a row in the admin
// queue. Written with the service role (like guest requests), since anon has no
// table access here.
const schema = z
  .object({
    businessName: z.string().trim().min(1).max(200),
    contactName: z.string().trim().min(1).max(200),
    contactEmail: z.string().trim().email().max(200).nullable().default(null),
    contactPhone: z.string().trim().max(50).nullable().default(null),
    category: z.string().trim().max(100).nullable().default(null),
    borough: z.string().trim().max(100).nullable().default(null),
    message: z.string().trim().max(2000).nullable().default(null),
  })
  .refine((d) => d.contactEmail !== null || d.contactPhone !== null, {
    message: 'needContact',
    path: ['contactEmail'],
  })

export type CatalogRequestResult = { ok: true } | { ok: false; error: string }

export async function submitCatalogRequest(input: unknown): Promise<CatalogRequestResult> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid' }
  }
  const d = parsed.data
  const supabase = createAdminClient()
  const { error } = await supabase.from('catalog_requests').insert({
    business_name: d.businessName,
    contact_name: d.contactName,
    contact_email: d.contactEmail,
    contact_phone: d.contactPhone,
    category: d.category,
    borough: d.borough,
    message: d.message,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
