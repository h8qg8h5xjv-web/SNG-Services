// Slot computation. Pure and dependency-free so it is fully unit-testable.
//
// Given a service (duration + capacity), a date, the provider's weekly schedule
// for that weekday, an optional schedule exception, and the existing bookings,
// it produces the bookable time slots — with past slots removed and occupancy
// (confirmed + pending party sizes) subtracted from capacity.

const TZ = 'Europe/London'

export type WeeklyInterval = { start_time: string; end_time: string }
export type ScheduleException = {
  is_closed: boolean
  start_time: string | null
  end_time: string | null
}
export type ExistingBooking = {
  starts_at: string
  ends_at: string
  party_size: number
  status: 'pending' | 'confirmed' | 'cancelled'
}

export type SlotInput = {
  date: string // 'YYYY-MM-DD', London local
  durationMin: number
  capacity: number
  weekly: WeeklyInterval[] // rows matching this weekday
  exception: ScheduleException | null // exception for this date, if any
  bookings: ExistingBooking[]
  now: Date
}

export type Slot = {
  start: string // ISO (UTC)
  end: string // ISO (UTC)
  capacityRemaining: number
}

// Minutes Europe/London is ahead of UTC at the given instant (0 in winter, 60 in summer).
function londonOffsetMinutes(instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = dtf.formatToParts(instant)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  let hour = get('hour')
  if (hour === 24) hour = 0 // some engines emit 24 for midnight
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
  )
  return (asUtc - instant.getTime()) / 60000
}

// Interprets a London wall-clock date+time as a UTC instant.
function londonToUtc(dateStr: string, timeStr: string): number {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, mi] = timeStr.split(':').map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const offset = londonOffsetMinutes(new Date(guess))
  return guess - offset * 60000
}

function occupancy(bookings: ExistingBooking[], startMs: number, endMs: number): number {
  let taken = 0
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    const bStart = Date.parse(b.starts_at)
    const bEnd = Date.parse(b.ends_at)
    // Overlap uses strict inequalities: a booking that ends exactly when the
    // slot starts does not occupy it (interval boundaries).
    if (bStart < endMs && bEnd > startMs) taken += b.party_size
  }
  return taken
}

export function computeSlots(input: SlotInput): Slot[] {
  const { date, durationMin, capacity, weekly, exception, bookings, now } = input

  let intervals: WeeklyInterval[]
  if (exception) {
    intervals =
      exception.is_closed || !exception.start_time || !exception.end_time
        ? []
        : [{ start_time: exception.start_time, end_time: exception.end_time }]
  } else {
    intervals = weekly
  }

  const durationMs = durationMin * 60000
  const nowMs = now.getTime()
  const slots: Slot[] = []

  for (const interval of intervals) {
    const openMs = londonToUtc(date, interval.start_time)
    const closeMs = londonToUtc(date, interval.end_time)
    for (let s = openMs; s + durationMs <= closeMs; s += durationMs) {
      const e = s + durationMs
      if (s <= nowMs) continue // hide past slots
      const remaining = capacity - occupancy(bookings, s, e)
      slots.push({
        start: new Date(s).toISOString(),
        end: new Date(e).toISOString(),
        capacityRemaining: Math.max(0, remaining),
      })
    }
  }

  return slots
}

/** Slots with room for the requested party size. */
export function availableSlots(slots: Slot[], partySize = 1): Slot[] {
  return slots.filter((s) => s.capacityRemaining >= partySize)
}
