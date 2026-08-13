'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { getSlots, createBooking } from '@/lib/booking/actions'
import { formatPrice } from '@/lib/format'
import type { Slot } from '@/lib/slots/compute'

const TZ = 'Europe/London'

export type BookingService = {
  id: string
  name_en: string
  name_ru: string | null
  duration_min: number
  price_pence: number
  capacity: number
}

function localDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function BookingWidget({
  services,
}: {
  services: BookingService[]
}) {
  const t = useTranslations('booking')
  const locale = useLocale()

  const dates = useMemo(() => Array.from({ length: 30 }, (_, i) => localDate(i)), [])
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [date, setDate] = useState(dates[0])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [partySize, setPartySize] = useState(1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ when: string; people: number } | null>(null)

  const service = services.find((s) => s.id === serviceId)

  useEffect(() => {
    if (!serviceId) return
    let ignore = false
    // Reset the picker and show a loading state before fetching slots for the
    // new service/date. This is a data-fetch effect, hence the intentional sync
    // setState.
    /* eslint-disable react-hooks/set-state-in-effect */
    setLoading(true)
    setSelected(null)
    /* eslint-enable react-hooks/set-state-in-effect */
    getSlots(serviceId, date).then((result) => {
      if (ignore) return
      setSlots(result.filter((s) => s.capacityRemaining > 0))
      setLoading(false)
    })
    return () => {
      ignore = true
    }
  }, [serviceId, date])

  const dateFmt = new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
  })
  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
  const dateTimeFmt = new Intl.DateTimeFormat(locale, {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!selected || !service) return
    setSubmitting(true)
    setError('')
    const result = await createBooking({
      service_id: service.id,
      starts_at: selected.start,
      party_size: partySize,
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
    })
    setSubmitting(false)
    if (result.ok) {
      setDone({ when: dateTimeFmt.format(new Date(result.startsAt)), people: result.partySize })
    } else {
      setError(result.error)
      // The slot may have just filled — refresh availability.
      getSlots(service.id, date).then((r) => setSlots(r.filter((s) => s.capacityRemaining > 0)))
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <h2 className="text-lg font-semibold">{t('confirmedTitle')}</h2>
        <p className="mt-2 text-sm">
          {t('confirmedBody', { when: done.when, people: done.people })}
        </p>
        <button
          type="button"
          onClick={() => {
            setDone(null)
            setSelected(null)
            setName('')
            setPhone('')
            setEmail('')
          }}
          className="mt-4 min-h-11 rounded-lg border border-black/15 px-4 text-sm dark:border-white/20"
        >
          {t('bookAnother')}
        </button>
      </div>
    )
  }

  const maxParty = selected ? selected.capacityRemaining : 1
  const isGroup = (service?.capacity ?? 1) > 1

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Service */}
      <div>
        <label className="mb-1 block text-sm text-foreground/70">{t('service')}</label>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="min-h-11 w-full rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {(locale === 'ru' ? s.name_ru ?? s.name_en : s.name_en)} · {formatPrice(s.price_pence)}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="mb-1 block text-sm text-foreground/70">{t('date')}</label>
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {dates.map((d) => {
            const active = d === date
            return (
              <button
                type="button"
                key={d}
                onClick={() => setDate(d)}
                className={`min-h-11 shrink-0 snap-start rounded-lg border px-3 text-sm ${
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-black/15 dark:border-white/20'
                }`}
              >
                {dateFmt.format(new Date(`${d}T12:00:00Z`))}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time */}
      <div>
        <label className="mb-1 block text-sm text-foreground/70">{t('time')}</label>
        {loading ? (
          <p className="text-sm text-foreground/50">{t('loading')}</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-foreground/50">{t('noSlots')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => {
              const active = selected?.start === slot.start
              return (
                <button
                  type="button"
                  key={slot.start}
                  onClick={() => {
                    setSelected(slot)
                    setPartySize((p) => Math.min(Math.max(1, p), slot.capacityRemaining))
                  }}
                  className={`min-h-11 rounded-lg border px-3 text-sm ${
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-black/15 dark:border-white/20'
                  }`}
                >
                  {timeFmt.format(new Date(slot.start))}
                  {isGroup && (
                    <span className="ml-1 text-xs opacity-70">
                      {t('remaining', { n: slot.capacityRemaining })}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <>
          {isGroup && (
            <div>
              <label className="mb-1 block text-sm text-foreground/70">{t('partySize')}</label>
              <input
                type="number"
                min={1}
                max={maxParty}
                value={partySize}
                onChange={(e) =>
                  setPartySize(Math.min(maxParty, Math.max(1, Number(e.target.value))))
                }
                className="min-h-11 w-24 rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder={t('name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-11 rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
            />
            <input
              required
              type="tel"
              placeholder={t('phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-11 rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
            />
            <input
              type="email"
              placeholder={t('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20 sm:col-span-2"
            />
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-lg bg-foreground px-6 font-medium text-background disabled:opacity-60 sm:w-auto"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </>
      )}
    </form>
  )
}
