import { createClient } from '@/lib/supabase/server'
import type {
  FulfillmentType,
  LanguageVerificationStatus,
  EntityType,
  CredentialStatus,
  DbsType,
  Json,
} from '@/types/database'
import type { Translation } from '@/lib/i18n/content'
import type { ProviderWithRelations } from '@/lib/catalog/transform'

const LIST_SELECT =
  'id, slug, name_en, description_en, borough, cover_image, venue_photos, fulfillment_type, external_order_url, ' +
  'entity_type, booking_enabled, opening_hours, phone, website, created_at, ' +
  'categories(slug,name_en,name_ru), ' +
  'provider_translations(locale,name,description), ' +
  'services(name_en,name_ru,price_pence,duration_min,capacity), ' +
  'provider_languages(language_code)'

export async function listProvidersByCategory(
  categoryId: string,
): Promise<ProviderWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('providers')
    .select(LIST_SELECT)
    .eq('status', 'published')
    .eq('category_id', categoryId)
    .returns<ProviderWithRelations[]>()
  if (error) throw error
  return data ?? []
}

export async function listAllPublishedProviders(): Promise<
  ProviderWithRelations[]
> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('providers')
    .select(LIST_SELECT)
    .eq('status', 'published')
    .returns<ProviderWithRelations[]>()
  if (error) throw error
  return data ?? []
}

// --- Full provider page -----------------------------------------------------

export type ProviderDetail = {
  id: string
  slug: string
  name_en: string
  description_en: string | null
  borough: string
  address: string | null
  lat: number | null
  lng: number | null
  phone: string | null
  telegram: string | null
  instagram: string | null
  website: string | null
  cover_image: string | null
  fulfillment_type: FulfillmentType
  external_order_url: string | null
  entity_type: EntityType
  booking_enabled: boolean
  travel_radius_km: number | null
  opening_hours: Json | null
  venue_photos: string[] | null
  insurance_status: CredentialStatus
  insurance_expires_at: string | null
  dbs_status: CredentialStatus
  dbs_type: DbsType | null
  dbs_expires_at: string | null
  categories: { slug: string; name_en: string; name_ru: string } | null
  provider_translations: Translation[]
  services: {
    id: string
    name_en: string
    name_ru: string | null
    description_en: string | null
    description_ru: string | null
    price_pence: number
    duration_min: number
    capacity: number
  }[]
  provider_languages: {
    status: LanguageVerificationStatus
    expires_at: string | null
    professional_level: boolean
    languages: { code: string; name_native: string } | null
  }[]
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
  schedule_exceptions: {
    exception_date: string
    is_closed: boolean
    start_time: string | null
    end_time: string | null
  }[]
}

const DETAIL_SELECT =
  'id, slug, name_en, description_en, borough, address, lat, lng, phone, telegram, instagram, website, ' +
  'cover_image, fulfillment_type, external_order_url, ' +
  'entity_type, booking_enabled, travel_radius_km, opening_hours, venue_photos, ' +
  'insurance_status, insurance_expires_at, dbs_status, dbs_type, dbs_expires_at, ' +
  'categories(slug,name_en,name_ru), ' +
  'provider_translations(locale,name,description), ' +
  'services(id,name_en,name_ru,description_en,description_ru,price_pence,duration_min,capacity), ' +
  'provider_languages(status,expires_at,professional_level,languages(code,name_native)), ' +
  'schedules(day_of_week,start_time,end_time), ' +
  'schedule_exceptions(exception_date,is_closed,start_time,end_time)'

export type ServiceLanguageBadge = { name: string; verified: boolean; professional: boolean }

/**
 * Display list of service languages with their verification state. An expired
 * verification falls back to "claimed" (no badge) — treated as claimed, not
 * deleted (DESIGN «Проверка языка»). Verified languages sort first.
 */
export function serviceLanguageBadges(
  rows: ProviderDetail['provider_languages'],
  now: number = Date.now(),
): ServiceLanguageBadge[] {
  return rows
    .flatMap((l) =>
      l.languages
        ? [
            {
              name: l.languages.name_native,
              verified:
                l.status === 'verified' &&
                (l.expires_at === null || Date.parse(l.expires_at) > now),
              professional: l.professional_level,
            },
          ]
        : [],
    )
    .sort((a, b) => Number(b.verified) - Number(a.verified) || a.name.localeCompare(b.name))
}

export type ProviderCredentials = {
  insuranceVerified: boolean
  dbsVerified: boolean
  dbsType: DbsType | null
}

/**
 * Effective credential state for a pro's public card. A verified credential
 * whose expiry has passed is NOT shown as verified — it reads as self_declared
 * (DESIGN), computed from expires_at with no background job.
 */
export function providerCredentials(
  p: Pick<
    ProviderDetail,
    | 'entity_type'
    | 'insurance_status'
    | 'insurance_expires_at'
    | 'dbs_status'
    | 'dbs_type'
    | 'dbs_expires_at'
  >,
  now: number = Date.now(),
): ProviderCredentials {
  const active = (status: CredentialStatus, expires: string | null) =>
    status === 'verified' && (expires === null || Date.parse(expires) > now)
  if (p.entity_type !== 'pro') {
    return { insuranceVerified: false, dbsVerified: false, dbsType: null }
  }
  return {
    insuranceVerified: active(p.insurance_status, p.insurance_expires_at),
    dbsVerified: active(p.dbs_status, p.dbs_expires_at),
    dbsType: p.dbs_type,
  }
}

/**
 * Full provider by slug, only if published. Returns null when not found or when
 * the URL's category segment does not match the provider's real category.
 */
export async function getProviderDetail(
  categorySlug: string,
  slug: string,
): Promise<ProviderDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('providers')
    .select(DETAIL_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
    .returns<ProviderDetail>()
  if (error) throw error
  if (!data) return null
  if (data.categories?.slug !== categorySlug) return null
  return data
}
