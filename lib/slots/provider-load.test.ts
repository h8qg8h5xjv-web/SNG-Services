import { test } from 'node:test'
import assert from 'node:assert/strict'
import { providerUnits, peakUnits, providerFits, type ProviderBooking } from './provider-load.ts'

const at = (hhmm: string) => Date.parse(`2030-01-07T${hhmm}:00Z`)
const b = (service_id: string, s: string, e: string, over: Partial<ProviderBooking> = {}): ProviderBooking => ({
  service_id,
  starts_at: `2030-01-07T${s}:00Z`,
  ends_at: `2030-01-07T${e}:00Z`,
  party_size: 1,
  status: 'pending',
  group: false,
  ...over,
})

test('solo master: a second service at the same time does not fit; touching does', () => {
  const load = { parallelCapacity: 1, units: providerUnits([b('cut', '10:00', '11:00')]) }
  assert.equal(providerFits(load, 'beard', false, at('10:00'), at('11:00')), false)
  assert.equal(providerFits(load, 'beard', false, at('10:30'), at('11:30')), false)
  assert.equal(providerFits(load, 'beard', false, at('11:00'), at('12:00')), true)
})

test('cancelled bookings take nothing', () => {
  const load = { parallelCapacity: 1, units: providerUnits([b('cut', '10:00', '11:00', { status: 'cancelled' })]) }
  assert.equal(providerFits(load, 'beard', false, at('10:00'), at('11:00')), true)
})

test('salon with two chairs: two fit, a third does not; peak, not a count of overlaps', () => {
  const two = { parallelCapacity: 2, units: providerUnits([b('cut', '10:00', '11:00')]) }
  assert.equal(providerFits(two, 'colour', false, at('10:00'), at('11:00')), true)
  const full = { parallelCapacity: 2, units: providerUnits([b('cut', '10:00', '11:00'), b('colour', '10:00', '11:00')]) }
  assert.equal(providerFits(full, 'nails', false, at('10:30'), at('11:30')), false)
  const staggered = { parallelCapacity: 2, units: providerUnits([b('cut', '12:00', '13:00'), b('cut', '13:00', '14:00')]) }
  assert.equal(peakUnits(staggered.units, at('12:30'), at('13:30')), 1)
  assert.equal(providerFits(staggered, 'colour', false, at('12:30'), at('13:30')), true)
})

test('group class: one unit per booked session; joining it needs no unit; it blocks individuals', () => {
  const units = providerUnits([
    b('class', '10:00', '11:00', { group: true }),
    b('class', '10:00', '11:00', { group: true, party_size: 2 }),
  ])
  assert.equal(units.length, 1)
  const load = { parallelCapacity: 1, units }
  assert.equal(providerFits(load, 'class', true, at('10:00'), at('11:00')), true) // join the session
  assert.equal(providerFits(load, 'personal', false, at('10:30'), at('11:30')), false)
  assert.equal(providerFits(load, 'class', true, at('10:30'), at('11:30')), false) // a different session
  // An empty class cannot start over an individual booking.
  const busy = { parallelCapacity: 1, units: providerUnits([b('personal', '14:00', '15:00')]) }
  assert.equal(providerFits(busy, 'class', true, at('14:00'), at('15:00')), false)
})
