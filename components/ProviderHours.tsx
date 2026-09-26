import { useTranslations } from 'next-intl'

type Schedule = { day_of_week: number; start_time: string; end_time: string }

// Display order Mon..Sun (Postgres DOW: 0 = Sunday).
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function hhmm(time: string): string {
  return time.slice(0, 5)
}

// Weekly hours as the v2 hours table; today's row (London) is bold.
export default function ProviderHours({ schedules, today }: { schedules: Schedule[]; today?: number }) {
  const t = useTranslations()

  const byDay: Record<number, Schedule[]> = {}
  for (const s of schedules) {
    ;(byDay[s.day_of_week] ??= []).push(s)
  }

  return (
    <div>
      <p className="hours-head">
        <b>{t('provider.hours')}</b>
      </p>
      <table className="hours">
        <tbody>
          {DISPLAY_ORDER.map((day) => {
            const rows = (byDay[day] ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time))
            return (
              <tr key={day} className={day === today ? 'is-today' : undefined}>
                <td>
                  {t(`days.${day}`)}
                  {day === today ? ` · ${t('listing.today')}` : ''}
                </td>
                <td>
                  {rows.length > 0
                    ? rows.map((r) => `${hhmm(r.start_time)}–${hhmm(r.end_time)}`).join(', ')
                    : t('provider.closed')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
