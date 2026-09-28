import { createAdminClient } from '@/lib/supabase/admin'
import { pickCategoryName } from '@/lib/i18n/content'
import type { References } from './validate'

export type CategoryOption = { id: string; slug: string; name: string }

// Categories for onboarding pickers, localised, in catalogue order. Every
// category counts as active (there is no flag yet).
export async function getCategoryOptions(locale: string): Promise<CategoryOption[]> {
  const { data } = await createAdminClient()
    .from('categories')
    .select('id, slug, name_en, name_ru, sort_order')
    .order('sort_order', { ascending: true })
  return (data ?? []).map((c) => ({ id: c.id, slug: c.slug, name: pickCategoryName(c, locale) }))
}

// The reference list of London districts (table `boroughs`), alphabetical.
export async function getBoroughOptions(): Promise<string[]> {
  const { data } = await createAdminClient().from('boroughs').select('name').order('name', { ascending: true })
  return (data ?? []).map((b) => b.name)
}

// What server actions validate against — read fresh on every write.
export async function loadReferences(): Promise<References> {
  const supabase = createAdminClient()
  const [cats, boroughs] = await Promise.all([
    supabase.from('categories').select('id'),
    supabase.from('boroughs').select('name'),
  ])
  return {
    categoryIds: new Set((cats.data ?? []).map((c) => c.id)),
    boroughs: new Set((boroughs.data ?? []).map((b) => b.name)),
  }
}
