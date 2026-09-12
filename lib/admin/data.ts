import { createClient } from '@/lib/supabase/server'
import type { Category, Language } from '@/types'
import type {
  FulfillmentType,
  ContentStatus,
  EventCategory,
  LanguageVerificationStatus,
  LanguageVerificationMethod,
  EntityType,
  ClaimStatus,
  CredentialStatus,
  DbsType,
  CatalogRequestStatus,
  Json,
} from '@/types/database'

export type AdminProviderLanguage = {
  language_code: string
  status: LanguageVerificationStatus
  method: LanguageVerificationMethod | null
  verified_at: string | null
  expires_at: string | null
  note: string | null
  professional_level: boolean
}

// Admin reads see drafts too (RLS grants admins full read).

export type AdminProviderRow = {
  id: string
  slug: string
  name_en: string
  status: ContentStatus
  fulfillment_type: FulfillmentType
  borough: string
  categories: { slug: string; name_en: string } | null
  provider_languages: { language_code: string; status: LanguageVerificationStatus; method: LanguageVerificationMethod | null }[]
  provider_translations: { locale: string; description: string | null }[]
}

export async function listAdminProviders(): Promise<AdminProviderRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('providers')
    .select(
      'id, slug, name_en, status, fulfillment_type, borough, ' +
        'categories(slug,name_en), provider_languages(language_code,status,method), ' +
        'provider_translations(locale,description)',
    )
    .order('name_en', { ascending: true })
    .returns<AdminProviderRow[]>()
  if (error) throw error
  return data ?? []
}

export type AdminProviderDetail = {
  id: string
  slug: string
  name_en: string
  description_en: string | null
  category_id: string
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
  status: ContentStatus
  entity_type: EntityType
  claim_status: ClaimStatus
  booking_enabled: boolean
  travel_radius_km: number | null
  opening_hours: Json | null
  venue_photos: string[] | null
  insurance_status: CredentialStatus
  insurance_verified_at: string | null
  insurance_expires_at: string | null
  insurance_document_ref: string | null
  insurance_note: string | null
  dbs_status: CredentialStatus
  dbs_type: DbsType | null
  dbs_verified_at: string | null
  dbs_expires_at: string | null
  dbs_document_ref: string | null
  dbs_note: string | null
  gas_safe_status: CredentialStatus
  gas_safe_number: string | null
  gas_safe_verified_at: string | null
  gas_safe_expires_at: string | null
  gas_safe_note: string | null
  electrical_status: CredentialStatus
  electrical_scheme: string | null
  electrical_verified_at: string | null
  electrical_expires_at: string | null
  electrical_note: string | null
  provider_languages: AdminProviderLanguage[]
  provider_translations: { locale: string; name: string | null; description: string | null }[]
  services: {
    id: string
    name_en: string
    name_ru: string | null
    description_en: string | null
    description_ru: string | null
    duration_min: number
    price_pence: number
    capacity: number
  }[]
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
}

export async function getAdminProvider(id: string): Promise<AdminProviderDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('providers')
    .select(
      'id, slug, name_en, description_en, category_id, borough, address, lat, lng, phone, telegram, instagram, website, cover_image, fulfillment_type, external_order_url, status, ' +
        'entity_type, claim_status, booking_enabled, travel_radius_km, opening_hours, venue_photos, ' +
        'insurance_status, insurance_verified_at, insurance_expires_at, insurance_document_ref, insurance_note, ' +
        'dbs_status, dbs_type, dbs_verified_at, dbs_expires_at, dbs_document_ref, dbs_note, ' +
        'gas_safe_status, gas_safe_number, gas_safe_verified_at, gas_safe_expires_at, gas_safe_note, ' +
        'electrical_status, electrical_scheme, electrical_verified_at, electrical_expires_at, electrical_note, ' +
        'provider_languages(language_code,status,method,verified_at,expires_at,note,professional_level), ' +
        'provider_translations(locale,name,description), ' +
        'services(id,name_en,name_ru,description_en,description_ru,duration_min,price_pence,capacity), ' +
        'schedules(day_of_week,start_time,end_time)',
    )
    .eq('id', id)
    .maybeSingle()
    .returns<AdminProviderDetail>()
  if (error) throw error
  return data ?? null
}

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listLanguages(): Promise<Language[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('languages')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export type AdminEventRow = {
  id: string
  slug: string
  title_en: string
  category: EventCategory
  starts_at: string
  status: ContentStatus
  borough: string | null
}

export async function listAdminEvents(): Promise<AdminEventRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('id, slug, title_en, category, starts_at, status, borough')
    .order('starts_at', { ascending: true })
    .returns<AdminEventRow[]>()
  if (error) throw error
  return data ?? []
}

export type AdminEventDetail = {
  id: string
  slug: string
  title_en: string
  title_ru: string | null
  description_en: string | null
  description_ru: string | null
  category: EventCategory
  starts_at: string
  ends_at: string | null
  venue_name: string | null
  address: string | null
  lat: number | null
  lng: number | null
  borough: string | null
  price_from_pence: number | null
  ticket_url: string | null
  organizer_provider_id: string | null
  languages: string[]
  cover_image: string | null
  status: ContentStatus
}

export async function getAdminEvent(id: string): Promise<AdminEventDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .maybeSingle()
    .returns<AdminEventDetail>()
  if (error) throw error
  return data ?? null
}

export async function countUpcomingEvents(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
  if (error) throw error
  return count ?? 0
}

export async function listProviderOptions(): Promise<{ id: string; name_en: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('providers')
    .select('id, name_en')
    .order('name_en', { ascending: true })
  if (error) throw error
  return data ?? []
}

export type AdminBookingRow = {
  id: string
  starts_at: string
  ends_at: string
  party_size: number
  customer_name: string
  customer_phone: string
  customer_email: string | null
  status: 'pending' | 'confirmed' | 'cancelled'
  // Locked at creation on the booking itself — NOT read from services, so a later
  // price change never rewrites a past booking.
  price_pence: number
  duration_min: number
  services: { name_en: string } | null
  providers: { name_en: string } | null
}

export async function listAdminBookings(filters: {
  providerId?: string
  date?: string
}): Promise<AdminBookingRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('bookings')
    .select(
      'id, starts_at, ends_at, party_size, customer_name, customer_phone, customer_email, status, ' +
        'price_pence, duration_min, services(name_en), providers(name_en)',
    )
    .order('starts_at', { ascending: false })

  if (filters.providerId) query = query.eq('provider_id', filters.providerId)
  if (filters.date && /^\d{4}-\d{2}-\d{2}$/.test(filters.date)) {
    query = query
      .gte('starts_at', `${filters.date}T00:00:00Z`)
      .lt('starts_at', `${filters.date}T23:59:59Z`)
  }

  const { data, error } = await query.returns<AdminBookingRow[]>()
  if (error) throw error
  return data ?? []
}

export type AdminCatalogRequest = {
  id: string
  business_name: string
  contact_name: string
  contact_email: string | null
  contact_phone: string | null
  category: string | null
  borough: string | null
  message: string | null
  status: CatalogRequestStatus
  created_at: string
}

// Catalog leads from /for-business, newest first. RLS limits these to admins.
export async function listCatalogRequests(): Promise<AdminCatalogRequest[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('catalog_requests')
    .select('id, business_name, contact_name, contact_email, contact_phone, category, borough, message, status, created_at')
    .order('created_at', { ascending: false })
    .returns<AdminCatalogRequest[]>()
  if (error) throw error
  return data ?? []
}
