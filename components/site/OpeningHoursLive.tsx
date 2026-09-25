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
    <div>
      <p className="hours-head">
        <b>{labels.title}</b>
        {live && (
          <span className={live.open ? 'status taken' : 'status declined'}>
            <i aria-hidden="true" />
            {live.open ? labels.openNow : labels.closedNow}
          </span>
        )}
      </p>
      <table className="hours">
        <tbody>
          {DAY_KEYS.map((day) => {
            const intervals = hours[day] ?? []
            return (
              <tr key={day} className={live?.today === day ? 'is-today' : undefined}>
                <td className="capitalize">{dayLabels[day]}</td>
                <td>
                  {intervals.length === 0
                    ? labels.closed
                    : intervals.map((iv) => `${iv.open}–${iv.close}`).join(', ')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
