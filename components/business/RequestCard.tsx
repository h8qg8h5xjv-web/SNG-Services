'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { IconClock, IconMapPin, IconCheck } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { FilterChip } from '@/components/ui/FilterChip'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatPrice } from '@/lib/format'
import { dateTimeFormat } from '@/lib/intl'
import { resolveImageUrl } from '@/lib/images'
import { acceptRequest, declineRequest, submitOffer } from '@/lib/business/actions'
import type { BusinessRequest } from '@/lib/business/data'

// Discrete 30-min slots inside each window, labelled in London time. The value is
// a precomputed ISO string, so accepting needs no client-side timezone maths.
function slotsFor(
  windows: { startsAt: string; endsAt: string }[],
  locale: string,
): { iso: string; label: string }[] {
  const fmt = dateTimeFormat(locale, {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  const out: { iso: string; label: string }[] = []
  for (const w of windows) {
    const start = new Date(w.startsAt).getTime()
    const end = new Date(w.endsAt).getTime()
    for (let t = start; t < end && out.length < 48; t += 30 * 60 * 1000) {
      const d = new Date(t)
      out.push({ iso: d.toISOString(), label: fmt.format(d) })
    }
  }
  return out
}

export default function RequestCard({ request: r, locale }: { request: BusinessRequest; locale: string }) {
  const t = useTranslations('business')
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lost, setLost] = useState(false)
  const [picking, setPicking] = useState(false)
  const [slot, setSlot] = useState('')
  const [offering, setOffering] = useState(false)
  const [price, setPrice] = useState('')
  const [offerMsg, setOfferMsg] = useState('')

  const slots = slotsFor(r.windows, locale)

  async function onAccept() {
    const startsAt = slot || slots[0]?.iso
    if (!startsAt) {
      setError(t('noSlot'))
      return
    }
    setBusy(true)
    setError('')
    const res = await acceptRequest({ requestId: r.requestId, providerId: r.providerId, startsAt })
    setBusy(false)
    if (res.ok && res.won === false) setLost(true)
    else if (res.ok) router.refresh()
    else setError(res.error)
  }

  async function onDecline() {
    setBusy(true)
    setError('')
    const res = await declineRequest({ requestId: r.requestId, providerId: r.providerId })
    setBusy(false)
    if (res.ok) router.refresh()
    else setError(res.error)
  }

  async function onOffer() {
    const pence = Math.round(Number(price) * 100)
    if (!price || Number.isNaN(pence) || pence < 0) {
      setError(t('badPrice'))
      return
    }
    setBusy(true)
    setError('')
    const res = await submitOffer({
      requestId: r.requestId,
      providerId: r.providerId,
      pricePence: pence,
      message: offerMsg.trim() === '' ? null : offerMsg.trim(),
      proposedStart: slot || slots[0]?.iso || null,
    })
    setBusy(false)
    if (res.ok) router.refresh()
    else setError(res.error)
  }

  const priceLine =
    r.type === 'fixed' && r.service
      ? `${r.service.name} · ${formatPrice(r.service.pricePence)}`
      : r.budgetMaxPence != null
        ? t('clientBudget', { amount: formatPrice(r.budgetMaxPence) })
        : t('quoteNoBudget')

  return (
    <li className={`card req ${!r.active && !r.contact ? 'st-declined' : ''}`}>
      <div className="req-top">
        <div>
          <b>{priceLine}</b>
          <span className="muted block">{t('ref', { ref: r.publicRef })}</span>
        </div>
        <StatusBadge tone={r.urgency === 'today' ? 'error' : 'neutral'}>{t(`urgency.${r.urgency}`)}</StatusBadge>
      </div>

      {r.description && <p className="txt">{r.description}</p>}

      {r.photos.length > 0 && (
        <div className="photos">
          {r.photos.map((p) => (
            <Image key={p} src={resolveImageUrl(p) ?? ''} alt="" width={96} height={96} unoptimized />
          ))}
        </div>
      )}

      <div className="tags">
        <span className="pill">
          <IconClock stroke={1.75} aria-hidden="true" />
          {slots.length > 0 ? slots.map((s) => s.label).slice(0, 3).join(' · ') : '—'}
        </span>
        <span className="pill">
          <IconMapPin stroke={1.75} aria-hidden="true" />
          {r.borough}
          {r.postcodeOutward ? ` · ${r.postcodeOutward}` : ''}
        </span>
      </div>

      {/* Matched to us: contacts + full address are now visible (RLS). */}
      {r.contact && (
        <div className="contact">
          <b>
            <IconCheck stroke={2} aria-hidden="true" />
            {t('yours')}
          </b>
          <span>
            {r.contact.name} · {r.contact.phone}
          </span>
          {r.contact.email && <span>{r.contact.email}</span>}
          {(r.contact.address || r.contact.postcode) && (
            <span className="muted">{[r.contact.address, r.contact.postcode].filter(Boolean).join(', ')}</span>
          )}
        </div>
      )}

      {lost && <p className="notice">{t('alreadyTaken')}</p>}

      {/* Actions only while this is a live, unanswered request. */}
      {r.active && !lost && (
        <>
          {r.type === 'fixed' ? (
            <>
              {picking && slots.length > 1 && (
                <div className="dchips">
                  {slots.map((s) => (
                    <FilterChip key={s.iso} look="dchip" active={slot === s.iso} onClick={() => setSlot(s.iso)}>
                      {s.label}
                    </FilterChip>
                  ))}
                </div>
              )}
              <div className="acts">
                {slots.length > 1 && !picking ? (
                  <Button variant="ink" onClick={() => setPicking(true)} disabled={busy}>
                    {t('take')}
                  </Button>
                ) : (
                  <Button variant="ink" onClick={onAccept} disabled={busy}>
                    {slots.length > 1 ? t('confirmTime') : t('take')}
                  </Button>
                )}
                <Button variant="line" onClick={onDecline} disabled={busy}>
                  {t('pass')}
                </Button>
              </div>
            </>
          ) : offering ? (
            <div className="offer-f">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t('yourPrice')}
                aria-label={t('yourPrice')}
                className="max-w-48"
              />
              <Textarea
                value={offerMsg}
                onChange={(e) => setOfferMsg(e.target.value)}
                rows={2}
                placeholder={t('offerMessage')}
                aria-label={t('offerMessage')}
              />
              <div className="acts">
                <Button variant="ink" onClick={onOffer} disabled={busy}>
                  {t('sendOffer')}
                </Button>
                <Button variant="line" onClick={() => setOffering(false)} disabled={busy}>
                  {t('backBtn')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="acts">
              <Button variant="ink" onClick={() => setOffering(true)} disabled={busy}>
                {t('makeOffer')}
              </Button>
              <Button variant="line" onClick={onDecline} disabled={busy}>
                {t('pass')}
              </Button>
            </div>
          )}
          {error && (
            <p className="msg-err-inline" role="alert">
              {error}
            </p>
          )}
        </>
      )}

      {/* Answered pile: show how it ended. */}
      {!r.active && !r.contact && <p className="muted">{t(`outcome.${r.response}`)}</p>}
    </li>
  )
}
