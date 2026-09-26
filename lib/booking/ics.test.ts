import { test } from 'node:test'
import assert from 'node:assert/strict'
import { icsFor } from './ics.ts'

test('one VEVENT in UTC with duration, escaped text and CRLF lines', () => {
  const ics = icsFor({
    start: '2030-06-01T10:15:00.000Z',
    durationMin: 45,
    title: 'Стрижка, борода — Барбершоп; Кавказ',
    location: 'Kilburn, Brent',
    now: new Date('2030-05-30T08:00:00Z'),
  })
  const lines = ics.split('\r\n')
  assert.equal(lines[0], 'BEGIN:VCALENDAR')
  assert.ok(lines.includes('DTSTART:20300601T101500Z'))
  assert.ok(lines.includes('DTSTAMP:20300530T080000Z'))
  assert.ok(lines.includes('DURATION:PT45M'))
  assert.ok(lines.includes('SUMMARY:Стрижка\\, борода — Барбершоп\; Кавказ'))
  assert.ok(lines.includes('LOCATION:Kilburn\\, Brent'))
  assert.equal(lines.filter((l) => l === 'BEGIN:VEVENT').length, 1)
})
