import { createClient } from '@/lib/supabase/server'
import type { FulfillmentType } from '@/types/database'
import type { Translation } from '@/lib/i18n/content'
import type { ProviderWithRelations } from '@/lib/catalog/transform'

const LIST_SELECT =
  'id, slug, name_en, description_en, borough, cover_image, fulfillment_type, external_order_url, created_at, ' +
  'categories(slug), ' +
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
  description_en: string
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
  provider_languages: { languages: { code: string; name_native: string } | null }[]
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
  'categories(slug,name_en,name_ru), ' +
  'provider_translations(locale,name,description), ' +
  'services(id,name_en,name_ru,description_en,description_ru,price_pence,duration_min,capacity), ' +
  'provider_languages(languages(code,name_native)), ' +
  'schedules(day_of_week,start_time,end_time), ' +
  'schedule_exceptions(exception_date,is_closed,start_time,end_time)'

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
