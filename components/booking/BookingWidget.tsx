'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { getSlots, createBooking, getSlotParticipants } from '@/lib/booking/actions'
import { formatPrice } from '@/lib/format'
import { dateTimeFormat } from '@/lib/intl'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { FilterChip } from '@/components/ui/FilterChip'
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

// Add whole days to a YYYY-MM-DD string via UTC — deterministic, no local-time
// or timezone drift, so server and client produce the identical list.
function addDays(iso: string, offsetDays: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + offsetDays)
  return dt.toISOString().slice(0, 10)
}

export default function BookingWidget({
  services,
  providerId,
  todayIso,
}: {
  services: BookingService[]
  providerId: string
  todayIso: string
}) {
  const t = useTranslations('booking')
  const locale = useLocale()

  // booking_started: fires once when the booking flow opens.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    const body = JSON.stringify({
      events: [{ provider_id: providerId, event_type: 'booking_started', surface: 'booking', locale }],
    })
    try {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
    } catch {
      fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {})
    }
  }, [providerId, locale])

  const dates = useMemo(
    () => Array.from({ length: 30 }, (_, i) => addDays(todayIso, i)),
    [todayIso],
  )
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
  const [visibleToGroup, setVisibleToGroup] = useState(false)
  const [done, setDone] = useState<
    { when: string; people: number; participants: string[] } | null
  >(null)

  const service = services.find((s) => s.id === serviceId)
  const isGroup = (service?.capacity ?? 1) > 1

  useEffect(() => {
    if (!serviceId) return
    let ignore = false
    // Reset the picker and show a loading state before fetching slots for the
    // new service/date (a data-fetch effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setSelected(null)
    getSlots(serviceId, date).then((result) => {
      if (ignore) return
      setSlots(result.filter((s) => s.capacityRemaining > 0))
      setLoading(false)
    })
    return () => {
      ignore = true
    }
  }, [serviceId, date])

  const dateFmt = dateTimeFormat(locale, {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
  })
  const timeFmt = dateTimeFormat(locale, {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  })
  const dateTimeFmt = dateTimeFormat(locale, {
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
    const isGroupService = (service.capacity ?? 1) > 1
    const result = await createBooking({
      service_id: service.id,
      starts_at: selected.start,
      party_size: partySize,
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      is_visible_to_group: isGroupService && visibleToGroup,
    })
    setSubmitting(false)
    if (result.ok) {
      const participants =
        isGroupService && visibleToGroup
          ? await getSlotParticipants(service.id, result.startsAt)
          : []
      setDone({
        when: dateTimeFmt.format(new Date(result.startsAt)),
        people: result.partySize,
        participants,
      })
    } else {
      setError(result.error)
      // The slot may have just filled — refresh availability.
      getSlots(service.id, date).then((r) => setSlots(r.filter((s) => s.capacityRemaining > 0)))
    }
  }

  if (done) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-100 p-6">
        <h2 className="text-h2 font-semibold">{t('confirmedTitle')}</h2>
        <p className="mt-2 text-body">
          {t('confirmedBody', { when: done.when, people: done.people })}
        </p>

        {isGroup && (
          <div className="mt-4">
            {done.participants.length > 0 ? (
              <>
                <p className="mb-2 text-body text-slate-500">{t('othersComing')}</p>
                <ul className="flex flex-wrap gap-3">
                  {done.participants.map((n, i) => (
                    <li key={`${n}-${i}`} className="flex items-center gap-2 text-body">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-meta font-semibold">
                        {n.trim().charAt(0).toUpperCase()}
                      </span>
                      {n}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-body text-slate-500">{t('aloneSoFar')}</p>
            )}
          </div>
        )}

        <Button
          variant="secondary"
          onClick={() => {
            setDone(null)
            setSelected(null)
            setName('')
            setPhone('')
            setEmail('')
            setVisibleToGroup(false)
          }}
          className="mt-4"
        >
          {t('bookAnother')}
        </Button>
      </div>
    )
  }

  const maxParty = selected ? selected.capacityRemaining : 1

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Service */}
      <div>
        <label className="mb-1 block text-body text-slate-500">{t('service')}</label>
        <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full">
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {(locale === 'ru' ? s.name_ru ?? s.name_en : s.name_en)} · {formatPrice(s.price_pence)}
            </option>
          ))}
        </Select>
      </div>

      {/* Date */}
      <div>
        <label className="mb-1 block text-body text-slate-500">{t('date')}</label>
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {dates.map((d) => {
            const active = d === date
            return (
              <FilterChip
                key={d}
                active={active}
                onClick={() => setDate(d)}
                className="shrink-0 snap-start"
              >
                {dateFmt.format(new Date(`${d}T12:00:00Z`))}
              </FilterChip>
            )
          })}
        </div>
      </div>

      {/* Time */}
      <div>
        <label className="mb-1 block text-body text-slate-500">{t('time')}</label>
        {loading ? (
          <p className="text-body text-slate-500">{t('loading')}</p>
        ) : slots.length === 0 ? (
          <p className="text-body text-slate-500">{t('noSlots')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => {
              const active = selected?.start === slot.start
              return (
                <FilterChip
                  key={slot.start}
                  active={active}
                  onClick={() => {
                    setSelected(slot)
                    setPartySize((p) => Math.min(Math.max(1, p), slot.capacityRemaining))
                  }}
                >
                  {timeFmt.format(new Date(slot.start))}
                  {isGroup && (
                    <span className="ml-1 text-meta opacity-70">
                      {t('remaining', { n: slot.capacityRemaining })}
                    </span>
                  )}
                </FilterChip>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <>
          {isGroup && (
            <div>
              <label className="mb-1 block text-body text-slate-500">{t('partySize')}</label>
              <Input
                type="number"
                min={1}
                max={maxParty}
                value={partySize}
                onChange={(e) =>
                  setPartySize(Math.min(maxParty, Math.max(1, Number(e.target.value))))
                }
                className="w-24"
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              required
              placeholder={t('name')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full"
            />
            <Input
              required
              type="tel"
              placeholder={t('phone')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full"
            />
            <Input
              type="email"
              placeholder={t('email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:col-span-2"
            />
          </div>

          {isGroup && (
            <label className="flex items-center gap-2 text-body text-slate-900">
              <input
                type="checkbox"
                checked={visibleToGroup}
                onChange={(e) => setVisibleToGroup(e.target.checked)}
                className="h-4 w-4"
              />
              {t('visibleToGroup')}
            </label>
          )}

          {error && <p className="text-body text-red-700">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </>
      )}
    </form>
  )
}
