import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type CabinetAccount = { userId: string; email: string | null; name: string | null } | null

export async function getAccount(): Promise<CabinetAccount> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('user_sync')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle()
  return { userId: user.id, email: user.email ?? null, name: data?.display_name ?? null }
}

export type ContactedProvider = { slug: string; name: string; categorySlug: string | null; at: string }

// "Кому я писал" — distinct providers the signed-in user opened contacts for
// (provider_events.contact_reveal by their user_id). Newest first.
export async function getContactedProviders(): Promise<ContactedProvider[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('provider_events')
    .select('occurred_at, providers(slug, name_en, categories(slug))')
    .eq('user_id', user.id)
    .eq('event_type', 'contact_reveal')
    .order('occurred_at', { ascending: false })
    .limit(100)
    .returns<
      { occurred_at: string; providers: { slug: string; name_en: string; categories: { slug: string } | null } | null }[]
    >()

  const seen = new Set<string>()
  const out: ContactedProvider[] = []
  for (const row of data ?? []) {
    const p = row.providers
    if (!p || seen.has(p.slug)) continue
    seen.add(p.slug)
    out.push({ slug: p.slug, name: p.name_en, categorySlug: p.categories?.slug ?? null, at: row.occurred_at })
  }
  return out
}
