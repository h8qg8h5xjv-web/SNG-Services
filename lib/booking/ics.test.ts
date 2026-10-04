import { test } from 'node:test'
import assert from 'node:assert/strict'
import { escapeText, foldLine, icsFor } from './ics.ts'

const octets = (s: string) => new TextEncoder().encode(s).length
// RFC 5545 §3.1 unfolding: drop every CRLF followed by one space.
const unfold = (ics: string) => ics.replace(/\r\n /g, '')

const event = (title: string, location: string) =>
  icsFor({ start: '2030-06-01T10:15:00.000Z', durationMin: 45, title, location, now: new Date('2030-05-30T08:00:00Z') })

test('one VEVENT in UTC with duration and CRLF lines', () => {
  const ics = event('Стрижка', 'Kilburn')
  assert.ok(ics.endsWith('\r\n'))
  const lines = unfold(ics).split('\r\n')
  assert.equal(lines[0], 'BEGIN:VCALENDAR')
  assert.ok(lines.includes('DTSTART:20300601T101500Z'))
  assert.ok(lines.includes('DTSTAMP:20300530T080000Z'))
  assert.ok(lines.includes('DURATION:PT45M'))
  assert.equal(lines.filter((l) => l === 'BEGIN:VEVENT').length, 1)
})

test('TEXT escaping: semicolon, comma, backslash and line breaks in title and address', () => {
  const lines = unfold(event('Стрижка, борода; Кавказ \\ VIP', 'Flat 2; 10 High St,\nKilburn\\NW6')).split('\r\n')
  assert.ok(lines.includes(String.raw`SUMMARY:Стрижка\, борода\; Кавказ \\ VIP`))
  assert.ok(lines.includes(String.raw`LOCATION:Flat 2\; 10 High St\,\nKilburn\\NW6`))
})

test('escapeText: backslash escaped first, so later escapes are not doubled', () => {
  assert.equal(escapeText(String.raw`a\;b`), String.raw`a\\\;b`)
  assert.equal(escapeText(String.raw`a\,b`), String.raw`a\\\,b`)
  assert.equal(escapeText('one\r\ntwo\rthree\nfour'), 'one\\ntwo\\nthree\\nfour')
  assert.equal(escapeText('plain: text'), 'plain: text')
})

test('long lines fold at 75 octets without splitting a character', () => {
  const title = 'Маникюр с покрытием гель-лаком и дизайном на все ногти, снятие старого покрытия 🌸 и уход'
  const ics = event(title, 'Kilburn')
  for (const line of ics.split('\r\n')) assert.ok(octets(line) <= 75, `${octets(line)} octets: ${line}`)
  // Every continuation starts with exactly one space; unfolding restores the line.
  assert.ok(ics.includes('\r\n '))
  assert.ok(unfold(ics).split('\r\n').includes(`SUMMARY:${escapeText(title)}`))
  // No lone surrogate: the emoji survived whole.
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(ics))
})

test('foldLine leaves short lines alone and cuts exactly at the limit', () => {
  assert.equal(foldLine('SUMMARY:short'), 'SUMMARY:short')
  const ascii = 'x'.repeat(75)
  assert.equal(foldLine(ascii), ascii)
  assert.equal(foldLine(ascii + 'y'), `${ascii}\r\n y`)
  // 2-octet letters: 37 fit (74 octets), the 38th would make 76 → next line.
  const cyr = 'ж'.repeat(38)
  assert.equal(foldLine(cyr), `${'ж'.repeat(37)}\r\n ж`)
})
