'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { saveCabinetSchedule } from '@/lib/business/actions'
import type { CabinetScheduleRow } from '@/lib/business/data'

// Postgres DOW: 0=Sun..6=Sat. Shown Mon-first.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
type DayState = { open: boolean; start: string; end: string }

export default function ScheduleEditor({
  providerId,
  rows,
}: {
  providerId: string
  rows: CabinetScheduleRow[]
}) {
  const t = useTranslations('business.schedule')
  const tDays = useTranslations('days')
  const init: Record<number, DayState> = {}
  for (const d of DAY_ORDER) {
    const found = rows.find((r) => r.dayOfWeek === d)
    init[d] = found
      ? { open: true, start: found.startTime.slice(0, 5), end: found.endTime.slice(0, 5) }
      : { open: false, start: '09:00', end: '18:00' }
  }
  const [state, setState] = useState(init)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function set(day: number, patch: Partial<DayState>) {
    setState((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }))
  }

  function save() {
    setError('')
    setSaved(false)
    const out = DAY_ORDER.filter((d) => state[d].open).map((d) => ({
      dayOfWeek: d,
      startTime: state[d].start,
      endTime: state[d].end,
    }))
    startTransition(async () => {
      const res = await saveCabinetSchedule({ providerId, rows: out })
      if (res.ok) setSaved(true)
      else setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-meta text-slate-500">{t('hint')}</p>
      <div className="space-y-2">
        {DAY_ORDER.map((d) => (
          <div key={d} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3">
            <label className="flex min-w-28 items-center gap-2 text-body font-semibold">
              <input type="checkbox" checked={state[d].open} onChange={(e) => set(d, { open: e.target.checked })} />
              {tDays(String(d))}
            </label>
            {state[d].open && (
              <div className="flex items-center gap-2 text-body">
                <input type="time" value={state[d].start} onChange={(e) => set(d, { start: e.target.value })} className="min-h-11 rounded-full border border-slate-300 px-3" />
                <span className="text-slate-400">—</span>
                <input type="time" value={state[d].end} onChange={(e) => set(d, { end: e.target.value })} className="min-h-11 rounded-full border border-slate-300 px-3" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? t('saving') : t('save')}
        </Button>
        {saved && <span className="text-meta text-green-700">{t('saved')}</span>}
        {error && <span className="text-meta text-red-700">{error}</span>}
      </div>
    </div>
  )
}
