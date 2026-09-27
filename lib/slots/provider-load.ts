// The provider-level rule from enforce_booking_rules (migration …36), for the
// site's slot maths, so the site never offers a window the database rejects:
//   * pending and confirmed bookings count; cancelled never do
//   * an individual booking (service capacity 1) takes one unit of the
//     provider's parallel capacity for its time
//   * a group session (service capacity > 1, same service and start) with at
//     least one booking takes ONE unit; an empty session takes none
//   * a new booking fits when, at every moment of its interval, busy units + 1
//     stay within parallel_capacity (peak concurrency); a booking joining an
//     already booked group session needs no new unit.
// Pure; relative imports only (unit-tested with node --test).

import type { ExistingBooking } from './compute.ts'

export type ProviderBooking = ExistingBooking & { service_id: string; group: boolean }
export type Unit = { start: number; end: number; session: string | null } // ms; session key for group units
export type ProviderLoad = { parallelCapacity: number; units: Unit[] }

export const sessionKey = (serviceId: string, startMs: number) => `${serviceId}@${startMs}`

export function providerUnits(bookings: ProviderBooking[]): Unit[] {
  const units: Unit[] = []
  const sessions = new Map<string, Unit>()
  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    const start = Date.parse(b.starts_at)
    const end = Date.parse(b.ends_at)
    if (!b.group) {
      units.push({ start, end, session: null })
      continue
    }
    const key = sessionKey(b.service_id, start)
    const u = sessions.get(key)
    if (u) u.end = Math.max(u.end, end)
    else {
      const nu = { start, end, session: key }
      sessions.set(key, nu)
      units.push(nu)
    }
  }
  return units
}

// Most units busy at any moment of [s, e). Concurrency only rises at a start,
// so checking s and every unit start inside (s, e) finds the peak.
export function peakUnits(units: Unit[], s: number, e: number): number {
  const live = units.filter((u) => u.start < e && u.end > s)
  const points = [s, ...live.map((u) => u.start).filter((t) => t > s && t < e)]
  let peak = 0
  for (const t of points) {
    let n = 0
    for (const u of live) if (u.start <= t && u.end > t) n++
    if (n > peak) peak = n
  }
  return peak
}

// Can a new booking of this service at [s, e) take the provider's time?
export function providerFits(
  load: ProviderLoad,
  serviceId: string,
  group: boolean,
  s: number,
  e: number,
): boolean {
  if (group) {
    const key = sessionKey(serviceId, s)
    if (load.units.some((u) => u.session === key)) return true
  }
  return peakUnits(load.units, s, e) + 1 <= load.parallelCapacity
}
