'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createRequest } from '@/lib/requests/create'
import { uploadRequestPhotos } from '@/lib/requests/photos'
import { saveRequest } from '@/lib/requests/local-store'
import { markFirstValue } from '@/lib/tracking/first-value'
import { formatPrice } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { FilterChip } from '@/components/ui/FilterChip'
import Consent from '@/components/Consent'
import type { PriceGuide } from '@/lib/requests/price-guide'
import type { Urgency, RegulatedKind } from '@/types/database'

type WindowKey = 'tonight' | 'tomorrowAm' | 'tomorrowPm' | 'weekend'
const WINDOW_KEYS: WindowKey[] = ['tonight', 'tomorrowAm', 'tomorrowPm', 'weekend']
const URGENCY_KEYS: Urgency[] = ['today', 'this_week', 'flexible']
const REGULATED_KINDS: RegulatedKind[] = ['gas', 'electrical', 'other']
const MAX_PHOTOS = 5

// Presets → concrete windows, computed on submit (never during render — no
// hydration concern). Windows, not exact times (REQUESTS §3).
function windowFor(key: WindowKey): { starts_at: string; ends_at: string } {
  const at = (addDays: number, h: number, endH: number) => {
    const s = new Date()
    s.setDate(s.getDate() + addDays)
    s.setHours(h, 0, 0, 0)
    const e = new Date(s)
    e.setHours(endH, 0, 0, 0)
    return { starts_at: s.toISOString(), ends_at: e.toISOString() }
  }
  switch (key) {
    case 'tonight':
      return at(0, 18, 22)
    case 'tomorrowAm':
      return at(1, 9, 12)
    case 'tomorrowPm':
      return at(1, 12, 17)
    case 'weekend': {
      const now = new Date()
      const toSat = ((6 - now.getDay() + 7) % 7) || 7
      return at(toSat, 9, 20)
    }
  }
}

