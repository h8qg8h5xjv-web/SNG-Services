'use server'

import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/auth'

export type InviteResult =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; error: string }

// Generates a one-time, 7-day invite token for a provider card. The business
// claims the card by signing in via magic link and calling accept_provider_invite.
export async function createProviderInvite(providerId: string): Promise<InviteResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAdmin(user)) return { ok: false, error: 'Not authorized.' }

  const token =
    globalThis.crypto.randomUUID().replace(/-/g, '') +
    globalThis.crypto.randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('provider_invites')
    .insert({ provider_id: providerId, token, expires_at: expiresAt })
  if (error) return { ok: false, error: error.message }

  return { ok: true, token, expiresAt }
}
