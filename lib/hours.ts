import { z } from 'zod'

// Structured opening hours stored in providers.opening_hours (jsonb). Shape:
//   { "mon": [{ "open": "09:00", "close": "13:00" }, { "open": "14:00", "close": "19:00" }], ... }
// A day that is closed is simply absent (or an empty array). Up to two intervals
// per day covers a lunch break; times are local London wall-clock "HH:MM".

export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type DayKey = (typeof DAY_KEYS)[number]
export const WEEKDAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri']

export type Interval = { open: string; close: string }
export type OpeningHours = Partial<Record<DayKey, Interval[]>>

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const intervalSchema = z
  .object({ open: z.string().regex(HHMM), close: z.string().regex(HHMM) })
  .refine((i) => i.close > i.open, { message: 'close must be after open' })

export const openingHoursSchema = z
  .record(z.enum(DAY_KEYS), z.array(intervalSchema).max(2))
  .nullable()

// Map JS getDay() / Intl weekday to our keys.
const SHORT_TO_KEY: Record<string, DayKey> = {
  Mon: 'mon',
  Tue: 'tue',
  Wed: 'wed',
  Thu: 'thu',
  Fri: 'fri',
  Sat: 'sat',
  Sun: 'sun',
}

/** Current London day key + "HH:MM", computed (never stored). */
export function londonNow(now: Date = new Date()): { day: DayKey; time: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  // Intl can emit "24" for midnight in some environments; normalise to "00".
  const hh = hour === '24' ? '00' : hour
  return { day: SHORT_TO_KEY[weekday] ?? 'mon', time: `${hh}:${minute}` }
}

/** Is the place open right now, by London wall-clock? False if no hours set. */
export function isOpenNow(hours: OpeningHours | null, now: Date = new Date()): boolean {
  if (!hours) return false
  const { day, time } = londonNow(now)
  const intervals = hours[day]
  if (!intervals || intervals.length === 0) return false
  return intervals.some((i) => i.open <= time && time < i.close)
}

/** Normalise unknown jsonb from the DB into a typed OpeningHours (or null). */
export function parseOpeningHours(value: unknown): OpeningHours | null {
  const result = openingHoursSchema.safeParse(value)
  return result.success ? (result.data ?? null) : null
}
