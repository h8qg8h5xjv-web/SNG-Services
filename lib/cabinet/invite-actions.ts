'use server'

import { createClient } from '@/lib/supabase/server'

// Claim a card entered from public data (provider_invites path). The SECURITY
// DEFINER RPC uses auth.uid(), so it must run under the signed-in user's session
// and adds them to provider_members.
export async function acceptCardInvite(
  token: string,
): Promise<{ ok: true } | { ok: false; code?: 'auth'; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, code: 'auth' }
  const { error } = await supabase.rpc('accept_provider_invite', { p_token: token })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
