'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { Pane } from '@/components/ui/Pane'
import { Skeleton } from '@/components/ui/Skeleton'
import { getSlots } from '@/lib/booking/actions'
import { dateTimeFormat } from '@/lib/intl'
import type { Slot } from '@/lib/slots/compute'

const TZ = 'Europe/London'
const WEEK = 7
const WEEKS = 4 // the booking horizon stays 28 days, as before

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function londonDate(isoInstant: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(isoInstant))
}

type Day = { slots: Slot[] | null } // null = loading

// Week picker (DEMO_MAP §4): 7 day tabs with the real number of free windows,
// and a grid of time panes for the chosen day. `link` mode (listing) makes each
// time a link; `select` mode (booking flow) reports the choice. Availability
// always comes from getSlots — the same engine the booking uses.
export default function WeekPicker({
  serviceId,
  todayIso,
  initialDate,
  selected,
  onSelect,
  hrefFor,
  isGroup = false,
}: {
  serviceId: string
  todayIso: string
  initialDate?: string
  selected?: string | null
  onSelect?: (slot: Slot) => void
  hrefFor?: (slot: Slot) => string
  isGroup?: boolean
}) {
  const t = useTranslations('week')
  const locale = useLocale()
  const startWeek = initialDate ? Math.min(WEEKS - 1, Math.max(0, Math.floor(dayIndex(todayIso, initialDate) / WEEK))) : 0
  const [week, setWeek] = useState(startWeek)
  const [date, setDate] = useState<string | null>(initialDate ?? null)
  const [days, setDays] = useState<Record<string, Day>>({})
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const dates = useMemo(() => Array.from({ length: WEEK }, (_, i) => addDays(todayIso, week * WEEK + i)), [todayIso, week])
  const dayFmt = dateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short', day: 'numeric' })
  const timeFmt = dateTimeFormat(locale, { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

  // Load the visible week for this service (7 calls, in parallel).
  useEffect(() => {
    let ignore = false
    for (const d of dates) {
      getSlots(serviceId, d).then((slots) => {
        if (ignore) return
        setDays((prev) => ({ ...prev, [`${serviceId}|${d}`]: { slots } }))
      })
    }
    return () => {
      ignore = true
    }
  }, [serviceId, dates])

  const dayOf = (d: string): Day => days[`${serviceId}|${d}`] ?? { slots: null }
  const free = (d: string) => (dayOf(d).slots ?? []).filter((s) => s.capacityRemaining > 0)
  // Default to the first day of the week that has a free window.
  const current =
    date && dates.includes(date)
      ? date
      : (dates.find((d) => free(d).length > 0) ?? (dates.every((d) => dayOf(d).slots) ? dates[0] : null))

  const choose = (i: number) => {
    setDate(dates[i])
    tabs.current[i]?.focus()
  }
  const onKey = (e: React.KeyboardEvent) => {
    const idx = current ? dates.indexOf(current) : 0
    if (e.key === 'ArrowRight' && idx < WEEK - 1) choose(idx + 1)
    else if (e.key === 'ArrowLeft' && idx > 0) choose(idx - 1)
    else return
    e.preventDefault()
  }

  const currentDay = current ? dayOf(current) : { slots: null }
  const currentFree = current ? free(current) : []

  return (
    <div>
      <div className="days" role="tablist" aria-label={t('days')} onKeyDown={onKey}>
        {week > 0 && (
          <button type="button" className="day more" aria-label={t('prev')} onClick={() => setWeek(week - 1)}>
            <IconChevronLeft stroke={2} />
          </button>
        )}
        {dates.map((d, i) => {
          const day = dayOf(d)
          const n = free(d).length
          const label = dayFmt.format(new Date(`${d}T12:00:00Z`))
          return (
            <button
              key={d}
              ref={(el) => {
                tabs.current[i] = el
              }}
              type="button"
              role="tab"
              aria-selected={d === current}
              tabIndex={d === current ? 0 : -1}
              className={`day ${day.slots && n === 0 ? 'none' : ''}`}
              onClick={() => setDate(d)}
            >
              <b>{label}</b>
              <span>{day.slots ? t('count', { n }) : '…'}</span>
            </button>
          )
        })}
        {week < WEEKS - 1 && (
          <button type="button" className="day more" aria-label={t('next')} onClick={() => setWeek(week + 1)}>
            <IconChevronRight stroke={2} />
          </button>
        )}
      </div>
      <div className="tgrid" role="tabpanel" aria-live="polite" aria-busy={currentDay.slots === null}>
        {currentDay.slots === null ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} dark />)
        ) : currentFree.length === 0 ? (
          <p className="t-empty">{currentDay.slots.length ? t('full') : t('closed')}</p>
        ) : (
          currentFree.map((s) => {
            const time = timeFmt.format(new Date(s.start))
            const extra = isGroup ? <small>{t('left', { n: s.capacityRemaining })}</small> : null
            return hrefFor ? (
              <Link key={s.start} href={hrefFor(s)} className="tbtn">
                <Pane thin time={time} />
                {extra}
              </Link>
            ) : (
              <button
                key={s.start}
                type="button"
                className="tbtn"
                aria-pressed={selected === s.start}
                onClick={() => onSelect?.(s)}
              >
                <Pane thin time={time} />
                {extra}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

function dayIndex(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10))
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10))
  return Math.round((b - a) / 86400000)
}
