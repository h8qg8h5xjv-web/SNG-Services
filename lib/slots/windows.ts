// Free windows in the next days across every bookable provider — the one list
// that feeds the home city (amber windows), the live counter, «Ближайшие окна»,
// business rows and the per-category counts, so every number agrees. Pure: the
// caller loads providers and bookings (lib/slots/service.ts).

import { computeSlots, type ExistingBooking, type ScheduleException, type WeeklyInterval } from './compute.ts'

export type WindowProvider = {
  slug: string
  categorySlug: string
  name: string
  borough: string
  bookable: boolean // native_booking with booking enabled
  services: { id: string; name: string; durationMin: number; capacity: number; pricePence: number }[]
  weekly: WeeklyInterval[] // rows for this date's weekday
  exception: ScheduleException | null // this date's exception, if any
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
  day: string // London date of the window, YYYY-MM-DD
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
          day: date,
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

// The city has 420 arched slot windows: it lights at most the 420 soonest.
// Counts never use a capped list — a cap drops whole later days, and a category
// would read «no windows this week» while it has them.
export const WINDOW_CAP = 420
export const HORIZON_DAYS = 7

// Several London dates → one list, soonest first, optionally capped. Each date
// carries the providers' rules for that date (weekday rows and its exception).
export function freeWindowsForDays(
  days: { date: string; providers: WindowProvider[] }[],
  bookingsByService: Map<string, ExistingBooking[]>,
  now: Date,
  cap = Infinity,
): FreeWindow[] {
  return days
    .flatMap((d) => freeWindows(d.providers, bookingsByService, d.date, now))
    .sort((a, b) => a.start.localeCompare(b.start) || a.slug.localeCompare(b.slug))
    .slice(0, cap)
}

export function londonDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now)
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10)
}

// Whole days from `today` to `day` (both London dates): 0 today, 1 tomorrow…
export function dayOffset(day: string, today: string): number {
  const ms = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
  return Math.round((ms(day) - ms(today)) / 86_400_000)
}

// The home's time chips: Сегодня · Завтра · Неделя.
export type Horizon = 'today' | 'tomorrow' | 'week'
export const HORIZONS: Horizon[] = ['today', 'tomorrow', 'week']

export function inHorizon(w: Pick<FreeWindow, 'day'>, h: Horizon, today: string): boolean {
  const off = dayOffset(w.day, today)
  if (h === 'today') return off === 0
  if (h === 'tomorrow') return off === 1
  return off >= 0 && off < HORIZON_DAYS
}

// «Ближайшие окна» without a filter: the earliest window per provider.
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

// Windows per provider slug, each list in time order; `limit` keeps the first
// few (rows show 3), so client components don't receive the whole week.
export function groupBySlug(windows: FreeWindow[], limit = Infinity): Record<string, FreeWindow[]> {
  const out: Record<string, FreeWindow[]> = {}
  for (const w of windows) {
    const list = (out[w.slug] ??= [])
    if (list.length < limit) list.push(w)
  }
  return out
}

// The earliest window of each provider on each day, in time order: enough for
// «Ближайшие окна» under any time chip or filter, without the whole week.
export function firstPerProviderDay(windows: FreeWindow[]): FreeWindow[] {
  const seen = new Set<string>()
  return windows.filter((w) => {
    const key = `${w.slug}@${w.day}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Exact counts per provider and day offset (0 = today … days-1) — the live
// counter sums these, so it stays exact while the client holds a small list.
export function countsBySlugDay(windows: FreeWindow[], today: string, days = HORIZON_DAYS): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const w of windows) {
    const off = dayOffset(w.day, today)
    if (off < 0 || off >= days) continue
    ;(out[w.slug] ??= new Array<number>(days).fill(0))[off]++
  }
  return out
}

// What the home page sends to the client: the soonest windows the city can
// light, plus each provider's first window per day (deduplicated, time order).
export function homePool(windows: FreeWindow[], cap = WINDOW_CAP): FreeWindow[] {
  const byId = new Map<string, FreeWindow>()
  for (const w of windows.slice(0, cap)) byId.set(w.id, w)
  for (const w of firstPerProviderDay(windows)) byId.set(w.id, w)
  return [...byId.values()].sort((a, b) => a.start.localeCompare(b.start) || a.slug.localeCompare(b.slug))
}
