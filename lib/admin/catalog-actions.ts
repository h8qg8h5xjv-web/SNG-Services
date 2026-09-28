'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin/auth'
import type { CatalogRequestStatus } from '@/types/database'

// Admin triage of catalog leads. RLS already restricts these rows to admins;
// this action re-checks the session before writing.
export async function setCatalogRequestStatus(
  id: string,
  status: CatalogRequestStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase.from('catalog_requests').update({ status }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/catalog-requests')
  return { ok: true }
}

// Map a request (typically one with a «Моей категории нет» suggestion) to an
// existing category. The suggestion text stays for the record; nothing here
// creates a category.
export async function setCatalogRequestCategory(
  id: string,
  categoryId: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) return { ok: false, error: 'Not authorized.' }
  if (categoryId) {
    const { data: cat } = await supabase.from('categories').select('id').eq('id', categoryId).maybeSingle()
    if (!cat) return { ok: false, error: 'Unknown category.' }
  }
  const { error } = await supabase.from('catalog_requests').update({ category_id: categoryId }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/catalog-requests')
  return { ok: true }
}
