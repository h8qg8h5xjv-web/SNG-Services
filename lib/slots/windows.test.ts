import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  freeWindows,
  freeWindowsForDays,
  earliestPerProvider,
  countByCategory,
  dayOffset,
  inHorizon,
  addDays,
  londonDate,
  groupBySlug,
  firstPerProviderDay,
  countsBySlugDay,
  homePool,
  type WindowProvider,
} from './windows.ts'

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

test('several days: each date uses its own rules, soonest first, each window knows its day', () => {
  const mon = provider()
  const tue = provider({ weekly: [{ start_time: '15:00', end_time: '16:00' }] })
  const w = freeWindowsForDays(
    [
      { date: '2030-01-08', providers: [tue] },
      { date: DATE, providers: [mon] },
    ],
    new Map(),
    new Date('2030-01-07T10:30:00Z'),
  )
  assert.deepEqual(
    w.map((x) => [x.day, x.start.slice(11, 16)]),
    [
      [DATE, '11:00'],
      [DATE, '12:00'],
      ['2030-01-08', '15:00'],
    ],
  )
})

test('the list is capped, keeping the soonest windows', () => {
  const days = Array.from({ length: 7 }, (_, i) => ({ date: addDays(DATE, i), providers: [provider()] }))
  const w = freeWindowsForDays(days, new Map(), NOW, 5)
  assert.equal(w.length, 5)
  assert.deepEqual([...new Set(w.map((x) => x.day))], [DATE, '2030-01-08'])
})

test('day offsets and horizons, across a clock change', () => {
  assert.equal(dayOffset('2030-03-31', '2030-03-30'), 1) // BST starts 31 March 2030
  assert.equal(dayOffset('2030-01-13', DATE), 6)
  const at = (day: string) => ({ day })
  assert.equal(inHorizon(at(DATE), 'today', DATE), true)
  assert.equal(inHorizon(at('2030-01-08'), 'today', DATE), false)
  assert.equal(inHorizon(at('2030-01-08'), 'tomorrow', DATE), true)
  assert.equal(inHorizon(at('2030-01-13'), 'week', DATE), true)
  assert.equal(inHorizon(at('2030-01-14'), 'week', DATE), false)
  assert.equal(inHorizon(at('2030-01-06'), 'week', DATE), false)
})

test('London date: late evening in summer is already tomorrow in UTC terms', () => {
  assert.equal(londonDate(new Date('2030-07-01T23:30:00Z')), '2030-07-02')
  assert.equal(londonDate(new Date('2030-01-01T23:30:00Z')), '2030-01-01')
})

test('home pool: the soonest N plus every provider-day first; exact counts kept apart', () => {
  const tutor = provider({ slug: 'dina', categorySlug: 'education', weekly: [{ start_time: '15:00', end_time: '17:00' }] })
  const days = Array.from({ length: 3 }, (_, i) => ({ date: addDays(DATE, i), providers: [provider(), tutor] }))
  const all = freeWindowsForDays(days, new Map(), NOW) // 3 days × (3 kavkaz + 2 dina) = 15
  assert.equal(all.length, 15)
  assert.equal(firstPerProviderDay(all).length, 6)
  const pool = homePool(all, 4)
  // 4 soonest (day 0: kavkaz 10,11,12 + dina 15) + firsts of days 1 and 2 for both.
  assert.equal(pool.length, 8)
  assert.deepEqual(
    pool.map((w) => w.start).slice().sort(),
    pool.map((w) => w.start),
  )
  assert.deepEqual(countsBySlugDay(all, DATE, 7), { kavkaz: [3, 3, 3, 0, 0, 0, 0], dina: [2, 2, 2, 0, 0, 0, 0] })
  assert.deepEqual(
    Object.fromEntries(Object.entries(groupBySlug(all, 2)).map(([k, v]) => [k, v.length])),
    { kavkaz: 2, dina: 2 },
  )
})
