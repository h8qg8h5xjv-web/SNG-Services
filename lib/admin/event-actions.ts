'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/auth'
import { eventInputSchema } from '@/lib/admin/schemas'
import type { EventCategory } from '@/types/database'
import type { ActionResult } from '@/lib/admin/provider-actions'

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

export async function saveEvent(
  id: string | null,
  input: unknown,
): Promise<ActionResult> {
  const parsed = eventInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error.issues) }
  }
  const d = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdmin(user)) return { ok: false, formError: 'Not authorized.' }

  const row = {
    slug: d.slug,
    title_en: d.title_en,
    title_ru: d.title_ru,
    description_en: d.description_en,
    description_ru: d.description_ru,
    category: d.category as EventCategory,
    starts_at: new Date(d.starts_at).toISOString(),
    ends_at: d.ends_at ? new Date(d.ends_at).toISOString() : null,
    venue_name: d.venue_name,
    address: d.address,
    lat: d.lat,
    lng: d.lng,
    borough: d.borough,
    price_from_pence: d.price_from_pence,
    ticket_url: d.ticket_url,
    organizer_provider_id: d.organizer_provider_id,
    languages: d.languages,
    cover_image: d.cover_image,
    status: d.status,
  }

  if (id) {
    const { error } = await supabase.from('events').update(row).eq('id', id)
    if (error) return { ok: false, formError: error.message }
    revalidatePath('/admin/events')
    return { ok: true, id }
  }
  const { data: created, error } = await supabase
    .from('events')
    .insert(row)
    .select('id')
    .single()
  if (error || !created) {
    return { ok: false, formError: error?.message ?? 'Insert failed.' }
  }
  revalidatePath('/admin')
  revalidatePath('/admin/events')
  return { ok: true, id: created.id }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdmin(user)) return { ok: false, formError: 'Not authorized.' }
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) return { ok: false, formError: error.message }
  revalidatePath('/admin')
  revalidatePath('/admin/events')
  return { ok: true, id }
}
