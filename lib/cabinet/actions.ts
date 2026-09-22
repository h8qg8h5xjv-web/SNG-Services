'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify, parseServices } from '@/lib/providers/quick'
import type { SyncPayload } from '@/lib/sync/actions'

type Result = { ok: true } | { ok: false; error: string }

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

const cardSchema = z.object({
  name: z.string().trim().min(1),
  categoryId: z.string().uuid(),
  borough: z.string().trim().min(1),
  phone: z.string().trim().max(50).default(''),
  languages: z.array(z.string()).default([]),
  servicesLine: z.string().default(''),
})

// Self-serve card creation. Creates a DRAFT pro, makes the current user its
// owner (provider_members), adds claimed languages + parsed services, and queues
// an admin notification. Publication stays admin-only (the language check).
export async function createMyCard(
  input: unknown,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = cardSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const d = parsed.data
  const admin = createAdminClient()

  const { data: provider, error } = await admin
    .from('providers')
    .insert({
      slug: slugify(d.name),
      name_en: d.name,
      category_id: d.categoryId,
      borough: d.borough,
      phone: d.phone.trim() || null,
      fulfillment_type: 'enquiry',
      entity_type: 'pro',
      status: 'draft',
      claim_status: 'claimed',
      booking_enabled: false,
    })
    .select('id')
    .single()
  if (error || !provider) return { ok: false, error: error?.message ?? 'Could not create the card.' }

  const { error: memberErr } = await admin
    .from('provider_members')
    .insert({ provider_id: provider.id, user_id: user.id, role: 'owner' })
  if (memberErr) return { ok: false, error: memberErr.message }

  if (d.languages.length > 0) {
    await admin
      .from('provider_languages')
      .insert(d.languages.map((code) => ({ provider_id: provider.id, language_code: code })))
  }
  const services = parseServices(d.servicesLine)
  if (services.length > 0) {
    await admin.from('services').insert(services.map((s) => ({ provider_id: provider.id, ...s })))
  }

  // Notify the admin (same queue as master notifications) to review + publish.
  await admin.from('notification_queue').insert({
    provider_id: provider.id,
    provider_name: d.name,
    kind: 'new_draft',
    subject: `New card to review: ${d.name}`,
    body: `A master created a card "${d.name}" (${d.borough}). Review the language and publish in the admin.`,
    status: 'unsent',
  })

  revalidatePath('/cabinet/cards')
  return { ok: true, id: provider.id }
}

const linkSchema = z.object({
  saved: z.array(z.string()).max(500).default([]),
  requests: z
    .array(z.object({ ref: z.string(), token: z.string(), at: z.string().optional() }))
    .max(500)
    .default([]),
})

// Auto-link browser data to the account on sign-in (no buttons). Attaches the
// guest requests (verified by token) to the account and merges saved + requests
// into user_sync, returning the merged set so the device adopts everything.
export async function linkBrowserData(
  input: unknown,
): Promise<{ ok: true; data: SyncPayload } | { ok: false; error: string }> {
  const parsed = linkSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid input' }
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const admin = createAdminClient()

  // Attach each guest request to the account, proving ownership by (ref, token).
  for (const r of parsed.data.requests) {
    await admin
      .from('requests')
      .update({ customer_id: user.id })
      .eq('public_ref', r.ref)
      .eq('guest_token', r.token)
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('user_sync')
    .select('saved, requests')
    .eq('user_id', user.id)
    .maybeSingle()

  const savedSet = new Set<string>([...(existing?.saved ?? []), ...parsed.data.saved])
  const reqMap = new Map<string, { ref: string; token: string; at?: string }>()
  const prev = Array.isArray(existing?.requests) ? (existing!.requests as SyncPayload['requests']) : []
  for (const r of [...prev, ...parsed.data.requests]) {
    if (r && typeof r.ref === 'string') reqMap.set(r.ref, r)
  }
  const merged: SyncPayload = { saved: [...savedSet], requests: [...reqMap.values()] }

  const { error } = await supabase.from('user_sync').upsert({
    user_id: user.id,
    saved: merged.saved,
    requests: merged.requests,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: merged }
}

export async function saveAccountName(name: string): Promise<Result> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('user_sync')
    .upsert({ user_id: user.id, display_name: name.trim() || null, updated_at: new Date().toISOString() })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/cabinet/account')
  return { ok: true }
}

// Delete the account and the data tied to it: requests, sync row, membership, and
// any draft cards the user solely owned. Published cards stay (membership drops).
// Finally removes the auth user. The client clears localStorage and signs out.
export async function deleteMyAccount(): Promise<Result> {
  const user = await requireUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const admin = createAdminClient()

  await admin.from('requests').delete().eq('customer_id', user.id)
  await admin.from('user_sync').delete().eq('user_id', user.id)

  const { data: memberships } = await admin
    .from('provider_members')
    .select('provider_id')
    .eq('user_id', user.id)
  const providerIds = (memberships ?? []).map((m) => m.provider_id)
  await admin.from('provider_members').delete().eq('user_id', user.id)

  for (const pid of providerIds) {
    const { data: others } = await admin
      .from('provider_members')
      .select('user_id')
      .eq('provider_id', pid)
    if ((others ?? []).length > 0) continue // someone else still owns it
    const { data: prov } = await admin.from('providers').select('status').eq('id', pid).maybeSingle()
    if (prov?.status === 'draft') await admin.from('providers').delete().eq('id', pid)
  }

  await admin.auth.admin.deleteUser(user.id)
  return { ok: true }
}
