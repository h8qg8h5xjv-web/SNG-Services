'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { Pane } from '@/components/ui/Pane'
import { Skeleton } from '@/components/ui/Skeleton'
import { getSavedRequests } from '@/lib/requests/local-store'
import { getGuestRequestState } from '@/lib/requests/guest'
import { dateTimeFormat } from '@/lib/intl'
import { formatPrice } from '@/lib/format'

type Booking = { ref: string; token: string; providerName: string; startsAt: string | null; pricePence: number | null }

const TZ = 'Europe/London'

// "My bookings": confirmed/matched requests with a scheduled time. Upcoming first,
// past below. Reads the same guest tokens as My requests (client-only). Each
// booking is a dark window — the slot is taken, by you.
export default function MyBookings() {
  const t = useTranslations('profile')
  const tc = useTranslations('cabinet2')
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
          out.push({ ref: s.ref, token: s.token, providerName: st.match.providerName, startsAt: st.match.startsAt, pricePence: st.match.pricePence })
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
    return (
      <ul className="bl" aria-hidden="true">
        {[0, 1].map((i) => (
          <li key={i} className="card bitem">
            <Pane off />
            <div>
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    )
  }
  const { upcoming, past } = split
  if (upcoming.length === 0 && past.length === 0)
    return (
      <EmptyState
        mark="—"
        title={tc('emptyBookings')}
        text={tc('emptyBookingsText')}
        action={
          <>
            <ButtonLink href="/request/find" variant="amber">
              {tc('describeTask')}
            </ButtonLink>
            <ButtonLink href="/" variant="line">
              {tc('seeSlots')}
            </ButtonLink>
          </>
        }
      />
    )

  const time = dateTimeFormat(locale, { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  const day = dateTimeFormat(locale, { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })

  const renderList = (items: Booking[], isPast: boolean) => (
    <ul className="bl">
      {items.map((b) => {
        const start = b.startsAt ? new Date(b.startsAt) : null
        return (
          <li key={b.ref} className={`card bitem ${isPast ? 'past' : ''}`}>
            <Pane off time={start ? time.format(start) : '—'} />
            <div>
              <b>{b.providerName}</b>
              <span className="muted">
                {[start ? day.format(start) : null, b.pricePence != null ? formatPrice(b.pricePence) : null, tc('viaRequest')]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <div className="acts">
              <ButtonLink href={`/requests/${b.ref}?token=${b.token}`} variant="line" size="sm">
                {tc('open')}
              </ButtonLink>
            </div>
          </li>
        )
      })}
    </ul>
  )

  return (
    <div>
      <h3 className="bl-h">{t('upcoming')}</h3>
      {upcoming.length > 0 ? (
        renderList(upcoming, false)
      ) : (
        <p className="muted">
          {tc('noUpcoming')}{' '}
          <Link href="/request/find" className="link">
            {tc('describeTask')}
          </Link>
        </p>
      )}
      {past.length > 0 && (
        <>
          <h3 className="bl-h">{t('past')}</h3>
          {renderList(past, true)}
        </>
      )}
    </div>
  )
}
