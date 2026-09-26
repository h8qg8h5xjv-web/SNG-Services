import { test } from 'node:test'
import assert from 'node:assert/strict'
import { quantile, leadTimeStats, formatLead } from './lead-time-stats.ts'

const H = 3_600_000
const row = (category: string | null, hoursAhead: number) => ({
  category,
  createdAt: '2030-01-07T10:00:00Z',
  startsAt: new Date(Date.parse('2030-01-07T10:00:00Z') + hoursAhead * H).toISOString(),
})

test('quantiles interpolate between ranks', () => {
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5)
  assert.equal(quantile([1, 2, 3, 4], 0.25), 1.75)
  assert.equal(quantile([5], 0.75), 5)
  assert.ok(Number.isNaN(quantile([], 0.5)))
})

test('per category and overall; most bookings first; bad rows skipped', () => {
  const s = leadTimeStats([
    row('beauty', 2),
    row('beauty', 4),
    row('beauty', 6),
    row('health', 48),
    row(null, 1),
    { category: 'beauty', createdAt: '2030-01-07T10:00:00Z', startsAt: '2030-01-06T10:00:00Z' },
  ])
  assert.deepEqual(
    s.byCategory.map((c) => [c.category, c.n, c.median / H]),
    [
      ['beauty', 3, 4],
      ['health', 1, 48],
      ['—', 1, 1],
    ],
  )
  assert.equal(s.overall?.n, 5)
  assert.equal(s.overall?.median, 4 * H)
  assert.equal(leadTimeStats([]).overall, null)
})

test('compact formatting', () => {
  assert.equal(formatLead(30 * 60_000), '30 мин')
  assert.equal(formatLead(1.5 * H), '1,5 ч')
  assert.equal(formatLead(30 * H), '30 ч')
  assert.equal(formatLead(72 * H), '3,0 дн')
})
