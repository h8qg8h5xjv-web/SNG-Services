import { createAdminClient } from '@/lib/supabase/admin'
import { computeSlots, type ExistingBooking, type Slot } from './compute'
import { providerUnits, type ProviderBooking } from './provider-load'
import {
  addDays,
  freeWindowsForDays,
  HORIZON_DAYS,
  londonDate,
  type FreeWindow,
  type WindowProvider,
} from './windows'
import { pickProviderContent } from '@/lib/i18n/content'

function dowOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() // 0 = Sunday
}

type BookingWithService = ExistingBooking & { service_id: string; services: { capacity: number } | null }

/**
 * Bookable time slots for a service on a London-local date. Occupancy covers
 * the service's own seats and the provider's parallel capacity across all its
 * services (the same rule as the booking trigger). Reads with the service-role
 * client (bookings aren't publicly readable) but returns only slot
 * availability, never booking details.
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

  const [weekly, exception, bookings, provider] = await Promise.all([
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
      .select('service_id, starts_at, ends_at, party_size, status, services(capacity)')
      .eq('provider_id', service.provider_id)
      .gte('starts_at', from)
      .lt('starts_at', to)
      .returns<BookingWithService[]>(),
    supabase.from('providers').select('parallel_capacity').eq('id', service.provider_id).maybeSingle(),
  ])

  const all = bookings.data ?? []
  const units = providerUnits(
    all.map((b): ProviderBooking => ({ ...b, group: (b.services?.capacity ?? 1) > 1 })),
  )
  return computeSlots({
    date,
    durationMin: service.duration_min,
    capacity: service.capacity,
    weekly: weekly.data ?? [],
    exception: exception.data ?? null,
    bookings: all.filter((b) => b.service_id === serviceId),
    now: new Date(),
    provider: {
      load: { parallelCapacity: provider.data?.parallel_capacity ?? 1, units },
      serviceId,
      group: service.capacity > 1,
    },
  })
}

type WindowProviderRow = {
  slug: string
  parallel_capacity: number
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

// Everything availability over the next `days` London dates needs, in two
// queries: published native_booking providers with services, schedules and
// exceptions, and their bookings over the horizon (±1 day for timezone edges).
// Service-role read: bookings aren't public; callers return only availability,
// never booking details.
async function loadWindows(days: number) {
  const supabase = createAdminClient()
  const now = new Date()
  const today = londonDate(now)
  const dates = Array.from({ length: days }, (_, i) => addDays(today, i))

  const { data } = await supabase
    .from('providers')
    .select(
      'slug, name_en, borough, booking_enabled, parallel_capacity, categories(slug), ' +
        'provider_translations(locale,name,description), ' +
        'services(id,name_en,name_ru,duration_min,capacity,price_pence), ' +
        'schedules(day_of_week,start_time,end_time), ' +
        'schedule_exceptions(exception_date,is_closed,start_time,end_time)',
    )
    .eq('status', 'published')
    .eq('fulfillment_type', 'native_booking')
    .returns<WindowProviderRow[]>()
  const providers = data ?? []

  const serviceIds = providers.flatMap((p) => p.services.map((s) => s.id))
  const bookingsByService = new Map<string, ExistingBooking[]>()
  if (serviceIds.length) {
    const { data: rows } = await supabase
      .from('bookings')
      .select('service_id, starts_at, ends_at, party_size, status')
      .in('service_id', serviceIds)
      .gte('starts_at', `${addDays(today, -1)}T00:00:00Z`)
      .lt('starts_at', `${addDays(today, days + 1)}T00:00:00Z`)
    for (const b of (rows ?? []) as (ExistingBooking & { service_id: string })[]) {
      const list = bookingsByService.get(b.service_id) ?? []
      list.push(b)
      bookingsByService.set(b.service_id, list)
    }
  }

  const rulesFor = (p: WindowProviderRow, date: string) => {
    const dow = dowOf(date)
    return {
      weekly: p.schedules
        .filter((s) => s.day_of_week === dow)
        .map((s) => ({ start_time: s.start_time, end_time: s.end_time })),
      exception: p.schedule_exceptions.find((e) => e.exception_date === date) ?? null,
    }
  }

  // Each provider's bookings across all its services, as parallel-capacity
  // units (individual bookings, booked group sessions) for the whole horizon.
  const loadFor = (p: WindowProviderRow) => {
    const group = new Map(p.services.map((s) => [s.id, s.capacity > 1]))
    const mine: ProviderBooking[] = p.services.flatMap((s) =>
      (bookingsByService.get(s.id) ?? []).map((b) => ({ ...b, service_id: s.id, group: group.get(s.id) ?? false })),
    )
    return { parallelCapacity: p.parallel_capacity ?? 1, units: providerUnits(mine) }
  }

  return { dates, now, providers, bookingsByService, rulesFor, loadFor }
}

/**
 * Every free window over the next `days` London dates (today first) across
 * bookable providers (booking enabled), names in the given locale; soonest
 * first, optionally capped. The single source for the home city (it lights the
 * WINDOW_CAP soonest), the live counter, «Ближайшие окна», business rows and
 * category counts.
 */
export async function getFreeWindows({
  locale,
  days = HORIZON_DAYS,
  cap,
}: {
  locale: string
  days?: number
  cap?: number // e.g. WINDOW_CAP for what the city lights; counts need no cap
}): Promise<FreeWindow[]> {
  const { dates, now, providers, bookingsByService, rulesFor, loadFor } = await loadWindows(days)
  const base = providers
    .filter((p) => p.categories)
    .map((p) => ({
      row: p,
      provider: {
        slug: p.slug,
        categorySlug: p.categories!.slug,
        name: pickProviderContent({ name_en: p.name_en, description_en: null }, p.provider_translations, locale).name,
        borough: p.borough,
        bookable: p.booking_enabled,
        load: loadFor(p),
        services: p.services.map((s) => ({
          id: s.id,
          name: locale === 'ru' ? (s.name_ru ?? s.name_en) : s.name_en,
          durationMin: s.duration_min,
          capacity: s.capacity,
          pricePence: s.price_pence,
        })),
      },
    }))
  const perDay = dates.map((date) => ({
    date,
    providers: base.map(({ row, provider }): WindowProvider => ({ ...provider, ...rulesFor(row, date) })),
  }))
  return freeWindowsForDays(perDay, bookingsByService, now, cap)
}
