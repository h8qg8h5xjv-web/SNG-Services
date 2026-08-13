import { createAdminClient } from '@/lib/supabase/admin'
import { computeSlots, type Slot } from './compute'

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

export type AvailableTodayProvider = {
  slug: string
  categorySlug: string
  name_en: string
  borough: string
  cover_image: string | null
  nextSlot: string // ISO
}

/**
 * Published native_booking providers with at least one free slot left today.
 * Powers the "Available today" block on the home page.
 */
export async function getAvailableTodayProviders(
  limit = 6,
): Promise<AvailableTodayProvider[]> {
  const supabase = createAdminClient()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(
    new Date(),
  )
  const dow = dowOf(today)
  const now = new Date()

  const { data: providers } = await supabase
    .from('providers')
    .select(
      'slug, name_en, borough, cover_image, categories(slug), ' +
        'services(id,duration_min,capacity), ' +
        'schedules(day_of_week,start_time,end_time), ' +
        'schedule_exceptions(exception_date,is_closed,start_time,end_time)',
    )
    .eq('status', 'published')
    .eq('fulfillment_type', 'native_booking')
    .returns<
      {
        slug: string
        name_en: string
        borough: string
        cover_image: string | null
        categories: { slug: string } | null
        services: { id: string; duration_min: number; capacity: number }[]
        schedules: { day_of_week: number; start_time: string; end_time: string }[]
        schedule_exceptions: {
          exception_date: string
          is_closed: boolean
          start_time: string | null
          end_time: string | null
        }[]
      }[]
    >()

  if (!providers) return []

  type ServiceBooking = {
    service_id: string
    starts_at: string
    ends_at: string
    party_size: number
    status: 'pending' | 'confirmed' | 'cancelled'
  }
  const serviceIds = providers.flatMap((p) => p.services.map((s) => s.id))
  const bookingsByService = new Map<string, ServiceBooking[]>()
  if (serviceIds.length) {
    const { data } = await supabase
      .from('bookings')
      .select('service_id, starts_at, ends_at, party_size, status')
      .in('service_id', serviceIds)
      .gte('starts_at', `${addDays(today, -1)}T00:00:00Z`)
      .lt('starts_at', `${addDays(today, 2)}T00:00:00Z`)
    for (const b of (data ?? []) as ServiceBooking[]) {
      const list = bookingsByService.get(b.service_id) ?? []
      list.push(b)
      bookingsByService.set(b.service_id, list)
    }
  }

  const result: AvailableTodayProvider[] = []
  for (const p of providers) {
    const weekly = p.schedules
      .filter((s) => s.day_of_week === dow)
      .map((s) => ({ start_time: s.start_time, end_time: s.end_time }))
    const exc = p.schedule_exceptions.find((e) => e.exception_date === today) ?? null

    let earliest: string | null = null
    for (const service of p.services) {
      const slots = computeSlots({
        date: today,
        durationMin: service.duration_min,
        capacity: service.capacity,
        weekly,
        exception: exc,
        bookings: bookingsByService.get(service.id) ?? [],
        now,
      })
      for (const slot of slots) {
        if (slot.capacityRemaining > 0 && (!earliest || slot.start < earliest)) {
          earliest = slot.start
        }
      }
    }

    if (earliest && p.categories) {
      result.push({
        slug: p.slug,
        categorySlug: p.categories.slug,
        name_en: p.name_en,
        borough: p.borough,
        cover_image: p.cover_image,
        nextSlot: earliest,
      })
    }
  }

  result.sort((a, b) => a.nextSlot.localeCompare(b.nextSlot))
  return result.slice(0, limit)
}
