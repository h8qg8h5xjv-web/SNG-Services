'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
  const tc = useTranslations('cabinet2')
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
    <div>
      <p className="muted">{t('hint')}</p>
      <ul className="mt-2">
        {DAY_ORDER.map((d) => (
          <li key={d} className="sched-row">
            <label className="check">
              <input type="checkbox" checked={state[d].open} onChange={(e) => set(d, { open: e.target.checked })} />
              {tDays(String(d))}
            </label>
            {state[d].open && (
              <div className="times">
                <Input
                  type="time"
                  value={state[d].start}
                  onChange={(e) => set(d, { start: e.target.value })}
                  aria-label={`${tDays(String(d))} · ${tc('from')}`}
                />
                <span className="muted" aria-hidden="true">
                  —
                </span>
                <Input
                  type="time"
                  value={state[d].end}
                  onChange={(e) => set(d, { end: e.target.value })}
                  aria-label={`${tDays(String(d))} · ${tc('to')}`}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <div className="ed-acts mt-5">
        <Button variant="ink" onClick={save} disabled={pending}>
          {pending ? t('saving') : t('save')}
        </Button>
        {saved && (
          <span className="msg-ok" role="status">
            {t('saved')}
          </span>
        )}
        {error && (
          <span className="msg-err-inline" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  )
}
