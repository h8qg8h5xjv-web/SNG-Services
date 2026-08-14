'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/auth'

// Real verification methods only — 'seed' is reserved for demo data written by
// the seed script and can never be chosen here.
export const VERIFICATION_METHODS = ['call', 'voice_sample', 'video_call'] as const

const verifySchema = z.object({
  providerId: z.string().uuid(),
  languageCode: z.string().min(2),
  status: z.enum(['claimed', 'verified', 'rejected']),
  method: z.enum(VERIFICATION_METHODS).nullable().default(null),
  note: z.string().trim().max(500).nullable().default(null),
  expiresAt: z.string().datetime().nullable().default(null),
})

export type LanguageActionResult = { ok: true } | { ok: false; error: string }

export async function setLanguageVerification(input: unknown): Promise<LanguageActionResult> {
  const parsed = verifySchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const d = parsed.data
  if (d.status === 'verified' && !d.method) {
    return { ok: false, error: 'Pick a verification method' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) return { ok: false, error: 'Not authorized.' }

  // 'verified'/'rejected' both record who acted and when; 'claimed' resets it.
  const patch =
    d.status === 'verified'
      ? {
          status: 'verified' as const,
          method: d.method,
          verified_by: user.id,
          verified_at: new Date().toISOString(),
          expires_at: d.expiresAt,
          note: d.note,
        }
      : d.status === 'rejected'
        ? {
            status: 'rejected' as const,
            method: null,
            verified_by: user.id,
            verified_at: new Date().toISOString(),
            expires_at: null,
            note: d.note,
          }
        : {
            status: 'claimed' as const,
            method: null,
            verified_by: null,
            verified_at: null,
            expires_at: null,
            note: d.note,
          }

  const { error } = await supabase
    .from('provider_languages')
    .update(patch)
    .eq('provider_id', d.providerId)
    .eq('language_code', d.languageCode)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/admin/providers/${d.providerId}`)
  revalidatePath('/admin/providers')
  return { ok: true }
}
