'use server'

import { saveProvider } from './provider-actions'
import { slugify, parseServices } from '@/lib/providers/quick'

// §10 fast master entry: name, category, borough, phone, languages, services as
// one line. Creates a DRAFT pro (contact-to-arrange) with claimed languages and
// parsed services; the admin opens the full form to finish before publishing.

export type QuickMasterInput = {
  name: string
  categoryId: string
  borough: string
  phone: string
  languages: string[]
  servicesLine: string
}

export async function quickCreateMaster(
  input: QuickMasterInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim()
  const borough = input.borough.trim()
  if (!name) return { ok: false, error: 'Name is required.' }
  if (!input.categoryId) return { ok: false, error: 'Pick a category.' }
  if (!borough) return { ok: false, error: 'Borough is required.' }

  const payload = {
    slug: slugify(name),
    name_en: name,
    description_en: null,
    category_id: input.categoryId,
    borough,
    phone: input.phone.trim() || null,
    fulfillment_type: 'enquiry' as const,
    status: 'draft' as const,
    entity_type: 'pro' as const,
    // Unclaimed avoids the description requirement; the admin claims it in the
    // full form before publishing.
    claim_status: 'unclaimed' as const,
    booking_enabled: false,
    languages: input.languages,
    services: parseServices(input.servicesLine),
  }

  const res = await saveProvider(null, payload)
  if (res.ok) return { ok: true }
  const fieldMsg = res.fieldErrors ? Object.values(res.fieldErrors)[0] : undefined
  return { ok: false, error: res.formError ?? fieldMsg ?? 'Could not create the master.' }
}
