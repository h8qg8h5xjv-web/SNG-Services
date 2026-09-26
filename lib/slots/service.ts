import { createAdminClient } from '@/lib/supabase/admin'
import { computeSlots, type ExistingBooking, type Slot } from './compute'
import { freeWindows, type FreeWindow, type WindowProvider } from './windows'
import { pickProviderContent } from '@/lib/i18n/content'

function dowOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() // 0 = Sunday
}

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10)
}

/**
 * Bookable time slots for a service on a London-local date. Reads occupancy with
 * the service-role client (bookings aren't publicly readable) but returns only
 * slot availability, never booking details.
 */
export async function getSlotsForServiceDate(
  serviceId: string,
  date: string,
): Promise<Slot[]> {
  const supabase = createAdminClient()

  const { data: service } = await supabase
    .from('services')
    .select('duration_min, capacity, provider_id')
    .eq('id', serviceId)
    .maybeSingle()
  if (!service) return []

  // Widen the booking window by a day each side to catch timezone edges.
  const from = `${addDays(date, -1)}T00:00:00Z`
  const to = `${addDays(date, 2)}T00:00:00Z`

  const [weekly, exception, bookings] = await Promise.all([
    supabase
      .from('schedules')
      .select('start_time, end_time')
      .eq('provider_id', service.provider_id)
      .eq('day_of_week', dowOf(date)),
    supabase
      .from('schedule_exceptions')
      .select('is_closed, start_time, end_time')
      .eq('provider_id', service.provider_id)
      .eq('exception_date', date)
      .maybeSingle(),
    supabase
      .from('bookings')
      .select('starts_at, ends_at, party_size, status')
      .eq('service_id', serviceId)
      .gte('starts_at', from)
      .lt('starts_at', to),
  ])

  return computeSlots({
    date,
    durationMin: service.duration_min,
    capacity: service.capacity,
    weekly: weekly.data ?? [],
    exception: exception.data ?? null,
    bookings: bookings.data ?? [],
    now: new Date(),
  })
}

type TodayProviderRow = {
  slug: string
  name_en: string
  borough: string
  booking_enabled: boolean
  categories: { slug: string } | null
  provider_translations: { locale: string; name: string | null; description: string | null }[]
  services: { id: string; name_en: string; name_ru: string | null; duration_min: number; capacity: number; price_pence: number }[]
  schedules: { day_of_week: number; start_time: string; end_time: string }[]
  schedule_exceptions: {
    exception_date: string
    is_closed: boolean
    start_time: string | null
    end_time: string | null
  }[]
}

// Everything today's availability needs, in two queries: published
// native_booking providers with services and schedules, and their bookings
// around today (±1 day for timezone edges). Service-role read: bookings aren't
// public; callers return only availability, never booking details.
async function loadToday() {
  const supabase = createAdminClient()
  const now = new Date()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now)
  const dow = dowOf(today)

  const { data } = await supabase
    .from('providers')
    .select(
      'slug, name_en, borough, booking_enabled, categories(slug), ' +
        'provider_translations(locale,name,description), ' +
        'services(id,name_en,name_ru,duration_min,capacity,price_pence), ' +
        'schedules(day_of_week,start_time,end_time), ' +
        'schedule_exceptions(exception_date,is_closed,start_time,end_time)',
    )
    .eq('status', 'published')
    .eq('fulfillment_type', 'native_booking')
    .returns<TodayProviderRow[]>()
  const providers = data ?? []

  const serviceIds = providers.flatMap((p) => p.services.map((s) => s.id))
  const bookingsByService = new Map<string, ExistingBooking[]>()
  if (serviceIds.length) {
    const { data: rows } = await supabase
      .from('bookings')
      .select('service_id, starts_at, ends_at, party_size, status')
      .in('service_id', serviceIds)
      .gte('starts_at', `${addDays(today, -1)}T00:00:00Z`)
      .lt('starts_at', `${addDays(today, 2)}T00:00:00Z`)
    for (const b of (rows ?? []) as (ExistingBooking & { service_id: string })[]) {
      const list = bookingsByService.get(b.service_id) ?? []
      list.push(b)
      bookingsByService.set(b.service_id, list)
    }
  }

  const todayRules = (p: TodayProviderRow) => ({
    weekly: p.schedules
      .filter((s) => s.day_of_week === dow)
      .map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
    exception: p.schedule_exceptions.find((e) => e.exception_date === today) ?? null,
  })

  return { today, now, providers, bookingsByService, todayRules }
}

/**
 * Every free window today across bookable providers (booking enabled), names in
 * the given locale. The single source for the home city, its live counter,
 * «Свободно сегодня» and category counts.
 */
export async function getFreeWindowsToday(locale: string): Promise<FreeWindow[]> {
  const { today, now, providers, bookingsByService, todayRules } = await loadToday()
  const input: WindowProvider[] = providers
    .filter((p) => p.categories)
    .map((p) => ({
      slug: p.slug,
      categorySlug: p.categories!.slug,
      name: pickProviderContent({ name_en: p.name_en, description_en: null }, p.provider_translations, locale).name,
      borough: p.borough,
      bookable: p.booking_enabled,
      services: p.services.map((s) => ({
        id: s.id,
        name: locale === 'ru' ? (s.name_ru ?? s.name_en) : s.name_en,
        durationMin: s.duration_min,
        capacity: s.capacity,
        pricePence: s.price_pence,
      })),
      ...todayRules(p),
    }))
  return freeWindows(input, bookingsByService, today, now)
}
