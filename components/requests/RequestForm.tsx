'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createRequest } from '@/lib/requests/create'
import { formatPrice } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { FilterChip } from '@/components/ui/FilterChip'
import type { PriceGuide } from '@/lib/requests/price-guide'

type WindowKey = 'tonight' | 'tomorrowAm' | 'tomorrowPm' | 'weekend'
const WINDOW_KEYS: WindowKey[] = ['tonight', 'tomorrowAm', 'tomorrowPm', 'weekend']

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
}: {
  categoryId: string
  type: 'fixed' | 'quote'
  borough: string | null
  boroughs: string[]
  services: { id: string; name: string; duration_min: number }[]
  targetProviderId?: string | null
  providerName?: string
  priceGuide: PriceGuide | null
}) {
  const t = useTranslations('request')
  const router = useRouter()

  const [selected, setSelected] = useState<WindowKey[]>([])
  const [borough, setBorough] = useState(fixedBorough ?? boroughs[0] ?? '')
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
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

  function toggle(key: WindowKey) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (selected.length === 0) {
      setError(t('needWindow'))
      return
    }
    setPending(true)
    setError('')
    const result = await createRequest({
      categoryId,
      type,
      targetProviderId,
      serviceId: type === 'fixed' && targetProviderId ? serviceId || null : null,
      borough,
      description: description.trim() === '' ? null : description.trim(),
      budgetMaxPence: budget.trim() === '' ? null : Math.round(Number(budget) * 100),
      windows: selected.map(windowFor),
      contactName: name.trim(),
      contactPhone: phone.trim(),
      contactEmail: email.trim() === '' ? null : email.trim(),
    })
    if (result.ok) {
      router.push(`/requests/${result.ref}?token=${result.token}`)
    } else {
      setPending(false)
      setError(result.error)
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
