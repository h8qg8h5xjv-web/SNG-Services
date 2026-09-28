'use client'

import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { EmptyState } from '@/components/ui/EmptyState'
import { ButtonLink } from '@/components/ui/Button'
import { Pane } from '@/components/ui/Pane'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getSavedBookings, getSavedRequests } from '@/lib/requests/local-store'
import { getGuestRequestState } from '@/lib/requests/guest'
import { getAccountBookings, getGuestBookings, type GuestBooking } from '@/lib/booking/guest'
import { dateTimeFormat } from '@/lib/intl'
import { formatPrice } from '@/lib/format'

// One row: a direct booking, or a request that became a booking.
type Booking = {
  ref: string
  providerName: string
  serviceName: string | null
  startsAt: string | null
  pricePence: number | null
  source: 'booking' | 'request'
  status: GuestBooking['status'] | null // direct bookings only
  href: string
}

const TZ = 'Europe/London'

// "My bookings": direct bookings and requests that became bookings. Upcoming
// first, past and cancelled below. Direct bookings come from this browser's
// (ref, token) pairs and, when signed in, the account; requests from their
// tokens, as in My requests. Each booking is a dark window — the slot is yours.
export default function MyBookings() {
  const t = useTranslations('profile')
  const tc = useTranslations('cabinet2')
  const locale = useLocale()
  const [split, setSplit] = useState<{ upcoming: Booking[]; past: Booking[] } | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const out: Booking[] = []
      const [guest, account] = await Promise.all([
        getGuestBookings(getSavedBookings().map(({ ref, token }) => ({ ref, token })), locale),
        getAccountBookings(locale),
      ])
      const seen = new Set<string>()
      for (const b of [...guest, ...account]) {
        if (seen.has(b.ref)) continue
        seen.add(b.ref)
        out.push({
          ref: b.ref,
          providerName: b.providerName,
          serviceName: b.serviceName || null,
          startsAt: b.startsAt,
          pricePence: b.pricePence,
          source: 'booking',
          status: b.status,
          href: b.categorySlug ? `/${b.categorySlug}/${b.providerSlug}` : '/',
        })
      }
      for (const s of getSavedRequests()) {
        const st = await getGuestRequestState(s.ref, s.token)
        if (st && (st.status === 'confirmed' || st.status === 'matched') && st.match) {
          out.push({
            ref: s.ref,
            providerName: st.match.providerName,
            serviceName: null,
            startsAt: st.match.startsAt,
            pricePence: st.match.pricePence,
            source: 'request',
            status: null,
            href: `/requests/${s.ref}?token=${s.token}`,
          })
        }
      }
      const now = Date.now()
      const live = (r: Booking) => !!r.startsAt && Date.parse(r.startsAt) >= now && r.status !== 'cancelled'
      const byTime = (a: Booking, b: Booking) => (a.startsAt ?? '').localeCompare(b.startsAt ?? '')
      const upcoming = out.filter(live).sort(byTime)
      const past = out.filter((r) => !live(r)).sort((a, b) => byTime(b, a))
      if (alive) setSplit({ upcoming, past })
    })()
    return () => {
      alive = false
    }
  }, [locale])

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
            <ButtonLink href="/" variant="amber">
              {tc('seeSlots')}
            </ButtonLink>
            <ButtonLink href="/request/find" variant="line">
              {tc('describeTask')}
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
                {[
                  start ? day.format(start) : null,
                  b.serviceName,
                  b.pricePence != null ? formatPrice(b.pricePence) : null,
                  b.source === 'request' ? tc('viaRequest') : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {b.status && (
                <StatusBadge tone={b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'error' : 'neutral'}>
                  {tc(b.status === 'confirmed' ? 'statusConfirmed' : b.status === 'cancelled' ? 'statusCancelled' : 'statusPending')}
                </StatusBadge>
              )}
            </div>
            <div className="acts">
              <ButtonLink href={b.href} variant="line" size="sm">
                {b.source === 'request' ? tc('open') : tc('toProvider')}
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
          <Link href="/" className="link">
            {tc('seeSlots')}
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
