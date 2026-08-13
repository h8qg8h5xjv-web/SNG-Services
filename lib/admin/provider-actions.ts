'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/auth'
import { providerInputSchema } from '@/lib/admin/schemas'

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string> }

function collectFieldErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key =
      issue.path.map((p) => (typeof p === 'symbol' ? '' : String(p))).join('.') ||
      'form'
    if (!fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export async function saveProvider(
  id: string | null,
  input: unknown,
): Promise<ActionResult> {
  const parsed = providerInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) }
  }
  const d = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdmin(user)) return { ok: false, formError: 'Not authorized.' }

  const scalar = {
    slug: d.slug,
    name_en: d.name_en,
    description_en: d.description_en,
    category_id: d.category_id,
    borough: d.borough,
    address: d.address,
    lat: d.lat,
    lng: d.lng,
    phone: d.phone,
    telegram: d.telegram,
    instagram: d.instagram,
    website: d.website,
    cover_image: d.cover_image,
    fulfillment_type: d.fulfillment_type,
    external_order_url:
      d.fulfillment_type === 'external_order' ? d.external_order_url : null,
  }

  // Upsert as draft first so rebuilding languages never trips the publish trigger.
  let providerId = id
  if (providerId) {
    const { error } = await supabase
      .from('providers')
      .update({ ...scalar, status: 'draft' })
      .eq('id', providerId)
    if (error) return { ok: false, formError: error.message }
  } else {
    const { data: created, error } = await supabase
      .from('providers')
      .insert({ ...scalar, status: 'draft' })
      .select('id')
      .single()
    if (error || !created) {
      return { ok: false, formError: error?.message ?? 'Insert failed.' }
    }
    providerId = created.id
  }
  const pid = providerId as string

  await supabase.from('provider_languages').delete().eq('provider_id', pid)
  if (d.languages.length) {
    const { error } = await supabase
      .from('provider_languages')
      .insert(d.languages.map((code) => ({ provider_id: pid, language_code: code })))
    if (error) return { ok: false, formError: error.message }
  }

  await supabase.from('provider_translations').delete().eq('provider_id', pid)
  const translations = d.translations.filter(
    (t) => (t.name && t.name.trim()) || (t.description && t.description.trim()),
  )
  if (translations.length) {
    const { error } = await supabase.from('provider_translations').insert(
      translations.map((t) => ({
        provider_id: pid,
        locale: t.locale,
        name: t.name,
        description: t.description,
      })),
    )
    if (error) return { ok: false, formError: error.message }
  }

  await supabase.from('services').delete().eq('provider_id', pid)
  if (d.services.length) {
    const { error } = await supabase.from('services').insert(
      d.services.map((s) => ({
        provider_id: pid,
        name_en: s.name_en,
        name_ru: s.name_ru,
        description_en: s.description_en,
        description_ru: s.description_ru,
        duration_min: s.duration_min,
        price_pence: s.price_pence,
        capacity: s.capacity,
      })),
    )
    if (error) return { ok: false, formError: error.message }
  }

  await supabase.from('schedules').delete().eq('provider_id', pid)
  if (d.schedule.length) {
    const { error } = await supabase.from('schedules').insert(
      d.schedule.map((r) => ({
        provider_id: pid,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
      })),
    )
    if (error) return { ok: false, formError: error.message }
  }

  // Final status — the DB trigger enforces "published needs a language" here too.
  const { error: statusError } = await supabase
    .from('providers')
    .update({ status: d.status })
    .eq('id', pid)
  if (statusError) {
    return { ok: false, fieldErrors: { languages: statusError.message } }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/providers')
  return { ok: true, id: pid }
}

export async function deleteProvider(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdmin(user)) return { ok: false, formError: 'Not authorized.' }
  const { error } = await supabase.from('providers').delete().eq('id', id)
  if (error) return { ok: false, formError: error.message }
  revalidatePath('/admin')
  revalidatePath('/admin/providers')
  return { ok: true, id }
}
