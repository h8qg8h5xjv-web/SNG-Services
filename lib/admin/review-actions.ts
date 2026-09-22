'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdmin } from '@/lib/admin/auth'

// «Подтвердить язык и опубликовать»: verify the card's claimed languages (the
// human check happened on the phone) and publish it. Publication needs a verified
// language (DB trigger), so we verify first. Admin only.
export async function publishDraft(
  providerId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) return { ok: false, error: 'Not authorized.' }

  const admin = createAdminClient()
  const { data: langs } = await admin
    .from('provider_languages')
    .select('language_code, status')
    .eq('provider_id', providerId)
  if (!langs || langs.length === 0) {
    return { ok: false, error: 'Card has no language — add one before publishing.' }
  }

  const nowIso = new Date().toISOString()
  const { error: verErr } = await admin
    .from('provider_languages')
    .update({ status: 'verified', method: 'call', verified_by: user.id, verified_at: nowIso })
    .eq('provider_id', providerId)
    .eq('status', 'claimed')
  if (verErr) return { ok: false, error: verErr.message }

  const { error: pubErr } = await admin
    .from('providers')
    .update({ status: 'published' })
    .eq('id', providerId)
  if (pubErr) return { ok: false, error: pubErr.message }

  revalidatePath('/admin/review')
  revalidatePath('/admin')
  return { ok: true }
}
