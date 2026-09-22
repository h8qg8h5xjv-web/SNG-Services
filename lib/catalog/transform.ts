import type {
  FulfillmentType,
  EntityType,
  CredentialStatus,
  ClaimStatus,
} from '@/types/database'
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
  travels_to_client: boolean
  claim_status: ClaimStatus
  insurance_status: CredentialStatus
  insurance_expires_at: string | null
  dbs_status: CredentialStatus
  dbs_expires_at: string | null
  gas_safe_status: CredentialStatus
  gas_safe_expires_at: string | null
  electrical_status: CredentialStatus
  electrical_expires_at: string | null
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
  provider_languages: {
    language_code: string
    status?: string
    expires_at?: string | null
    languages?: { name_native: string } | null
  }[]
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
  travelsToClient: boolean
  // Card entered from public data with no owner yet — shows an honest source note.
  unclaimed: boolean
  // Native names of languages with a live 'verified' badge — trust signal on the
  // card in place of a rating (DESIGN §5). Empty when none.
  verifiedLanguages: string[]
  // Prices are never surfaced for external_order providers (DESIGN §4 / PROMPTS §4).
  priceRange: PriceRange | null
}

// A credential (insurance/DBS/Gas Safe/electrical) that is verified and not expired.
function credentialActive(
  status: CredentialStatus,
  expires: string | null,
  now: number,
): boolean {
  return status === 'verified' && (expires === null || Date.parse(expires) > now)
}

/**
 * "Documents verified" for the category filter (idea #5): at least one verified,
 * non-expired credential — insurance, DBS, Gas Safe or electrical. Deliberately
 * NOT language: every published provider already has a verified language, so a
 * language-based filter would exclude almost no one. Expiry from expires_at, no job.
 */
export function hasVerifiedDocument(
  p: ProviderWithRelations,
  now: number = Date.now(),
): boolean {
  return (
    credentialActive(p.insurance_status, p.insurance_expires_at, now) ||
    credentialActive(p.dbs_status, p.dbs_expires_at, now) ||
    credentialActive(p.gas_safe_status, p.gas_safe_expires_at, now) ||
    credentialActive(p.electrical_status, p.electrical_expires_at, now)
  )
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
  const now = Date.now()
  // Only 'verified' and not expired counts as a trust badge (DESIGN §5).
  const verifiedLanguages = provider.provider_languages
    .filter(
      (l) =>
        l.status === 'verified' &&
        l.languages != null &&
        (l.expires_at == null || Date.parse(l.expires_at) > now),
    )
    .map((l) => l.languages!.name_native)
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
    travelsToClient: provider.travels_to_client,
    unclaimed: provider.claim_status === 'unclaimed',
    verifiedLanguages,
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

export type SortKey = 'relevance' | 'price' | 'newest'

export function filterByBorough(
  providers: ProviderWithRelations[],
  borough: string | null,
): ProviderWithRelations[] {
  if (!borough) return providers
  return providers.filter((p) => p.borough === borough)
}

export type CategoryFacets = { travels: boolean; verifiedOnly: boolean }

/** URL-driven facet filters for the category page (idea #5). */
export function filterByFacets(
  providers: ProviderWithRelations[],
  facets: CategoryFacets,
  now: number = Date.now(),
): ProviderWithRelations[] {
  return providers.filter(
    (p) =>
      (!facets.travels || p.travels_to_client) &&
      (!facets.verifiedOnly || hasVerifiedDocument(p, now)),
  )
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
    case 'newest':
      return copy.sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || byName(a, b),
      )
    case 'relevance':
    default:
      return copy.sort(byName)
  }
}
