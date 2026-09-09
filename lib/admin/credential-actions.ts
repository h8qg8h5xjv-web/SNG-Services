'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/auth'
import type { Database } from '@/types/database'

type ProviderUpdate = Database['public']['Tables']['providers']['Update']

export const DBS_TYPES = ['basic', 'standard', 'enhanced'] as const

const credentialSchema = z.object({
  providerId: z.string().uuid(),
  kind: z.enum(['insurance', 'dbs', 'gas_safe', 'electrical']),
  status: z.enum(['none', 'self_declared', 'verified']),
  // For gas_safe / electrical this carries the number / scheme name.
  documentRef: z.string().trim().max(120).nullable().default(null),
  note: z.string().trim().max(500).nullable().default(null),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').nullable().default(null),
  dbsType: z.enum(DBS_TYPES).nullable().default(null),
})

export type CredentialActionResult = { ok: true } | { ok: false; error: string }

// Admin marks a pro's insurance / DBS. We store only the fact it was seen and
// the document number — never a scan (LEGAL: fewer personal data, less
// liability). 'verified' records who/when; an expired 'verified' is read as
// self_declared elsewhere, computed from expires_at.
export async function setProviderCredential(input: unknown): Promise<CredentialActionResult> {
  const parsed = credentialSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const d = parsed.data
  if (d.status === 'verified' && !d.expiresAt) {
    return { ok: false, error: 'A verified credential needs an expiry date' }
  }
  if (d.kind === 'dbs' && d.status !== 'none' && !d.dbsType) {
    return { ok: false, error: 'Pick a DBS type (basic/standard/enhanced)' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) return { ok: false, error: 'Not authorized.' }

  const verifiedBy = d.status === 'verified' ? user.id : null
  const verifiedAt = d.status === 'verified' ? new Date().toISOString() : null
  const cleared = d.status === 'none'

  const patchByKind: Record<typeof d.kind, ProviderUpdate> = {
    insurance: {
      insurance_status: d.status,
      insurance_verified_by: verifiedBy,
      insurance_verified_at: verifiedAt,
      insurance_expires_at: cleared ? null : d.expiresAt,
      insurance_document_ref: cleared ? null : d.documentRef,
      insurance_note: cleared ? null : d.note,
    },
    dbs: {
      dbs_status: d.status,
      dbs_type: cleared ? null : d.dbsType,
      dbs_verified_by: verifiedBy,
      dbs_verified_at: verifiedAt,
      dbs_expires_at: cleared ? null : d.expiresAt,
      dbs_document_ref: cleared ? null : d.documentRef,
      dbs_note: cleared ? null : d.note,
    },
    gas_safe: {
      gas_safe_status: d.status,
      gas_safe_number: cleared ? null : d.documentRef,
      gas_safe_verified_by: verifiedBy,
      gas_safe_verified_at: verifiedAt,
      gas_safe_expires_at: cleared ? null : d.expiresAt,
      gas_safe_note: cleared ? null : d.note,
    },
    electrical: {
      electrical_status: d.status,
      electrical_scheme: cleared ? null : d.documentRef,
      electrical_verified_by: verifiedBy,
      electrical_verified_at: verifiedAt,
      electrical_expires_at: cleared ? null : d.expiresAt,
      electrical_note: cleared ? null : d.note,
    },
  }
  const patch = patchByKind[d.kind]

  const { error } = await supabase.from('providers').update(patch).eq('id', d.providerId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/admin/providers/${d.providerId}`)
  return { ok: true }
}
