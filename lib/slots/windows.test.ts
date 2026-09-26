import { test } from 'node:test'
import assert from 'node:assert/strict'
import { freeWindows, earliestPerProvider, countByCategory, type WindowProvider } from './windows.ts'

// A winter date (London = UTC), so wall-clock times equal UTC in assertions.
const DATE = '2030-01-07'
const NOW = new Date('2030-01-07T08:00:00Z')

const provider = (over: Partial<WindowProvider> = {}): WindowProvider => ({
  slug: 'kavkaz',
  categorySlug: 'beauty',
  name: 'Kavkaz',
  borough: 'Brent',
  bookable: true,
  services: [
    { id: 'cut', name: 'Cut', durationMin: 60, capacity: 1, pricePence: 2500 },
    { id: 'beard', name: 'Beard', durationMin: 60, capacity: 1, pricePence: 1500 },
  ],
  weekly: [{ start_time: '10:00', end_time: '13:00' }],
  exception: null,
  ...over,
})

test('one window per provider and start time, cheapest service shown', () => {
  const w = freeWindows([provider()], new Map(), DATE, NOW)
  assert.deepEqual(
    w.map((x) => [x.start.slice(11, 16), x.serviceId]),
    [
      ['10:00', 'beard'],
      ['11:00', 'beard'],
      ['12:00', 'beard'],
    ],
  )
})

test('a full service falls back to another service at that time', () => {
  const bookings = new Map([
    ['beard', [{ starts_at: '2030-01-07T10:00:00Z', ends_at: '2030-01-07T11:00:00Z', party_size: 1, status: 'pending' as const }]],
  ])
  const w = freeWindows([provider()], bookings, DATE, NOW)
  assert.equal(w[0].serviceId, 'cut')
  assert.equal(w.length, 3)
})

test('no window when every service at that time is taken; cancelled bookings free it', () => {
  const full = (status: 'confirmed' | 'cancelled') =>
    new Map(
      ['cut', 'beard'].map((id) => [
        id,
        [{ starts_at: '2030-01-07T10:00:00Z', ends_at: '2030-01-07T11:00:00Z', party_size: 1, status }],
      ]),
    )
  assert.equal(freeWindows([provider()], full('confirmed'), DATE, NOW).length, 2)
  assert.equal(freeWindows([provider()], full('cancelled'), DATE, NOW).length, 3)
})

test('not bookable, closed today, or past slots give no windows', () => {
  assert.equal(freeWindows([provider({ bookable: false })], new Map(), DATE, NOW).length, 0)
  const closed = provider({ exception: { is_closed: true, start_time: null, end_time: null } })
  assert.equal(freeWindows([closed], new Map(), DATE, NOW).length, 0)
  assert.equal(freeWindows([provider()], new Map(), DATE, new Date('2030-01-07T11:30:00Z')).length, 1)
})

test('earliest per provider, sorted by time; counts by category', () => {
  const other = provider({ slug: 'vesna', categorySlug: 'beauty', weekly: [{ start_time: '09:00', end_time: '11:00' }] })
  const tutor = provider({ slug: 'dina', categorySlug: 'education' })
  const w = freeWindows([provider(), other, tutor], new Map(), DATE, NOW)
  assert.deepEqual(
    earliestPerProvider(w, 12).map((x) => x.slug),
    ['vesna', 'dina', 'kavkaz'],
  )
  assert.deepEqual(countByCategory(w), { beauty: 5, education: 3 })
})
