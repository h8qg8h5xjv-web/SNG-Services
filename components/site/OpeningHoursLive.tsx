'use client'

import { useEffect, useState } from 'react'
import { DAY_KEYS, isOpenNow, londonNow, type DayKey, type OpeningHours } from '@/lib/hours'

type Labels = { title: string; openNow: string; closedNow: string; closed: string }

// The hours table is static data, but "today" and "open now" depend on the
// current London time. We compute them on the client (after mount) so the value
// is correct no matter how the page is cached, and stays live while the tab is
// open. Before mount, server and client render the same time-less table — no
// hydration mismatch.
export default function OpeningHoursLive({
  hours,
  dayLabels,
  labels,
}: {
  hours: OpeningHours
  dayLabels: Record<DayKey, string>
  labels: Labels
}) {
  const [live, setLive] = useState<{ today: DayKey; open: boolean } | null>(null)

  useEffect(() => {
    const compute = () => setLive({ today: londonNow().day, open: isOpenNow(hours) })
    compute()
    const id = setInterval(compute, 60_000)
    return () => clearInterval(id)
  }, [hours])

  return (
    <section className="py-6">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-h2 font-semibold">{labels.title}</h2>
        {live && (
          <span
            className={`rounded-full px-2 py-1 text-meta ${
              live.open
                ? 'bg-green-100 text-green-700'
                : 'bg-slate-100 text-slate-500 '
            }`}
          >
            {live.open ? labels.openNow : labels.closedNow}
          </span>
        )}
      </div>
      <table className="text-body">
        <tbody>
          {DAY_KEYS.map((day) => {
            const intervals = hours[day] ?? []
            const isToday = live?.today === day
            return (
              <tr key={day} className={isToday ? 'font-semibold' : 'text-slate-500'}>
                <td className="py-1 pr-4 capitalize">{dayLabels[day]}</td>
                <td className="py-1">
                  {intervals.length === 0
                    ? labels.closed
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
