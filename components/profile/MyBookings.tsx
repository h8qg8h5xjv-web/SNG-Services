'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { IconCalendarEvent } from '@tabler/icons-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { getSavedRequests } from '@/lib/requests/local-store'
import { getGuestRequestState } from '@/lib/requests/guest'
import { dateTimeFormat } from '@/lib/intl'
import { formatPrice } from '@/lib/format'

type Booking = { ref: string; providerName: string; startsAt: string | null; pricePence: number | null }

// "My bookings": confirmed/matched requests with a scheduled time. Upcoming first,
// past below. Reads the same guest tokens as My requests (client-only).
export default function MyBookings() {
  const t = useTranslations('profile')
  const locale = useLocale()
  const [split, setSplit] = useState<{ upcoming: Booking[]; past: Booking[] } | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const saved = getSavedRequests()
      const out: Booking[] = []
      for (const s of saved) {
        const st = await getGuestRequestState(s.ref, s.token)
        if (st && (st.status === 'confirmed' || st.status === 'matched') && st.match) {
          out.push({ ref: s.ref, providerName: st.match.providerName, startsAt: st.match.startsAt, pricePence: st.match.pricePence })
        }
      }
      const now = Date.now()
      const upcoming = out.filter((r) => r.startsAt && Date.parse(r.startsAt) >= now)
      const past = out.filter((r) => !r.startsAt || Date.parse(r.startsAt) < now)
      if (alive) setSplit({ upcoming, past })
    })()
    return () => {
      alive = false
    }
  }, [])

  if (split === null) {
    // Skeleton in the shape of the rows — no spinner, no "Loading" text (§5).
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-card border border-slate-200 bg-white p-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-2 h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  }
  const { upcoming, past } = split
  if (upcoming.length === 0 && past.length === 0)
    return <EmptyState icon={IconCalendarEvent} text={t('bookingsEmpty')} />

  const dtf = dateTimeFormat(locale, {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const renderList = (items: Booking[]) => (
    <div className="space-y-2">
      {items.map((b) => (
        <div key={b.ref} className="rounded-lg border border-slate-200 p-3">
          <p className="text-body font-semibold">{b.providerName}</p>
          <p className="text-meta text-slate-500">
            {[b.startsAt ? dtf.format(new Date(b.startsAt)) : null, b.pricePence != null ? formatPrice(b.pricePence) : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <div>
          <h3 className="mb-2 text-h2 font-semibold">{t('upcoming')}</h3>
          {renderList(upcoming)}
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="mb-2 text-h2 font-semibold text-slate-500">{t('past')}</h3>
          {renderList(past)}
        </div>
      )}
    </div>
  )
}
