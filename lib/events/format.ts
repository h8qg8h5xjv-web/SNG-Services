// Event date/time formatting in London local time (stored UTC, shown local).

const TZ = 'Europe/London'

export function formatEventDateTime(startsAt: string, locale: string): string {
  const d = new Date(startsAt)
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d)
  const time = new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${date}, ${time}`
}
