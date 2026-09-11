'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconClock, IconCircleCheck, IconMoodSad } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/Button'
import { formatPrice } from '@/lib/format'
import {
  getGuestRequestState,
  confirmGuestMatch,
  cancelGuestRequest,
  chooseGuestOffer,
  type GuestRequestState,
} from '@/lib/requests/guest'

// Waiting screen (REQUESTS §11): a state, not a spinner. Guest requests can't be
// read by anon under RLS (token/contacts are protected), so we poll the
// token-scoped server action every 8s rather than a raw Realtime table
// subscription. (True Realtime would need a token-scoped broadcast channel.)
export default function RequestStatus({
  ref_,
  token,
  initial,
  locale,
}: {
  ref_: string
  token: string
  initial: GuestRequestState
  locale: string
}) {
  const t = useTranslations('request')
  const [state, setState] = useState(initial)
  const [busy, setBusy] = useState(false)
  const done =
    state.status === 'confirmed' || state.status === 'cancelled' || state.status === 'expired'

  useEffect(() => {
    if (done) return
    const poll = async () => {
      const next = await getGuestRequestState(ref_, token)
      if (next) setState(next)
    }
    const id = setInterval(poll, 8000)
    return () => clearInterval(id)
  }, [ref_, token, done])

  async function onConfirm() {
    setBusy(true)
    await confirmGuestMatch(ref_, token)
    const next = await getGuestRequestState(ref_, token)
    if (next) setState(next)
    setBusy(false)
  }
  async function onCancel() {
    setBusy(true)
    await cancelGuestRequest(ref_, token)
    const next = await getGuestRequestState(ref_, token)
    if (next) setState(next)
    setBusy(false)
  }
  async function onChoose(offerId: string) {
    setBusy(true)
    await chooseGuestOffer(ref_, token, offerId)
    const next = await getGuestRequestState(ref_, token)
    if (next) setState(next)
    setBusy(false)
  }

  const dtf = new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  if (state.status === 'matched' && state.match) {
    const when = state.match.startsAt ? dtf.format(new Date(state.match.startsAt)) : ''
    return (
      <div className="rounded-lg border border-green-200 bg-green-100 p-6">
        <div className="flex items-center gap-2">
          <IconCircleCheck className="h-6 w-6 text-green-700" stroke={1.5} />
          <h1 className="text-h2 font-semibold text-green-700">{t('matchedTitle')}</h1>
        </div>
        <p className="mt-2 text-body">
          {t('matchedBody', {
            provider: state.match.providerName,
            when,
            price: state.match.pricePence != null ? formatPrice(state.match.pricePence) : '—',
          })}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={onConfirm} disabled={busy}>
            {t('confirm')}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {t('cancel')}
          </Button>
        </div>
      </div>
    )
  }

  if (state.status === 'confirmed') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 p-8 text-center">
        <IconCircleCheck className="h-6 w-6 text-green-700" stroke={1.5} />
        <p className="text-body">{t('confirmedBody')}</p>
        <Link href="/bookings" className="text-body font-semibold text-teal-700 hover:underline">
          {t('goToBookings')}
        </Link>
      </div>
    )
  }

  if (state.status === 'expired' || state.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 p-8 text-center">
        <IconMoodSad className="h-6 w-6 text-slate-400" stroke={1.5} />
        <p className="text-body text-slate-500">
          {state.status === 'expired' ? t('expiredHelp') : t('cancelledBody')}
        </p>
        <Link href="/" className="text-body font-semibold text-teal-700 hover:underline">
          {t('backHome')}
        </Link>
      </div>
    )
  }

  // broadcasting / draft
  return (
    <div className="rounded-lg border border-slate-200 p-6">
      <div className="flex items-center gap-2">
        <IconClock className="h-6 w-6 text-teal-700" stroke={1.5} />
        <h1 className="text-h2 font-semibold">{t('asking', { n: state.askedCount })}</h1>
      </div>
      <p className="mt-2 text-body text-slate-500">{t('usuallyMinutes')}</p>
      {state.maxWave >= 2 && (
        <p className="mt-2 text-meta text-slate-500">{t('expandedNeighbours')}</p>
      )}

      {/* Quote: offers the client chooses from (REQUESTS §2 / 12.2). */}
      {state.offers.length > 0 && (
        <div className="mt-4 space-y-2">
          <h2 className="text-body font-semibold">{t('offersTitle')}</h2>
          {state.offers.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3"
            >
              <div>
                <p className="text-body font-semibold">
                  {o.providerName} · {formatPrice(o.pricePence)}
                </p>
                {o.message && <p className="text-meta text-slate-500">{o.message}</p>}
              </div>
              <Button onClick={() => onChoose(o.id)} disabled={busy}>
                {t('chooseOffer')}
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t('cancelRequest')}
        </Button>
      </div>
    </div>
  )
}
