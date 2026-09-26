import { dateTimeFormat } from '@/lib/intl'
import { dayOffset } from './windows'

// «Сегодня» / «Завтра» / «Пт» for a window's London date. `words` are the
// translated today/tomorrow; later days get the short weekday, capitalised.
export function dayLabel(
  day: string,
  today: string,
  locale: string,
  words: { today: string; tomorrow: string },
): string {
  const off = dayOffset(day, today)
  if (off === 0) return words.today
  if (off === 1) return words.tomorrow
  const [y, m, d] = day.split('-').map(Number)
  const wd = dateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d, 12)))
  return wd.charAt(0).toUpperCase() + wd.slice(1).replace('.', '')
}
