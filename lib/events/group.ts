// Buckets upcoming events into today / tomorrow / this weekend / later, using
// London local dates (events are stored in UTC; the timezone matters only on
// output). Each event lands in exactly one bucket, by priority.

const TZ = 'Europe/London'
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }) // -> "YYYY-MM-DD"

export type GroupKey = 'today' | 'tomorrow' | 'weekend' | 'later'

export type DatedEvent = { starts_at: string }

function londonDate(d: Date): string {
  return ymd.format(d)
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d + days, 12))
  return next.toISOString().slice(0, 10)
}

function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() // 0 = Sunday
}

export function bucketFor(startsAt: string, now: Date): GroupKey {
  const today = londonDate(now)
  const tomorrow = addDays(today, 1)
  const daysUntilSaturday = (6 - dayOfWeek(today) + 7) % 7
  const saturday = addDays(today, daysUntilSaturday)
  const sunday = addDays(saturday, 1)

  const date = londonDate(new Date(startsAt))
  if (date === today) return 'today'
  if (date === tomorrow) return 'tomorrow'
  if (date === saturday || date === sunday) return 'weekend'
  return 'later'
}

export function groupEvents<T extends DatedEvent>(
  events: T[],
  now: Date,
): { key: GroupKey; events: T[] }[] {
  const buckets: Record<GroupKey, T[]> = {
    today: [],
    tomorrow: [],
    weekend: [],
    later: [],
  }
  for (const event of events) {
    buckets[bucketFor(event.starts_at, now)].push(event)
  }
  const order: GroupKey[] = ['today', 'tomorrow', 'weekend', 'later']
  return order
    .map((key) => ({ key, events: buckets[key] }))
    .filter((g) => g.events.length > 0)
}
