'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createRequest } from '@/lib/requests/create'
import { uploadRequestPhotos } from '@/lib/requests/photos'
import { saveRequest } from '@/lib/requests/local-store'
import { formatPrice } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { FilterChip } from '@/components/ui/FilterChip'
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
      router.push(`/requests/${result.ref}?token=${result.token}`)
    } else {
      setPending(false)
      // Honest LEGAL D3a stop gets a translated message; other errors pass through.
      setError(result.code === 'no_regulated_providers' ? t('noRegulatedProviders') : result.error)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {providerName && <p className="text-body text-slate-500">{t('forMaster', { name: providerName })}</p>}

      <div>
        <label className="mb-2 block text-body font-semibold">{t('windows')}</label>
        <div className="flex flex-wrap gap-2">
          {WINDOW_KEYS.map((key) => (
            <FilterChip key={key} active={selected.includes(key)} onClick={() => toggle(key)}>
              {t(`window.${key}`)}
            </FilterChip>
          ))}
        </div>
        <p className="mt-2 text-meta text-slate-500">{speedHint}</p>
      </div>

      <div>
        <label className="mb-2 block text-body font-semibold">{t('urgency')}</label>
        <div className="flex flex-wrap gap-2">
          {URGENCY_KEYS.map((key) => (
            <FilterChip key={key} active={urgency === key} onClick={() => setUrgency(key)}>
              {t(`urgencyOption.${key}`)}
            </FilterChip>
          ))}
        </div>
      </div>

      {type === 'fixed' && targetProviderId && services.length > 0 && (
        <div>
          <label className="mb-1 block text-body text-slate-500">{t('service')}</label>
          <Select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="w-full">
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {type === 'quote' && (
        <div>
          <label className="mb-1 block text-body text-slate-500">{t('describe')}</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full"
          />
        </div>
      )}

      {type === 'quote' && (
        <div>
          <label className="mb-1 block text-body text-slate-500">{t('photos')}</label>
          {previews.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {previews.map((src, i) => (
                <div key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded bg-slate-900 px-2 text-meta text-white"
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
              className="block text-body"
            />
          )}
          <p className="mt-1 text-meta text-slate-500">{t('photosHint', { max: MAX_PHOTOS })}</p>
        </div>
      )}

      {!fixedBorough && (
        <div>
          <label className="mb-1 block text-body text-slate-500">{t('borough')}</label>
          <Select value={borough} onChange={(e) => setBorough(e.target.value)} className="w-full">
            {boroughs.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-body text-slate-500">{t('postcode')}</label>
        <Input
          required
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="SW1A 1AA"
          autoCapitalize="characters"
          className="w-40"
        />
        <p className="mt-1 text-meta text-slate-500">{t('postcodeHint')}</p>
      </div>

      {regulatedApplies && (
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-body font-semibold">{t('regulatedQuestion')}</p>
          <p className="mt-1 text-meta text-slate-500">{t('regulatedWhy')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterChip active={!regulated} onClick={() => setRegulated(false)}>
              {t('regulatedNo')}
            </FilterChip>
            <FilterChip active={regulated} onClick={() => setRegulated(true)}>
              {t('regulatedYes')}
            </FilterChip>
          </div>
          {regulated && (
            <div className="mt-3">
              <label className="mb-1 block text-body text-slate-500">{t('regulatedKind')}</label>
              <Select
                value={regulatedKind}
                onChange={(e) => setRegulatedKind(e.target.value as RegulatedKind)}
                className="w-full"
              >
                {REGULATED_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`regulatedKindOption.${k}`)}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-meta text-slate-500">{t('regulatedNote')}</p>
            </div>
          )}
        </div>
      )}

      <div>
        <label className="mb-1 block text-body text-slate-500">
          {t('budget')} <span className="text-slate-400">{t('budgetOptional')}</span>
        </label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="w-40"
        />
        {priceGuide && (
          <p className="mt-1 text-meta text-slate-500">
            {t('priceGuide', {
              p10: formatPrice(priceGuide.p10),
              p90: formatPrice(priceGuide.p90),
            })}
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input required placeholder={t('name')} value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
        <Input required type="tel" placeholder={t('phone')} value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
        <Input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} className="w-full sm:col-span-2" />
      </div>

      {error && <p className="text-body text-red-700">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t('submitting') : t('submit')}
      </Button>
    </form>
  )
}
