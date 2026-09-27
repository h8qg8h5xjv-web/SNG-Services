import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openingHoursSchema, parseOpeningHours } from './hours.ts'

test('opening hours: days may be missing (closed); empty and null are fine', () => {
  const week = { mon: [{ open: '09:00', close: '18:00' }], sat: [{ open: '10:00', close: '14:00' }] }
  assert.deepEqual(parseOpeningHours(week), week)
  assert.equal(openingHoursSchema.safeParse({}).success, true)
  assert.equal(parseOpeningHours(null), null)
})

test('opening hours: bad keys and bad intervals are still rejected', () => {
  assert.equal(openingHoursSchema.safeParse({ xyz: [] }).success, false)
  assert.equal(openingHoursSchema.safeParse({ mon: [{ open: '18:00', close: '09:00' }] }).success, false)
})
