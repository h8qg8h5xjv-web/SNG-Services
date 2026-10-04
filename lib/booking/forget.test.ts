import { test } from 'node:test'
import assert from 'node:assert/strict'
import { splitForForget } from './forget.ts'

const NOW = new Date('2030-01-07T12:00:00Z')

test('past and cancelled bookings are wiped; upcoming live ones stay with the specialist', () => {
  const { wipe, keep } = splitForForget(
    [
      { ref: 'PAST', endsAt: '2030-01-07T11:00:00Z', status: 'confirmed' },
      { ref: 'JUST-ENDED', endsAt: '2030-01-07T12:00:00Z', status: 'pending' },
      { ref: 'IN-PROGRESS', endsAt: '2030-01-07T12:30:00Z', status: 'confirmed' },
      { ref: 'UPCOMING', endsAt: '2030-01-09T10:00:00Z', status: 'pending' },
      { ref: 'UPCOMING-CANCELLED', endsAt: '2030-01-09T10:00:00Z', status: 'cancelled' },
    ],
    NOW,
  )
  assert.deepEqual(wipe, ['PAST', 'JUST-ENDED', 'UPCOMING-CANCELLED'])
  assert.deepEqual(keep, ['IN-PROGRESS', 'UPCOMING'])
})
