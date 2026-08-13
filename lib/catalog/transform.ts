import type { FulfillmentType } from '@/types/database'
import { pickProviderContent, type Translation } from '../i18n/content'

// Shape fetched from Supabase for a provider used in listings and cards.
export type ProviderWithRelations = {
  id: string
  slug: string
  name_en: string
  description_en: string
  borough: string
  cover_image: string | null
  fulfillment_type: FulfillmentType
  external_order_url: string | null
  created_at: string
  categories?: { slug: string } | null
  provider_translations: Translation[]
  services: {
    name_en: string
    name_ru: string | null
    price_pence: number
    duration_min: number
    capacity: number
  }[]
  provider_languages: { language_code: string }[]
}

export type PriceRange = { min: number; max: number }

export type ProviderCardVM = {
  slug: string
  categorySlug: string
  name: string
  borough: string
  coverImage: string | null
  fulfillment: FulfillmentType
  externalUrl: string | null
  // Prices are never surfaced for external_order providers (DESIGN §4 / PROMPTS §4).
  priceRange: PriceRange | null
}

export function priceRangeOf(
  provider: ProviderWithRelations,
): PriceRange | null {
  if (provider.fulfillment_type === 'external_order') return null
  const prices = provider.services.map((s) => s.price_pence)
  if (prices.length === 0) return null
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export function toCard(
  provider: ProviderWithRelations,
  categorySlug: string,
  locale: string,
): ProviderCardVM {
  const { name } = pickProviderContent(provider, provider.provider_translations, locale)
  return {
    slug: provider.slug,
    categorySlug,
    name,
    borough: provider.borough,
    coverImage: provider.cover_image,
    fulfillment: provider.fulfillment_type,
    externalUrl: provider.external_order_url,
    priceRange: priceRangeOf(provider),
  }
}

// --- Search -----------------------------------------------------------------

// Case-insensitive, Cyrillic-aware (String.toLowerCase folds Cyrillic case).
function haystack(provider: ProviderWithRelations, locale: string): string {
  const { name, description } = pickProviderContent(
    provider,
    provider.provider_translations,
    locale,
  )
  const parts = [
    provider.name_en,
    provider.description_en,
    name,
    description,
    provider.borough,
    ...provider.provider_translations.flatMap((t) => [t.name ?? '', t.description ?? '']),
    ...provider.services.flatMap((s) => [s.name_en, s.name_ru ?? '']),
  ]
  return parts.join(' ␟ ').toLowerCase()
}

export function matchesQuery(
  provider: ProviderWithRelations,
  query: string,
  locale: string,
): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = haystack(provider, locale)
  // Every whitespace-separated term must appear somewhere.
  return q.split(/\s+/).every((term) => hay.includes(term))
}

// --- Filter & sort ----------------------------------------------------------

export type SortKey = 'relevance' | 'price' | 'slot'

export function filterByBorough(
  providers: ProviderWithRelations[],
  borough: string | null,
): ProviderWithRelations[] {
  if (!borough) return providers
  return providers.filter((p) => p.borough === borough)
}

export function boroughsOf(providers: ProviderWithRelations[]): string[] {
  return [...new Set(providers.map((p) => p.borough))].sort((a, b) =>
    a.localeCompare(b),
  )
}

function minPrice(provider: ProviderWithRelations): number {
  const range = priceRangeOf(provider)
  return range ? range.min : Number.POSITIVE_INFINITY
}

export function sortProviders(
  providers: ProviderWithRelations[],
  sort: SortKey,
  locale: string,
): ProviderWithRelations[] {
  const copy = [...providers]
  const byName = (a: ProviderWithRelations, b: ProviderWithRelations) =>
    pickProviderContent(a, a.provider_translations, locale).name.localeCompare(
      pickProviderContent(b, b.provider_translations, locale).name,
    )

  switch (sort) {
    case 'price':
      return copy.sort((a, b) => minPrice(a) - minPrice(b) || byName(a, b))
    // 'slot' (nearest free slot) needs the slot engine from step 7. Until then it
    // falls back to relevance ordering. Marked so it is not mistaken for done.
    case 'slot':
    case 'relevance':
    default:
      return copy.sort(byName)
  }
}
