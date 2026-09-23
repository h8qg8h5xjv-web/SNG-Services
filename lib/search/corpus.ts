import { createClient } from '@/lib/supabase/server'
import { listAllPublishedProviders } from '@/lib/queries/providers'
import { pickCategoryName, pickProviderContent } from '@/lib/i18n/content'
import type { Corpus } from './suggest'

// Search corpus for suggestions. Cached briefly per locale — suggestions fire on
// every keystroke, so we never rebuild it per request.
let cache: { at: number; locale: string; corpus: Corpus } | null = null
const TTL = 60_000

export async function buildCorpus(locale: string): Promise<Corpus> {
  if (cache && cache.locale === locale && Date.now() - cache.at < TTL) return cache.corpus

  const supabase = await createClient()
  const { data: cats } = await supabase
    .from('categories')
    .select('slug, name_en, name_ru')
    .order('sort_order', { ascending: true })
  const providers = await listAllPublishedProviders()

  const categories = (cats ?? []).map((c) => ({ name: pickCategoryName(c, locale), slug: c.slug }))
  const provs = providers.map((p) => ({
    name: pickProviderContent(p, p.provider_translations, locale).name,
    slug: p.slug,
    categorySlug: p.categories?.slug ?? '',
    borough: p.borough,
  }))
  const boroughs = [...new Set(providers.map((p) => p.borough))]
  const svc = new Map<string, string>()
  for (const p of providers) {
    for (const s of p.services) {
      const name = locale === 'ru' ? (s.name_ru ?? s.name_en) : s.name_en
      if (name && !svc.has(name.toLowerCase())) svc.set(name.toLowerCase(), p.categories?.slug ?? '')
    }
  }
  const services = [...svc.entries()].map(([name, categorySlug]) => ({ name, categorySlug }))

  const corpus: Corpus = { categories, providers: provs, boroughs, services }
  cache = { at: Date.now(), locale, corpus }
  return corpus
}
