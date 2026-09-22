'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// §3 optional cross-device sync. Runs under the signed-in user's session; RLS
// (user_sync_owner_all) confines every row to that user. Guests never reach here.

const refSchema = z.object({ ref: z.string(), token: z.string(), at: z.string().optional() })
const syncSchema = z.object({
  saved: z.array(z.string()).max(500).default([]),
  requests: z.array(refSchema).max(500).default([]),
})

export type SyncPayload = { saved: string[]; requests: { ref: string; token: string; at?: string }[] }

async function currentUserId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Merge this device's data into the account (union saved slugs; union requests by
// ref, keeping the token). Returns the merged set so the client can adopt it.
export async function pushSync(
  input: unknown,
): Promise<{ ok: true; data: SyncPayload } | { ok: false; error: string }> {
  const parsed = syncSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid input' }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { data: existing } = await supabase
    .from('user_sync')
    .select('saved, requests')
    .eq('user_id', user.id)
    .maybeSingle()

  const savedSet = new Set<string>([...(existing?.saved ?? []), ...parsed.data.saved])
  const reqMap = new Map<string, { ref: string; token: string; at?: string }>()
  const prevReqs = Array.isArray(existing?.requests) ? (existing!.requests as SyncPayload['requests']) : []
  for (const r of [...prevReqs, ...parsed.data.requests]) {
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

export async function pullSync(): Promise<
  { ok: true; data: SyncPayload } | { ok: false; error: string }
> {
  const uid = await currentUserId()
  if (!uid) return { ok: false, error: 'Not signed in.' }
  const supabase = await createClient()
  const { data } = await supabase.from('user_sync').select('saved, requests').eq('user_id', uid).maybeSingle()
  const requests = Array.isArray(data?.requests) ? (data!.requests as SyncPayload['requests']) : []
  return { ok: true, data: { saved: data?.saved ?? [], requests } }
}
