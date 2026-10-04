// A one-event iCalendar file for «Добавить в календарь» (RFC 5545). Built in
// the browser from the real booking; times in UTC so every calendar app places
// it correctly.

import { BRAND_NAME } from '../brand.ts'

// RFC 5545 §3.3.11 TEXT: backslash first (so the escapes added after it stay
// single), then semicolon, comma and line breaks.
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n')
}

const utf8Length = (cp: number) => (cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4)

// RFC 5545 §3.1: a content line is at most 75 octets; longer ones continue on
// the next line after CRLF + one space (which counts towards that line). Cut
// between characters only — never inside a UTF-8 sequence. Cyrillic is 2 octets
// a letter, so a title of ~35 letters already needs this.
export function foldLine(line: string): string {
  const parts: string[] = []
  let current = ''
  let octets = 0
  let limit = 75
  for (const ch of line) {
    const n = utf8Length(ch.codePointAt(0) ?? 0)
    if (octets + n > limit) {
      parts.push(current)
      current = ''
      octets = 0
      limit = 74
    }
    current += ch
    octets += n
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function icsFor(e: { start: string; durationMin: number; title: string; location: string; now?: Date }): string {
  const start = new Date(e.start).toISOString()
  const created = (e.now ?? new Date()).toISOString()
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${BRAND_NAME}//Booking//EN`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${stamp(start)}-${Math.abs(hash(e.title + e.location))}@${BRAND_NAME.toLowerCase()}`,
    `DTSTAMP:${stamp(created)}`,
    `DTSTART:${stamp(start)}`,
    `DURATION:PT${Math.max(1, Math.round(e.durationMin))}M`,
    `SUMMARY:${escapeText(e.title)}`,
    `LOCATION:${escapeText(e.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(foldLine)
    .join('\r\n') + '\r\n'
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}
