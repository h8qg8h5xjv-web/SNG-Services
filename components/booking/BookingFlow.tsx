'use client'

import { ViewTransition, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { Pane } from '@/components/ui/Pane'
import { Field, describedBy } from '@/components/ui/Input'
import { useMagnetic } from '@/components/ui/useMagnetic'
import Consent from '@/components/Consent'
import WeekPicker, { londonDate } from '@/components/booking/WeekPicker'
import { createBooking, getSlotParticipants, getSlots } from '@/lib/booking/actions'
import { formatDuration, formatPrice } from '@/lib/format'
import { dateTimeFormat } from '@/lib/intl'
import { icsFor } from '@/lib/booking/ics'
import { setNavKind } from '@/components/site/NavMotion'

const TZ = 'Europe/London'
const STEPS = ['service', 'time', 'details', 'done'] as const
type Step = (typeof STEPS)[number]

export type FlowService = {
  id: string
  name: string
  durationMin: number
  pricePence: number
  capacity: number
}

type Done = { start: string; partySize: number; name: string; participants: string[]; serviceId: string }

// Step-by-step booking (DEMO_MAP §3.3). The URL is the state: ?step=service |
// time | details | done, &svc=, &slot= (an ISO instant). Guards: an unknown svc
// is dropped; no svc → service; details without slot → time; a link with svc +
// slot and no step (home cards) → details; done only exists right after a
// booking. Uses the same getSlots / createBooking as before.
export default function BookingFlow({
  providerId,
  providerName,
  borough,
  address,
  categorySlug,
  providerSlug,
  services,
  todayIso,
}: {
  providerId: string
  providerName: string
  borough: string
  address: string | null
  categorySlug: string
  providerSlug: string
  services: FlowService[]
  todayIso: string
}) {
  const tv = useTranslations('booking.v2')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [done, setDone] = useState<Done | null>(null)

  const svcParam = params.get('svc')
  const service = services.find((s) => s.id === svcParam) ?? null
  const slotParam = params.get('slot')
  const slot = slotParam && !Number.isNaN(Date.parse(slotParam)) ? new Date(slotParam).toISOString() : null
  const asked = params.get('step') as Step | null
  let step: Step
  if (asked === 'done' && done) step = 'done'
  else if (!service || asked === 'service') step = 'service'
  else if (asked === 'time' || !slot) step = 'time'
  else step = 'details'

  // booking_started: fires once when the booking flow opens.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    const body = JSON.stringify({
      events: [{ provider_id: providerId, event_type: 'booking_started', surface: 'booking', locale }],
    })
    try {
      navigator.sendBeacon('/api/track', new Blob([body], { type: 'application/json' }))
    } catch {
      fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {})
    }
  }, [providerId, locale])

  const timeFmt = dateTimeFormat(locale, { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
  const whenFmt = dateTimeFormat(locale, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
  const tu = useTranslations('units')
  const durationLabels = { hour: tu('hour'), min: tu('min') }

  const go = (next: Step, patch: Record<string, string | null>, replace = false) => {
    const q = new URLSearchParams(params.toString())
    q.set('step', next)
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) q.delete(k)
      else q.set(k, v)
    }
    setNavKind(STEPS.indexOf(next) >= STEPS.indexOf(step) ? 'step' : 'step-back')
    const href = `${pathname}?${q.toString()}`
    if (replace) router.replace(href, { scroll: false })
    else router.push(href)
  }

  const summaryWhen = slot && step !== 'service' ? whenFmt.format(new Date(slot)) : null

  return (
    <div className="bk">
      {step !== 'done' && (
        <div className="bk-top">
          <h1 className="ph1">{tv('heading')}</h1>
          <ol className="progress" aria-label={tv('progress')}>
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={s === step ? 'step' : undefined}
                className={i < STEPS.indexOf(step) ? 'done' : undefined}
              >
                <span>{tv(`step${s[0].toUpperCase()}${s.slice(1)}` as 'stepService')}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <ViewTransition key={step} enter="none" exit="none" update="none" default="none">
        {step === 'done' && done ? (
          <DoneScreen
            done={done}
            service={services.find((s) => s.id === done.serviceId) ?? null}
            providerName={providerName}
            borough={borough}
            address={address}
            categorySlug={categorySlug}
            whenFmt={whenFmt}
            timeFmt={timeFmt}
          />
        ) : (
          <div className="bk-grid">
            <div className="bk-main">
              {step === 'service' && (
                <ServiceStep
                  services={services}
                  initial={service?.id ?? services[0]?.id ?? ''}
                  durationLabels={durationLabels}
                  onNext={(id) => go(slot ? 'details' : 'time', { svc: id })}
                  backHref={`/${categorySlug}/${providerSlug}`}
                />
              )}
              {step === 'time' && service && (
                <TimeStep
                  service={service}
                  todayIso={todayIso}
                  slot={slot}
                  timeFmt={timeFmt}
                  onPick={(s) => go('time', { slot: s }, true)}
                  onNext={() => go('details', {})}
                  onBack={() => go('service', {})}
                />
              )}
              {step === 'details' && service && slot && (
                <DetailsStep
                  key={`${service.id}|${slot}`}
                  service={service}
                  slot={slot}
                  time={timeFmt.format(new Date(slot))}
                  onBack={() => go('time', {})}
                  onPickOther={() => go('time', { slot: null })}
                  onDone={(d) => {
                    setDone(d)
                    go('done', {}, true)
                  }}
                />
              )}
            </div>
            <aside className="card bk-sum" aria-label={tv('stepDone')}>
              <b>{providerName}</b>
              <div className="muted text-small">{borough}</div>
              <dl>
                <div>
                  <dt>{tv('sumService')}</dt>
                  <dd className={service ? undefined : 'none'}>{service ? service.name : tv('sumNoService')}</dd>
                </div>
                <div>
                  <dt>{tv('sumWhen')}</dt>
                  <dd className={summaryWhen ? undefined : 'none'}>{summaryWhen ?? tv('sumNoTime')}</dd>
                </div>
                {service && (
                  <div className="price-row">
                    <span>{tv('sumPrice')}</span>
                    <b>{formatPrice(service.pricePence)}</b>
                  </div>
                )}
              </dl>
            </aside>
          </div>
        )}
      </ViewTransition>
    </div>
  )
}

function ServiceStep({
  services: list,
  initial,
  durationLabels: labels,
  onNext,
  backHref,
}: {
  services: FlowService[]
  initial: string
  durationLabels: { hour: string; min: string }
  onNext: (id: string) => void
  backHref: string
}) {
  const tv = useTranslations('booking.v2')
  const [choice, setChoice] = useState(initial)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (choice) onNext(choice)
      }}
    >
      <h2 className="h3 mb-4">{tv('whatService')}</h2>
      <div className="opts" role="radiogroup" aria-label={tv('stepService')}>
        {list.map((s) => (
          <label key={s.id} className="opt">
            <input type="radio" name="svc" value={s.id} checked={choice === s.id} onChange={() => setChoice(s.id)} />
            <span className="radio" aria-hidden="true" />
            <span>
              <b>{s.name}</b>
              <small>{formatDuration(s.durationMin, labels)}</small>
            </span>
            <span className="price">{formatPrice(s.pricePence)}</span>
          </label>
        ))}
      </div>
      <div className="bk-nav">
        <button type="submit" className="btn btn-ink">
          {tv('next')}
        </button>
        <Link href={backHref} className="btn btn-plain" data-kind="pop">
          {tv('backToProvider')}
        </Link>
      </div>
    </form>
  )
}

