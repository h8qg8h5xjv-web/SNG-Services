// Today's free windows across every bookable provider — the one list that feeds
// the home city (amber windows), the live counter, «Свободно сегодня» and the
// per-category counts, so every number on the page agrees. Pure: the caller
// loads providers and bookings (lib/slots/service.ts).

import { computeSlots, type ExistingBooking, type ScheduleException, type WeeklyInterval } from './compute.ts'

export type WindowProvider = {
  slug: string
  categorySlug: string
  name: string
  borough: string
  bookable: boolean // native_booking with booking enabled
  services: { id: string; name: string; durationMin: number; capacity: number; pricePence: number }[]
  weekly: WeeklyInterval[] // rows for today's weekday
  exception: ScheduleException | null // today's exception, if any
}

// One free window = one provider at one start time. Several services starting
// at the same moment are still one window (one person, one chair); the card
// shows the cheapest of them.
export type FreeWindow = {
  id: string // `${slug}@${start}`
  slug: string
  categorySlug: string
  name: string
  borough: string
  start: string // ISO UTC
  serviceId: string
  serviceName: string
  pricePence: number
}

export function freeWindows(
  providers: WindowProvider[],
  bookingsByService: Map<string, ExistingBooking[]>,
  date: string,
  now: Date,
): FreeWindow[] {
  const out: FreeWindow[] = []
  for (const p of providers) {
    if (!p.bookable) continue
    const byStart = new Map<string, FreeWindow>()
    for (const s of p.services) {
      const slots = computeSlots({
        date,
        durationMin: s.durationMin,
        capacity: s.capacity,
        weekly: p.weekly,
        exception: p.exception,
        bookings: bookingsByService.get(s.id) ?? [],
        now,
      })
      for (const slot of slots) {
        if (slot.capacityRemaining <= 0) continue
        const seen = byStart.get(slot.start)
        if (seen && seen.pricePence <= s.pricePence) continue
        byStart.set(slot.start, {
          id: `${p.slug}@${slot.start}`,
          slug: p.slug,
          categorySlug: p.categorySlug,
          name: p.name,
          borough: p.borough,
          start: slot.start,
          serviceId: s.id,
          serviceName: s.name,
          pricePence: s.pricePence,
        })
      }
    }
    out.push(...byStart.values())
  }
  return out.sort((a, b) => a.start.localeCompare(b.start) || a.slug.localeCompare(b.slug))
}

// «Свободно сегодня» without a filter: the earliest window per provider.
export function earliestPerProvider(windows: FreeWindow[], limit: number): FreeWindow[] {
  const seen = new Set<string>()
  const out: FreeWindow[] = []
  for (const w of windows) {
    if (seen.has(w.slug)) continue
    seen.add(w.slug)
    out.push(w)
    if (out.length >= limit) break
  }
  return out
}

export function countByCategory(windows: FreeWindow[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const w of windows) counts[w.categorySlug] = (counts[w.categorySlug] ?? 0) + 1
  return counts
}

// Booking link for a window: straight to the details step of that slot.
export function windowHref(w: Pick<FreeWindow, 'categorySlug' | 'slug' | 'serviceId' | 'start'>): string {
  return `/${w.categorySlug}/${w.slug}/book?step=details&svc=${encodeURIComponent(w.serviceId)}&slot=${encodeURIComponent(w.start)}`
}

// Windows per provider slug, each list in time order (rows show the first 3).
export function groupBySlug(windows: FreeWindow[]): Record<string, FreeWindow[]> {
  const out: Record<string, FreeWindow[]> = {}
  for (const w of windows) (out[w.slug] ??= []).push(w)
  return out
}
