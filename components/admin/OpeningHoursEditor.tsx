'use client'

import { DAY_KEYS, WEEKDAY_KEYS, type DayKey, type Interval, type OpeningHours } from '@/lib/hours'

const DAY_LABEL: Record<DayKey, string> = {
  mon: 'Пн',
  tue: 'Вт',
  wed: 'Ср',
  thu: 'Чт',
  fri: 'Пт',
  sat: 'Сб',
  sun: 'Вс',
}

const DEFAULT_INTERVAL: Interval = { open: '10:00', close: '19:00' }

export default function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: OpeningHours
  onChange: (next: OpeningHours) => void
}) {
  function setDay(day: DayKey, intervals: Interval[] | undefined) {
    const next: OpeningHours = { ...value }
    if (!intervals || intervals.length === 0) delete next[day]
    else next[day] = intervals
    onChange(next)
  }

  function setInterval(day: DayKey, index: number, patch: Partial<Interval>) {
    const current = value[day] ?? []
    const updated = current.map((iv, i) => (i === index ? { ...iv, ...patch } : iv))
    setDay(day, updated)
  }

  function copyToWeekdays(day: DayKey) {
    const source = value[day]
    if (!source) return
    const next: OpeningHours = { ...value }
    for (const d of WEEKDAY_KEYS) next[d] = source.map((iv) => ({ ...iv }))
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {DAY_KEYS.map((day) => {
        const intervals = value[day] ?? []
        const open = intervals.length > 0
        return (
          <div key={day} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 p-2">
            <span className="w-8 text-body font-semibold">{DAY_LABEL[day]}</span>
            <label className="inline-flex items-center gap-1 text-body">
              <input
                type="checkbox"
                checked={open}
                onChange={(e) => setDay(day, e.target.checked ? [DEFAULT_INTERVAL] : [])}
              />
              {open ? 'Открыто' : 'Закрыто'}
            </label>

            {open &&
              intervals.map((iv, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <input
                    type="time"
                    value={iv.open}
                    onChange={(e) => setInterval(day, i, { open: e.target.value })}
                    className="min-h-9 rounded-lg border border-slate-200 bg-transparent px-2 text-body"
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="time"
                    value={iv.close}
                    onChange={(e) => setInterval(day, i, { close: e.target.value })}
                    className="min-h-9 rounded-lg border border-slate-200 bg-transparent px-2 text-body"
                  />
                  {intervals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDay(day, intervals.filter((_, j) => j !== i))}
                      className="text-body text-red-700 hover:underline"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}

            {open && intervals.length < 2 && (
              <button
                type="button"
                onClick={() => setDay(day, [...intervals, { ...DEFAULT_INTERVAL }])}
                className="text-body text-slate-500 hover:underline"
              >
                + обед
              </button>
            )}
            {open && (
              <button
                type="button"
                onClick={() => copyToWeekdays(day)}
                className="ml-auto text-body text-slate-500 hover:underline"
              >
                Скопировать на все будни
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
