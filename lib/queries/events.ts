import { createClient } from '@/lib/supabase/server'
import type { EventCategory } from '@/types/database'

export type EventListItem = {
  id: string
  slug: string
  title_en: string
  title_ru: string | null
  category: EventCategory
  starts_at: string
  ends_at: string | null
  venue_name: string | null
  borough: string | null
  price_from_pence: number | null
  cover_image: string | null
}

const LIST_SELECT =
  'id, slug, title_en, title_ru, category, starts_at, ends_at, venue_name, borough, price_from_pence, cover_image'

export type EventFilters = {
  category?: string
  borough?: string
  price?: 'free' | 'paid'
}

/**
 * Upcoming published events, ordered by start time. Past events are excluded by
 * the query (starts_at >= now) — never by a flag or a background job.
 */
export async function listUpcomingEvents(
  filters: EventFilters = {},
): Promise<EventListItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from('events')
    .select(LIST_SELECT)
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  if (filters.category) query = query.eq('category', filters.category as EventCategory)
  if (filters.borough) query = query.eq('borough', filters.borough)
  if (filters.price === 'free') query = query.is('price_from_pence', null)
  if (filters.price === 'paid') query = query.not('price_from_pence', 'is', null)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/** Distinct boroughs among upcoming events, for the filter dropdown. */
export async function listEventBoroughs(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('borough')
    .eq('status', 'published')
    .gte('starts_at', new Date().toISOString())
    .not('borough', 'is', null)
  if (error) throw error
  const set = new Set<string>()
  for (const row of data ?? []) if (row.borough) set.add(row.borough)
  return [...set].sort((a, b) => a.localeCompare(b))
}

export type EventDetail = EventListItem & {
  description_en: string | null
  description_ru: string | null
  address: string | null
  lat: number | null
  lng: number | null
  ticket_url: string | null
  languages: string[]
  organizer: {
    slug: string
    name_en: string
    categories: { slug: string } | null
  } | null
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(
      `${LIST_SELECT}, description_en, description_ru, address, lat, lng, ticket_url, languages, ` +
        'organizer:providers!organizer_provider_id(slug,name_en,categories(slug))',
    )
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
    .returns<EventDetail>()
  if (error) throw error
  return data ?? null
}

/** Upcoming events organized by a given provider (for the provider page block). */
export async function listEventsByOrganizer(
  providerId: string,
  limit = 3,
): Promise<EventListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select(LIST_SELECT)
    .eq('status', 'published')
    .eq('organizer_provider_id', providerId)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
