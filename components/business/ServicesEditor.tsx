'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { IconTrash } from '@tabler/icons-react'
import { Button } from '@/components/ui/Button'
import { Input, Field } from '@/components/ui/Input'
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
    <div>
      {services.map((s) => (
        <ServiceRow key={s.id} providerId={providerId} service={s} />
      ))}
      <ServiceRow providerId={providerId} service={null} />
      <p className="muted mt-3 text-sm">{t('priceHint')}</p>
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

  const key = service?.id ?? 'new'

  return (
    <div>
      <div className="svc-row">
        <Field id={`svc-name-${key}`} label={t('name')}>
          <Input id={`svc-name-${key}`} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field id={`svc-price-${key}`} label={t('price')}>
          <Input id={`svc-price-${key}`} type="number" inputMode="decimal" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field id={`svc-dur-${key}`} label={t('duration')}>
          <Input id={`svc-dur-${key}`} type="number" inputMode="numeric" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
        </Field>
        <Button variant={service ? 'line' : 'ink'} onClick={save} disabled={pending || !valid}>
          {service ? t('save') : t('add')}
        </Button>
        {service ? (
          <button type="button" onClick={remove} disabled={pending} aria-label={t('delete')} className="icon-btn">
            <IconTrash stroke={1.75} aria-hidden="true" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </div>
      {error && (
        <p className="msg-err-inline mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
