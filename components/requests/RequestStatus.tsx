'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button, ButtonLink } from '@/components/ui/Button'
import { SuccessScreen } from '@/components/ui/SuccessScreen'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatPrice } from '@/lib/format'
import { dateTimeFormat } from '@/lib/intl'
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
    state.status === 'confirmed' ||
    state.status === 'cancelled' ||
    state.status === 'expired' ||
    // manual / handled never change on their own — an admin passes them on by hand.
    state.status === 'manual' ||
    state.status === 'handled'

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

  const dtf = dateTimeFormat(locale, {
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
      <SuccessScreen
        title={t('matchedTitle')}
        message={t('matchedBody', {
          provider: state.match.providerName,
          when,
          price: state.match.pricePence != null ? formatPrice(state.match.pricePence) : '—',
        })}
        action={
          <>
            <Button variant="amber" onClick={onConfirm} disabled={busy}>
              {t('confirm')}
            </Button>
            <Button variant="line" onClick={onCancel} disabled={busy}>
              {t('cancel')}
            </Button>
          </>
        }
      />
    )
  }

  if (state.status === 'confirmed') {
    return (
      <SuccessScreen
        title={t('confirmedTitle')}
        message={t('confirmedBody')}
        action={
          <ButtonLink href="/bookings" variant="ink">
            {t('goToBookings')}
          </ButtonLink>
        }
      />
    )
  }

  if (state.status === 'manual' || state.status === 'handled') {
    return (
      <SuccessScreen
        title={t('manualTitle')}
        message={t('manualBody', { ref: ref_ })}
        action={
          <ButtonLink href="/" variant="line">
            {t('backHome')}
          </ButtonLink>
        }
      />
    )
  }

  if (state.status === 'expired' || state.status === 'cancelled') {
    return (
      <EmptyState
        mark="—"
        text={state.status === 'expired' ? t('expiredHelp') : t('cancelledBody')}
        action={
          <Link href="/" className="btn btn-ink">
            {t('backHome')}
          </Link>
        }
      />
    )
  }

  // broadcasting / draft: a state, not a spinner.
  return (
    <div className="thread">
      <h1 className="ph1">{t('asking', { n: state.askedCount })}</h1>
      <p className="muted">{t('usuallyMinutes')}</p>
      {state.maxWave >= 2 && <p className="meta">{t('expandedNeighbours')}</p>}

      {/* Quote: offers the client chooses from (REQUESTS §2 / 12.2). */}
      {state.offers.length > 0 && (
        <>
          <h2 className="h3 mt-4">{t('offersTitle')}</h2>
          {state.offers.map((o) => (
            <article key={o.id} className="rep">
              <div className="rep-top">
                <b>{o.providerName}</b>
                <span className="price">{formatPrice(o.pricePence)}</span>
              </div>
              {o.message && <p>{o.message}</p>}
              <div>
                <Button variant="ink" size="sm" onClick={() => onChoose(o.id)} disabled={busy}>
                  {t('chooseOffer')}
                </Button>
              </div>
            </article>
          ))}
        </>
      )}

      <div className="mt-4">
        <Button variant="line" onClick={onCancel} disabled={busy}>
          {t('cancelRequest')}
        </Button>
      </div>
    </div>
  )
}