function TimeStep({
  service,
  todayIso,
  slot,
  timeFmt,
  onPick,
  onNext,
  onBack,
}: {
  service: FlowService
  todayIso: string
  slot: string | null
  timeFmt: Intl.DateTimeFormat
  onPick: (slot: string) => void
  onNext: () => void
  onBack: () => void
}) {
  const tv = useTranslations('booking.v2')
  return (
    <div>
      <h2 className="h3 mb-4">{tv('pickTime')}</h2>
      <WeekPicker
        serviceId={service.id}
        todayIso={todayIso}
        initialDate={slot ? londonDate(slot) : undefined}
        selected={slot}
        onSelect={(s) => onPick(s.start)}
        isGroup={service.capacity > 1}
      />
      <div className="bk-nav">
        <button type="button" className="btn btn-ink" disabled={!slot} onClick={onNext}>
          {slot ? tv('nextAt', { time: timeFmt.format(new Date(slot)) }) : tv('next')}
        </button>
        <button type="button" className="btn btn-plain" onClick={onBack}>
          {tv('back')}
        </button>
      </div>
    </div>
  )
}

function DetailsStep({
  service,
  slot,
  time,
  onBack,
  onPickOther,
  onDone,
}: {
  service: FlowService
  slot: string
  time: string
  onBack: () => void
  onPickOther: () => void
  onDone: (d: Done) => void
}) {
  const t = useTranslations('booking')
  const tv = useTranslations('booking.v2')
  const [free, setFree] = useState<number | null>(null) // seats left in this slot; 0 = taken
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [party, setParty] = useState(1)
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submitRef = useMagnetic<HTMLButtonElement>()
  const isGroup = service.capacity > 1

  // Re-check the slot: it may have been taken since the time step.
  useEffect(() => {
    let ignore = false
    getSlots(service.id, londonDate(slot)).then((slots) => {
      if (ignore) return
      setFree(slots.find((s) => s.start === slot)?.capacityRemaining ?? 0)
    })
    return () => {
      ignore = true
    }
  }, [service.id, slot])

  if (free === 0) {
    return (
      <div>
        <p className="notice">{tv('taken')}</p>
        <div className="bk-nav">
          <button type="button" className="btn btn-ink" onClick={onPickOther}>
            {tv('pickOther')}
          </button>
        </div>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = tv('errName')
    if (!phone.trim()) next.phone = tv('errPhone')
    setErrors(next)
    if (next.name || next.phone) {
      document.getElementById(next.name ? 'bk-name' : 'bk-phone')?.focus()
      return
    }
    setSubmitting(true)
    setServerError('')
    const result = await createBooking({
      service_id: service.id,
      starts_at: slot,
      party_size: party,
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      is_visible_to_group: isGroup && visible,
    })
    if (result.ok) {
      const participants = isGroup && visible ? await getSlotParticipants(service.id, result.startsAt) : []
      onDone({ start: result.startsAt, partySize: result.partySize, name, participants, serviceId: service.id })
      return
    }
    setSubmitting(false)
    if (/taken/i.test(result.error)) setFree(0)
    else setServerError(result.error)
  }

  const maxParty = Math.max(1, free ?? 1)
  return (
    <form className="bk-form" onSubmit={submit} noValidate>
      <h2 className="h3">{tv('yourDetails')}</h2>
      <Field id="bk-name" label={t('name')} error={errors.name}>
        <input
          id="bk-name"
          className="input"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy('bk-name', null, errors.name)}
        />
      </Field>
      <Field id="bk-phone" label={t('phone')} hint={tv('phoneHint')} error={errors.phone}>
        <input
          id="bk-phone"
          className="input"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={describedBy('bk-phone', true, errors.phone)}
        />
      </Field>
      <Field id="bk-email" label={t('email')}>
        <input id="bk-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      {isGroup && (
        <>
          <Field id="bk-party" label={t('partySize')}>
            <input
              id="bk-party"
              className="input w-28"
              type="number"
              min={1}
              max={maxParty}
              value={party}
              onChange={(e) => setParty(Math.min(maxParty, Math.max(1, Number(e.target.value))))}
            />
          </Field>
          <label className="check">
            <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
            {t('visibleToGroup')}
          </label>
        </>
      )}
      {serverError && (
        <p className="notice" role="alert">
          {serverError}
        </p>
      )}
      <div className="bk-nav">
        <button ref={submitRef} type="submit" className="btn btn-amber magnetic" disabled={submitting || free === null}>
          {submitting ? t('submitting') : tv('submitAt', { time })}
        </button>
        <button type="button" className="btn btn-plain" onClick={onBack}>
          {tv('back')}
        </button>
      </div>
      <Consent />
    </form>
  )
}