export default function RequestForm({
  categoryId,
  type,
  borough: fixedBorough,
  boroughs,
  services,
  targetProviderId = null,
  providerName,
  priceGuide,
  regulatedApplies = false,
}: {
  categoryId: string
  type: 'fixed' | 'quote'
  borough: string | null
  boroughs: string[]
  services: { id: string; name: string; duration_min: number }[]
  targetProviderId?: string | null
  providerName?: string
  priceGuide: PriceGuide | null
  // LEGAL D3a: the regulated-work question is asked only in home/auto.
  regulatedApplies?: boolean
}) {
  const t = useTranslations('request')
  const router = useRouter()

  const [selected, setSelected] = useState<WindowKey[]>([])
  const [urgency, setUrgency] = useState<Urgency>('this_week')
  const [borough, setBorough] = useState(fixedBorough ?? boroughs[0] ?? '')
  const [postcode, setPostcode] = useState('')
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [regulated, setRegulated] = useState(false)
  const [regulatedKind, setRegulatedKind] = useState<RegulatedKind>('gas')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const speedHint = useMemo(() => {
    const n = selected.length
    if (n === 0) return t('speedHintNone')
    if (n === 1) return t('speedHintOne')
    return t('speedHintMany')
  }, [selected.length, t])

  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])

  function toggle(key: WindowKey) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function onPhotos(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? [])
    setPhotos((prev) => [...prev, ...picked].slice(0, MAX_PHOTOS))
    event.target.value = ''
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (selected.length === 0) {
      setError(t('needWindow'))
      return
    }
    setPending(true)
    setError('')

    // Photos (quote only): guests can't write Storage, so the server action
    // uploads with the service role and returns the stored paths.
    let photoPaths: string[] = []
    if (type === 'quote' && photos.length > 0) {
      const fd = new FormData()
      photos.forEach((f) => fd.append('photos', f))
      const up = await uploadRequestPhotos(fd)
      if (!up.ok) {
        setPending(false)
        setError(up.error)
        return
      }
      photoPaths = up.paths
    }

    const result = await createRequest({
      categoryId,
      type,
      targetProviderId,
      serviceId: type === 'fixed' && targetProviderId ? serviceId || null : null,
      borough,
      postcode,
      urgency,
      photos: photoPaths,
      regulatedKind: regulatedApplies && regulated ? regulatedKind : null,
      description: description.trim() === '' ? null : description.trim(),
      budgetMaxPence: budget.trim() === '' ? null : Math.round(Number(budget) * 100),
      windows: selected.map(windowFor),
      contactName: name.trim(),
      contactPhone: phone.trim(),
      contactEmail: email.trim() === '' ? null : email.trim(),
    })
    if (result.ok) {
      saveRequest(result.ref, result.token) // so it shows under "Bookings"
      markFirstValue() // leaving a request is a "first value" action (§ metric #1)
      router.push(`/requests/${result.ref}?token=${result.token}`)
    } else {
      setPending(false)
      // Honest LEGAL D3a stop gets a translated message; other errors pass through.
      setError(result.code === 'no_regulated_providers' ? t('noRegulatedProviders') : result.error)
    }
  }

  return (
    <form onSubmit={onSubmit} className="rq-form" noValidate>
      {providerName && <p className="notice">{t('forMaster', { name: providerName })}</p>}

      <div className="field">
        <span className="lbl" id="rq-windows">{t('windows')}</span>
        <div className="chipset" role="group" aria-labelledby="rq-windows">
          {WINDOW_KEYS.map((key) => (
            <FilterChip key={key} look="dchip" active={selected.includes(key)} onClick={() => toggle(key)}>
              {t(`window.${key}`)}
            </FilterChip>
          ))}
        </div>
        <p className="hint">{speedHint}</p>
      </div>

      <div className="field">
        <span className="lbl" id="rq-urgency">{t('urgency')}</span>
        <div className="chipset" role="group" aria-labelledby="rq-urgency">
          {URGENCY_KEYS.map((key) => (
            <FilterChip key={key} look="dchip" active={urgency === key} onClick={() => setUrgency(key)}>
              {t(`urgencyOption.${key}`)}
            </FilterChip>
          ))}
        </div>
      </div>

      {type === 'fixed' && targetProviderId && services.length > 0 && (
        <div className="field">
          <label className="lbl">{t('service')}</label>
          <Select
            value={serviceId}
            onChange={setServiceId}
            options={services.map((s) => ({ value: s.id, label: s.name }))}
            ariaLabel={t('service')}
            title={t('service')}
            
          />
        </div>
      )}

      {type === 'quote' && (
        <div className="field">
          <label className="lbl">{t('describe')}</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            
          />
        </div>
      )}

      {type === 'quote' && (
        <div className="field">
          <label className="lbl">{t('photos')}</label>
          {previews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-20 w-20 rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="x-btn"
                    aria-label={t('removePhoto')}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_PHOTOS && (
            // accept="image/*" (no capture) lets mobile offer BOTH camera and
            // gallery in the native picker; capture would force camera-only.
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPhotos}
              className="block text-ui"
            />
          )}
          <p className="hint">{t('photosHint', { max: MAX_PHOTOS })}</p>
        </div>
      )}

      {!fixedBorough && (
        <div className="field">
          <label className="lbl">{t('borough')}</label>
          <Select
            value={borough}
            onChange={setBorough}
            options={boroughs.map((b) => ({ value: b, label: b }))}
            ariaLabel={t('borough')}
            title={t('borough')}
            
          />
        </div>
      )}

      <div className="field">
        <label className="lbl" htmlFor="rq-postcode">{t('postcode')}</label>
        <Input
          id="rq-postcode"
          required
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="SW1A 1AA"
          autoCapitalize="characters"
          className="w-40"
        />
        <p className="hint">{t('postcodeHint')}</p>
      </div>

      {regulatedApplies && (
        <div className="card p-5">
          <p className="lbl">{t('regulatedQuestion')}</p>
          <p className="hint mt-1">{t('regulatedWhy')}</p>
          <div className="chipset mt-3">
            <FilterChip look="dchip" active={!regulated} onClick={() => setRegulated(false)}>
              {t('regulatedNo')}
            </FilterChip>
            <FilterChip look="dchip" active={regulated} onClick={() => setRegulated(true)}>
              {t('regulatedYes')}
            </FilterChip>
          </div>
          {regulated && (
            <div className="field mt-4">
              <label className="lbl">{t('regulatedKind')}</label>
              <Select
                value={regulatedKind}
                onChange={(v) => setRegulatedKind(v as RegulatedKind)}
                options={REGULATED_KINDS.map((k) => ({ value: k, label: t(`regulatedKindOption.${k}`) }))}
                ariaLabel={t('regulatedKind')}
                title={t('regulatedKind')}
                
              />
              <p className="hint">{t('regulatedNote')}</p>
            </div>
          )}
        </div>
      )}

      <div className="field">
        <label className="lbl" htmlFor="rq-budget">
          {t('budget')} <span className="muted font-normal">{t('budgetOptional')}</span>
        </label>
        <Input
          id="rq-budget"
          type="number"
          inputMode="numeric"
          min={0}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-40"
        />
        {priceGuide && (
          <p className="hint">
            {t('priceGuide', {
              p10: formatPrice(priceGuide.p10),
              p90: formatPrice(priceGuide.p90),
            })}
          </p>
        )}
      </div>

      <div className="grid gap-3 tablet:grid-cols-2">
        <Input required aria-label={t('name')} autoComplete="name" placeholder={t('name')} value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        <Input required type="tel" aria-label={t('phone')} autoComplete="tel" placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
        <Input type="email" aria-label={t('email')} autoComplete="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} className="tablet:col-span-2" />
      </div>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" variant="amber" disabled={pending} className="justify-self-start">
        {pending ? t('submitting') : t('submit')}
      </Button>
      <Consent />
    </form>
  )
}
