import type { FulfillmentType, EntityType } from '@/types/database'
import { pickProviderContent, pickCategoryName, type Translation } from '../i18n/content'
import { parseOpeningHours, type OpeningHours } from '../hours'

// Shape fetched from Supabase for a provider used in listings and cards.
export type ProviderWithRelations = {
  id: string
  slug: string
  name_en: string
  description_en: string | null
  borough: string
  cover_image: string | null
  venue_photos: string[] | null
  fulfillment_type: FulfillmentType
  external_order_url: string | null
  entity_type: EntityType
  booking_enabled: boolean
  opening_hours: unknown
  phone: string | null
  website: string | null
  created_at: string
  categories?: { slug: string; name_en: string; name_ru: string } | null
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
  id: string
  slug: string
  categorySlug: string
  categoryName: string
  name: string
  borough: string
  coverImage: string | null
  fulfillment: FulfillmentType
  externalUrl: string | null
  entityType: EntityType
  bookingEnabled: boolean
  openingHours: OpeningHours | null
  phone: string | null
  website: string | null
  // Prices are never surfaced for external_order providers (DESIGN §4 / PROMPTS §4).
  priceRange: PriceRange | null
}

// The two homepage lenses (DESIGN §2в). A bookable place is both a place (on the
// map/Места) and a service (Услуги) — the overlap is intentional.
export const isServiceCard = (c: ProviderCardVM): boolean =>
  c.entityType === 'pro' || c.bookingEnabled
export const isPlaceCard = (c: ProviderCardVM): boolean => c.entityType === 'place'

// Raw-row variant of the Services test, for query-layer filtering.
export const isServiceEligible = (p: {
  entity_type: EntityType
  booking_enabled: boolean
}): boolean => p.entity_type === 'pro' || p.booking_enabled

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
    id: provider.id,
    slug: provider.slug,
    categorySlug,
    categoryName: provider.categories ? pickCategoryName(provider.categories, locale) : '',
    name,
    borough: provider.borough,
    coverImage: provider.venue_photos?.[0] ?? provider.cover_image,
    fulfillment: provider.fulfillment_type,
    externalUrl: provider.external_order_url,
    entityType: provider.entity_type,
    bookingEnabled: provider.booking_enabled,
    openingHours: parseOpeningHours(provider.opening_hours),
    phone: provider.phone,
    website: provider.website,
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
    provider.description_en ?? '',
    name,
    description ?? '',
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
