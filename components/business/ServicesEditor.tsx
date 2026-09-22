'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { IconTrash } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useRouter } from '@/i18n/navigation'
import { saveCabinetService, deleteCabinetService } from '@/lib/business/actions'
import type { CabinetService } from '@/lib/business/data'

export default function ServicesEditor({
  providerId,
  services,
}: {
  providerId: string
  services: CabinetService[]
}) {
  const t = useTranslations('business.services')
  return (
    <div className="space-y-3">
      {services.map((s) => (
        <ServiceRow key={s.id} providerId={providerId} service={s} />
      ))}
      <ServiceRow providerId={providerId} service={null} />
      <p className="text-meta text-slate-500">{t('priceHint')}</p>
    </div>
  )
}

function ServiceRow({
  providerId,
  service,
}: {
  providerId: string
  service: CabinetService | null
}) {
  const t = useTranslations('business.services')
  const router = useRouter()
  const [name, setName] = useState(service?.name ?? '')
  const [price, setPrice] = useState(service ? (service.pricePence / 100).toString() : '')
  const [duration, setDuration] = useState(service ? service.durationMin.toString() : '')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function save() {
    setError('')
    startTransition(async () => {
      const res = await saveCabinetService({
        providerId,
        id: service?.id ?? null,
        name: name.trim(),
        pricePence: Math.round(Number(price) * 100),
        durationMin: Math.round(Number(duration)),
      })
      if (res.ok) {
        if (!service) {
          setName('')
          setPrice('')
          setDuration('')
        }
        router.refresh()
      } else setError(res.error)
    })
  }

  function remove() {
    if (!service) return
    startTransition(async () => {
      const res = await deleteCabinetService(providerId, service.id)
      if (res.ok) router.refresh()
      else setError(res.error)
    })
  }

  const valid = name.trim() && Number(price) >= 0 && Number(duration) > 0

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-meta text-slate-500">
          {t('name')}
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full" />
        </label>
        <label className="text-meta text-slate-500">
          {t('price')}
          <Input type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-24" />
        </label>
        <label className="text-meta text-slate-500">
          {t('duration')}
          <Input type="number" inputMode="numeric" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1 w-24" />
        </label>
        <Button variant="secondary" onClick={save} disabled={pending || !valid}>
          {service ? t('save') : t('add')}
        </Button>
        {service && (
          <button type="button" onClick={remove} disabled={pending} aria-label={t('delete')} className="min-h-12 px-2 text-slate-400 hover:text-red-700">
            <IconTrash className="h-5 w-5" stroke={1.5} />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-meta text-red-700">{error}</p>}
    </div>
  )
}
