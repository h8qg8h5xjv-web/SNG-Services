import { createAdminClient } from '@/lib/supabase/admin'

// Draft cards awaiting review (self-serve creations + seeded/imported drafts).
// Admin-gated by the dashboard layout; service role.

export type DraftCard = {
  id: string
  name: string
  borough: string
  categorySlug: string | null
  languages: { code: string; name: string; status: string }[]
  createdAt: string
}

export async function listDraftProviders(): Promise<DraftCard[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('providers')
    .select('id, name_en, borough, created_at, categories(slug), provider_languages(language_code, status, languages(name_native))')
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .returns<
      {
        id: string
        name_en: string
        borough: string
        created_at: string
        categories: { slug: string } | null
        provider_languages: { language_code: string; status: string; languages: { name_native: string } | null }[]
      }[]
    >()
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name_en,
    borough: p.borough,
    categorySlug: p.categories?.slug ?? null,
    createdAt: p.created_at,
    languages: p.provider_languages.map((l) => ({
      code: l.language_code,
      name: l.languages?.name_native ?? l.language_code,
      status: l.status,
    })),
  }))
}

export async function countDraftProviders(): Promise<number> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'draft')
  return count ?? 0
}
