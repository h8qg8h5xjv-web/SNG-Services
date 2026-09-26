// A one-event iCalendar file for «Добавить в календарь» (RFC 5545). Built in
// the browser from the real booking; times in UTC so every calendar app places
// it correctly.

const fold = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
const stamp = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function icsFor(e: { start: string; durationMin: number; title: string; location: string; now?: Date }): string {
  const start = new Date(e.start).toISOString()
  const created = (e.now ?? new Date()).toISOString()
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SNG Services//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${stamp(start)}-${Math.abs(hash(e.title + e.location))}@sng-services`,
    `DTSTAMP:${stamp(created)}`,
    `DTSTART:${stamp(start)}`,
    `DURATION:PT${Math.max(1, Math.round(e.durationMin))}M`,
    `SUMMARY:${fold(e.title)}`,
    `LOCATION:${fold(e.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}
