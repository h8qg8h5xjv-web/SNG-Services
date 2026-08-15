import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types'

export type CategoryWithCount = { category: Category; count: number }

/**
 * Categories that have at least one published provider, ordered by that count
 * (descending) — the home-page tile order. Categories with zero published
 * providers are omitted entirely (DESIGN §2).
 */
export async function getHomeCategories(): Promise<CategoryWithCount[]> {
  const supabase = await createClient()

  const [{ data: categories, error: catError }, { data: providers, error: provError }] =
    await Promise.all([
      supabase.from('categories').select('*'),
      supabase
        .from('providers')
        .select('category_id, entity_type, booking_enabled')
        .eq('status', 'published'),
    ])
  if (catError) throw catError
  if (provError) throw provError

  // The category tiles are the Services lens (DESIGN §2в/§3): count only
  // service-eligible providers (a pro, or a place that takes bookings).
  // Listing-only places live in the Places tab, not the category grid.
  const counts = new Map<string, number>()
  for (const p of providers ?? []) {
    if (p.entity_type === 'pro' || p.booking_enabled) {
      counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1)
    }
  }

  return (categories ?? [])
    .map((category) => ({ category, count: counts.get(category.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort(
      (a, b) => b.count - a.count || a.category.sort_order - b.category.sort_order,
    )
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data
}