function DoneScreen({
  done,
  service,
  providerName,
  borough,
  address,
  categorySlug,
  whenFmt,
  timeFmt,
}: {
  done: Done
  service: FlowService | null
  providerName: string
  borough: string
  address: string | null
  categorySlug: string
  whenFmt: Intl.DateTimeFormat
  timeFmt: Intl.DateTimeFormat
}) {
  const t = useTranslations('booking')
  const tv = useTranslations('booking.v2')
  const paneRef = useRef<HTMLDivElement | null>(null)
  const when = whenFmt.format(new Date(done.start))

  // The lamp switches off 380ms after the screen appears: the window is yours.
  useEffect(() => {
    const pane = paneRef.current?.querySelector('.pane')
    if (!pane) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pane.classList.add('off')
      return
    }
    const a = window.setTimeout(() => pane.classList.add('switching'), 380)
    const b = window.setTimeout(() => {
      pane.classList.remove('switching')
      pane.classList.add('off')
    }, 380 + 480)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [])

  const ics = useMemo(
    () =>
      icsFor({
        start: done.start,
        durationMin: service?.durationMin ?? 60,
        title: service ? `${service.name} — ${providerName}` : providerName,
        location: address ?? borough,
      }),
    [done.start, service, providerName, address, borough],
  )
  const addToCalendar = () => {
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'sng-booking.ics'
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="bk-done">
      <div ref={paneRef} className="done-pane">
        <Pane time={timeFmt.format(new Date(done.start))} />
      </div>
      <h1 className="ph1">{t('confirmedTitle')}</h1>
      <p className="muted">{tv('doneOff')}</p>
      <dl>
        <dt>{tv('doneWhere')}</dt>
        <dd>
          {providerName}, {borough}
        </dd>
        <dt>{tv('doneWhen')}</dt>
        <dd>{when}</dd>
        {service && (
          <>
            <dt>{tv('doneService')}</dt>
            <dd>
              {service.name} · {formatPrice(service.pricePence)}
            </dd>
          </>
        )}
        <dt>{tv('doneName')}</dt>
        <dd>
          {done.name}
          {done.partySize > 1 ? ` · ${done.partySize}` : ''}
        </dd>
      </dl>
      {service && service.capacity > 1 && (
        <div className="mb-6">
          {done.participants.length > 0 ? (
            <>
              <p className="muted">{t('othersComing')}</p>
              <ul className="who-list">
                {done.participants.map((n, i) => (
                  <li key={`${n}-${i}`}>
                    <i aria-hidden="true">{n.trim().charAt(0).toUpperCase()}</i>
                    {n}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">{t('aloneSoFar')}</p>
          )}
        </div>
      )}
      <div className="acts">
        <Link href="/bookings" className="btn btn-ink">
          {tv('myBookings')}
        </Link>
        <button type="button" className="btn btn-line" onClick={addToCalendar}>
          {tv('addCalendar')}
        </button>
        <Link href={`/${categorySlug}`} className="btn btn-plain">
          {tv('moreInCategory')}
        </Link>
      </div>
    </div>
  )
}
