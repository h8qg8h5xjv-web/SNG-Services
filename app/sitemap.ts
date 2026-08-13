import type { MetadataRoute } from 'next'
import { enabledLocales, defaultLocale } from '@/i18n/locales'
import { createAnonClient } from '@/lib/supabase/anon'

// Generated per-request so it reflects live published content (and needs no DB
// at build time).
export const dynamic = 'force-dynamic'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

function languages(suffix: string): Record<string, string> {
  return Object.fromEntries(
    enabledLocales.map((l) => [l, `${siteUrl}/${l}${suffix}`]),
  )
}

function entry(suffix: string, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}/${defaultLocale}${suffix}`,
    lastModified,
    alternates: { languages: languages(suffix) },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let providers: { slug: string; categorySlug: string; updated_at: string }[] = []
  let events: { slug: string; updated_at: string }[] = []

  try {
    const supabase = createAnonClient()
    const [provRes, eventRes] = await Promise.all([
      supabase
        .from('providers')
        .select('slug, updated_at, categories(slug)')
        .eq('status', 'published')
        .returns<{ slug: string; updated_at: string; categories: { slug: string } | null }[]>(),
      supabase
        .from('events')
        .select('slug, updated_at')
        .eq('status', 'published')
        .gte('starts_at', new Date().toISOString()),
    ])
    providers = (provRes.data ?? [])
      .filter((p) => p.categories)
      .map((p) => ({ slug: p.slug, categorySlug: p.categories!.slug, updated_at: p.updated_at }))
    events = eventRes.data ?? []
  } catch {
    // No DB at build / missing env — emit static routes only.
  }

  const entries: MetadataRoute.Sitemap = [entry(''), entry('/events')]
  for (const p of providers) {
    entries.push(entry(`/${p.categorySlug}/${p.slug}`, p.updated_at))
  }
  for (const e of events) {
    entries.push(entry(`/events/${e.slug}`, e.updated_at))
  }
  return entries
}
