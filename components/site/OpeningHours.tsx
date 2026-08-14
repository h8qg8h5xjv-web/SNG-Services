import { getTranslations } from 'next-intl/server'
import {
  DAY_KEYS,
  isOpenNow,
  londonNow,
  parseOpeningHours,
  type DayKey,
} from '@/lib/hours'

// Renders a place's weekly hours as a table with the current London day
// highlighted, plus an "open now / closed" line computed from the clock — never
// stored as a flag.
export default async function OpeningHours({
  hours,
  locale,
}: {
  hours: unknown
  locale: string
}) {
  const parsed = parseOpeningHours(hours)
  if (!parsed || Object.keys(parsed).length === 0) return null

  const t = await getTranslations({ locale, namespace: 'provider' })
  const open = isOpenNow(parsed)
  const today = londonNow().day
  const dayName = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // A fixed reference week (2024-01-01 is a Monday) to label rows per locale.
  const label = (day: DayKey) => {
    const index = DAY_KEYS.indexOf(day)
    return dayName.format(new Date(Date.UTC(2024, 0, 1 + index)))
  }

  return (
    <section className="py-5">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-lg font-medium">{t('hours')}</h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            open
              ? 'bg-green-500/15 text-green-700 dark:text-green-400'
              : 'bg-black/5 text-foreground/60 dark:bg-white/10'
          }`}
        >
          {open ? t('openNow') : t('closedNow')}
        </span>
      </div>
      <table className="text-sm">
        <tbody>
          {DAY_KEYS.map((day) => {
            const intervals = parsed[day] ?? []
            const isToday = day === today
            return (
              <tr key={day} className={isToday ? 'font-medium' : 'text-foreground/70'}>
                <td className="py-0.5 pr-4 capitalize">{label(day)}</td>
                <td className="py-0.5">
                  {intervals.length === 0
                    ? t('closed')
                    : intervals.map((iv) => `${iv.open}–${iv.close}`).join(', ')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
