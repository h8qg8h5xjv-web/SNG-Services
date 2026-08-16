import { useTranslations } from 'next-intl'

type Schedule = { day_of_week: number; start_time: string; end_time: string }

// Display order Mon..Sun (Postgres DOW: 0 = Sunday).
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function hhmm(time: string): string {
  return time.slice(0, 5)
}

export default function ProviderHours({ schedules }: { schedules: Schedule[] }) {
  const t = useTranslations()

  const byDay: Record<number, Schedule[]> = {}
  for (const s of schedules) {
    ;(byDay[s.day_of_week] ??= []).push(s)
  }

  return (
    <dl className="divide-y divide-slate-100">
      {DISPLAY_ORDER.map((day) => {
        const rows = (byDay[day] ?? []).sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        )
        return (
          <div key={day} className="flex justify-between py-2 text-body">
            <dt className="text-slate-500">{t(`days.${day}`)}</dt>
            <dd>
              {rows.length > 0
                ? rows.map((r) => `${hhmm(r.start_time)}–${hhmm(r.end_time)}`).join(', ')
                : t('provider.closed')}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
