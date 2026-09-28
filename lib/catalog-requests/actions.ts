'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadReferences } from '@/lib/onboarding/reference'
import { checkCatalogRequest } from '@/lib/onboarding/validate'

// A "get into the catalog" lead from /for-business. Registration stays
// invite-only — this never creates a provider card, only a row in the admin
// queue. Written with the service role (like guest requests), since anon has no
// table access here. Category and district come from the reference tables
// (checked here, never trusting the client); «Моей категории нет» stores a
// suggestion that never creates a category.
const schema = z
  .object({
    businessName: z.string().trim().min(1).max(200),
    contactName: z.string().trim().min(1).max(200),
    contactEmail: z.string().trim().email().max(200).nullable().default(null),
    contactPhone: z.string().trim().max(50).nullable().default(null),
    categoryId: z.string().trim().min(1).max(100),
    categorySuggestion: z.string().max(1000).nullable().default(null),
    borough: z.string().trim().min(1).max(100),
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
  const checked = checkCatalogRequest(
    { categoryId: d.categoryId, suggestion: d.categorySuggestion, borough: d.borough },
    await loadReferences(),
  )
  if (!checked.ok) return { ok: false, error: checked.error }

  const supabase = createAdminClient()
  const { error } = await supabase.from('catalog_requests').insert({
    business_name: d.businessName,
    contact_name: d.contactName,
    contact_email: d.contactEmail,
    contact_phone: d.contactPhone,
    category_id: checked.categoryId,
    category_suggestion: checked.suggestion,
    borough: checked.borough,
    message: d.message,
  })
  if (error) return { ok: false, error: error.message }

  // Tell the admin (same queue as the other admin notifications).
  const what = checked.suggestion ? `suggested category «${checked.suggestion}»` : 'a listed category'
  await supabase.from('notification_queue').insert({
    provider_id: null,
    provider_name: d.businessName,
    kind: 'new_catalog_request',
    subject: `New catalogue request: ${d.businessName}`,
    body: `${d.contactName} (${checked.borough}) asked to join the catalogue, ${what}. Review it in the admin.`,
    cta_path: '/admin/catalog-requests',
    status: 'unsent',
  })
  return { ok: true }
}
